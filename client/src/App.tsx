import { Switch, Route } from "wouter";
import { useEffect } from "react";
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

// Define a global error handler for WebSocket connections
if (typeof window !== 'undefined') {
  // Patch the WebSocket constructor to catch errors
  const OriginalWebSocket = window.WebSocket;
  
  class SafeWebSocket extends OriginalWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      try {
        super(url, protocols);
        logger.debug(`SafeWebSocket: Connection created for ${String(url)}`);
      } catch (error) {
        logger.error('SafeWebSocket: Constructor error:', error);
        // Don't rethrow to prevent unhandled rejections
        throw error; // The error will be caught by our global handler
      }
    }
  }
  
  // Replace global WebSocket with our safe version
  window.WebSocket = SafeWebSocket as any;
  
  logger.info('SafeWebSocket: WebSocket constructor patched');
}

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
  // Setup global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent the default browser behavior which logs the error
      event.preventDefault();
      
      // Get more detailed information about the rejection
      const reason = event.reason;
      const stack = reason instanceof Error ? reason.stack : null;
      const message = reason instanceof Error ? reason.message : String(reason);
      
      // Log detailed error information
      logger.error(
        'Unhandled Promise Rejection:',
        {
          message,
          stack,
          type: reason?.constructor?.name || typeof reason,
          // Log additional context that might help with debugging
          url: window.location.href,
          timestamp: new Date().toISOString()
        }
      );
      
      // If this is a network error (like WebSocket connection failure), log it specially
      if (message.includes('WebSocket') || message.includes('network') || message.includes('fetch')) {
        logger.warn('Network-related error detected. This may be related to WebSocket connections or API requests.');
      }
      
      // Return true to indicate we've handled the event
      return true;
    };
    
    // Add global event listener for unhandled promise rejections
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
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