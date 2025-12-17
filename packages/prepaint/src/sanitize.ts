import { DANGEROUS_ATTRIBUTES, DANGEROUS_HTML_TAGS } from '@firsttx/shared';

type DOMPurifyLike = {
  sanitize: (html: string, config?: Record<string, unknown>) => string;
};

let cachedDOMPurify: DOMPurifyLike | null | undefined = undefined;

async function tryLoadDOMPurify(): Promise<DOMPurifyLike | null> {
  if (cachedDOMPurify !== undefined) {
    return cachedDOMPurify;
  }

  try {
    const module = await import('dompurify');
    cachedDOMPurify = module.default || module;
    return cachedDOMPurify;
  } catch {
    cachedDOMPurify = null;
    return null;
  }
}

function fallbackSanitize(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  DANGEROUS_HTML_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  });

  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el) => {
    DANGEROUS_ATTRIBUTES.forEach((attr) => {
      if (el.hasAttribute(attr)) {
        el.removeAttribute(attr);
      }
    });

    const attributes = Array.from(el.attributes);
    attributes.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
      const value = attr.value.toLowerCase().trim();
      if (value.startsWith('javascript:') || value.startsWith('data:text/html')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  doc.querySelectorAll('a[href^="javascript:"]').forEach((el) => {
    el.removeAttribute('href');
  });

  return doc.body.innerHTML;
}

export async function sanitizeSnapshotHTML(html: string): Promise<string> {
  const DOMPurify = await tryLoadDOMPurify();

  if (DOMPurify) {
    return DOMPurify.sanitize(html, {
      FORBID_TAGS: [...DANGEROUS_HTML_TAGS],
      FORBID_ATTR: [...DANGEROUS_ATTRIBUTES],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: true,
    });
  }

  return fallbackSanitize(html);
}

export function sanitizeSnapshotHTMLSync(html: string): string {
  return fallbackSanitize(html);
}

export async function safeSetInnerHTML(container: HTMLElement, html: string): Promise<void> {
  const sanitized = await sanitizeSnapshotHTML(html);
  container.innerHTML = sanitized;
}

export function safeSetInnerHTMLSync(container: HTMLElement, html: string): void {
  const sanitized = sanitizeSnapshotHTMLSync(html);
  container.innerHTML = sanitized;
}
