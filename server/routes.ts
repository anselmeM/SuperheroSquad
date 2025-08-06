/**
 * API Routes Module
 * * This module defines all the API endpoints for the superhero application.
 * It includes endpoints for searching heroes, fetching hero details, and retrieving cache statistics.
 * The module also sets up WebSocket connections for real-time updates.
 * * Features:
 * - REST API endpoints for hero search and detail retrieval
 * - In-memory caching with TTL (Time To Live) for performance optimization
 * - Cache statistics tracking and reporting
 * - WebSocket server for real-time updates
 * - Auto-suggestion optimization for search queries
 */

import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { searchResponseSchema, superheroSchema, type Superhero, type SearchResponse } from "@shared/schema";
import { ZodError } from "zod";
import { heroCache, searchCache, CacheFactory, CacheService } from "./cache";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { appConfig, createLogger } from "./utils/config";
import { handleApiError } from "./utils/errorHandler";

// Make sure WebSocket.OPEN is defined (fixing potential issues with type imports)
const WS_OPEN = WebSocket.OPEN;

// Create a logger instance for the routes module
const logger = createLogger('routes');

// Get API configuration from centralized config
const { token: API_TOKEN, baseUrl: API_BASE_URL } = appConfig.api;
if (!API_TOKEN) {
  logger.warn("SUPERHERO_API_TOKEN environment variable is not set. API requests will fail.");
}

// Allowed WebSocket origins (these are validated on connection)
const ALLOWED_ORIGINS = [
  // Allow connections from the same server (development)
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  
  // Allow specific Replit domains (more secure patterns)
  // Matches URLs like https://<deployment-id>.replit.app
  /^https?:\/\/[a-zA-Z0-9-]+\.replit\.app$/,
  
  // Matches URLs like https://<repl-slug>.<username>.repl.co
  /^https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.repl\.co$/,
  
  // Match Picard development URLs (Replit internal)
  /^https?:\/\/[a-zA-Z0-9-]+\.picard\.replit\.dev$/,
  
  // Match more specific deployment patterns
  // Example: <random-id>-<slug>-<username>.replit.app
  /^https?:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.replit\.app$/,
  
  // Match all Replit workspace domains for maximum compatibility
  /^https?:\/\/.*\.replit\.dev$/,
  
  // Allow all connections when in development mode
  // This is more permissive but ensures connectivity during development
  ...(process.env.NODE_ENV !== 'production' ? [/^http:\/\/localhost:\d+$/] : [])
];

/**
 * Schedules periodic cache cleanup to remove expired entries
 * Uses the CacheFactory to schedule cleanup for all cache instances
 */
function scheduleCacheCleanup() {
  CacheFactory.scheduleCacheCleanup();
}

/**
 * Registers all API routes and WebSocket server
 * @param app Express application instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * GET /api/cache-stats
   * * Returns current cache statistics including size, hits, misses, and hit rate
   * Used by the dashboard to display cache performance metrics
   */
  app.get("/api/cache-stats", (req, res) => {
    const heroStats = heroCache.getStats();
    const searchStats = searchCache.getStats();
    
    res.json({
      hero: heroStats,
      search: searchStats,
      timestamp: Date.now()
    });
  });

  /**
   * GET /api/hero/:id
   * * Retrieves detailed information about a specific superhero by ID
   * Uses caching to improve performance for frequently accessed heroes
   * * @param id The superhero ID to retrieve
   * @returns Complete superhero object with all available information
   */
  app.get("/api/hero/:id", async (req, res) => {
    try {
      const { id } = req.params;
      if (!/^\d+$/.test(id)) {
        return res.status(400).json({ error: "Invalid hero ID format" });
      }
      const cacheKey = CacheFactory.getHeroCacheKey(id);
      
      // Try to get from cache first
      const cachedData = heroCache.get(cacheKey) as Superhero | undefined;
      
      if (cachedData) {
        logger.debug(`Cache HIT for hero:${id}`);
        return res.json(cachedData);
      }
      
      logger.debug(`Cache MISS for hero:${id}, fetching from API`);
      
      // Declare response outside try block
      let response: Response;
      
      try {
        // Fetch from external API - Wrapped in try...catch for network errors
        response = await fetch(`${API_BASE_URL}/${API_TOKEN}/${id}`);
      } catch (fetchError: any) {
        // Handle network/fetch specific errors
        logger.error(`Workspace Error for hero ${id}:`, fetchError);
        return res.status(503).json({
          error: "Service Unavailable",
          message: `Could not connect to the Superhero API: ${fetchError.message}`
        });
      }
      
      if (!response.ok) {
        const error: any = new Error(`API HTTP Error: ${response.status} ${response.statusText}`);
        error.response = { status: response.status, statusText: response.statusText };
        throw error;
      }
      
      // Try parsing the successful response
      try {
        const data = await response.json();

        if (data.response === 'error') {
          return res.status(404).json({ 
            error: "Hero Not Found", 
            message: data.error || 'The requested superhero was not found' 
          });
        }

        // Validate response data against our schema to ensure type safety
        const validatedData = await superheroSchema.parseAsync(data);
        
        // Cache the validated result for future requests (12 hour TTL by default)
        heroCache.set(cacheKey, validatedData);
        
        return res.json(validatedData); // Explicit return
      } catch (parseError: any) {
        logger.error('Error parsing API response:', parseError);
        // Handle JSON parsing errors specifically
        return res.status(502).json({
          error: "Invalid API response",
          message: "Failed to parse the response from the Superhero API."
        });
      }
    } catch (error: any) {
      handleApiError(res, error, "hero", req.params.id);
    }
  });

  /**
   * GET /api/search
   * * Searches for superheroes matching the provided query
   * Implements caching strategies based on query length
   * Optimizes auto-suggestion requests for better performance
   * * @param query The search term to look for
   * @param expire (Optional) If true, sets a short TTL for testing expiry
   * @param ttl (Optional) Custom TTL in milliseconds for testing, used with expire=true
   * @returns Array of superheroes matching the search criteria
   */
  app.get("/api/search", async (req, res) => {
    try {
      const { query, expire, ttl } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      // For auto-suggestions, we optimize for speed and reduce logging
      const isAutoSuggestion = query.length < 4;  // Simple heuristic, can be adjusted
      const cacheKey = CacheFactory.getSearchCacheKey(query);
      
      // Determine if we're testing expiry (for demonstration/testing purposes)
      const isTestingExpiry = expire === 'true';
      
      // Parse custom TTL if provided
      const customTtl = ttl ? parseInt(ttl as string) : 1000; // Default to 1 second for testing
      
      // Use cache for queries of sufficient length (to avoid cache churn)
      if (query.length >= 3 && !isTestingExpiry) {
        const cachedData = searchCache.get(cacheKey) as SearchResponse | undefined;
        
        if (cachedData) {
          logger.debug(`Cache HIT for search:${query}`);
          return res.json(cachedData);
        }
      }
      
      logger.debug(`Cache MISS for search:${query}, fetching from API`);
      
      // Declare response outside try block
      let response: Response;
      
      try {
        // Fetch from external API - Wrapped in try...catch for network errors
        response = await fetch(`${API_BASE_URL}/${API_TOKEN}/search/${encodeURIComponent(query)}`);
      } catch (fetchError: any) {
        // Handle network/fetch specific errors
        logger.error(`Workspace Error for search "${query}":`, fetchError);
        return res.status(503).json({
          error: "Service Unavailable",
          message: `Could not connect to the Superhero API: ${fetchError.message}`
        });
      }
      
      if (!response.ok) {
        const error: any = new Error(`API HTTP Error: ${response.status} ${response.statusText}`);
        error.response = { status: response.status, statusText: response.statusText };
        throw error;
      }
      
      // Try parsing the successful response
      try {
        const data = await response.json();

        // Only log full responses for non-suggestion queries to reduce console noise
        if (!isAutoSuggestion) {
          logger.debug('API Response:', JSON.stringify(data, null, 2));
        }

        // Validate response data against our schema to ensure type safety
        const validatedData = await searchResponseSchema.parseAsync(data);

        if (isTestingExpiry) {
          const mockResponse: SearchResponse = {
            response: "success",
            "results-for": query,
            results: [
              {
                id: `test-${Date.now()}`,
                name: query,
                powerstats: { intelligence: "50", strength: "50", speed: "50", durability: "50", power: "50", combat: "50" },
                image: { url: "https://via.placeholder.com/150" },
              },
            ],
          };
          logger.debug(`Setting test search entry with ${customTtl}ms TTL for: ${query}`);
          searchCache.set(cacheKey, mockResponse, customTtl);
          if (customTtl <= 2000) {
            await new Promise((resolve) => setTimeout(resolve, customTtl * 1.5));
          }
          return res.json(mockResponse);
        }

        if (validatedData.response === 'error') {
          return res.status(404).json({ 
            error: "No Results Found", 
            message: validatedData.error || `No superheroes match the search query: "${query}"`,
            code: 404
          });
        }

        if (query.length >= 3) {
          const ttl = isAutoSuggestion ? appConfig.cache.suggestionTtl : undefined;
          searchCache.set(cacheKey, validatedData, ttl);
        }

        return res.json(validatedData); // Explicit return
      } catch (parseError: any) {
        logger.error('Error parsing search API response:', parseError);
        return res.status(502).json({
          error: "Invalid API response",
          message: "Failed to parse the search response from the Superhero API."
        });
      }
    } catch (error: any) {
      handleApiError(res, error, "search", query as string);
    }
  });
  
  /**
   * GET /api/cleanup
   * * Manually triggers a cache cleanup with the specified sampling parameters
   * This is primarily for testing and debugging purposes
   * * @param sampleSize Percentage of cache to check (0-1), defaults to 0.2 (20%)
   * @param minSample Minimum number of items to check regardless of percentage
   * @param maxSample Maximum number of items to check at once
   * @returns Statistics about the cleanup operation
   */
  app.get("/api/cleanup", (req, res) => {
    try {
      const sampleSize = req.query.sampleSize ? parseFloat(req.query.sampleSize as string) : 0.2;
      const minSample = req.query.minSample ? parseInt(req.query.minSample as string) : 10;
      const maxSample = req.query.maxSample ? parseInt(req.query.maxSample as string) : 1000;
      
      // Validate parameters
      if (isNaN(sampleSize) || sampleSize <= 0 || sampleSize > 1) {
        return res.status(400).json({ error: "sampleSize must be between 0 and 1" });
      }
      if (isNaN(minSample) || minSample < 0) {
        return res.status(400).json({ error: "minSample must be a positive integer" });
      }
      if (isNaN(maxSample) || maxSample < 1) {
        return res.status(400).json({ error: "maxSample must be a positive integer greater than 0" });
      }
      
      // Perform the cleanup with sampling
      const heroRemoved = heroCache.cleanup(sampleSize, minSample, maxSample);
      const searchRemoved = searchCache.cleanup(sampleSize, minSample, maxSample);
      
      res.json({
        success: true,
        timestamp: Date.now(),
        cleaned: {
          hero: heroRemoved,
          search: searchRemoved,
          total: heroRemoved + searchRemoved
        },
        params: {
          sampleSize,
          minSample,
          maxSample
        },
        stats: {
          hero: heroCache.getStats(),
          search: searchCache.getStats()
        }
      });
    } catch (error: any) {
      logger.error('Cache cleanup error:', error);
      res.status(500).json({ 
        error: "Cache Cleanup Failed", 
        message: error.message || "Failed to perform cache cleanup operation",
        code: 500
      });
    }
  });

  /**
   * GET /api/test-error/:type
   * * Test endpoint that triggers different types of errors
   * Used to demonstrate the enhanced error handler functionality
   * * @param type The type of error to simulate (client, server, validation, api)
   * @returns Always throws an error of the specified type
   */
  app.get("/api/test-error/:type", (req, res, next) => {
    const { type } = req.params;
    
    try {
      switch (type) {
        case 'client':
          // 400 Bad Request - Simulate a client error
          const clientError = new Error("Invalid client request parameters");
          (clientError as any).status = 400;
          throw clientError;
          
        case 'server':
          // 500 Internal Server Error - Simulate a server error
          throw new Error("Simulated server error with stack trace");
          
        case 'validation':
          // Simulate a Zod validation error
          throw new ZodError([{
            code: "invalid_type",
            expected: "string",
            received: "number", 
            path: ["name"],
            message: "Expected string, received number"
          }]);
          
        case 'api':
          // Simulate an API response error
          const apiError = new Error("Superhero API error");
          (apiError as any).response = {
            error: "character with given name not found",
            response: "error"
          };
          (apiError as any).status = 404;
          throw apiError;
          
        default:
          // Generic error
          throw new Error("Unknown error type");
      }
    } catch (error) {
      // Pass error to the global error handler
      next(error);
    }
  });

  // Start the cache cleanup schedule
  scheduleCacheCleanup();

  /**
   * Create an HTTP server from the Express app
   * This is needed to attach the WebSocket server
   */
  const httpServer = createServer(app);
  
  /**
   * WebSocket Server Setup
   * * Provides real-time updates for cache statistics and other dynamic data
   * Uses the same HTTP server as the REST API but with a different path
   * NOTE: We use '/ws' path to avoid conflicts with Vite's HMR websocket
   */
  logger.info('Setting up WebSocket server on path: /ws');
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Verify client origin for increased security
    verifyClient: (info, callback) => {
      const origin = info.origin || '';
      const isOriginAllowed = validateOrigin(origin);
      
      if (!isOriginAllowed) {
        logger.warn(`WebSocket connection rejected. Invalid origin: ${origin}`);
        return callback(false, 403, 'Origin not allowed');
      }
      
      logger.info(`WebSocket connection accepted from origin: ${origin || 'No Origin'}`);
      return callback(true);
    }
  });
  
  logger.info('WebSocket server initialized');
  
  /**
   * Validates if a connection origin is allowed
   * Helps prevent cross-site WebSocket hijacking attacks
   * * @param origin The origin header from the connection request
   * @returns Boolean indicating if the origin is permitted
   */
  function validateOrigin(origin: string): boolean {
    try {
      // Empty origin is allowed for non-browser clients
      if (!origin) return true;
      
      // Check against allowed origins patterns
      const isAllowed = ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
      
      if (isAllowed) {
        logger.debug(`Origin '${origin}' matched allowed pattern`);
      } else {
        logger.warn(`Origin '${origin}' did not match any allowed patterns`);
      }
      
      return isAllowed;
    } catch (error) {
      logger.error('Origin validation error:', error);
      return false;
    }
  }
  
  /**
   * WebSocket connection handler
   * Manages client connections, messages, and disconnections
   */
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    logger.info(`WebSocket client connected from ${clientIp}`);
    
    // Set a connection timeout to clean up idle/zombie connections
    const connectionTimeout = setTimeout(() => {
      logger.info('WebSocket connection timeout - closing inactive socket');
      ws.terminate();
    }, 30 * 60 * 1000); // 30 minute timeout
    
    // Send a welcome message with connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connection', 
      message: 'Connected to Superhero API WebSocket',
      timestamp: Date.now()
    }));
    
    /**
     * Message handler for client requests
     * Supports different message types for various real-time features
     */
    ws.on('message', (message) => {
      try {
        // Validate the message is valid JSON and has a limited size
        const messageStr = message.toString();
        if (messageStr.length > 10000) {
          throw new Error('Message too large');
        }
        
        const parsedMessage = JSON.parse(messageStr);
        
        // Validate message structure
        if (!parsedMessage || typeof parsedMessage !== 'object' || !parsedMessage.type) {
          throw new Error('Invalid message format');
        }
        
        logger.debug('Received message type:', parsedMessage.type);
        
        // Simple ping-pong functionality for connection testing
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now(),
            received: parsedMessage.timestamp // Echo back the client timestamp if provided
          }));
          
          // Reset connection timeout on activity
          clearTimeout(connectionTimeout);
        } else if (parsedMessage.type === 'get-stats') { // Handle explicit request for stats
          const stats = {
            type: 'cache-stats',
            timestamp: Date.now(),
            hero: heroCache.getStats(),
            search: searchCache.getStats()
          };
          ws.send(JSON.stringify(stats));
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
        
        // Send error response to client
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: Date.now()
          }));
        } catch (sendError) {
          logger.error('Failed to send error response:', sendError);
        }
      }
    });
    
    /**
     * Disconnection handler
     * Cleans up resources when clients disconnect
     */
    ws.on('close', (code, reason) => {
      logger.info(`WebSocket client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      clearTimeout(connectionTimeout);
    });
    
    // Handle connection errors
    ws.on('error', (err) => {
      logger.error('WebSocket connection error:', err);
      clearTimeout(connectionTimeout);
    });
  });
  
  /**
   * Periodic cache statistics broadcaster
   * * Sends updated cache statistics to all connected clients every minute
   * This enables real-time dashboard updates without polling the API
   */
  setInterval(() => {
    // Prepare stats payload with current timestamp
    const stats = {
      type: 'cache-stats',
      timestamp: Date.now(),
      hero: heroCache.getStats(),
      search: searchCache.getStats()
    };
    
    // Broadcast to all connected clients that are ready to receive messages
    wss.clients.forEach((client) => {
      // Use WS_OPEN constant instead of WebSocket.OPEN to prevent type issues
      if (client.readyState === WS_OPEN) {
        try {
          client.send(JSON.stringify(stats));
        } catch (error) {
          logger.error('Error sending stats to client:', error);
        }
      }
    });
  }, 60 * 1000); // Every minute
  
  return httpServer;
}