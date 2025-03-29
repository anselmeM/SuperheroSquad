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

import type { Express } from "express";
import { createServer, type Server } from "http";
import { searchResponseSchema, superheroSchema, type Superhero, type SearchResponse } from "@shared/schema";
import { ZodError } from "zod";
import { heroCache, searchCache } from "./cache";
import { WebSocketServer, WebSocket } from "ws";

// API configuration
const API_TOKEN = process.env.SUPERHERO_API_TOKEN || "e2f8ee39a6603445c2dd55dd9d8ab2d4";
const API_BASE_URL = "https://superheroapi.com/api.php";

/**
 * Cache performance tracking counters
 * Used to calculate hit rates and measure cache effectiveness
 */
let heroHits = 0;
let heroMisses = 0;
let searchHits = 0;
let searchMisses = 0;

/**
 * Schedules periodic cache cleanup to remove expired entries
 * Runs every hour to prevent memory leaks from outdated cached data
 */
function scheduleCacheCleanup() {
  setInterval(() => {
    const heroCleanupCount = heroCache.cleanup();
    const searchCleanupCount = searchCache.cleanup();
    
    if (heroCleanupCount > 0 || searchCleanupCount > 0) {
      console.log(`Cache cleanup: Removed ${heroCleanupCount} hero entries and ${searchCleanupCount} search entries`);
    }
  }, 60 * 60 * 1000); // 1 hour
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
    res.json({
      hero: {
        size: heroCache.size(),
        hits: heroHits,
        misses: heroMisses,
        hitRate: heroHits + heroMisses === 0 ? 0 : heroHits / (heroHits + heroMisses)
      },
      search: {
        size: searchCache.size(),
        hits: searchHits,
        misses: searchMisses,
        hitRate: searchHits + searchMisses === 0 ? 0 : searchHits / (searchHits + searchMisses)
      }
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
        heroHits++;
        console.log(`Cache HIT for hero:${id}`);
        return res.json(cachedData);
      }
      
      heroMisses++;
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
   * @returns Array of superheroes matching the search criteria
   */
  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      // For auto-suggestions, we optimize for speed and reduce logging
      const isAutoSuggestion = query.length < 4;  // Simple heuristic, can be adjusted
      const cacheKey = `search:${query}`;
      
      // Use cache for queries of sufficient length (to avoid cache churn)
      if (query.length >= 3) {
        const cachedData = searchCache.get(cacheKey) as SearchResponse | undefined;
        
        if (cachedData) {
          searchHits++;
          console.log(`Cache HIT for search:${query}`);
          return res.json(cachedData);
        }
      }
      
      searchMisses++;
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
        return res.status(404).json({ error: validatedData.error || 'No results found' });
      }

      // Cache strategy based on query length
      if (query.length >= 3) {
        // Shorter TTL for auto-suggestions since they change frequently
        const ttl = query.length < 4 ? 10 * 60 * 1000 : undefined; // 10 minutes for short queries
        searchCache.set(cacheKey, validatedData, ttl);
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
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  /**
   * WebSocket connection handler
   * Manages client connections, messages, and disconnections
   */
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send a welcome message with connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connection', 
      message: 'Connected to Superhero API WebSocket' 
    }));
    
    /**
     * Message handler for client requests
     * Supports different message types for various real-time features
     */
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);
        
        // Simple ping-pong functionality for connection testing
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: Date.now() 
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    /**
     * Disconnection handler
     * Cleans up resources when clients disconnect
     */
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
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
      hero: {
        size: heroCache.size(),
        hits: heroHits,
        misses: heroMisses,
        hitRate: heroHits + heroMisses === 0 ? 0 : heroHits / (heroHits + heroMisses)
      },
      search: {
        size: searchCache.size(),
        hits: searchHits,
        misses: searchMisses,
        hitRate: searchHits + searchMisses === 0 ? 0 : searchHits / (searchHits + searchMisses)
      }
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