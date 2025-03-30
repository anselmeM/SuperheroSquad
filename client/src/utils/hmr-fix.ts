/**
 * Utility to fix Vite HMR WebSocket connection issues
 * This addresses potential unhandled promise rejections when Vite HMR
 * tries to connect to an invalid WebSocket URL
 */
import { createLogger } from './config';

const logger = createLogger('vite-hmr-fix');

/**
 * Fix Vite HMR WebSocket issues in Replit environment
 */
export function setupViteHmrFix() {
  if (typeof window === 'undefined') return;

  try {
    const originalCreateElement = document.createElement;
    
    // Patch document.createElement to intercept script elements
    // This allows us to fix issues with Vite's HMR scripts
    document.createElement = function(tagName: string, options?: ElementCreationOptions): HTMLElement {
      const element = originalCreateElement.call(document, tagName, options);
      
      if (tagName.toLowerCase() === 'script') {
        // Watch for script src changes that might be related to Vite HMR
        const originalSetter = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src')?.set;
        
        if (originalSetter) {
          Object.defineProperty(element, 'src', {
            set(value: string) {
              // Intercept and fix problematic HMR URLs
              if (typeof value === 'string' && value.includes('vite/client') && value.includes('localhost:undefined')) {
                logger.warn('Intercepted problematic Vite HMR URL:', value);
                
                // Fix the URL to use the current host instead of localhost:undefined
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                const fixedValue = value.replace(
                  /localhost:undefined/g, 
                  host
                ).replace(
                  /ws:/g,
                  protocol
                );
                
                logger.info('Fixed Vite HMR URL:', fixedValue);
                originalSetter.call(this, fixedValue);
              } else {
                // Pass through normal URLs
                originalSetter.call(this, value);
              }
            },
            get() {
              return this.getAttribute('src') || '';
            },
            configurable: true
          });
        }
      }
      
      return element;
    };
    
    logger.info('Vite HMR fix applied successfully');
  } catch (error) {
    logger.error('Failed to apply Vite HMR fix:', error);
  }
}

// Apply the fix immediately
setupViteHmrFix();