import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CacheStats } from "@/components/cache-stats";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div className="flex items-center gap-4 w-full justify-center md:justify-start">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-4xl font-bangers bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent tracking-wide">
              API Performance Dashboard
            </h1>
          </div>
          <div className="flex justify-center md:justify-end">
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <CacheStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">About Caching</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  This application implements an intelligent caching system to reduce API calls
                  and improve performance.
                </p>
                <p>
                  <strong>Hero Details Cache:</strong> Hero information is cached for 12 hours,
                  dramatically reducing load times for frequently accessed heroes.
                </p>
                <p>
                  <strong>Search Results Cache:</strong> Search queries are cached for 30 minutes,
                  with shorter expiration times for more general searches.
                </p>
                <p>
                  The cache system automatically cleans up expired entries to ensure
                  memory usage remains optimized.
                </p>
              </div>
            </div>
            
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4">Performance Metrics</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong>Cache Hit Rate:</strong> The percentage of requests that are served from the cache
                  instead of making external API calls. Higher is better.
                </p>
                <p>
                  <strong>Cached Items:</strong> The current number of unique items stored in the cache.
                </p>
                <p>
                  <strong>Total Requests:</strong> The total number of API requests processed, both
                  cached and uncached.
                </p>
                <p>
                  <strong>Real-time Updates:</strong> This dashboard receives live updates via WebSockets
                  when connected, falling back to regular polling when WebSockets are unavailable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}