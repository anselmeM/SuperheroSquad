import { useState, useEffect, useRef } from 'react';
import { createLogger } from '@/utils/config';
import { SafeWebSocket, createSafeWebSocket, WebSocketStatus } from '@/utils/safe-websocket';

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
  const [connectionStatus, setConnectionStatus] = useState<WebSocketStatus>('closed');

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
    
    logger.info('Setting up WebSocket connection for cache stats');
    
    // Create the SafeWebSocket instance using our utility function
    const socket = createSafeWebSocket('/ws', {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      autoReconnect: true,
      debug: false
    });
    
    socketRef.current = socket;
    
    // Set up message handler
    socket.onMessage((data) => {
      if (data && data.type === 'cache-stats') {
        logger.debug('Received cache stats update:', data);
        setStats(data);
        setLastUpdated(data.timestamp || Date.now());
      } else if (data && data.type === 'pong') {
        logger.debug('Received pong response');
      }
    });
    
    // Set up status handler
    socket.onStatus((status) => {
      setConnectionStatus(status);
      
      if (status === 'open') {
        logger.info('WebSocket connection established');
        setError(null);
        
        // Request initial cache stats
        socket.send({ type: 'get-stats' });
      } else if (status === 'error' || status === 'closed') {
        if (status === 'error') {
          logger.warn('WebSocket connection error');
          setError('Connection error. Stats may be outdated.');
        } else {
          logger.info('WebSocket connection closed');
        }
      }
    });
    
    // Set up error handler
    socket.onError((error) => {
      logger.error('WebSocket error:', error);
      setError('Connection error. Stats may be outdated.');
    });
    
    // Start the connection
    socket.connect().catch(error => {
      logger.error('Failed to connect WebSocket:', error);
      setError('Failed to establish real-time connection. Stats may be outdated.');
    });
    
    // Setup a heartbeat interval to detect dead connections
    heartbeatIntervalRef.current = setInterval(() => {
      // Only send heartbeat if connected
      if (connectionStatus === 'open') {
        logger.debug('Sending ping for heartbeat');
        socket.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000) as unknown as ReturnType<typeof setInterval>; // Cast for TypeScript compatibility
    
    // Cleanup on unmount
    return () => {
      logger.debug('Cleaning up WebSocket resources');
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (socket) {
        // Remove all event handlers to prevent memory leaks
        socket.close();
      }
      
      socketRef.current = null;
    };
  }, []);
  
  return { 
    stats, 
    loading, 
    error, 
    lastUpdated,
    connectionStatus
  };
}