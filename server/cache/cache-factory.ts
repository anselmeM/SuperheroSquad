import { CacheService } from './interfaces';
import { InMemoryCacheProvider } from './in-memory-provider';
import { Superhero, SearchResponse } from '@shared/schema';

/**
 * Factory class for managing cache instances
 * Provides centralized access to different cache services
 */
export class CacheFactory {
  private static heroCache: CacheService<Superhero>;
  private static searchCache: CacheService<SearchResponse>;
  
  /**
   * Get the hero cache instance
   * @param ttl Optional TTL override for the cache
   */
  static getHeroCache(ttl?: number): CacheService<Superhero> {
    if (!this.heroCache) {
      // 12 hours TTL for hero details by default
      this.heroCache = new InMemoryCacheProvider<Superhero>(ttl || 12 * 60 * 60 * 1000);
    }
    return this.heroCache;
  }
  
  /**
   * Get the search cache instance
   * @param ttl Optional TTL override for the cache
   */
  static getSearchCache(ttl?: number): CacheService<SearchResponse> {
    if (!this.searchCache) {
      // 30 minutes TTL for search results by default
      this.searchCache = new InMemoryCacheProvider<SearchResponse>(ttl || 30 * 60 * 1000);
    }
    return this.searchCache;
  }
  
  /**
   * Schedule cleanup for all caches using sampling strategy
   * @param interval Cleanup interval in milliseconds (default: 1 hour)
   * @param sampleSize Percentage of cache to check (0-1), defaults to 0.2 (20%)
   * @param minSample Minimum number of items to check regardless of percentage
   * @param maxSample Maximum number of items to check at once
   */
  static scheduleCacheCleanup(
    interval = 60 * 60 * 1000, 
    sampleSize = 0.2, 
    minSample = 10, 
    maxSample = 1000
  ): NodeJS.Timeout {
    return setInterval(() => {
      let totalCleaned = 0;
      
      if (this.heroCache) {
        totalCleaned += this.heroCache.cleanup(sampleSize, minSample, maxSample);
      }
      
      if (this.searchCache) {
        totalCleaned += this.searchCache.cleanup(sampleSize, minSample, maxSample);
      }
      
      if (totalCleaned > 0) {
        console.log(`Cache cleanup: Removed ${totalCleaned} expired entries (sampling ${Math.round(sampleSize * 100)}% of cache)`);
      }
    }, interval);
  }

  static getHeroCacheKey(id: string): string {
    return `hero:${id}`;
  }

  static getSearchCacheKey(query: string): string {
    return `search:${query}`;
  }
}