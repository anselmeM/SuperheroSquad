/**
 * Main cache module
 * Re-exports all the cache functionality from the cache directory
 */

export * from './cache/interfaces';
export * from './cache/in-memory-provider';
export * from './cache/cache-factory';

// Export pre-configured instances for backward compatibility
import { CacheFactory } from './cache/cache-factory';

export const heroCache = CacheFactory.getHeroCache();
export const searchCache = CacheFactory.getSearchCache();