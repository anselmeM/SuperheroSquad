/**
 * Generic cache item with data and expiry time
 */
export interface CacheItem<T> {
  data: T;
  expiry: number;
}

/**
 * Statistics for cache performance tracking
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Abstract interface for cache implementations
 * Defines the contract that any cache provider must implement
 */
export interface CacheService<T> {
  /**
   * Retrieve an item from the cache
   * @param key - Unique identifier for the cached item
   * @returns The cached data or undefined if not found or expired
   */
  get(key: string): T | undefined;
  
  /**
   * Store an item in the cache
   * @param key - Unique identifier for the item
   * @param data - The data to cache
   * @param ttl - Time to live in milliseconds (optional)
   */
  set(key: string, data: T, ttl?: number): void;
  
  /**
   * Remove an item from the cache
   * @param key - Unique identifier for the cached item
   */
  delete(key: string): void;
  
  /**
   * Remove all items from the cache
   */
  clear(): void;
  
  /**
   * Get the number of items in the cache
   */
  size(): number;
  
  /**
   * Remove expired items from the cache
   * @returns Number of items removed
   */
  cleanup(): number;
  
  /**
   * Get cache statistics
   * @returns Object containing cache statistics
   */
  getStats(): CacheStats;
}