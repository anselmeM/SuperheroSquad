import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '@/utils/config';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const logger = createLogger('error-boundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * This component catches JavaScript errors anywhere in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 * 
 * Features:
 * - Detailed error logging with component identification
 * - Customizable fallback UI
 * - Error recovery with reset capability
 * - Isolated error boundaries to prevent cascading failures
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName } = this.props;
    
    // Log the error with component context for easier debugging
    logger.error(
      `Error caught in ${componentName || 'unknown'} component:`, 
      { error, errorInfo }
    );
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }
  
  // Reset the error boundary state
  resetErrorBoundary = (): void => {
    const { onReset } = this.props;
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Call the optional onReset callback if provided
    if (onReset) {
      onReset();
    }
  }

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      // Return custom fallback UI if provided, otherwise show default error UI
      if (fallback) {
        return fallback;
      }
      
      // Default error UI with component info and reset option
      return (
        <div className="p-6 rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-2" />
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">
              Component Error
            </h3>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-red-600 dark:text-red-300 mb-2">
              {componentName ? (
                <>Something went wrong in the <strong>{componentName}</strong> component.</>
              ) : (
                <>Something went wrong in this component.</>
              )}
            </p>
            
            {error && (
              <pre className="text-xs bg-red-100 dark:bg-red-900/30 p-3 rounded border border-red-200 dark:border-red-800 overflow-auto max-h-32">
                {error.toString()}
              </pre>
            )}
          </div>
          
          <Button 
            onClick={this.resetErrorBoundary}
            variant="destructive"
            size="sm"
            className="w-full justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    // When there's no error, render children normally
    return children;
  }
}

/**
 * Wrap a component with an error boundary
 * Utility HOC to easily wrap components with error boundaries
 * 
 * @param Component - The component to wrap
 * @param errorBoundaryProps - Props for the ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<Props, 'children'> = {}
): React.FC<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  
  const ComponentWithErrorBoundary: React.FC<P> = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps} componentName={displayName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  ComponentWithErrorBoundary.displayName = `WithErrorBoundary(${displayName})`;
  
  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;