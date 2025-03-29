/**
 * API Routes Module
 * 
 * This module defines all the API endpoints for the superhero application.
 * It includes endpoints for searching heroes, fetching hero details, and retrieving cache statistics.
 * The module also sets up WebSocket connections for real-time updates.
 * 
 * Features:
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

// Make sure WebSocket.OPEN is defined (fixing potential issues with type imports)
const WS_OPEN = WebSocket.OPEN;

// API configuration
const API_TOKEN = process.env.SUPERHERO_API_TOKEN;
if (!API_TOKEN) {
  throw new Error("SUPERHERO_API_TOKEN environment variable is not set. Please set it to a valid Superhero API token.");
}
const API_BASE_URL = "https://superheroapi.com/api.php";

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
  /^https?:\/\/[a-zA-Z0-9-]+-[a-zA-Z0-9-]+-[a-zA-Z0-9-]+\.replit\.app$/
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
   * 
   * Returns current cache statistics including size, hits, misses, and hit rate
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
   * 
   * Retrieves detailed information about a specific superhero by ID
   * Uses caching to improve performance for frequently accessed heroes
   * 
   * @param id The superhero ID to retrieve
   * @returns Complete superhero object with all available information
   */
  app.get("/api/hero/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cacheKey = `hero:${id}`;
      
      // Try to get from cache first
      const cachedData = heroCache.get(cacheKey) as Superhero | undefined;
      
      if (cachedData) {
        console.log(`Cache HIT for hero:${id}`);
        return res.json(cachedData);
      }
      
      console.log(`Cache MISS for hero:${id}, fetching from API`);
      
      // Declare response outside try block
      let response: Response;
      
      try {
        // Fetch from external API - Wrapped in try...catch for network errors
        response = await fetch(`${API_BASE_URL}/${API_TOKEN}/${id}`);
      } catch (fetchError: any) {
        // Handle network/fetch specific errors
        console.error(`Workspace Error for hero ${id}:`, fetchError);
        return res.status(503).json({
          error: "Service Unavailable",
          message: `Could not connect to the Superhero API: ${fetchError.message}`
        });
      }
      
      // Check for HTTP error status codes from the external API
      if (!response.ok) {
        const statusCode = response.status;
        const statusText = response.statusText || await response.text().catch(() => "Unknown error"); // Read body for potential error message
        
        console.error(`API HTTP Error: ${statusCode} ${statusText}`);
        
        // Map external API status codes to appropriate client responses
        // 404 -> 404 Not Found
        // 401/403 -> 502 Bad Gateway (API key issues)
        // 429 -> 503 Service Unavailable (rate limiting)
        // Other -> 502 Bad Gateway
        if (statusCode === 404) {
          return res.status(404).json({ 
            error: "Hero Not Found", 
            message: `No superhero found with ID: ${id}` 
          });
        } else if (statusCode === 401 || statusCode === 403) {
          return res.status(502).json({ 
            error: "API Authentication Error", 
            message: "Could not authenticate with the Superhero API. The API key may be invalid or expired."
          });
        } else if (statusCode === 429) {
          return res.status(503).json({ 
            error: "API Rate Limit Exceeded", 
            message: "The Superhero API rate limit has been exceeded. Please try again later."
          });
        } else {
          return res.status(502).json({ 
            error: "External API Error", 
            message: `The Superhero API returned an error: ${statusCode} ${statusText}`
          });
        }
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
        console.error('Error parsing API response:', parseError);
        // Handle JSON parsing errors specifically
        return res.status(502).json({
          error: "Invalid API response",
          message: "Failed to parse the response from the Superhero API."
        });
      }
    } catch (error: any) {
      console.error('Hero details error:', error);
      
      if (error instanceof ZodError) {
        // If the API response doesn't match our schema, it's a Bad Gateway (502)
        // This indicates the upstream server (Superhero API) sent an invalid response
        res.status(502).json({ 
          error: "Invalid API response format", 
          message: "The upstream API returned a malformed response",
          details: error.errors 
        });
      } else if (error instanceof TypeError && error.message?.includes('fetch')) {
        // Network errors (cannot connect to API)
        res.status(503).json({ 
          error: "Service Unavailable", 
          message: "Could not connect to the Superhero API" 
        });
      } else if (error.response) {
        // The API returned an error with a status code
        const statusCode = error.response.status || 502;
        res.status(statusCode).json({ 
          error: "External API error", 
          message: error.message || "Error from Superhero API",
          details: error.response
        });
      } else {
        // Unexpected errors get 500 status
        res.status(500).json({ 
          error: "Internal Server Error", 
          message: "An unexpected error occurred while processing your request"
        });
      }
    }
  });

  /**
   * GET /api/search
   * 
   * Searches for superheroes matching the provided query
   * Implements caching strategies based on query length
   * Optimizes auto-suggestion requests for better performance
   * 
   * @param query The search term to look for
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
      const cacheKey = `search:${query}`;
      
      // Determine if we're testing expiry (for demonstration/testing purposes)
      const isTestingExpiry = expire === 'true';
      
      // Parse custom TTL if provided
      const customTtl = ttl ? parseInt(ttl as string) : 1000; // Default to 1 second for testing
      
      // Use cache for queries of sufficient length (to avoid cache churn)
      if (query.length >= 3 && !isTestingExpiry) {
        const cachedData = searchCache.get(cacheKey) as SearchResponse | undefined;
        
        if (cachedData) {
          console.log(`Cache HIT for search:${query}`);
          return res.json(cachedData);
        }
      }
      
      console.log(`Cache MISS for search:${query}, fetching from API`);
      
      // Declare response outside try block
      let response: Response;
      
      try {
        // Fetch from external API - Wrapped in try...catch for network errors
        response = await fetch(`${API_BASE_URL}/${API_TOKEN}/search/${encodeURIComponent(query)}`);
      } catch (fetchError: any) {
        // Handle network/fetch specific errors
        console.error(`Workspace Error for search "${query}":`, fetchError);
        return res.status(503).json({
          error: "Service Unavailable",
          message: `Could not connect to the Superhero API: ${fetchError.message}`
        });
      }
      
      // Check for HTTP error status codes from the external API
      if (!response.ok) {
        const statusCode = response.status;
        const statusText = response.statusText || await response.text().catch(() => "Unknown error");
        
        console.error(`Search API HTTP Error: ${statusCode} ${statusText} for query: "${query}"`);
        
        // Map external API status codes to appropriate client responses
        // 404 -> 404 Not Found (expected for search with no results)
        // 401/403 -> 502 Bad Gateway (API key issues)
        // 429 -> 503 Service Unavailable (rate limiting)
        // Other -> 502 Bad Gateway
        if (statusCode === 404) {
          return res.status(404).json({ 
            error: "No Results Found", 
            message: `No superheroes match the search query: "${query}"`
          });
        } else if (statusCode === 401 || statusCode === 403) {
          return res.status(502).json({ 
            error: "API Authentication Error", 
            message: "Could not authenticate with the Superhero API. The API key may be invalid or expired."
          });
        } else if (statusCode === 429) {
          return res.status(503).json({ 
            error: "API Rate Limit Exceeded", 
            message: "The Superhero API rate limit has been exceeded. Please try again later."
          });
        } else {
          return res.status(502).json({ 
            error: "External API Error", 
            message: `The Superhero API returned an error: ${statusCode} ${statusText}`
          });
        }
      }
      
      // Try parsing the successful response
      try {
        const data = await response.json();

        // Only log full responses for non-suggestion queries to reduce console noise
        if (!isAutoSuggestion) {
          console.log('API Response:', JSON.stringify(data, null, 2));
        }

        // Validate response data against our schema to ensure type safety
        const validatedData = await searchResponseSchema.parseAsync(data);

        // Handle API error responses
        if (validatedData.response === 'error') {
          if (isTestingExpiry) {
            // For testing expired cache entries, create a mock response
            const mockResponse: SearchResponse = {
              response: "success",
              "results-for": query,
              results: [
                {
                  id: `test-${Date.now()}`,
                  name: query,
                  powerstats: {
                    intelligence: "50",
                    strength: "50",
                    speed: "50",
                    durability: "50",
                    power: "50",
                    combat: "50"
                  },
                  image: {
                    url: "https://via.placeholder.com/150"
                  }
                }
              ]
            };
            
            // Set custom TTL for testing cleanup
            console.log(`Setting test search entry with ${customTtl}ms TTL for: ${query}`);
            searchCache.set(cacheKey, mockResponse, customTtl);
            
            // For very short TTLs, wait to ensure expiry
            if (customTtl <= 2000) {
              // Wait 1.5x the TTL to ensure expiry
              await new Promise(resolve => setTimeout(resolve, customTtl * 1.5));
            }
            
            return res.json(mockResponse);
          }
          
          return res.status(404).json({ 
            error: "No Results Found", 
            message: validatedData.error || `No superheroes match the search query: "${query}"`,
            code: 404
          });
        }

        // Cache strategy based on query length
        if (query.length >= 3) {
          // If testing expiry, use a custom TTL
          if (isTestingExpiry) {
            console.log(`Setting test search entry with ${customTtl}ms TTL for: ${query}`);
            searchCache.set(cacheKey, validatedData, customTtl);
            
            // For very short TTLs, wait to ensure expiry
            if (customTtl <= 2000) {
              // Wait 1.5x the TTL to ensure expiry
              await new Promise(resolve => setTimeout(resolve, customTtl * 1.5));
            }
          } else {
            // Normal operation: Shorter TTL for auto-suggestions since they change frequently
            const ttl = query.length < 4 ? 10 * 60 * 1000 : undefined; // 10 minutes for short queries
            searchCache.set(cacheKey, validatedData, ttl);
          }
        }

        return res.json(validatedData); // Explicit return
      } catch (parseError: any) {
        console.error('Error parsing search API response:', parseError);
        return res.status(502).json({
          error: "Invalid API response",
          message: "Failed to parse the search response from the Superhero API."
        });
      }
    } catch (error: any) {
      console.error('Search error:', error);
      
      if (error instanceof ZodError) {
        // If the API response doesn't match our schema, it's a Bad Gateway (502)
        // This indicates the upstream server (Superhero API) sent a response that doesn't match our expectations
        res.status(502).json({ 
          error: "Invalid API response format", 
          message: "The Superhero API returned data in an unexpected format",
          details: error.errors 
        });
      } else if (error instanceof TypeError && error.message?.includes('fetch')) {
        // Network errors (cannot connect to API)
        res.status(503).json({ 
          error: "Service Unavailable", 
          message: "Could not connect to the Superhero API at this time"
        });
      } else if (error.response) {
        // The API returned an error with a status code
        const statusCode = error.response.status || 502;
        res.status(statusCode).json({ 
          error: "External API error", 
          message: error.message || "Error from Superhero API",
          details: error.response
        });
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        // DNS or connection errors
        res.status(503).json({ 
          error: "Service Unavailable", 
          message: "Connection to external API failed",
          code: error.code
        });
      } else {
        // Unexpected errors get 500 status
        res.status(500).json({ 
          error: "Internal Server Error", 
          message: "An unexpected error occurred while searching for superheroes"
        });
      }
    }
  });
  
  /**
   * GET /api/cleanup
   * 
   * Manually triggers a cache cleanup with the specified sampling parameters
   * This is primarily for testing and debugging purposes
   * 
   * @param sampleSize Percentage of cache to check (0-1), defaults to 0.2 (20%)
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
      console.error('Cache cleanup error:', error);
      res.status(500).json({ 
        error: "Cache Cleanup Failed", 
        message: error.message || "Failed to perform cache cleanup operation",
        code: 500
      });
    }
  });

  /**
   * GET /api/test-error/:type
   * 
   * Test endpoint that triggers different types of errors
   * Used to demonstrate the enhanced error handler functionality
   * 
   * @param type The type of error to simulate (client, server, validation, api)
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
   * 
   * Provides real-time updates for cache statistics and other dynamic data
   * Uses the same HTTP server as the REST API but with a different path
   * NOTE: We use '/ws' path to avoid conflicts with Vite's HMR websocket
   */
  console.log('Setting up WebSocket server on path: /ws');
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Verify client origin for increased security
    verifyClient: (info, callback) => {
      const origin = info.origin || '';
      const isOriginAllowed = validateOrigin(origin);
      
      if (!isOriginAllowed) {
        console.warn(`WebSocket connection rejected. Invalid origin: ${origin}`);
        return callback(false, 403, 'Origin not allowed');
      }
      
      console.log(`WebSocket connection accepted from origin: ${origin || 'No Origin'}`);
      return callback(true);
    }
  });
  
  console.log('WebSocket server initialized');
  
  /**
   * Validates if a connection origin is allowed
   * Helps prevent cross-site WebSocket hijacking attacks
   * 
   * @param origin The origin header from the connection request
   * @returns Boolean indicating if the origin is permitted
   */
  function validateOrigin(origin: string): boolean {
    try {
      // Empty origin is allowed for non-browser clients
      if (!origin) return true;
      
      // Check against allowed origins patterns
      return ALLOWED_ORIGINS.some(pattern => pattern.test(origin));
    } catch (error) {
      console.error('Origin validation error:', error);
      return false;
    }
  }
  
  /**
   * WebSocket connection handler
   * Manages client connections, messages, and disconnections
   */
  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress || 'unknown';
    console.log(`WebSocket client connected from ${clientIp}`);
    
    // Set a connection timeout to clean up idle/zombie connections
    const connectionTimeout = setTimeout(() => {
      console.log('WebSocket connection timeout - closing inactive socket');
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
        
        console.log('Received message type:', parsedMessage.type);
        
        // Simple ping-pong functionality for connection testing
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now(),
            received: parsedMessage.timestamp // Echo back the client timestamp if provided
          }));
          
          // Reset connection timeout on activity
          clearTimeout(connectionTimeout);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        
        // Send error response to client
        try {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            timestamp: Date.now()
          }));
        } catch (sendError) {
          console.error('Failed to send error response:', sendError);
        }
      }
    });
    
    /**
     * Disconnection handler
     * Cleans up resources when clients disconnect
     */
    ws.on('close', (code, reason) => {
      console.log(`WebSocket client disconnected. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      clearTimeout(connectionTimeout);
    });
    
    // Handle connection errors
    ws.on('error', (err) => {
      console.error('WebSocket connection error:', err);
      clearTimeout(connectionTimeout);
    });
  });
  
  /**
   * Periodic cache statistics broadcaster
   * 
   * Sends updated cache statistics to all connected clients every minute
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
          console.error('Error sending stats to client:', error);
        }
      }
    });
  }, 60 * 1000); // Every minute
  
  return httpServer;
}