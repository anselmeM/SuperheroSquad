import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { createLogger } from "@/utils/config";

const logger = createLogger('api');

// Error types for better categorization and handling
export enum ApiErrorType {
  Network = 'NETWORK',
  Server = 'SERVER',
  Validation = 'VALIDATION',
  Auth = 'AUTH',
  NotFound = 'NOT_FOUND',
  Unknown = 'UNKNOWN',
}

// Enhanced API Error class with better context
export class ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  retryable: boolean;
  
  constructor(message: string, type: ApiErrorType, status?: number, retryable = false) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.retryable = retryable;
    
    // This is necessary for instanceof to work correctly
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// Helper to determine if an error should be retried
const isRetryableError = (error: unknown): boolean => {
  // Network errors are usually temporary and should be retried
  if (error instanceof TypeError && error.message.includes('Network')) {
    return true;
  }
  
  // ApiErrors marked as retryable
  if (error instanceof ApiError && error.retryable) {
    return true;
  }
  
  // Server errors (5xx) are often temporary
  if (error instanceof ApiError && error.status && error.status >= 500) {
    return true;
  }
  
  return false;
};

/**
 * Enhanced error handling for API responses
 * Transforms HTTP errors into structured ApiError instances with context
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    const status = res.status;
    let errorType: ApiErrorType;
    let isRetryable = false;
    
    // Categorize errors by HTTP status code
    if (status >= 500) {
      errorType = ApiErrorType.Server;
      isRetryable = true; // Server errors are often temporary
    } else if (status === 404) {
      errorType = ApiErrorType.NotFound;
    } else if (status === 401 || status === 403) {
      errorType = ApiErrorType.Auth;
    } else if (status === 400 || status === 422) {
      errorType = ApiErrorType.Validation;
    } else {
      errorType = ApiErrorType.Unknown;
    }
    
    // Log the error with context
    logger.error(`API Error [${status}] ${errorType}:`, text);
    
    throw new ApiError(
      `${status}: ${text}`,
      errorType,
      status,
      isRetryable
    );
  }
}

/**
 * Enhanced API request function with improved error handling
 * and detailed logging for debugging
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retries = 2
): Promise<Response> {
  try {
    logger.debug(`${method} ${url}`, data ? { dataPreview: JSON.stringify(data).slice(0, 100) } : {});
    
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    logger.debug(`${method} ${url} succeeded with status ${res.status}`);
    return res;
  } catch (error) {
    // Handle network errors specifically
    if (error instanceof TypeError && error.message.includes('Network')) {
      logger.warn(`Network error in ${method} ${url}:`, error.message);
      
      // Attempt retry for network errors if retries remaining
      if (retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
        logger.info(`Retrying ${method} ${url} after ${delay}ms (${retries} retries left)`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiRequest(method, url, data, retries - 1);
      }
      
      throw new ApiError(
        `Network request failed: ${error.message}`,
        ApiErrorType.Network,
        undefined,
        true
      );
    }
    
    // Rethrow ApiErrors (already formatted)
    if (error instanceof ApiError) {
      // Retry server errors automatically if retries remaining
      if (error.type === ApiErrorType.Server && retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
        logger.info(`Retrying ${method} ${url} after ${delay}ms (${retries} retries left)`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiRequest(method, url, data, retries - 1);
      }
      throw error;
    }
    
    // Fallback for unexpected errors
    logger.error(`Unexpected error in ${method} ${url}:`, error);
    throw new ApiError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      ApiErrorType.Unknown
    );
  }
}

/**
 * Options for query function behavior
 */
interface QueryFnOptions {
  /** How to handle 401 unauthorized errors */
  on401: "returnNull" | "throw";
  /** Maximum number of retry attempts */
  maxRetries?: number;
}

/**
 * Enhanced query function with retry logic and better error handling
 */
export const getQueryFn: <T>(options: QueryFnOptions) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, maxRetries = 2 }) =>
  async ({ queryKey, signal }) => {
    const url = queryKey[0] as string;
    let retryCount = 0;
    
    // Function to handle retries with exponential backoff
    const executeWithRetry = async (): Promise<T> => {
      try {
        logger.debug(`Fetching ${url}${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}`);
        
        const res = await fetch(url, {
          credentials: "include",
          signal, // Support for abort controller signal
        });
        
        // Handle 401 according to options
        if (res.status === 401) {
          logger.warn(`Unauthorized request to ${url}`);
          if (unauthorizedBehavior === "returnNull") {
            return null as unknown as T;
          }
        }
        
        await throwIfResNotOk(res);
        const data = await res.json();
        return data;
      } catch (error) {
        // Don't retry if the request was manually cancelled
        if (signal?.aborted) {
          logger.debug(`Request to ${url} was aborted`);
          throw error;
        }
        
        // Determine if we should retry this error
        const shouldRetry = isRetryableError(error) && retryCount < (maxRetries || 0);
        
        if (shouldRetry) {
          // Calculate backoff delay: 2^retry * 1000ms, capped at 10 seconds
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
          
          logger.info(`Retrying ${url} after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          // Increment retry counter and wait before retrying
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, delay));
          return executeWithRetry();
        }
        
        // If we shouldn't retry or have exhausted retries, rethrow
        throw error;
      }
    };
    
    return executeWithRetry();
  };

/**
 * Configured QueryClient with enhanced error handling and retries
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ 
        on401: "throw", 
        maxRetries: 2 
      }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      
      // Use our custom retry logic for API-specific errors
      retry: (failureCount, error) => {
        // Don't retry more than 3 times
        if (failureCount > 3) return false;
        
        // Use our helper to determine if error is retryable
        return isRetryableError(error);
      },
      
      // Increase retry delay with exponential backoff
      retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 30000),
    },
    
    mutations: {
      // Apply same retry logic to mutations
      retry: (failureCount, error) => {
        if (failureCount > 2) return false;
        return isRetryableError(error);
      },
      retryDelay: attemptIndex => Math.min(1000 * (2 ** attemptIndex), 10000),
    },
  },
  
  // Configure logger for query client events
  logger: {
    log: (...args) => logger.debug('QueryClient:', ...args),
    warn: (...args) => logger.warn('QueryClient:', ...args),
    error: (...args) => logger.error('QueryClient:', ...args),
  }
});
