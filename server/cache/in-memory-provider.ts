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
   * Clean expired items from the cache
   * @returns Number of items removed
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    
    // Use forEach to avoid iterator issues
    this.cache.forEach((item, key) => {
      if (now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    });
    
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