import { useCacheStats, type CacheStats as CacheStatsType } from "@/hooks/use-cache-stats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Database as DatabaseIcon, 
  Server as ServerIcon, 
  Clock as ClockIcon, 
  PieChart as PieChartIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/**
 * Component to display cache statistics with real-time updates
 */
export function CacheStats() {
  const { stats, isLoading, isWsConnected } = useCacheStats();

  // Create default empty stats
  const defaultStats: CacheStatsType = {
    hero: { size: 0, hits: 0, misses: 0, hitRate: 0 },
    search: { size: 0, hits: 0, misses: 0, hitRate: 0 }
  };
  
  // Use the stats if available, otherwise use default
  const safeStats = stats ? (stats as CacheStatsType) : defaultStats;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DatabaseIcon className="h-5 w-5" />
              Cache Statistics
            </CardTitle>
            <CardDescription>Performance monitoring for API requests</CardDescription>
          </div>
          <Badge variant={isWsConnected ? "default" : "outline"} className="h-6">
            {isWsConnected ? (
              <WifiIcon className="h-3 w-3 mr-1" />
            ) : (
              <WifiOffIcon className="h-3 w-3 mr-1" />
            )}
            {isWsConnected ? "Live" : "Polling"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <CacheStatsSkeleton />
        ) : stats ? (
          <Tabs defaultValue="hero">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hero">Hero API</TabsTrigger>
              <TabsTrigger value="search">Search API</TabsTrigger>
            </TabsList>
            <TabsContent value="hero" className="space-y-4 mt-4">
              <CacheStatDetails 
                title="Hero Details Cache"
                stats={safeStats.hero}
                timestamp={safeStats.timestamp}
              />
            </TabsContent>
            <TabsContent value="search" className="space-y-4 mt-4">
              <CacheStatDetails 
                title="Search Results Cache"
                stats={safeStats.search}
                timestamp={safeStats.timestamp}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center p-4 text-muted-foreground">
            No cache statistics available
          </div>
        )}
      </CardContent>
    </Card>
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
  const totalRequests = stats.hits + stats.misses;
  const hitRatePercent = Math.round(stats.hitRate * 100);
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <ServerIcon className="h-4 w-4" />
          {title}
        </h3>
        {timestamp && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            Updated {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Cache Hit Rate</span>
          <span className="font-mono">{hitRatePercent}%</span>
        </div>
        <Progress value={hitRatePercent} className="h-2" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Cache Hits</div>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-mono">{stats.hits}</span>
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          </div>
        </div>
        
        <div className="rounded-lg border p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Cache Misses</div>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-mono">{stats.misses}</span>
            <XCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Cached Items</div>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-mono">{stats.size}</span>
            <DatabaseIcon className="h-5 w-5 text-blue-500" />
          </div>
        </div>
        
        <div className="rounded-lg border p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Total Requests</div>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-mono">{totalRequests}</span>
            <PieChartIcon className="h-5 w-5 text-purple-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CacheStatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-[80px]" />
      </div>
      
      <Skeleton className="h-2 w-full" />
      
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-[80px] w-full" />
        <Skeleton className="h-[80px] w-full" />
      </div>
    </div>
  );
}