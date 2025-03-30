/**
 * HMR Connection Fix
 * 
 * This module provides a solution for Vite's HMR WebSocket connection issue in Replit
 * where it tries to connect to 'wss://localhost:undefined' instead of the correct host.
 *
 * We implement a direct approach that works globally for all Vite HMR connections.
 */

// Only run in development mode and in browser context
if (import.meta.env.DEV && typeof window !== 'undefined') {
  console.info('[HMR Fix] Initializing Vite HMR connection fix');

  /**
   * This function creates a script element that will be injected into the page
   * The script rewrites problematic WebSocket URLs at runtime
   */
  const createFixScript = () => {
    const script = document.createElement('script');
    
    // Define the fix as a string - this avoids TypeScript analyzing the string content
    const fixCode = [
      '// Fix for Vite HMR WebSocket connection issues',
      '(function() {',
      '  // Store original WebSocket constructor',
      '  var OriginalWebSocket = window.WebSocket;',
      '',
      '  // Create a replacement constructor function',
      '  function FixedWebSocket(url, protocols) {',
      '    if (typeof url === "string" && url.includes("localhost:undefined")) {',
      '      var tokenMatch = url.match(/\\?token=([^&]+)/);',
      '      var token = tokenMatch ? tokenMatch[1] : "";',
      '      ',
      '      var protocol = window.location.protocol === "https:" ? "wss:" : "ws:";',
      '      var host = window.location.host;',
      '      var newUrl = protocol + "//" + host + (token ? "?token=" + token : "");',
      '      ',
      '      console.info("[HMR Fix] Fixed WebSocket URL: " + url + " → " + newUrl);',
      '      return new OriginalWebSocket(newUrl, protocols);',
      '    }',
      '    ',
      '    return new OriginalWebSocket(url, protocols);',
      '  }',
      '',
      '  // Copy prototype',
      '  FixedWebSocket.prototype = OriginalWebSocket.prototype;',
      '',
      '  // Copy static properties',
      '  FixedWebSocket.CONNECTING = OriginalWebSocket.CONNECTING;',
      '  FixedWebSocket.OPEN = OriginalWebSocket.OPEN;',
      '  FixedWebSocket.CLOSING = OriginalWebSocket.CLOSING;',
      '  FixedWebSocket.CLOSED = OriginalWebSocket.CLOSED;',
      '',
      '  // Replace WebSocket constructor',
      '  window.WebSocket = FixedWebSocket;',
      '',
      '  console.info("[HMR Fix] WebSocket constructor patched successfully");',
      '})();'
    ].join('\n');
    
    script.textContent = fixCode;
    return script;
  };

  // Inject our fix script at the beginning of the document head
  const fixScript = createFixScript();
  if (document.head.firstChild) {
    document.head.insertBefore(fixScript, document.head.firstChild);
  } else {
    document.head.appendChild(fixScript);
  }
  
  console.info('[HMR Fix] Injected WebSocket fix script');
}

// This empty export makes TypeScript treat this file as a module
export {};