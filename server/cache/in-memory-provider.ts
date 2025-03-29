import { CacheItem, CacheService, CacheStats } from './interfaces';

/**
 * In-memory implementation of the CacheService interface
 * Uses a Map for storing cache entries with TTL support
 */
export class InMemoryCacheProvider<T> implements CacheService<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private readonly defaultTtl: number;
  private hits: number = 0;
  private misses: number = 0;

  /**
   * @param defaultTtl Default time-to-live in milliseconds
   */
  constructor(defaultTtl = 60 * 60 * 1000) { // Default: 1 hour
    this.defaultTtl = defaultTtl;
  }

  /**
   * Get an item from cache
   * @param key Cache key
   * @returns The cached item or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // Return undefined if item doesn't exist
    if (!item) {
      this.misses++;
      return undefined;
    }
    
    // Check if the item has expired
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }
    
    this.hits++;
    return item.data;
  }

  /**
   * Set an item in the cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Optional custom TTL in milliseconds
   */
  set(key: string, data: T, ttl = this.defaultTtl): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Remove an item from the cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired items from the cache using a sampling strategy.
   * This approach checks only a random subset of the cache keys during each run.
   * 
   * Why sampling? Iterating over the entire cache can be resource-intensive
   * and impact performance, especially with a large number of entries. Sampling
   * provides a good balance between cleanup effectiveness and performance overhead.
   * 
   * Note: Because it's sampling-based, it's probabilistic and might not remove
   * every single expired item immediately upon expiry in one pass, but expired
   * items will eventually be removed on subsequent checks or cleanup runs.
   * This trade-off is acceptable for most caching scenarios as it prevents
   * performance spikes that would occur with full cache iteration.
   * 
   * @param sampleSize Percentage of cache to check (0-1), defaults to 0.2 (20%)
   * @param minSample Minimum number of items to check regardless of percentage
   * @param maxSample Maximum number of items to check at once to prevent excessive CPU usage
   * @returns Number of items removed in this run
   */
  cleanup(sampleSize: number = 0.2, minSample: number = 10, maxSample: number = 1000): number {
    const now = Date.now();
    let count = 0;
    
    // Get all keys from the cache
    const allKeys = Array.from(this.cache.keys());
    const totalKeys = allKeys.length;
    
    // Nothing to cleanup if cache is empty
    if (totalKeys === 0) {
      return 0;
    }
    
    // Determine how many items to check based on parameters
    let keysToCheck = Math.max(
      Math.min(Math.ceil(totalKeys * sampleSize), maxSample),
      Math.min(minSample, totalKeys)
    );
    
    // Randomly sample keys to check
    const selectedKeys: string[] = [];
    
    // If we're checking almost all keys anyway, just use them all
    if (keysToCheck > totalKeys * 0.8) {
      selectedKeys.push(...allKeys);
    } else {
      // Reservoir sampling algorithm for random selection
      for (let i = 0; i < keysToCheck; i++) {
        const randomIndex = Math.floor(Math.random() * totalKeys);
        selectedKeys.push(allKeys[randomIndex]);
      }
    }
    
    // Check selected keys for expiry
    for (const key of selectedKeys) {
      const item = this.cache.get(key);
      if (item && now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    return {
      size: this.size(),
      hits: this.hits,
      misses: this.misses,
      hitRate: totalRequests === 0 ? 0 : this.hits / totalRequests
    };
  }
}