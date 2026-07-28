import { DANGEROUS_ATTRIBUTES } from '@firsttx/shared';

type DOMPurifyLike = {
  sanitize: (html: string, config?: Record<string, unknown>) => string;
};

/**
 * snapshot은 비대화형 overlay로만 재생된다. 따라서 제거 대상은
 * "코드를 실행하거나 원격 리소스를 불러오는 태그"로 한정한다.
 * form control은 그 자체로 위험하지 않고, 제거하면 복원된 화면에서
 * 버튼·입력창이 통째로 사라진다. 대신 아래 STRIPPED_ATTRIBUTES가
 * 제출·이동 경로를 끊는다.
 */
const SNAPSHOT_FORBIDDEN_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'frame',
  'frameset',
  'meta',
  'link',
  'base',
] as const;

/**
 * overlay는 클릭될 수 없어야 하지만 그 보장이 CSS(`pointer-events: none`)에만
 * 있으면 캡처된 inline style이나 stylesheet가 되돌릴 수 있다. 이동·제출 대상을
 * 속성 수준에서 제거해 클릭이 가능해져도 갈 곳이 없게 만든다.
 */
const STRIPPED_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'action',
  'formaction',
  'method',
  'formmethod',
  'target',
  'formtarget',
  'autocomplete',
]);

let cachedDOMPurify: DOMPurifyLike | null | undefined = undefined;
const DANGEROUS_ATTRIBUTE_SET = new Set<string>(DANGEROUS_ATTRIBUTES);
const URL_ATTRIBUTE_SET = new Set(['background', 'cite', 'poster', 'src']);
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

function stripInteractiveStyle(value: string): string {
  return value
    .split(';')
    .filter((decl) => decl.slice(0, decl.indexOf(':')).trim().toLowerCase() !== 'pointer-events')
    .join(';');
}

function fallbackSanitize(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  SNAPSHOT_FORBIDDEN_TAGS.forEach((tag) => {
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
      if (
        DANGEROUS_ATTRIBUTE_SET.has(attrName) ||
        STRIPPED_ATTRIBUTES.has(attrName) ||
        attrName.startsWith('on')
      ) {
        el.removeAttribute(attr.name);
        return;
      }
      if (attrName === 'style') {
        el.setAttribute(attr.name, stripInteractiveStyle(attr.value));
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
      FORBID_TAGS: [...SNAPSHOT_FORBIDDEN_TAGS],
      FORBID_ATTR: [...DANGEROUS_ATTRIBUTES, ...STRIPPED_ATTRIBUTES],
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
