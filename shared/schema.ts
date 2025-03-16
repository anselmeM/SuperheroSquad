import { z } from "zod";

// Superhero API response schemas
export const powerStatsSchema = z.object({
  intelligence: z.number(),
  strength: z.number(),
  speed: z.number(),
  durability: z.number(),
  power: z.number(),
  combat: z.number()
});

export const superheroSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.object({
    url: z.string()
  }),
  powerstats: powerStatsSchema
});

export const searchResponseSchema = z.object({
  results: z.array(superheroSchema).optional(),
  error: z.string().optional()
});

export type PowerStats = z.infer<typeof powerStatsSchema>;
export type Superhero = z.infer<typeof superheroSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
