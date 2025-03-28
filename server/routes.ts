import type { Express } from "express";
import { createServer, type Server } from "http";
import { searchResponseSchema, superheroSchema } from "@shared/schema";
import { ZodError } from "zod";

const API_TOKEN = process.env.SUPERHERO_API_TOKEN || "e2f8ee39a6603445c2dd55dd9d8ab2d4";
const API_BASE_URL = "https://superheroapi.com/api.php";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/hero/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await fetch(`${API_BASE_URL}/${API_TOKEN}/${id}`);
      const data = await response.json();

      if (data.response === 'error') {
        return res.status(404).json({ error: data.error || 'Hero not found' });
      }

      // Validate response data
      const validatedData = await superheroSchema.parseAsync(data);
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

  const httpServer = createServer(app);
  return httpServer;
}