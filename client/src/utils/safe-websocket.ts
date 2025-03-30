/**
 * Safe WebSocket implementation that prevents unhandled promise rejections
 * and provides better error handling
 */
import { createLogger } from './config';

const logger = createLogger('websocket');

type MessageHandler = (data: any) => void;
type ErrorHandler = (error: Event | Error) => void;
type ConnectionHandler = () => void;

interface WebSocketOptions {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  autoReconnect?: boolean;
}

/**
 * A reliable WebSocket wrapper with built-in reconnection logic
 */
export class SafeWebSocket {
  private socket: WebSocket | null = null;
  private url: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  
  /**
   * Creates a new SafeWebSocket instance
   * 
   * @param url The WebSocket URL to connect to
   * @param options Configuration options
   */
  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.reconnectDelay = options.reconnectDelay || 1000; // 1 second
    this.shouldReconnect = options.autoReconnect !== false;
    
    // Don't auto-connect in constructor to prevent unhandled rejections
    // Call connect() explicitly
  }
  
  /**
   * Establishes the WebSocket connection
   * 
   * @returns A promise that resolves when the connection is established
   */
  async connect(): Promise<boolean> {
    // Prevent multiple connections
    if (this.isConnecting) {
      return false;
    }
    
    if (this.socket?.readyState === WebSocket.OPEN) {
      return true;
    }
    
    this.isConnecting = true;
    
    try {
      // Create a new WebSocket connection
      logger.debug(`Connecting to WebSocket at ${this.url}`);
      
      return new Promise<boolean>((resolve, reject) => {
        try {
          this.socket = new WebSocket(this.url);
          
          // Handle the connection established event
          this.socket.onopen = () => {
            logger.debug('WebSocket connection established');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            this.notifyConnectHandlers();
            resolve(true);
          };
          
          // Handle incoming messages
          this.socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              this.notifyMessageHandlers(data);
            } catch (error) {
              logger.error('Error parsing WebSocket message:', error);
            }
          };
          
          // Handle connection errors
          this.socket.onerror = (event) => {
            logger.error('WebSocket error:', event);
            this.notifyErrorHandlers(event);
            // Don't resolve or reject here, let onclose handle it
          };
          
          // Handle connection closure
          this.socket.onclose = (event) => {
            logger.debug(`WebSocket closed: code=${event.code}, clean=${event.wasClean}`);
            this.socket = null;
            this.isConnecting = false;
            
            // Try to reconnect if appropriate
            if (this.shouldReconnect && !event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
              this.scheduleReconnect();
              // Resolve with false to indicate connection was lost but reconnect scheduled
              resolve(false);
            } else {
              // Connection closed without reconnect
              reject(new Error(`WebSocket connection closed: ${event.code}`));
            }
          };
          
          // Handle initial timeout
          setTimeout(() => {
            if (this.socket?.readyState !== WebSocket.OPEN) {
              logger.warn('WebSocket connection timed out');
              this.notifyErrorHandlers(new Error('Connection timed out'));
              // Let onclose handle the cleanup
            }
          }, 10000); // 10 second timeout
        } catch (error) {
          logger.error('Error creating WebSocket:', error);
          this.isConnecting = false;
          this.notifyErrorHandlers(error as Error);
          reject(error);
        }
      });
    } catch (error) {
      logger.error('Error in connect method:', error);
      this.isConnecting = false;
      return false;
    }
  }
  
  /**
   * Schedules a reconnection attempt
   */
  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
    
    logger.debug(`Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectTimer = setTimeout(() => {
      logger.debug('Attempting to reconnect...');
      this.connect().catch(error => {
        logger.error('Reconnection failed:', error);
      });
    }, delay);
  }
  
  /**
   * Sends a message through the WebSocket
   * 
   * @param data The data to send
   * @returns True if the message was sent, false otherwise
   */
  send(data: any): boolean {
    try {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        logger.warn('Cannot send message: WebSocket not connected');
        return false;
      }
      
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  /**
   * Closes the WebSocket connection
   */
  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.shouldReconnect = false;
    
    if (this.socket) {
      try {
        this.socket.close(1000, 'Closed by client');
        this.socket = null;
      } catch (error) {
        logger.error('Error closing WebSocket:', error);
      }
    }
  }
  
  /**
   * Registers a handler for incoming messages
   * 
   * @param handler The message handler function
   * @returns This instance for chaining
   */
  onMessage(handler: MessageHandler): SafeWebSocket {
    this.messageHandlers.add(handler);
    return this;
  }
  
  /**
   * Registers a handler for connection errors
   * 
   * @param handler The error handler function
   * @returns This instance for chaining
   */
  onError(handler: ErrorHandler): SafeWebSocket {
    this.errorHandlers.add(handler);
    return this;
  }
  
  /**
   * Registers a handler for successful connections
   * 
   * @param handler The connection handler function
   * @returns This instance for chaining
   */
  onConnect(handler: ConnectionHandler): SafeWebSocket {
    this.connectHandlers.add(handler);
    return this;
  }
  
  /**
   * Notifies all registered message handlers
   * 
   * @param data The message data
   */
  private notifyMessageHandlers(data: any) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        logger.error('Error in message handler:', error);
      }
    });
  }
  
  /**
   * Notifies all registered error handlers
   * 
   * @param error The error event or object
   */
  private notifyErrorHandlers(error: Event | Error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        logger.error('Error in error handler:', handlerError);
      }
    });
  }
  
  /**
   * Notifies all registered connection handlers
   */
  private notifyConnectHandlers() {
    this.connectHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        logger.error('Error in connect handler:', error);
      }
    });
  }
  
  /**
   * Gets the current connection state
   * 
   * @returns True if the WebSocket is connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}