/**
 * Vite HMR WebSocket Interceptor
 * 
 * This utility addresses the specific issue with Vite's HMR WebSocket connections
 * in the Replit environment that causes unhandled promise rejections.
 * 
 * The root cause appears to be Vite attempting to connect to "localhost:undefined"
 * which our existing WebSocket fixes can't intercept early enough.
 */
import { createLogger } from './config';

const logger = createLogger('vite-hmr-fix');

/**
 * Patch global fetch and WebSocket to catch problematic Vite HMR initialization
 */
export function setupViteHmrInterceptor() {
  if (typeof window === 'undefined') return;

  try {
    // Track if we've already applied our patch
    const isPatched = (window as any).__viteHmrInterceptorApplied;
    if (isPatched) return;
    (window as any).__viteHmrInterceptorApplied = true;

    // 1. Patch the window.__HMR_PROTOCOL property which Vite reads
    Object.defineProperty(window, '__HMR_PROTOCOL', {
      value: window.location.protocol === 'https:' ? 'wss' : 'ws',
      writable: false,
      configurable: true
    });

    // 2. Patch the window.__HMR_HOSTNAME property which Vite reads
    Object.defineProperty(window, '__HMR_HOSTNAME', {
      value: window.location.host,
      writable: false,
      configurable: true
    });

    // 3. Monitor network requests to intercept Vite's WebSocket connections
    const originalWebSocket = window.WebSocket;
    window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
      // Convert URL object to string for inspection
      const urlStr = url.toString();

      // Check if this is a Vite HMR WebSocket connection with issues
      if (urlStr.includes('vite') && urlStr.includes('localhost:undefined')) {
        logger.warn('Intercepted problematic Vite HMR WebSocket URL:', urlStr);
        
        // Create correct URL using current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const fixedUrl = `${protocol}//${host}${new URL(urlStr).pathname}`;
        
        logger.info('Redirecting Vite HMR WebSocket to:', fixedUrl);
        
        // Call the original WebSocket with fixed URL
        return new originalWebSocket(fixedUrl, protocols);
      }
      
      // Pass through normal WebSocket connections
      return new originalWebSocket(url, protocols);
    } as any;
    
    // Ensure static properties are accessible
    // We need to use any type to work around TypeScript's readonly constraints
    // because we're doing low-level patching that TypeScript doesn't allow
    const customWebSocket = window.WebSocket as any;
    customWebSocket.CONNECTING = originalWebSocket.CONNECTING;
    customWebSocket.OPEN = originalWebSocket.OPEN;
    customWebSocket.CLOSING = originalWebSocket.CLOSING;
    customWebSocket.CLOSED = originalWebSocket.CLOSED;
    
    // 4. Also intercept direct script injections with localhost:undefined
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeName === 'SCRIPT') {
              const scriptEl = node as HTMLScriptElement;
              if (scriptEl.src && scriptEl.src.includes('localhost:undefined')) {
                const oldSrc = scriptEl.src;
                const newSrc = oldSrc.replace(
                  /https?:\/\/localhost:undefined/g, 
                  window.location.origin
                );
                logger.info('Fixed script src from', oldSrc, 'to', newSrc);
                scriptEl.src = newSrc;
              }
            }
          });
        }
      });
    });
    
    // Start monitoring DOM changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    logger.info('Vite HMR interceptor installed successfully');
  } catch (error) {
    logger.error('Failed to install Vite HMR interceptor:', error);
  }
}

// Install the interceptor immediately
setupViteHmrInterceptor();