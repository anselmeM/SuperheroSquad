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

export const biographySchema = z.object({
  "full-name": z.string(),
  "alter-egos": z.string(),
  "aliases": z.array(z.string()),
  "place-of-birth": z.string(),
  "first-appearance": z.string(),
  "publisher": z.string(),
  "alignment": z.string()
});

export const appearanceSchema = z.object({
  "gender": z.string(),
  "race": z.string(),
  "height": z.array(z.string()),
  "weight": z.array(z.string()),
  "eye-color": z.string(),
  "hair-color": z.string()
});

export const workSchema = z.object({
  "occupation": z.string(),
  "base": z.string()
});

export const connectionsSchema = z.object({
  "group-affiliation": z.string(),
  "relatives": z.string()
});

export const superheroSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.object({
    url: z.string()
  }),
  powerstats: powerStatsSchema,
  biography: biographySchema.optional(),
  appearance: appearanceSchema.optional(),
  work: workSchema.optional(),
  connections: connectionsSchema.optional()
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
export type Biography = z.infer<typeof biographySchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type Work = z.infer<typeof workSchema>;
export type Connections = z.infer<typeof connectionsSchema>;
export type Superhero = z.infer<typeof superheroSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;