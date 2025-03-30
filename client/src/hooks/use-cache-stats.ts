import { useState, useEffect, useRef } from 'react';
import { createLogger } from '@/utils/config';

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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isUnmountingRef = useRef<boolean>(false);

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
    
    // Connection parameters
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000; // Start with 1 second delay
    const MAX_RECONNECT_DELAY = 30000; // Maximum 30 second delay
    
    // Determine WebSocket URL using window.location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    logger.info(`Initializing WebSocket for cache stats: ${wsUrl}`);
    
    // Calculate reconnect delay with exponential backoff
    const getReconnectDelay = () => {
      return Math.min(
        BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current),
        MAX_RECONNECT_DELAY
      );
    };
    
    // Safely send a message through the WebSocket
    const safeSend = (message: object): boolean => {
      try {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify(message));
          return true;
        }
        return false;
      } catch (err) {
        logger.error('Error sending WebSocket message:', err);
        return false;
      }
    };
    
    // Handle WebSocket connection and reconnection
    const connectWebSocket = () => {
      try {
        // Skip if we're unmounting or already have an active connection
        if (isUnmountingRef.current) return;
        
        if (socketRef.current && 
            (socketRef.current.readyState === WebSocket.OPEN || 
             socketRef.current.readyState === WebSocket.CONNECTING)) {
          logger.debug('WebSocket already connected or connecting');
          return;
        }
        
        // Close any existing connection
        if (socketRef.current) {
          try {
            socketRef.current.close();
          } catch (closeErr) {
            logger.debug('Error closing existing socket:', closeErr);
          }
          socketRef.current = null;
        }
        
        logger.debug(`Attempting WebSocket connection (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        // Gracefully handle WebSocket creation errors
        try {
          socketRef.current = new WebSocket(wsUrl);
          logger.debug('WebSocket created successfully');
        } catch (wsError) {
          // Handle WebSocket constructor errors (like invalid URL)
          logger.error('Error creating WebSocket:', wsError);
          setError(`WebSocket connection failed: ${wsError instanceof Error ? wsError.message : String(wsError)}`);
          
          // Don't throw, schedule reconnect instead
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            const delay = getReconnectDelay();
            reconnectTimerRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connectWebSocket();
            }, delay);
          }
          return;
        }
        
        // Setup event handlers for the new connection
        if (socketRef.current) {
          // Connection established handler
          socketRef.current.onopen = () => {
            logger.info('WebSocket connection established');
            reconnectAttemptsRef.current = 0;
            setError(null);
            safeSend({ type: 'ping', timestamp: Date.now() });
          };
          
          // Message handler
          socketRef.current.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data as string);
              if (data.type === 'cache-stats') {
                setStats(data);
                setLastUpdated(data.timestamp || Date.now());
              }
            } catch (parseErr) {
              logger.error('Error parsing WebSocket message:', parseErr);
            }
          };
          
          // Error handler
          socketRef.current.onerror = (event) => {
            logger.error('WebSocket error:', event);
          };
          
          // Connection closure handler
          socketRef.current.onclose = (event) => {
            logger.debug(`WebSocket closed: code=${event.code}, clean=${event.wasClean}`);
            socketRef.current = null;
            
            // Attempt reconnection for unexpected closures
            const isNormalClosure = event.code === 1000 && event.wasClean;
            if (!isNormalClosure && 
                reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && 
                !isUnmountingRef.current) {
              
              const delay = getReconnectDelay();
              logger.info(`Scheduling reconnection in ${delay}ms`);
              setError(`Connection lost. Reconnecting (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
              
              reconnectTimerRef.current = setTimeout(() => {
                if (!isUnmountingRef.current) {
                  reconnectAttemptsRef.current += 1;
                  connectWebSocket();
                }
              }, delay);
            } 
            else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS && !isUnmountingRef.current) {
              setError('Could not establish a stable connection. Cache statistics may be outdated.');
            }
          };
        }
      } catch (setupError) {
        // Catch-all for any other errors during setup
        logger.error('Error in WebSocket setup:', setupError);
        setError('Failed to set up WebSocket connection');
      }
    };
    
    // Start the initial connection
    connectWebSocket();
    
    // Heartbeat to detect dead connections
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        safeSend({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
    
    // Cleanup on unmount
    return () => {
      logger.debug('Cleaning up WebSocket resources');
      isUnmountingRef.current = true;
      
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      
      clearInterval(heartbeatInterval);
      
      if (socketRef.current) {
        try {
          socketRef.current.close(1000, 'Component unmounting');
        } catch (closeErr) {
          logger.error('Error closing WebSocket:', closeErr);
        }
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