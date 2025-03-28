import { useState, useEffect, useRef } from "react";
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
 */
export function useCacheStats() {
  const [wsStats, setWsStats] = useState<CacheStats | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Query for initial stats and periodic polling as backup
  const { data: apiStats, isLoading, error } = useQuery({
    queryKey: ['/api/cache-stats'],
    // Refetch every 60 seconds as a fallback
    refetchInterval: 60 * 1000,
  });

  // Combine API and WebSocket stats, preferring WebSocket for freshness
  const stats = wsStats || apiStats;

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Only run this effect in the browser
    if (typeof window === 'undefined') return;

    // Setup WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected for cache stats');
      setIsWsConnected(true);
      
      // Send a ping message to check the connection
      socket.send(JSON.stringify({ type: 'ping' }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Only update for cache-stats messages
        if (data.type === 'cache-stats') {
          setWsStats({
            hero: data.hero,
            search: data.search,
            timestamp: data.timestamp
          });
        }
        
        // Log other message types
        else if (data.type !== 'pong') {
          console.log('WebSocket message:', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (err) => {
      console.error('WebSocket error:', err);
      setIsWsConnected(false);
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsWsConnected(false);
    };

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  // Send periodic pings to keep the connection alive
  useEffect(() => {
    if (!isWsConnected || !wsRef.current) return;
    
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(pingInterval);
  }, [isWsConnected]);

  return {
    stats,
    isLoading: isLoading && !stats,
    error,
    isWsConnected
  };
}