import { useState, useEffect, useRef } from 'react';
import { createLogger } from '@/utils/config';
import { SafeWebSocket, createSafeWebSocket, WebSocketStatus } from '@/utils/safe-websocket';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Database, Activity, Clock, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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
 * * @returns Current cache statistics and loading state
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
      if (socket.status === 'open') { // Use socket.status here
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

/**
 * Displays the current WebSocket connection status
 */
function ConnectionStatus({ status }: { status: WebSocketStatus }) {
  let statusIcon = <WifiOff className="h-4 w-4 mr-1" />;
  let statusText = "Disconnected";
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  
  switch (status) {
    case 'connecting':
      statusIcon = <Wifi className="h-4 w-4 mr-1 animate-pulse" />;
      statusText = "Connecting...";
      variant = "secondary";
      break;
    case 'open':
      statusIcon = <Wifi className="h-4 w-4 mr-1" />;
      statusText = "Connected";
      variant = "default";
      break;
    case 'closing':
      statusIcon = <Wifi className="h-4 w-4 mr-1 animate-pulse" />;
      statusText = "Closing...";
      variant = "secondary";
      break;
    case 'closed':
      statusIcon = <WifiOff className="h-4 w-4 mr-1" />;
      statusText = "Disconnected";
      variant = "outline";
      break;
    case 'error':
      statusIcon = <AlertCircle className="h-4 w-4 mr-1" />;
      statusText = "Connection Error";
      variant = "destructive";
      break;
  }
  
  return (
    <Badge variant={variant} className="flex items-center">
      {statusIcon}
      {statusText}
    </Badge>
  );
}

interface CacheStatDetailsProps {
  title: string;
  stats: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
  timestamp?: number;
}

function CacheStatDetails({ title, stats, timestamp }: CacheStatDetailsProps) {
  // Calculate total cache access count
  const totalAccesses = stats.hits + stats.misses;
  
  // Format hit rate as a percentage
  const hitRatePercent = stats.hitRate * 100;
  const formattedHitRate = hitRatePercent.toFixed(1);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Size</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.size}</div>
          <p className="text-xs text-muted-foreground">Items stored in cache</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Hits</CardTitle>
          <Activity className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.hits}</div>
          <p className="text-xs text-muted-foreground">
            {totalAccesses > 0 
              ? `${(stats.hits / totalAccesses * 100).toFixed(1)}% of total requests`
              : 'No cache accesses yet'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cache Misses</CardTitle>
          <Activity className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.misses}</div>
          <p className="text-xs text-muted-foreground">
            {totalAccesses > 0 
              ? `${(stats.misses / totalAccesses * 100).toFixed(1)}% of total requests`
              : 'No cache accesses yet'}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedHitRate}%</div>
          <Progress value={hitRatePercent} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {totalAccesses > 0 
              ? `Based on ${totalAccesses} total cache accesses`
              : 'No cache accesses yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CacheStatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-36" />
      </div>
      
      <Skeleton className="h-10 w-full mb-4" />
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array(4).fill(null).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-16 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Component to display cache statistics with real-time updates
 */
export function CacheStats() {
  const { stats, loading, error, lastUpdated, connectionStatus } = useCacheStats();
  
  // Default stats to prevent errors if stats is null
  const defaultStats: CacheStatsType = {
    size: 0,
    hits: 0,
    misses: 0,
    hitRate: 0
  };
  
  // If loading, show skeleton UI
  if (loading) {
    return <CacheStatsSkeleton />;
  }
  
  // If error, show error message with connection status
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Cache Statistics</h2>
          <ConnectionStatus status={connectionStatus} />
        </div>
        
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Ensure stats is not null before rendering main content
  if (!stats) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Cache Statistics</h2>
          <ConnectionStatus status={connectionStatus} />
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Cache stats unavailable.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Cache Statistics</h2>
        <div className="flex items-center gap-4">
          <ConnectionStatus status={connectionStatus} />
          {lastUpdated && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="hero">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="hero">Hero Cache</TabsTrigger>
          <TabsTrigger value="search">Search Cache</TabsTrigger>
        </TabsList>
        
        <TabsContent value="hero">
          <CacheStatDetails 
            title="Hero Cache" 
            stats={stats.hero || defaultStats} 
            timestamp={stats.timestamp}
          />
        </TabsContent>
        
        <TabsContent value="search">
          <CacheStatDetails 
            title="Search Cache" 
            stats={stats.search || defaultStats} 
            timestamp={stats.timestamp}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}