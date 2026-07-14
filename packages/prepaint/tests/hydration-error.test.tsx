import { describe, expect, it } from 'vitest';
import { HydrationError } from '../src/errors';

describe('HydrationError', () => {
  it('creates a typed recoverable error', () => {
    const cause = new Error('React hydration mismatch');
    const error = new HydrationError('Mismatch detected', 'content', cause);

    expect(error).toBeInstanceOf(HydrationError);
    expect(error.name).toBe('HydrationError');
    expect(error.message).toBe('Mismatch detected');
    expect(error.mismatchType).toBe('content');
    expect(error.cause).toBe(cause);
    expect(error.isRecoverable()).toBe(true);
  });

  it('provides user and debug messages for legacy consumers', () => {
    const error = new HydrationError('Hydration failed', 'content', new Error('Text mismatch'));

    expect(error.getUserMessage()).toContain('Page content has been updated');
    expect(error.getDebugInfo()).toContain('[HydrationError]');
    expect(error.getDebugInfo()).toContain('content mismatch');
    expect(error.getDebugInfo()).toContain('Text mismatch');
  });

  it('retains all mismatch type values for compatibility', () => {
    expect(new HydrationError('Content', 'content', new Error()).mismatchType).toBe('content');
    expect(new HydrationError('Attribute', 'attribute', new Error()).mismatchType).toBe(
      'attribute',
    );
    expect(new HydrationError('Structure', 'structure', new Error()).mismatchType).toBe(
      'structure',
    );
  });
});
