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

// API configuration
const API_TOKEN = process.env.SUPERHERO_API_TOKEN;
if (!API_TOKEN) {
  throw new Error("SUPERHERO_API_TOKEN environment variable is not set. Please set it to a valid Superhero API token.");
}
const API_BASE_URL = "https://superheroapi.com/api.php";

// Allowed WebSocket origins (these are validated on connection)
const ALLOWED_ORIGINS = [
  // Allow connections from the same server
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  // Allow Replit domains
  /^https?:\/\/.*\.replit\.app$/,
  /^https?:\/\/.*\.repl\.co$/,
  /^https?:\/\/.*\.picard\.replit\.dev$/
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
      
      // Fetch from external API
      const response = await fetch(`${API_BASE_URL}/${API_TOKEN}/${id}`);
      const data = await response.json();

      if (data.response === 'error') {
        return res.status(404).json({ error: data.error || 'Hero not found' });
      }

      // Validate response data against our schema to ensure type safety
      const validatedData = await superheroSchema.parseAsync(data);
      
      // Cache the validated result for future requests (12 hour TTL by default)
      heroCache.set(cacheKey, validatedData);
      
      res.json(validatedData);
    } catch (error) {
      console.error('Hero details error:', error);
      if (error instanceof ZodError) {
        // Handle schema validation errors separately for better debugging
        res.status(500).json({ error: "Invalid API response format", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to fetch hero details" });
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
      
      // Fetch from external API
      const response = await fetch(`${API_BASE_URL}/${API_TOKEN}/search/${encodeURIComponent(query)}`);
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
        
        return res.status(404).json({ error: validatedData.error || 'No results found' });
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

      res.json(validatedData);
    } catch (error) {
      console.error('Search error:', error);
      if (error instanceof ZodError) {
        // Handle schema validation errors separately for better debugging
        res.status(500).json({ error: "Invalid API response format", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to fetch superhero data" });
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
    } catch (error) {
      console.error('Cache cleanup error:', error);
      res.status(500).json({ error: "Failed to perform cache cleanup" });
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
      
      return callback(true);
    }
  });
  
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
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(stats));
      }
    });
  }, 60 * 1000); // Every minute
  
  return httpServer;
}