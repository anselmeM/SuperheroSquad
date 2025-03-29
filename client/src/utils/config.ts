/**
 * Client-side configuration utilities
 * Provides debug mode and environment settings
 */

// Debug mode configuration
type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug' | 'all';

interface ClientConfig {
  // Logging configuration
  logging: {
    level: LogLevel;
    enabled: boolean;
  };
  // Runtime environment
  environment: 'development' | 'production' | 'test';
}

// Default configuration
const defaultConfig: ClientConfig = {
  logging: {
    // In production, only show errors by default
    level: import.meta.env.MODE === 'production' ? 'error' : 'all',
    enabled: import.meta.env.MODE !== 'production'
  },
  environment: (import.meta.env.MODE as ClientConfig['environment']) || 'development'
};

/**
 * Load configuration from environment variables with validation
 * @returns The validated client configuration
 */
export function loadConfig(): ClientConfig {
  // Create a config object starting with defaults
  const config: ClientConfig = { ...defaultConfig };
  
  // Read DEBUG query parameter from URL for easy toggling in the browser
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  
  // Enable debug mode through URL parameter
  if (debugParam === 'true') {
    config.logging.enabled = true;
    config.logging.level = 'all';
  } else if (debugParam === 'false') {
    config.logging.enabled = false;
  }
  
  return config;
}

// Export the singleton configuration instance
export const appConfig = loadConfig();

/**
 * Logger utility that respects the configured log level
 */
export class Logger {
  private static levels: Record<LogLevel, number> = {
    'none': 0,
    'error': 1,
    'warn': 2,
    'info': 3, 
    'debug': 4,
    'all': 5
  };
  
  private source: string;
  
  constructor(source: string) {
    this.source = source;
  }
  
  private shouldLog(level: LogLevel): boolean {
    if (!appConfig.logging.enabled) return false;
    
    const configuredLevel = Logger.levels[appConfig.logging.level];
    const requestedLevel = Logger.levels[level];
    
    return requestedLevel <= configuredLevel;
  }
  
  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[${this.source}]`, ...args);
    }
  }
  
  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[${this.source}]`, ...args);
    }
  }
  
  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.info(`[${this.source}]`, ...args);
    }
  }
  
  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[${this.source}]`, ...args);
    }
  }
  
  log(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[${this.source}]`, ...args);
    }
  }
}

/**
 * Create a new logger instance for a specific source
 * @param source The source module/component name
 * @returns A configured logger instance
 */
export function createLogger(source: string): Logger {
  return new Logger(source);
}