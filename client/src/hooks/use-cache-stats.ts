import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

export interface CacheStat {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface CacheStats {
  hero: CacheStat;
  search: CacheStat;
  timestamp?: number;
}

/**
 * Custom hook to fetch and track cache statistics
 * Combines REST API polling with WebSocket real-time updates
 * Includes enhanced error handling and reconnection logic
 */
export function useCacheStats() {
  const [wsStats, setWsStats] = useState<CacheStats | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Constants for WebSocket configuration
  const MAX_RECONNECT_ATTEMPTS = 5;
  const INITIAL_RECONNECT_DELAY = 1000; // 1 second
  const MAX_RECONNECT_DELAY = 30000; // 30 seconds
  const PING_INTERVAL = 30000; // 30 seconds
  
  // Query for initial stats and periodic polling as backup
  const { data: apiStats, isLoading, error } = useQuery({
    queryKey: ['/api/cache-stats'],
    // Refetch every 60 seconds as a fallback
    refetchInterval: 60 * 1000,
  });

  // Combine API and WebSocket stats, preferring WebSocket for freshness
  const stats = wsStats || apiStats;

  // Calculate backoff delay for reconnection attempts
  const getReconnectDelay = useCallback(() => {
    // Exponential backoff with jitter: 2^n * 1000 + random(0-1000)ms
    return Math.min(
      MAX_RECONNECT_DELAY,
      Math.pow(2, reconnectAttemptsRef.current) * INITIAL_RECONNECT_DELAY + 
      Math.floor(Math.random() * 1000)
    );
  }, []);

  // Validate message data structure for cache-stats type
  const validateCacheStats = useCallback((data: any): boolean => {
    // Check if we have the required data structure
    if (!data || typeof data !== 'object' || !data.type) {
      return false;
    }
    
    // Only validate cache-stats messages
    if (data.type !== 'cache-stats') {
      return true; // Other message types don't need validation
    }
    
    // Validate required fields exist
    if (!data.hero || !data.search) {
      return false;
    }
    
    // Validate stat object structure
    const validateStat = (stat: any): boolean => {
      return typeof stat === 'object' && 
             'size' in stat && 
             'hits' in stat && 
             'misses' in stat &&
             'hitRate' in stat;
    };
    
    return validateStat(data.hero) && validateStat(data.search);
  }, []);

  // Handle WebSocket message processing
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      // Validate message size to prevent processing extremely large messages
      if (typeof event.data === 'string' && event.data.length > 100000) {
        console.error('WebSocket message too large:', event.data.length);
        return;
      }
      
      // Parse the message data
      const data = JSON.parse(event.data);
      
      // Validate message structure
      if (!validateCacheStats(data)) {
        throw new Error('Invalid message format');
      }
      
      // Handle error messages from server
      if (data.type === 'error') {
        console.error('Server reported WebSocket error:', data.message);
        return;
      }
      
      // Update state for cache-stats messages
      if (data.type === 'cache-stats') {
        setWsStats({
          hero: data.hero,
          search: data.search,
          timestamp: data.timestamp || Date.now()
        });
      }
      // Log other message types (except for frequent pong messages)
      else if (data.type !== 'pong') {
        console.log('WebSocket message:', data);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      
      // Log a limited preview of the raw data for debugging
      if (typeof event.data === 'string') {
        const preview = event.data.length > 200 
          ? `${event.data.substring(0, 200)}... (truncated, length: ${event.data.length})`
          : event.data;
        console.error('Raw message data:', preview);
      }
    }
  }, [validateCacheStats]);

  // Setup the WebSocket connection
  const setupWebSocketConnection = useCallback(() => {
    // Cleanup any existing connection and timeout
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    try {
      // Get connection URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      if (!host) {
        throw new Error('Invalid host for WebSocket connection');
      }
      
      const wsUrl = `${protocol}//${host}/ws`;
      console.log(`Connecting to WebSocket: ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      
      // Create the WebSocket
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;
      
      // Connection event handlers
      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsWsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect counter on successful connection
        
        // Send initial ping to verify connection
        socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      };
      
      socket.onmessage = handleWebSocketMessage;
      
      socket.onerror = (err) => {
        console.error('WebSocket error:', err);
        setIsWsConnected(false);
      };
      
      socket.onclose = (event) => {
        console.log(`WebSocket closed: Code ${event.code}, Reason: ${event.reason || 'No reason'}, Clean: ${event.wasClean}`);
        setIsWsConnected(false);
        
        // Attempt reconnection for unexpected closures
        const isAbnormalClosure = 
          event.code !== 1000 && // Normal closure
          event.code !== 1001 && // Going away (page navigation)
          event.code !== 1005;   // No status code
        
        if (isAbnormalClosure && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          const delay = getReconnectDelay();
          
          console.log(`Scheduling reconnection in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(setupWebSocketConnection, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.error('Maximum WebSocket reconnection attempts reached');
        }
      };
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setIsWsConnected(false);
    }
  }, [getReconnectDelay, handleWebSocketMessage]);

  // Initialize WebSocket connection
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;
    
    setupWebSocketConnection();
    
    // Cleanup function
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupWebSocketConnection]);

  // Keep-alive pings
  useEffect(() => {
    if (!isWsConnected || !wsRef.current) return;
    
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'ping', 
          timestamp: Date.now() 
        }));
      }
    }, PING_INTERVAL);
    
    return () => clearInterval(pingInterval);
  }, [isWsConnected]);

  return {
    stats,
    isLoading: isLoading && !stats,
    error,
    isWsConnected
  };
}