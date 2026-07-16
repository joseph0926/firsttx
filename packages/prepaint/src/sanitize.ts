import { DANGEROUS_ATTRIBUTES, DANGEROUS_HTML_TAGS } from '@firsttx/shared';

type DOMPurifyLike = {
  sanitize: (html: string, config?: Record<string, unknown>) => string;
};

let cachedDOMPurify: DOMPurifyLike | null | undefined = undefined;
const DANGEROUS_ATTRIBUTE_SET = new Set<string>(DANGEROUS_ATTRIBUTES);
const URL_ATTRIBUTE_SET = new Set([
  'action',
  'background',
  'cite',
  'formaction',
  'href',
  'poster',
  'src',
  'xlink:href',
]);
const RASTER_DATA_URL_PATTERN =
  /^data:image\/(?:png|jpeg|gif|webp|avif);base64,(?=[a-z0-9+/])((?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?)$/i;

function isUnsafeAttributeUrl(rawValue: string): boolean {
  const value = rawValue.trim();
  const separatorIndex = value.indexOf(':');

  if (separatorIndex < 0) {
    return false;
  }

  const scheme = value
    .slice(0, separatorIndex)
    .replace(/[\u0000-\u0020\u007f]+/g, '')
    .toLowerCase();

  if (scheme === 'javascript' || scheme === 'vbscript') {
    return true;
  }

  return scheme === 'data' && !RASTER_DATA_URL_PATTERN.test(value);
}

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

  if (!doc.body) {
    return '';
  }
  const allElements = doc.body.querySelectorAll('*');
  allElements.forEach((el) => {
    const attributes = Array.from(el.attributes);
    attributes.forEach((attr) => {
      const attrName = attr.name.toLowerCase();
      if (DANGEROUS_ATTRIBUTE_SET.has(attrName) || attrName.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }
      if (URL_ATTRIBUTE_SET.has(attrName) && isUnsafeAttributeUrl(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });

  return doc.body.innerHTML;
}

export async function sanitizeSnapshotHTML(html: string): Promise<string> {
  const DOMPurify = await tryLoadDOMPurify();

  if (DOMPurify) {
    const sanitized = DOMPurify.sanitize(html, {
      FORBID_TAGS: [...DANGEROUS_HTML_TAGS],
      FORBID_ATTR: [...DANGEROUS_ATTRIBUTES],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: true,
    });

    return fallbackSanitize(sanitized);
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
