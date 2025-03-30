import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll } from 'vitest';

// Mock global.fetch for server tests
if (typeof window === 'undefined') {
  global.fetch = vi.fn();
}

// Silence console warnings/errors during tests
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});