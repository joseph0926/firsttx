export function mountOverlay(html: string, styles?: string[]): void {
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
    for (const css of styles) {
      const s = document.createElement('style');
      s.textContent = css;
      shadow.appendChild(s);
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
