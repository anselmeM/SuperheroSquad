/**
 * HMR Connection Fix for Vite in Replit
 * 
 * This module directly patches the Vite HMR client code to fix the WebSocket connection issue
 * where it attempts to connect to 'wss://localhost:undefined' instead of the correct host.
 *
 * Our approach is to create custom `setupHMR` and `moduleDirective` function overrides that
 * will be injected before the Vite HMR client is loaded, effectively replacing its
 * WebSocket connection logic.
 */

// Only run in development mode and in browser context
if (import.meta.env.DEV && typeof window !== 'undefined') {
  console.info('[HMR Fix] Initializing direct Vite HMR patch');

  // Create a script element with an inline script that runs before Vite's client
  const script = document.createElement('script');
  
  // This code directly targets Vite's HMR client by its module ID pattern
  script.textContent = `
    (function() {
      console.info('[HMR Fix] Preparing Vite client patch');
      
      // Intercept dynamic imports to patch the Vite client before it executes
      const originalImport = window.import;
      window.import = function(url) {
        // Check if this is the Vite client module
        if (url && typeof url === 'string' && url.includes('@vite/client')) {
          console.info('[HMR Fix] Intercepted Vite client import:', url);
          
          // Return our patched version of the client
          return originalImport(url).then(module => {
            // Store the original functions we need to patch
            const originalCreateWebSocket = module.setupWebSocket;
            
            if (originalCreateWebSocket) {
              // Replace the WebSocket setup function
              module.setupWebSocket = function(serverUrl, hmr) {
                console.info('[HMR Fix] Patching WebSocket creation');
                
                // Validate and fix the server URL if needed
                if (serverUrl && serverUrl.includes('localhost:undefined')) {
                  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                  const host = window.location.host;
                  
                  // Extract the path and query from the original URL
                  let path = '/';
                  let query = '';
                  
                  try {
                    const urlObj = new URL(serverUrl);
                    path = urlObj.pathname || '/';
                    query = urlObj.search || '';
                  } catch (e) {
                    // If URL parsing fails, extract query params directly
                    const queryMatch = serverUrl.match(/\\?(.*)/);
                    if (queryMatch) query = '?' + queryMatch[1];
                  }
                  
                  // Construct the corrected WebSocket URL
                  const fixedUrl = \`\${protocol}//\${host}\${path}\${query}\`;
                  console.info('[HMR Fix] Replacing invalid WebSocket URL:', serverUrl, '→', fixedUrl);
                  serverUrl = fixedUrl;
                }
                
                // Call the original function with our fixed URL
                return originalCreateWebSocket(serverUrl, hmr);
              };
              
              console.info('[HMR Fix] Successfully patched Vite HMR client');
            } else {
              console.warn('[HMR Fix] Could not locate setupWebSocket function in Vite client');
            }
            
            return module;
          });
        }
        
        // For all other imports, use the original import function
        return originalImport.apply(this, arguments);
      };
      
      console.info('[HMR Fix] Import interceptor installed');
    })();
  `;
  
  // Add this script to the page before any other scripts
  if (document.head.firstChild) {
    document.head.insertBefore(script, document.head.firstChild);
  } else {
    document.head.appendChild(script);
  }
  
  console.info('[HMR Fix] Injected Vite client patch script');
}

// Empty export to make TypeScript treat this as a module
export {};