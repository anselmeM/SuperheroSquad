import { z } from "zod";

/**
 * Shared schema definitions for the Superhero API
 * 
 * This file contains all the Zod schemas for the various data models used in the application.
 * These schemas serve multiple purposes:
 * 1. Type definitions for TypeScript
 * 2. Runtime validation for API responses
 * 3. Documentation of the data structure
 * 
 * Note: The Superhero API returns power stats as strings (e.g., "80" instead of 80),
 * so we need to handle both strings and numbers in our schema definitions.
 */

// Superhero API response schemas
/**
 * Schema for superhero power statistics
 * 
 * The API sometimes returns these values as strings (e.g., "80") and sometimes as numbers (80).
 * We use z.union to accept both formats to handle API inconsistencies.
 */
export const powerStatsSchema = z.object({
  intelligence: z.union([z.number(), z.string()]),
  strength: z.union([z.number(), z.string()]),
  speed: z.union([z.number(), z.string()]),
  durability: z.union([z.number(), z.string()]),
  power: z.union([z.number(), z.string()]),
  combat: z.union([z.number(), z.string()])
});

/**
 * Schema for superhero biography information
 * Contains personal details and origin information of the superhero
 */
export const biographySchema = z.object({
  "full-name": z.string(),
  "alter-egos": z.string(),
  "aliases": z.array(z.string()),
  "place-of-birth": z.string(),
  "first-appearance": z.string(),
  "publisher": z.string(),
  "alignment": z.string() // good, bad, neutral
});

/**
 * Schema for superhero physical appearance
 * Details about the superhero's physical characteristics
 */
export const appearanceSchema = z.object({
  "gender": z.string(),
  "race": z.string(),
  "height": z.array(z.string()), // Array containing both metric and imperial units
  "weight": z.array(z.string()), // Array containing both metric and imperial units
  "eye-color": z.string(),
  "hair-color": z.string()
});

/**
 * Schema for superhero occupation information
 * Details about where and how they work
 */
export const workSchema = z.object({
  "occupation": z.string(),
  "base": z.string() // Base of operations
});

/**
 * Schema for superhero relationships
 * Information about their affiliations and family members
 */
export const connectionsSchema = z.object({
  "group-affiliation": z.string(), // Teams or organizations they belong to
  "relatives": z.string() // Family members and relationships
});

/**
 * Main schema for a superhero entity
 * Combines all the above schemas to create a complete superhero profile
 * 
 * Note: biography, appearance, work, and connections are marked as optional
 * because some API responses may not include complete information for every hero
 */
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

/**
 * Schema for API search responses
 * Validates the structure of responses from the superhero search API
 * 
 * Fields:
 * - response: "success" or "error"
 * - results: array of superhero objects (optional, present on success)
 * - error: error message (optional, present on error)
 * - results-for: search term that was used (optional)
 */
export const searchResponseSchema = z.object({
  response: z.string(),
  results: z.array(superheroSchema).optional(),
  error: z.string().optional(),
  "results-for": z.string().optional()
});

/**
 * Schema for favorite superheroes
 * A simplified version of the superhero schema that we store in local storage
 * Contains only the essential information needed to identify and display a favorite
 */
export const favoriteSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z.string(),
  addedAt: z.string() // ISO timestamp when the hero was added to favorites
});

export type PowerStats = z.infer<typeof powerStatsSchema>;
export type Biography = z.infer<typeof biographySchema>;
export type Appearance = z.infer<typeof appearanceSchema>;
export type Work = z.infer<typeof workSchema>;
export type Connections = z.infer<typeof connectionsSchema>;
export type Superhero = z.infer<typeof superheroSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type Favorite = z.infer<typeof favoriteSchema>;