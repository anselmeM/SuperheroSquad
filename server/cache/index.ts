export * from './interfaces';
export * from './in-memory-provider';
export * from './cache-factory';

// Export pre-configured instances for backward compatibility
import { CacheFactory } from './cache-factory';

export const heroCache = CacheFactory.getHeroCache();
export const searchCache = CacheFactory.getSearchCache();