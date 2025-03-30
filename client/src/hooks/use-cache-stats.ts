import { useState, useEffect, useRef } from 'react';
import { createLogger } from '@/utils/config';
import { SafeWebSocket } from '@/utils/safe-websocket';

// Create a logger for the cache-stats module
const logger = createLogger('cache-stats');

export interface CacheStatsType {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

interface CacheStatsResponse {
  hero: CacheStatsType;
  search: CacheStatsType;
  timestamp: number;
  type?: string;
}

/**
 * Custom hook to fetch and monitor cache statistics
 * Combines REST API fetching with WebSocket for real-time updates
 * 
 * @returns Current cache statistics and loading state
 */
export function useCacheStats() {
  const [stats, setStats] = useState<CacheStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // Define refs outside useEffect to maintain state across renders
  const socketRef = useRef<SafeWebSocket | null>(null);
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch of stats via REST API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/cache-stats');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch cache stats: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setStats(data);
        setLastUpdated(Date.now());
        setError(null);
      } catch (err) {
        logger.error('Error fetching cache stats:', err);
        setError(err instanceof Error ? err.message : 'Unknown error fetching cache stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Only connect to WebSocket if we're on a client (browser)
    if (typeof window === 'undefined') return;
    
    // Determine WebSocket URL using window.location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    logger.info(`Initializing SafeWebSocket for cache stats: ${wsUrl}`);
    
    // Create the SafeWebSocket instance
    socketRef.current = new SafeWebSocket(wsUrl, {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      autoReconnect: true
    });
    
    // Register message handler
    socketRef.current.onMessage((data) => {
      try {
        if (data.type === 'cache-stats') {
          setStats(data);
          setLastUpdated(data.timestamp || Date.now());
        }
      } catch (parseErr) {
        logger.error('Error handling WebSocket message:', parseErr);
      }
    });
    
    // Register error handler
    socketRef.current.onError((error) => {
      logger.error('WebSocket error:', error);
      setError('Connection error. Stats may be outdated.');
    });
    
    // Register connection handler
    socketRef.current.onConnect(() => {
      logger.info('WebSocket connection established');
      setError(null);
      
      // Send a ping message to verify connection
      socketRef.current?.send({ 
        type: 'ping', 
        timestamp: Date.now() 
      });
    });
    
    // Start the connection
    socketRef.current.connect().catch(error => {
      logger.error('Failed to connect WebSocket:', error);
      setError('Failed to establish real-time connection. Stats may be outdated.');
    });
    
    // Setup a heartbeat interval to detect dead connections
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.isConnected()) {
        socketRef.current.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
    
    // Cleanup on unmount
    return () => {
      logger.debug('Cleaning up SafeWebSocket resources');
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);
  
  return { 
    stats, 
    loading, 
    error, 
    lastUpdated 
  };
}