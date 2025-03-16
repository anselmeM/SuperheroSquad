import { z } from "zod";

// Superhero API response schemas
export const powerStatsSchema = z.object({
  intelligence: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val) || 0 : val
  ),
  strength: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val) || 0 : val
  ),
  speed: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val) || 0 : val
  ),
  durability: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val) || 0 : val
  ),
  power: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val) || 0 : val
  ),
  combat: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val) || 0 : val
  )
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
  response: z.string(),
  results: z.array(superheroSchema).optional(),
  error: z.string().optional(),
  "results-for": z.string().optional()
});

// Favorites related schemas
export const favoriteSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  addedAt: z.string()
});

export type PowerStats = z.infer<typeof powerStatsSchema>;
export type Superhero = z.infer<typeof superheroSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;