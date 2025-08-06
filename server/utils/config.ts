/**
 * Server configuration utilities
 * Manages environment variables, API tokens, and logging settings
 */

// Debug mode configuration
type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug' | 'all';

interface AppConfig {
  // API related configuration
  api: {
    token: string;
    baseUrl: string;
    tokenSource: 'env' | 'default'; // Track if token came from env var or default
  };
  // Logging configuration
  logging: {
    level: LogLevel;
    enabled: boolean;
  };
  // Runtime environment
  environment: 'development' | 'production' | 'test';
  // Cache configuration
  cache: {
    suggestionTtl: number;
  };
}

// Default configuration - will be overridden by environment variables when available
const defaultConfig: AppConfig = {
  api: {
    token: '10164567091540405', // Fallback token (not recommended for production)
    baseUrl: 'https://superheroapi.com/api/',
    tokenSource: 'default'
  },
  logging: {
    // In production, only show errors by default
    level: process.env.NODE_ENV === 'production' ? 'error' : 'all',
    enabled: process.env.NODE_ENV !== 'production'
  },
  environment: (process.env.NODE_ENV as AppConfig['environment']) || 'development',
  cache: {
    suggestionTtl: 10 * 60 * 1000, // 10 minutes
  },
};

/**
 * Load configuration from environment variables with validation
 * @returns The validated application configuration
 */
export function loadConfig(): AppConfig {
  // Create a config object starting with defaults
  const config: AppConfig = { ...defaultConfig };
  
  // Override with environment variables if available
  if (process.env.SUPERHERO_API_TOKEN) {
    config.api.token = process.env.SUPERHERO_API_TOKEN.trim();
    config.api.tokenSource = 'env';
  }
  
  if (process.env.API_BASE_URL) {
    config.api.baseUrl = process.env.API_BASE_URL.trim();
  }
  
  // Validate API token
  if (!config.api.token) {
    throw new Error('API token is required. Set SUPERHERO_API_TOKEN environment variable.');
  }
  
  // Set logging level from environment
  if (process.env.LOG_LEVEL) {
    const requestedLevel = process.env.LOG_LEVEL.toLowerCase() as LogLevel;
    if (Object.keys(Logger.levels).includes(requestedLevel)) {
      config.logging.level = requestedLevel;
    }
  }
  
  // Enable/disable logging from environment
  if (process.env.LOG_ENABLED) {
    config.logging.enabled = process.env.LOG_ENABLED === 'true';
  }
  
  return config;
}

// Export the singleton configuration instance
export const appConfig = loadConfig();

/**
 * Logger utility that respects the configured log level
 */
export class Logger {
  static levels: Record<LogLevel, number> = {
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