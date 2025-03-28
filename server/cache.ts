interface CacheItem<T> {
  data: T;
  expiry: number;
}

/**
 * Simple in-memory cache with TTL (Time To Live)
 */
export class Cache<T> {
  private cache: Map<string, CacheItem<T>> = new Map();
  private readonly defaultTtl: number;

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
    
    if (!item) {
      return undefined;
    }

    // Check if the item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

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
}

// Create cache instances with different TTLs
export const heroCache = new Cache(12 * 60 * 60 * 1000); // 12 hours for hero details
export const searchCache = new Cache(30 * 60 * 1000); // 30 minutes for search results