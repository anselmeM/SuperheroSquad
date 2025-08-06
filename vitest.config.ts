import { defineConfig } from 'vitest/config';
import { mergeConfig } from 'vite';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import viteConfig from './vite.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: __dirname, // Override the root from vite.config.ts
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['./vitest.setup.ts'],
      include: [
        './client/src/**/*.{test,spec}.{ts,tsx,js,jsx}',
        './server/**/*.{test,spec}.{ts,tsx,js,jsx}',
        './*.{test,spec}.{ts,tsx,js,jsx}'
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.d.ts',
          '**/index.ts',
          '**/*.config.ts',
        ]
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client', 'src'),
        '@shared': path.resolve(__dirname, 'shared'),
      },
    }
  })
);