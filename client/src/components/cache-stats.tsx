import { useCacheStats, type CacheStatsType } from '@/hooks/use-cache-stats';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Database, Activity, Clock, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import type { WebSocketStatus } from '@/utils/safe-websocket';

/**
 * Component to display cache statistics with real-time updates
 */
export function CacheStats() {
  const { stats, loading, error, lastUpdated, connectionStatus } = useCacheStats();
  const [statusText, setStatusText] = useState<string>('Disconnected');
  const [statusVariant, setStatusVariant] = useState<'default' | 'secondary' | 'destructive' | 'outline'>('outline');
  
  // Update status text and variant when connection status changes
  useEffect(() => {
    switch (connectionStatus) {
      case 'connecting':
        setStatusText('Connecting...');
        setStatusVariant('secondary');
        break;
      case 'open':
        setStatusText('Connected');
        setStatusVariant('default');
        break;
      case 'closing':
        setStatusText('Closing...');
        setStatusVariant('secondary');
        break;
      case 'closed':
        setStatusText('Disconnected');
        setStatusVariant('outline');
        break;
      case 'error':
        setStatusText('Connection Error');
        setStatusVariant('destructive');
        break;
      default:
        setStatusText('Unknown');
        setStatusVariant('outline');
    }
  }, [connectionStatus]);
  
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
            stats={stats?.hero || defaultStats} 
            timestamp={stats?.timestamp}
          />
        </TabsContent>
        
        <TabsContent value="search">
          <CacheStatDetails 
            title="Search Cache" 
            stats={stats?.search || defaultStats} 
            timestamp={stats?.timestamp}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
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