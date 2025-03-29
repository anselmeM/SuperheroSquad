import { useCacheStats, type CacheStatsType } from '@/hooks/use-cache-stats';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Database, Activity, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDistanceToNow } from 'date-fns';

/**
 * Component to display cache statistics with real-time updates
 */
export function CacheStats() {
  const { stats, loading, error, lastUpdated } = useCacheStats();
  
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
  
  // If error, show error message
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Cache Statistics</h2>
        {lastUpdated && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="mr-1 h-4 w-4" />
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </div>
        )}
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