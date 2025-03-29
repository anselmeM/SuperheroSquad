import { CacheStats } from '@/components/cache-stats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';
import { ArrowLeft, Gauge, Database, LineChart, LayoutGrid } from 'lucide-react';

/**
 * Dashboard Page
 * 
 * A developer-focused dashboard that provides insights into the application's
 * performance and internal workings. Features real-time cache statistics and
 * system monitoring.
 */
export default function DashboardPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Developer Dashboard</h1>
          <p className="text-muted-foreground">Monitor performance metrics and system health</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Application
          </Link>
        </Button>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Gauge className="mr-2 h-5 w-5 text-primary" />
              System Status
            </CardTitle>
            <CardDescription>Overview of system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
              <p className="text-sm">All systems operational</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5 text-primary" />
              Cache Info
            </CardTitle>
            <CardDescription>In-memory cache status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cache Type:</span>
                <span className="text-sm font-medium">In-Memory</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TTL (Hero):</span>
                <span className="text-sm font-medium">12 hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">TTL (Search):</span>
                <span className="text-sm font-medium">30 minutes</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <LineChart className="mr-2 h-5 w-5 text-primary" />
              API Stats
            </CardTitle>
            <CardDescription>External API usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">API Provider:</span>
                <span className="text-sm font-medium">SuperHero API</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rate Limit:</span>
                <span className="text-sm font-medium">Managed by cache</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="cache">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="cache">
            <Database className="mr-2 h-4 w-4" />
            Cache Performance
          </TabsTrigger>
          <TabsTrigger value="apiMonitor">
            <LayoutGrid className="mr-2 h-4 w-4" />
            API Monitor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="cache" className="pt-4">
          <CacheStats />
        </TabsContent>
        <TabsContent value="apiMonitor" className="pt-4">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">API monitoring coming soon...</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-center text-muted-foreground pt-8">
        <p>This dashboard is intended for development and debugging purposes only.</p>
        <p>Cache statistics update in real-time via WebSocket connection.</p>
      </div>
    </div>
  );
}