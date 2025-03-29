import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Vite configuration for server-side bundle
 * 
 * This configuration is used for building the server-side code
 * and is separate from the client-side Vite configuration.
 * 
 * It's designed to:
 * 1. Bundle all server code into a single file
 * 2. Exclude node_modules dependencies
 * 3. Preserve the same path aliases used in the client config
 */
export default defineConfig({
  // Using build.lib instead of the standard build configuration
  // as it's more suitable for a Node.js application
  build: {
    lib: {
      entry: resolve(__dirname, 'server/index.ts'),
      formats: ['es'],
      fileName: () => 'index.js',
    },
    outDir: 'dist',
    // Skip minification for Node.js code
    minify: false,
    // Don't bundle dependencies
    rollupOptions: {
      external: [
        // Node.js built-ins
        'path',
        'fs',
        'http',
        'https',
        'url',
        'util',
        'crypto',
        'os',
        'stream',
        'zlib',
        'events',
        'buffer',
        'string_decoder',
        'querystring',
        'child_process',
        // Third-party packages
        /^express/,
        /^ws/,
        /^node-fetch/,
        /^cors/,
        // Add any other dependencies that should be excluded
      ],
      output: {
        // Global variables for the external modules
        globals: {
          express: 'express',
          ws: 'ws',
          'node-fetch': 'fetch',
          cors: 'cors',
          path: 'path',
          fs: 'fs',
          http: 'http',
          https: 'https',
          url: 'url',
          // Add any other globals needed
        },
      },
    },
    // Copy necessary files to the output directory
    copyPublicDir: false,
    // Ensure good source map for debugging
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
    },
  },
  // Use a plugin to handle Node.js-specific features
  plugins: [
    // Fix common issues with Node.js ESM compatibility
    {
      name: 'node-esm-fix',
      transform(code, id) {
        // Convert __dirname and __filename references
        if (id.includes('server/') && (code.includes('__dirname') || code.includes('__filename'))) {
          const fileUrlCode = `
            import { fileURLToPath } from 'url';
            import { dirname } from 'path';
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
          `;
          return fileUrlCode + code;
        }
        return null;
      },
    },
  ],
});