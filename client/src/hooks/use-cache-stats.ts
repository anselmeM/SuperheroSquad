import { useState, useEffect } from 'react';

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
        console.error('Error fetching cache stats:', err);
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

    const makeWebSocketConnection = () => {
      try {
        // Determine WebSocket URL using the same host but with ws/wss protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
        
        let socket: WebSocket | null = null;
        let reconnectTimer: NodeJS.Timeout | null = null;
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const baseReconnectDelay = 1000; // Start with 1 second delay
        
        // Function to create and set up the WebSocket
        const connectWebSocket = () => {
          try {
            if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
              return; // Already connected or connecting
            }
            
            // Create new WebSocket connection
            socket = new WebSocket(wsUrl);
            
            socket.onopen = () => {
              if (process.env.NODE_ENV === 'development') {
                console.log('WebSocket connected for cache stats');
              }
              reconnectAttempts = 0; // Reset reconnect attempts counter on successful connection
              
              try {
                // Send a ping to verify connection is working
                if (socket && socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({ 
                    type: 'ping',
                    timestamp: Date.now()
                  }));
                }
              } catch (sendError) {
                console.error('WebSocket send error:', sendError);
              }
            };
            
            socket.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                
                // Handle different message types
                if (data.type === 'cache-stats') {
                  setStats(data);
                  setLastUpdated(data.timestamp || Date.now());
                } else if (data.type === 'pong') {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('WebSocket connection confirmed (pong received)');
                  }
                } else if (data.type === 'connection') {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('WebSocket connection established:', data.message);
                  }
                } else if (data.type === 'error') {
                  console.error('WebSocket error message:', data.message);
                }
              } catch (err) {
                console.error('Error processing WebSocket message:', err);
              }
            };
            
            socket.onerror = (event) => {
              console.error('WebSocket error event:', event);
              setError('WebSocket connection error. Cache stats may not update in real-time.');
            };
            
            socket.onclose = (event) => {
              if (process.env.NODE_ENV === 'development') {
                console.log(`WebSocket closed: ${event.code} ${event.reason}`);
              }
              
              // Attempt to reconnect if the connection was closed unexpectedly
              if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                const delay = Math.min(
                  baseReconnectDelay * Math.pow(1.5, reconnectAttempts), 
                  30000 // Maximum 30 second delay
                );
                
                if (process.env.NODE_ENV === 'development') {
                  console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
                }
                
                reconnectTimer = setTimeout(() => {
                  reconnectAttempts++;
                  connectWebSocket();
                }, delay);
              } else if (reconnectAttempts >= maxReconnectAttempts) {
                console.warn('Maximum WebSocket reconnect attempts reached');
                setError('Failed to establish real-time connection after multiple attempts. Please refresh the page to try again.');
              }
            };
          } catch (connectionError) {
            console.error('Error setting up WebSocket:', connectionError);
            setError('Error setting up real-time connection. Stats will not update automatically.');
          }
        };
        
        // Initialize the WebSocket connection
        connectWebSocket();
        
        // Cleanup function to close WebSocket when component unmounts
        return () => {
          try {
            if (socket) {
              // Use code 1000 (Normal Closure) to indicate intentional disconnect
              socket.close(1000, 'Component unmounting');
            }
            
            if (reconnectTimer) {
              clearTimeout(reconnectTimer);
            }
          } catch (cleanupError) {
            console.error('WebSocket cleanup error:', cleanupError);
          }
        };
      } catch (setupError) {
        console.error('WebSocket setup error:', setupError);
        setError('Failed to set up real-time connection. Using fallback to REST API only.');
        return () => {}; // Empty cleanup function
      }
    };

    // Initialize the connection with error handling
    const cleanupFn = makeWebSocketConnection();
    return cleanupFn;
  }, []);
  
  return { 
    stats, 
    loading, 
    error, 
    lastUpdated 
  };
}