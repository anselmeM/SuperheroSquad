/**
 * SafeWebSocket
 * 
 * A more resilient WebSocket wrapper that properly handles connection errors,
 * provides reconnection logic, and exposes a more robust event-based API.
 * 
 * Features:
 * - Automatic reconnection with configurable backoff
 * - Event-based interface with typed events
 * - Error handling that prevents unhandled rejections
 * - Connection state tracking
 * - Timeouts for connection attempts
 */
import { createLogger } from './config';

const logger = createLogger('safe-websocket');

export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';
export type MessageHandler = (data: any) => void;
export type StatusHandler = (status: WebSocketStatus) => void;
export type ErrorHandler = (error: Error) => void;

interface WebSocketOptions {
  /** Whether to automatically reconnect on disconnection */
  autoReconnect?: boolean;
  /** Initial reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;
  /** Backoff multiplier for reconnection delay */
  reconnectBackoff?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
  /** Maximum number of reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number;
  /** Debug mode */
  debug?: boolean;
}

/**
 * Enhanced WebSocket class that provides automatic reconnection,
 * better error handling, and a more robust API.
 */
export class SafeWebSocket {
  private url: string;
  private protocols?: string | string[];
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private statusHandlers: StatusHandler[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private connectionTimeoutId: number | null = null;
  private reconnectTimeoutId: number | null = null;
  private reconnectAttempts = 0;
  
  // Default options
  private options: Required<WebSocketOptions> = {
    autoReconnect: true,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    reconnectBackoff: 1.5,
    connectionTimeout: 10000,
    maxReconnectAttempts: 10,
    debug: false
  };
  
  // Current WebSocket status
  private _status: WebSocketStatus = 'closed';
  
  /**
   * Creates a new SafeWebSocket instance
   * 
   * @param url WebSocket URL to connect to
   * @param protocols WebSocket protocols to use
   * @param options Configuration options
   */
  constructor(
    url: string,
    protocols?: string | string[],
    options?: WebSocketOptions
  ) {
    this.url = url;
    this.protocols = protocols;
    
    // Merge user options with defaults
    if (options) {
      this.options = { ...this.options, ...options };
    }
    
    // Don't connect automatically - let the caller decide when to connect
  }
  
  /**
   * Get the current connection status
   */
  get status(): WebSocketStatus {
    return this._status;
  }
  
  /**
   * Update connection status and notify handlers
   */
  private setStatus(status: WebSocketStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.notifyStatusHandlers(status);
    }
  }
  
  /**
   * Connect to the WebSocket server
   * @returns Promise that resolves when connected
   */
  connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || 
                         this.socket.readyState === WebSocket.OPEN)) {
      // Already connecting or connected
      return Promise.resolve();
    }
    
    // Clear any previous reconnection timers
    this.clearReconnectTimeout();
    
    return new Promise<void>((resolve, reject) => {
      try {
        this.setStatus('connecting');
        
        // Create new WebSocket connection
        this.socket = new WebSocket(this.url, this.protocols);
        
        // Set up connection timeout
        this.connectionTimeoutId = window.setTimeout(() => {
          if (this.socket?.readyState !== WebSocket.OPEN) {
            const error = new Error(`WebSocket connection timeout after ${this.options.connectionTimeout}ms`);
            this.handleError(error);
            reject(error);
            
            // Force close the socket
            this.close();
            
            // Attempt to reconnect if enabled
            this.scheduleReconnect();
          }
        }, this.options.connectionTimeout);
        
        // Connection opened
        this.socket.onopen = () => {
          this.clearConnectionTimeout();
          this.reconnectAttempts = 0;
          this.setStatus('open');
          logger.info(`Connected to ${this.url}`);
          resolve();
        };
        
        // Connection closed
        this.socket.onclose = (event) => {
          this.clearConnectionTimeout();
          this.setStatus('closed');
          logger.info(`Disconnected from ${this.url}, code: ${event.code}, reason: ${event.reason}`);
          
          // Attempt to reconnect if enabled
          this.scheduleReconnect();
        };
        
        // Connection error
        this.socket.onerror = (event) => {
          this.clearConnectionTimeout();
          
          const error = new Error(`WebSocket error: ${event.type}`);
          this.handleError(error);
          
          if (this._status === 'connecting') {
            // Only reject the promise if we're still connecting
            reject(error);
          }
        };
        
        // Handle incoming messages
        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.notifyMessageHandlers(data);
          } catch (error) {
            // Not JSON or other parsing error
            logger.warn('Failed to parse WebSocket message:', error);
            this.notifyMessageHandlers(event.data);
          }
        };
      } catch (error) {
        this.setStatus('error');
        this.handleError(error as Error);
        reject(error);
        
        // Attempt to reconnect if enabled
        this.scheduleReconnect();
      }
    });
  }
  
  /**
   * Close the WebSocket connection
   * @param code Close code
   * @param reason Close reason
   */
  close(code?: number, reason?: string): void {
    this.clearConnectionTimeout();
    this.clearReconnectTimeout();
    
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING) {
        try {
          this.setStatus('closing');
          this.socket.close(code, reason);
        } catch (error) {
          logger.error('Error closing WebSocket:', error);
        }
      }
      
      // Clean up event handlers
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
      
      this.socket = null;
    }
  }
  
  /**
   * Send data through the WebSocket
   * @param data Data to send (will be JSON.stringified)
   * @returns true if sent successfully, false otherwise
   */
  send(data: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.warn('Cannot send data - socket not open');
      return false;
    }
    
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }
  
  /**
   * Add handler for incoming messages
   * @param handler Function to call with message data
   * @returns this instance for chaining
   */
  onMessage(handler: MessageHandler): SafeWebSocket {
    this.messageHandlers.push(handler);
    return this;
  }
  
  /**
   * Add handler for connection status changes
   * @param handler Function to call with new status
   * @returns this instance for chaining
   */
  onStatus(handler: StatusHandler): SafeWebSocket {
    this.statusHandlers.push(handler);
    // Immediately notify with current status
    handler(this._status);
    return this;
  }
  
  /**
   * Add handler for connection errors
   * @param handler Function to call with error
   * @returns this instance for chaining
   */
  onError(handler: ErrorHandler): SafeWebSocket {
    this.errorHandlers.push(handler);
    return this;
  }
  
  /**
   * Remove a message handler
   * @param handler Handler to remove
   */
  offMessage(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }
  
  /**
   * Remove a status handler
   * @param handler Handler to remove
   */
  offStatus(handler: StatusHandler): void {
    this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
  }
  
  /**
   * Remove an error handler
   * @param handler Handler to remove
   */
  offError(handler: ErrorHandler): void {
    this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
  }
  
  /**
   * Clear the connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutId !== null) {
      window.clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
  }
  
  /**
   * Clear the reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId !== null) {
      window.clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
  }
  
  /**
   * Schedule a reconnection attempt with backoff
   */
  private scheduleReconnect(): void {
    if (!this.options.autoReconnect) {
      return;
    }
    
    // Check if we've exceeded the maximum number of attempts
    if (this.options.maxReconnectAttempts > 0 && 
        this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      logger.warn(`Maximum reconnection attempts (${this.options.maxReconnectAttempts}) reached`);
      return;
    }
    
    // Calculate backoff delay
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(this.options.reconnectBackoff, this.reconnectAttempts),
      this.options.maxReconnectDelay
    );
    
    logger.info(`Scheduling reconnection attempt in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
    
    this.clearReconnectTimeout();
    this.reconnectTimeoutId = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        logger.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      });
    }, delay);
  }
  
  /**
   * Handle a WebSocket error
   * @param error Error object
   */
  private handleError(error: Error): void {
    this.setStatus('error');
    logger.error('WebSocket error:', error);
    this.notifyErrorHandlers(error);
  }
  
  /**
   * Notify all message handlers of a new message
   * @param data Message data
   */
  private notifyMessageHandlers(data: any): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error('Error in message handler:', error);
      }
    });
  }
  
  /**
   * Notify all status handlers of a status change
   * @param status New status
   */
  private notifyStatusHandlers(status: WebSocketStatus): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        logger.error('Error in status handler:', error);
      }
    });
  }
  
  /**
   * Notify all error handlers of an error
   * @param error Error object
   */
  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (error) {
        logger.error('Error in error handler:', error);
      }
    });
  }
}

/**
 * Create a safe WebSocket connection with proper URL construction
 * for the current environment
 * 
 * @param path WebSocket path (e.g., '/ws')
 * @param options Connection options
 * @returns SafeWebSocket instance
 */
export function createSafeWebSocket(
  path: string,
  options?: WebSocketOptions
): SafeWebSocket {
  // Determine protocol (ws/wss) based on current page protocol
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Create URL using current host and provided path
  const wsUrl = `${protocol}//${window.location.host}${path}`;
  // Create and return the SafeWebSocket instance
  return new SafeWebSocket(wsUrl, undefined, options);
}