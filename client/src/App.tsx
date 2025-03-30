import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home as HomeIcon } from "lucide-react";
import { RouteNotFound } from "@/pages/not-found";
import Home from "@/pages/home";
import Favorites from "@/pages/favorites";
import Compare from "@/pages/compare";
import HeroDetail from "@/pages/hero-detail";
import Dashboard from "@/pages/dashboard";
import { createLogger } from "@/utils/config";

const logger = createLogger('app');

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/compare" component={Compare} />
      <Route path="/hero/:id" component={HeroDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={RouteNotFound} />
    </Switch>
  );
}

function App() {
  const handleReset = () => {
    logger.info('Global error boundary reset triggered');
    // Clear query cache on global error reset
    queryClient.clear();
    // Force refresh the page to completely reset the app state
    window.location.href = '/';
  };

  // Custom fallback UI for global application errors
  const globalErrorFallback = (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-8 p-8 border rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-6">
            The application encountered an unexpected error.
          </p>
          
          <div className="flex flex-col space-y-4">
            <Button onClick={handleReset} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Restart Application
            </Button>
            
            <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full">
              <HomeIcon className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary
      componentName="Root Application"
      fallback={globalErrorFallback}
      onReset={handleReset}
    >
      <ThemeProvider defaultTheme="system" storageKey="superhero-app-theme">
        <QueryClientProvider client={queryClient}>
          <Router />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;