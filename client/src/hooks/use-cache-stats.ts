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

  // Define refs outside useEffect to maintain state across renders
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isUnmountingRef = useRef<boolean>(false);
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    // Only connect to WebSocket if we're on a client (browser)
    if (typeof window === 'undefined') return;
    
    // WebSocket connection parameters
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000; // Start with 1 second delay
    const MAX_RECONNECT_DELAY = 30000; // Maximum 30 second delay
    
    // Determine WebSocket URL, handling various development and production environments
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use the current host for connection to avoid localhost/undefined issues
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    logger.info(`Initializing WebSocket connection handler for: ${wsUrl}`);
    logger.debug(`Current origin: ${window.location.origin}, host: ${host}`);
    
    // Function to calculate reconnect delay with exponential backoff
    const getReconnectDelay = () => {
      return Math.min(
        BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current),
        MAX_RECONNECT_DELAY
      );
    };
    
    // Function to safely send a message through the WebSocket
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
    
    // Main function to handle WebSocket connection and reconnection
    const connectWebSocket = () => {
      try {
        // Don't create a new connection if one is already active or we're unmounting
        if (isUnmountingRef.current) return;
        
        if (socketRef.current && 
            (socketRef.current.readyState === WebSocket.OPEN || 
             socketRef.current.readyState === WebSocket.CONNECTING)) {
          logger.debug('WebSocket already connected or connecting, skipping reconnect');
          return;
        }
        
        // Clear any existing socket first to avoid memory leaks
        if (socketRef.current) {
          try {
            socketRef.current.close();
          } catch (err) {
            // Ignore errors when closing existing socket
          }
          socketRef.current = null;
        }
        
        logger.debug(`Attempting WebSocket connection (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
        
        // Create new WebSocket connection with error handling
        try {
          socketRef.current = new WebSocket(wsUrl);
          logger.debug('WebSocket instance created successfully');
        } catch (wsError) {
          logger.error('Error creating WebSocket:', wsError);
          throw wsError; // Let the outer catch block handle reconnection
        }
        
        // We know socketRef.current is defined here because if the WebSocket constructor threw,
        // the exception would have been caught above
        // TypeScript doesn't know that socketRef.current is defined here, so we'll handle it safely
        if (!socketRef.current) {
          throw new Error('WebSocket instance was unexpectedly null after creation');
        }
        
        // Connection successfully established
        socketRef.current.onopen = () => {
          logger.info('WebSocket connection established successfully');
          reconnectAttemptsRef.current = 0; // Reset counter on successful connection
          setError(null); // Clear any previous connection errors
          
          // Send a ping message to verify connection
          safeSend({ 
            type: 'ping', 
            timestamp: Date.now() 
          });
        };
        
        // Handle incoming messages
        socketRef.current.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string);
            
            switch (data.type) {
              case 'cache-stats':
                setStats(data);
                setLastUpdated(data.timestamp || Date.now());
                break;
                
              case 'pong':
                logger.debug('Received pong response, connection confirmed');
                break;
                
              case 'connection':
                logger.debug(`Connection message: ${data.message}`);
                break;
                
              case 'error':
                logger.warn(`Server reported WebSocket error: ${data.message}`);
                break;
                
              default:
                logger.debug(`Received unknown message type: ${data.type}`);
            }
          } catch (err) {
            logger.error('Error processing WebSocket message:', err);
          }
        };
        
        // Handle connection errors
        socketRef.current.onerror = (event: Event) => {
          // Just log the error event here, actual reconnect logic is in onclose
          logger.error('WebSocket error event occurred', event);
        };
        
        // Handle connection closure and implement reconnection strategy
        socketRef.current.onclose = (event: CloseEvent) => {
          logger.debug(`WebSocket closed: code=${event.code}, reason=${event.reason || 'No reason provided'}, wasClean=${event.wasClean}`);
          
          // Clear socket reference
          socketRef.current = null;
          
          // Check if the closure was expected (normal) or unexpected
          const isNormalClosure = event.code === 1000 && event.wasClean;
          
          // Only attempt to reconnect if:
          // 1. It wasn't a normal closure
          // 2. We haven't reached max reconnect attempts
          // 3. Component is not unmounting
          if (!isNormalClosure && 
              reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && 
              !isUnmountingRef.current) {
            
            // Calculate delay with exponential backoff
            const delay = getReconnectDelay();
            
            logger.info(`Scheduling WebSocket reconnection in ${delay}ms`);
            setError(`Connection lost. Reconnecting (${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
            
            // Schedule reconnection
            reconnectTimerRef.current = setTimeout(() => {
              if (!isUnmountingRef.current) {
                reconnectAttemptsRef.current += 1;
                connectWebSocket();
              }
            }, delay);
          } 
          // If we've used all our reconnection attempts, give up
          else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS && !isUnmountingRef.current) {
            logger.warn('Maximum WebSocket reconnect attempts reached');
            setError('Could not establish a stable connection. Cache statistics may be outdated.');
            
            // Schedule one final attempt after a longer delay (1 minute)
            reconnectTimerRef.current = setTimeout(() => {
              if (!isUnmountingRef.current) {
                logger.info('Making final reconnection attempt after cool-down period');
                reconnectAttemptsRef.current = 0; // Reset counter for fresh start
                connectWebSocket();
              }
            }, 60000);
          }
        };
      } catch (err) {
        logger.error('Exception during WebSocket setup:', err);
        setError('Failed to set up real-time connection');
        
        // Still try to reconnect on unexpected errors
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && !isUnmountingRef.current) {
          const delay = getReconnectDelay();
          logger.info(`Scheduling WebSocket reconnection after error in ${delay}ms`);
          
          reconnectTimerRef.current = setTimeout(() => {
            if (!isUnmountingRef.current) {
              reconnectAttemptsRef.current += 1;
              connectWebSocket();
            }
          }, delay);
        }
      }
    };
    
    // Start the initial connection
    connectWebSocket();
    
    // Setup a heartbeat interval to detect dead connections
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        logger.debug('Sending heartbeat ping');
        safeSend({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000); // Send heartbeat every 30 seconds
    
    // Define cleanup function for component unmount
    return () => {
      logger.debug('WebSocket cleanup: component unmounting');
      isUnmountingRef.current = true;
      
      // Clear all timers
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      
      clearInterval(heartbeatInterval);
      
      // Close WebSocket connection if it exists
      if (socketRef.current) {
        try {
          // Use 1000 code to indicate normal closure
          socketRef.current.close(1000, 'Component unmounting');
        } catch (err) {
          logger.error('Error during WebSocket cleanup:', err);
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