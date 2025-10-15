import { describe, it, expect, afterEach } from 'vitest';
import { mountOverlay } from '../src/overlay';

describe('Overlay', () => {
  afterEach(() => {
    if (!document.body) {
      const body = document.createElement('body');
      document.documentElement.appendChild(body);
    }
    const existing = document.getElementById('__firsttx_prepaint__');
    if (existing) existing.remove();
  });

  it('should not throw when document.body is unavailable', () => {
    document.body?.remove();
    expect(() => mountOverlay('<div>test</div>')).not.toThrow();
  });
});
