import { describe, it, expect, afterEach } from 'vitest';
import { mountOverlay, removeOverlay } from '../src/overlay';

describe('Overlay', () => {
  afterEach(() => {
    removeOverlay();
    if (!document.body) {
      const body = document.createElement('body');
      document.documentElement.appendChild(body);
    }
  });

  it('should not throw when document.body is unavailable', () => {
    document.body?.remove();
    expect(() => mountOverlay('<div>test</div>')).not.toThrow();
  });

  it('cancels a deferred mount when handoff finishes before body exists', () => {
    document.body?.remove();
    mountOverlay('<div>test</div>');
    removeOverlay();
    const body = document.createElement('body');
    document.documentElement.appendChild(body);
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(document.getElementById('__firsttx_prepaint__')).toBeNull();
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
    const styles = Array.from(styleEls).map((s) => s.textContent);
    expect(styles.some((t) => t === '.from-inline { color: red; }')).toBe(true);
    // In test env external styles are inlined to avoid network fetches
    expect(styles.some((t) => t === '' || t === null)).toBe(true);
  });
});
