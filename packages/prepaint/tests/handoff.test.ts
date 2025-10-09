import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handoff } from '../src/handoff';

describe('handoff', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-prepaint');
    document.documentElement.removeAttribute('data-prepaint-timestamp');
    vi.restoreAllMocks();
  });

  it('should return "cold-start" when no prepaint attribute', () => {
    const result = handoff();

    expect(result).toBe('cold-start');
  });

  it('should return "has-prepaint" when attribute exists', () => {
    document.documentElement.setAttribute('data-prepaint', '');

    const result = handoff();

    expect(result).toBe('has-prepaint');
  });

  it('should log age in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleLogSpy = vi.spyOn(console, 'log');
    const timestamp = Date.now() - 5000;

    document.documentElement.setAttribute('data-prepaint', '');
    document.documentElement.setAttribute('data-prepaint-timestamp', String(timestamp));

    handoff();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[FirstTx] Prepaint detected'),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('age:'));

    process.env.NODE_ENV = originalEnv;
  });

  it('should not log in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const consoleLogSpy = vi.spyOn(console, 'log');
    const timestamp = Date.now() - 5000;

    document.documentElement.setAttribute('data-prepaint', '');
    document.documentElement.setAttribute('data-prepaint-timestamp', String(timestamp));

    handoff();

    expect(consoleLogSpy).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle missing timestamp gracefully', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const consoleLogSpy = vi.spyOn(console, 'log');
    document.documentElement.setAttribute('data-prepaint', '');

    expect(() => handoff()).not.toThrow();
    expect(consoleLogSpy).toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
