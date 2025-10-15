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

  it('injects inline and external styles into the overlay shadow root', () => {
    mountOverlay('<div class="from-inline from-external">test</div>', [
      { type: 'inline', content: '.from-inline { color: red; }' },
      { type: 'external', href: 'https://example.com/styles.css' },
    ]);
    const host = document.getElementById('__firsttx_prepaint__');
    expect(host).toBeTruthy();
    const shadow = host!.shadowRoot;
    expect(shadow).toBeTruthy();
    const styleEls = shadow!.querySelectorAll('style');
    expect(styleEls.length).toBeGreaterThan(0);
    expect(Array.from(styleEls)[0].textContent).toBe('.from-inline { color: red; }');
    const link = shadow!.querySelector('link[rel="stylesheet"]');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBe('https://example.com/styles.css');
  });
});
