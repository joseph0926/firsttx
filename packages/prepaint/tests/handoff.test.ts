import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handoff } from '../src/handoff';

describe('handoff', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
    document.documentElement.removeAttribute('data-prepaint-overlay');
    vi.restoreAllMocks();
  });

  it('returns "cold-start" when no prepaint attribute', () => {
    const result = handoff();
    expect(result).toBe('cold-start');
  });

  it('returns "has-prepaint" when attribute exists', () => {
    document.documentElement.setAttribute('data-prepaint', 'true');
    const result = handoff();
    expect(result).toBe('has-prepaint');
  });

  it('does not throw when timestamp is missing', () => {
    document.documentElement.setAttribute('data-prepaint', 'true');
    expect(() => handoff()).not.toThrow();
  });
});
