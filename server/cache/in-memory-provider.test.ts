import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryCacheProvider } from './in-memory-provider';

describe('InMemoryCacheProvider', () => {
  let cache: InMemoryCacheProvider<string>;
  
  beforeEach(() => {
    // Create a new cache instance before each test
    cache = new InMemoryCacheProvider<string>(1000); // 1 second TTL for faster testing
  });
  
  it('should store and retrieve cache items', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });
  
  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });
  
  it('should track cache hits and misses', () => {
    cache.set('key1', 'value1');
    
    // Access the key once (hit)
    cache.get('key1');
    
    // Access a non-existent key (miss)
    cache.get('nonexistent');
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });
  
  it('should expire items after TTL', async () => {
    cache.set('key1', 'value1', 50); // 50ms TTL
    
    // Should be available immediately
    expect(cache.get('key1')).toBe('value1');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Should be expired now
    expect(cache.get('key1')).toBeUndefined();
  });
  
  it('should properly clear the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.clear();
    
    expect(cache.size()).toBe(0);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    
    // Stats should be reset too
    const stats = cache.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(2); // From the two gets above
  });
  
  it('should delete specific cache items', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.delete('key1');
    
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });
  
  describe('cleanup', () => {
    it('should remove expired items using sampling', async () => {
      // Mock the current time
      const now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      
      // Add 100 items with varied expiry times
      for (let i = 0; i < 100; i++) {
        // Every third item will be expired
        const ttl = i % 3 === 0 ? -100 : 10000; // -100 means already expired
        cache.set(`key${i}`, `value${i}`, ttl);
      }
      
      // We should have 100 items initially
      expect(cache.size()).toBe(100);
      
      // Advance time by 500ms
      vi.spyOn(Date, 'now').mockImplementation(() => now + 500);
      
      // Run cleanup with 100% sampling to ensure all expired items are removed
      const removed = cache.cleanup(1.0);
      
      // We should have removed approximately 33-34 items (every third item)
      // The exact number might vary slightly due to random sampling
      expect(removed).toBeGreaterThanOrEqual(33);
      expect(removed).toBeLessThanOrEqual(34);
      
      // Cache size should be reduced by the number of removed items
      expect(cache.size()).toBe(100 - removed);
    });
    
    it('should respect minSample parameter', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);

      // Add 5 expired items
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`, -100);
      }
      expect(cache.size()).toBe(5);
      
      // Advance time to ensure items are expired
      vi.spyOn(Date, 'now').mockImplementation(() => now + 500);

      // Run cleanup with minimum 10 samples. Since we only have 5 items, all should be checked and removed.
      const removed = cache.cleanup(0.1, 10);
      
      expect(removed).toBe(5);
      expect(cache.size()).toBe(0);
    });
    
    it('should respect maxSample parameter', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);

      // Add 100 expired items
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`, -100);
      }
      expect(cache.size()).toBe(100);
      
      // Advance time to ensure items are expired
      vi.spyOn(Date, 'now').mockImplementation(() => now + 500);

      // Run cleanup with max 15 samples
      const removed = cache.cleanup(0.2, 5, 15);

      // Check that we only removed at most 15 items
      expect(removed).toBeLessThanOrEqual(15);
      expect(cache.size()).toBe(100 - removed);
    });

    it('should not affect cache stats during cleanup', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);

      // Add 10 expired items
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`, -100);
      }

      // Get initial stats. Note: set() does not affect stats
      const initialStats = cache.getStats();
      expect(initialStats.misses).toBe(0);

      // Advance time to ensure items are expired
      vi.spyOn(Date, 'now').mockImplementation(() => now + 500);
      
      // Run cleanup
      cache.cleanup(1.0);
      
      // Get final stats
      const finalStats = cache.getStats();
      
      // The number of misses should NOT have changed
      expect(finalStats.misses).toBe(initialStats.misses);
    });
    
    it('should handle empty cache gracefully', () => {
      const removed = cache.cleanup();
      expect(removed).toBe(0);
    });
  });
});