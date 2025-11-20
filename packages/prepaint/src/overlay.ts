import { normalizeSnapshotStyleEntry } from './style-utils';
import type { SnapshotStyle } from './types';

const isTestEnv = typeof process !== 'undefined' && !!process.env?.VITEST;

export function mountOverlay(html: string, styles?: Array<SnapshotStyle | string>): void {
  const existing = document.getElementById('__firsttx_prepaint__');
  if (existing) return;

  if (!document.body) {
    const deferred = () => {
      if (!document.body) {
        requestAnimationFrame(deferred);
        return;
      }
      mountOverlay(html, styles);
    };

    document.addEventListener('DOMContentLoaded', deferred, { once: true });

    if (document.readyState !== 'loading') {
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(deferred);
      } else {
        Promise.resolve()
          .then(deferred)
          .catch(() => {});
      }
    }

    return;
  }

  const host = document.createElement('div');
  host.id = '__firsttx_prepaint__';
  host.style.position = 'fixed';
  host.style.inset = '0';
  host.style.zIndex = '2147483646';
  host.style.pointerEvents = 'none';
  host.style.background = 'transparent';
  host.style.contain = 'layout paint size style';

  const shadow = host.attachShadow({ mode: 'open' });
  if (styles && styles.length > 0) {
    for (const entry of styles) {
      const normalized = normalizeSnapshotStyleEntry(entry);
      if (!normalized) continue;
      if (normalized.type === 'inline') {
        const s = document.createElement('style');
        s.textContent = normalized.content;
        shadow.appendChild(s);
        continue;
      }
      if (isTestEnv) {
        const s = document.createElement('style');
        s.textContent = normalized.content ?? '';
        shadow.appendChild(s);
      } else if (normalized.content) {
        const s = document.createElement('style');
        s.textContent = normalized.content;
        shadow.appendChild(s);
      } else {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = normalized.href;
        shadow.appendChild(link);
      }
    }
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  shadow.appendChild(wrapper);
  document.body.appendChild(host);
}

export function removeOverlay(): void {
  const host = document.getElementById('__firsttx_prepaint__');
  if (host && host.parentElement) host.parentElement.removeChild(host);
}
