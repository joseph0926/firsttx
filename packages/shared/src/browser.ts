import { DANGEROUS_ATTRIBUTES, DANGEROUS_HTML_TAGS } from './constants';

export function supportsViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof document.startViewTransition === 'function'
  );
}

export function getCurrentOrigin(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const { location } = window;
    if (location?.origin && location.origin !== 'null') {
      return location.origin;
    }
  } catch {
    // Security error in cross-origin context
  }

  return null;
}

export type SanitizeOptions = {
  allowedTags?: string[];
  allowedAttributes?: string[];
  removeScripts?: boolean;
  removeEventHandlers?: boolean;
};

const DEFAULT_SANITIZE_OPTIONS: Required<SanitizeOptions> = {
  allowedTags: [],
  allowedAttributes: [],
  removeScripts: true,
  removeEventHandlers: true,
};

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

function fallbackSanitize(html: string, options: Required<SanitizeOptions>): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  if (options.removeScripts) {
    const dangerousTags = DANGEROUS_HTML_TAGS.filter((tag) => !options.allowedTags.includes(tag));
    dangerousTags.forEach((tag) => {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    });
  }

  if (options.removeEventHandlers) {
    const allElements = doc.body.querySelectorAll('*');
    const dangerousAttrs = DANGEROUS_ATTRIBUTES.filter(
      (attr) => !options.allowedAttributes.includes(attr),
    );

    allElements.forEach((el) => {
      dangerousAttrs.forEach((attr) => {
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
  }

  doc.querySelectorAll('a[href^="javascript:"]').forEach((el) => {
    el.removeAttribute('href');
  });

  return doc.body.innerHTML;
}

export async function sanitizeHTML(html: string, options: SanitizeOptions = {}): Promise<string> {
  const mergedOptions = { ...DEFAULT_SANITIZE_OPTIONS, ...options };

  const DOMPurify = await tryLoadDOMPurify();

  if (DOMPurify) {
    return DOMPurify.sanitize(html, {
      FORBID_TAGS: mergedOptions.removeScripts
        ? DANGEROUS_HTML_TAGS.filter((tag) => !mergedOptions.allowedTags.includes(tag))
        : [],
      FORBID_ATTR: mergedOptions.removeEventHandlers
        ? DANGEROUS_ATTRIBUTES.filter((attr) => !mergedOptions.allowedAttributes.includes(attr))
        : [],
      ALLOW_DATA_ATTR: false,
      ALLOW_ARIA_ATTR: true,
    });
  }

  return fallbackSanitize(html, mergedOptions);
}

export function sanitizeHTMLSync(html: string, options: SanitizeOptions = {}): string {
  const mergedOptions = { ...DEFAULT_SANITIZE_OPTIONS, ...options };
  return fallbackSanitize(html, mergedOptions);
}

export async function safeSetInnerHTML(
  container: HTMLElement,
  html: string,
  options: SanitizeOptions = {},
): Promise<void> {
  const sanitized = await sanitizeHTML(html, options);
  container.innerHTML = sanitized;
}

export function safeSetInnerHTMLSync(
  container: HTMLElement,
  html: string,
  options: SanitizeOptions = {},
): void {
  const sanitized = sanitizeHTMLSync(html, options);
  container.innerHTML = sanitized;
}

export type PostMessageOptions = {
  targetOrigin?: string;
  transfer?: Transferable[];
};

export function safePostMessage(
  target: Window,
  message: unknown,
  options: PostMessageOptions = {},
): boolean {
  const { targetOrigin, transfer } = options;

  const origin = targetOrigin ?? getCurrentOrigin();

  if (!origin) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[FirstTx] Cannot determine origin for postMessage, skipping');
    }
    return false;
  }

  try {
    if (transfer && transfer.length > 0) {
      target.postMessage(message, origin, transfer);
    } else {
      target.postMessage(message, origin);
    }
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[FirstTx] Failed to post message:', error);
    }
    return false;
  }
}

export function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    const reason = signal.reason instanceof Error ? signal.reason : new Error('Aborted');
    return Promise.reject(reason);
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      clearTimeout(timer);
      const reason = signal?.reason instanceof Error ? signal.reason : new Error('Aborted');
      cleanup();
      reject(reason);
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
