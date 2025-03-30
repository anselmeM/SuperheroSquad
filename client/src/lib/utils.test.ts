import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('text-red-500', 'bg-blue-200', 'p-4');
    expect(result).toBe('text-red-500 bg-blue-200 p-4');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const result = cn(
      'base-class',
      isActive && 'active-class',
      !isActive && 'inactive-class'
    );
    expect(result).toBe('base-class active-class');
  });

  it('should handle falsy values', () => {
    const result = cn('base-class', false, null, undefined, 0, '');
    expect(result).toBe('base-class');
  });

  it('should resolve conflicts with tailwind classes', () => {
    // When conflicting classes are provided, the later ones should override
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['text-sm', 'font-bold'], 'text-center');
    expect(result).toBe('text-sm font-bold text-center');
  });

  it('should handle objects where keys are class names and values are booleans', () => {
    const result = cn({ 'text-primary': true, 'bg-accent': false, 'p-4': true });
    expect(result).toBe('text-primary p-4');
  });

  it('should handle complex combinations', () => {
    const isError = true;
    const isLarge = false;
    
    const result = cn(
      'base-class',
      {
        'text-error': isError,
        'text-success': !isError,
        'text-lg': isLarge,
        'text-sm': !isLarge
      },
      isLarge && ['p-6', 'mx-4'],
      !isLarge && ['p-2', 'mx-2']
    );
    
    expect(result).toBe('base-class text-error text-sm p-2 mx-2');
  });
});