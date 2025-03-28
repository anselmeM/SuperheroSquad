import type { Express } from "express";
import { createServer, type Server } from "http";
import { searchResponseSchema, superheroSchema, type Superhero, type SearchResponse } from "@shared/schema";
import { ZodError } from "zod";
import { heroCache, searchCache } from "./cache";
import { WebSocketServer, WebSocket } from "ws";

const API_TOKEN = process.env.SUPERHERO_API_TOKEN || "e2f8ee39a6603445c2dd55dd9d8ab2d4";
const API_BASE_URL = "https://superheroapi.com/api.php";

// Cache hit/miss counters
let heroHits = 0;
let heroMisses = 0;
let searchHits = 0;
let searchMisses = 0;

// Schedule cache cleanup every hour
function scheduleCacheCleanup() {
  setInterval(() => {
    const heroCleanupCount = heroCache.cleanup();
    const searchCleanupCount = searchCache.cleanup();
    
    if (heroCleanupCount > 0 || searchCleanupCount > 0) {
      console.log(`Cache cleanup: Removed ${heroCleanupCount} hero entries and ${searchCleanupCount} search entries`);
    }
  }, 60 * 60 * 1000); // 1 hour
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Endpoint to get cache stats
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
      
      const response = await fetch(`${API_BASE_URL}/${API_TOKEN}/${id}`);
      const data = await response.json();

      if (data.response === 'error') {
        return res.status(404).json({ error: data.error || 'Hero not found' });
      }

      // Validate response data
      const validatedData = await superheroSchema.parseAsync(data);
      
      // Cache the validated result
      heroCache.set(cacheKey, validatedData);
      
      res.json(validatedData);
    } catch (error) {
      console.error('Hero details error:', error);
      if (error instanceof ZodError) {
        res.status(500).json({ error: "Invalid API response format", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to fetch hero details" });
      }
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      // For auto-suggestions, we want to respond quickly, so we don't log the full response
      const isAutoSuggestion = query.length < 4;  // Simple heuristic, can be adjusted
      const cacheKey = `search:${query}`;
      
      // Try to get from cache first (unless it's an auto-suggestion with 1-2 chars, which changes too frequently)
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
      
      const response = await fetch(`${API_BASE_URL}/${API_TOKEN}/search/${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!isAutoSuggestion) {
        console.log('API Response:', JSON.stringify(data, null, 2));
      }

      // Validate response data
      const validatedData = await searchResponseSchema.parseAsync(data);

      // If the API returns an error response
      if (validatedData.response === 'error') {
        return res.status(404).json({ error: validatedData.error || 'No results found' });
      }

      // Cache the validated result (for queries >= 3 chars)
      if (query.length >= 3) {
        // Set a shorter TTL for short queries (more likely to change)
        const ttl = query.length < 4 ? 10 * 60 * 1000 : undefined; // 10 minutes for short queries
        searchCache.set(cacheKey, validatedData, ttl);
      }

      res.json(validatedData);
    } catch (error) {
      console.error('Search error:', error);
      if (error instanceof ZodError) {
        res.status(500).json({ error: "Invalid API response format", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to fetch superhero data" });
      }
    }
  });

  // Start the cache cleanup schedule
  scheduleCacheCleanup();

  const httpServer = createServer(app);
  
  // Initialize WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    // Send a welcome message
    ws.send(JSON.stringify({ type: 'connection', message: 'Connected to Superhero API WebSocket' }));
    
    // Listen for messages from clients
    ws.on('message', (message) => {
      try {
        const parsedMessage = JSON.parse(message.toString());
        console.log('Received message:', parsedMessage);
        
        // Handle different message types
        if (parsedMessage.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  // Broadcast cache stats to all connected clients every minute
  setInterval(() => {
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
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(stats));
      }
    });
  }, 60 * 1000); // Every minute
  
  return httpServer;
}