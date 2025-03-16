import type { Express } from "express";
import { createServer, type Server } from "http";
import { searchResponseSchema } from "@shared/schema";
import { ZodError } from "zod";

const API_TOKEN = process.env.SUPERHERO_API_TOKEN || "e2f8ee39a6603445c2dd55dd9d8ab2d4";
const API_BASE_URL = "https://superheroapi.com/api";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }

      const response = await fetch(`${API_BASE_URL}/${API_TOKEN}/search/${encodeURIComponent(query)}`);
      const data = await response.json();
      
      // Validate response data
      const validatedData = await searchResponseSchema.parseAsync(data);
      res.json(validatedData);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(500).json({ error: "Invalid API response format" });
      } else {
        res.status(500).json({ error: "Failed to fetch superhero data" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
