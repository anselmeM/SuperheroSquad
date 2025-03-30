import { describe, it, expect } from 'vitest';

describe('Basic test suite', () => {
  it('should add two numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should concatenate strings correctly', () => {
    expect('hello ' + 'world').toBe('hello world');
  });
});