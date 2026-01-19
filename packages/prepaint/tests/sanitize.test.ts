import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  sanitizeSnapshotHTML,
  sanitizeSnapshotHTMLSync,
  safeSetInnerHTML,
  safeSetInnerHTMLSync,
} from '../src/sanitize';

/**
 * Sanitization tests cover both sync (fallback-only) and async (DOMPurify/fallback) paths.
 *
 * - sanitizeSnapshotHTMLSync: Always uses built-in fallback sanitizer
 * - sanitizeSnapshotHTML: Uses DOMPurify if available, otherwise fallback
 *
 * DOMPurify IS installed in this monorepo (root package.json), so async tests
 * exercise the DOMPurify path. The fallback path is tested separately using
 * vi.doMock() to simulate DOMPurify being unavailable.
 */
describe('sanitize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fallbackSanitize (via sanitizeSnapshotHTMLSync)', () => {
    describe('dangerous tags removal', () => {
      it('removes script tags', () => {
        const html = '<div>Hello<script>alert("xss")</script>World</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
        expect(result).toContain('Hello');
        expect(result).toContain('World');
      });

      it('removes iframe tags', () => {
        const html = '<div><iframe src="evil.com"></iframe>Content</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('<iframe');
        expect(result).toContain('Content');
      });

      it('removes form tags', () => {
        const html = '<form action="/steal"><input type="text" /></form>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('<form');
        expect(result).not.toContain('<input');
      });

      it('removes object and embed tags', () => {
        const html = '<object data="malware.swf"></object><embed src="evil.swf" />';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('<object');
        expect(result).not.toContain('<embed');
      });

      it('removes meta and link tags', () => {
        const html =
          '<meta http-equiv="refresh" content="0;url=evil.com"><link rel="import" href="x">';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('<meta');
        expect(result).not.toContain('<link');
      });

      it('removes frame and frameset tags', () => {
        const html = '<frameset><frame src="evil.html"></frame></frameset>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('<frameset');
        expect(result).not.toContain('<frame');
      });
    });

    describe('dangerous attributes removal', () => {
      it('removes onclick attribute', () => {
        const html = '<div onclick="alert(1)">Click me</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('onclick');
        expect(result).toContain('Click me');
      });

      it('removes onload attribute', () => {
        const html = '<img src="x" onload="alert(1)" />';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('onload');
      });

      it('removes onerror attribute', () => {
        const html = '<img src="x" onerror="alert(1)" />';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('onerror');
      });

      it('removes onmouseover attribute', () => {
        const html = '<div onmouseover="alert(1)">Hover</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('onmouseover');
      });

      it('removes onfocus and onblur attributes', () => {
        const html = '<a onfocus="alert(1)" onblur="alert(2)">Link</a>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('onfocus');
        expect(result).not.toContain('onblur');
      });

      it('removes custom on* attributes', () => {
        const html = '<div oncustomevent="alert(1)" ondataload="x">Content</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('oncustomevent');
        expect(result).not.toContain('ondataload');
      });
    });

    describe('javascript: URL removal', () => {
      it('removes javascript: href', () => {
        const html = '<a href="javascript:alert(1)">Click</a>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('javascript:');
        expect(result).toContain('Click');
      });

      it('removes javascript: href with whitespace', () => {
        const html = '<a href="  javascript:alert(1)">Click</a>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('javascript:');
      });

      it('removes javascript: href case-insensitive', () => {
        const html = '<a href="JAVASCRIPT:alert(1)">Click</a>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('JAVASCRIPT:');
      });

      it('removes data:text/html URLs', () => {
        const html = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('data:text/html');
      });
    });

    describe('preserves safe content', () => {
      it('preserves regular div content', () => {
        const html = '<div class="container"><span>Hello World</span></div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('<div class="container">');
        expect(result).toContain('<span>Hello World</span>');
      });

      it('preserves img tags without event handlers', () => {
        const html = '<img src="image.png" alt="An image" />';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('<img');
        expect(result).toContain('src="image.png"');
        expect(result).toContain('alt="An image"');
      });

      it('preserves anchor tags with safe href', () => {
        const html = '<a href="https://example.com">Link</a>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('<a href="https://example.com">');
        expect(result).toContain('Link');
      });

      it('preserves data attributes except dangerous ones', () => {
        const html = '<div data-id="123" data-name="test">Content</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('data-id="123"');
        expect(result).toContain('data-name="test"');
      });

      it('preserves aria attributes', () => {
        // Note: button is in DANGEROUS_HTML_TAGS, so use div instead
        const html = '<div role="button" aria-label="Close" aria-hidden="false">X</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('aria-label="Close"');
        expect(result).toContain('aria-hidden="false"');
        expect(result).toContain('role="button"');
      });

      it('preserves style attribute', () => {
        const html = '<div style="color: red; font-size: 16px;">Styled</div>';
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('style="color: red; font-size: 16px;"');
      });
    });

    describe('complex cases', () => {
      it('handles nested dangerous content', () => {
        const html = `
          <div onclick="alert(1)">
            <span onmouseover="alert(2)">
              <a href="javascript:alert(3)">
                <img onerror="alert(4)" src="x" />
              </a>
            </span>
          </div>
        `;
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).not.toContain('onclick');
        expect(result).not.toContain('onmouseover');
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
      });

      it('handles mixed safe and dangerous content', () => {
        const html = `
          <div class="safe">
            <script>evil()</script>
            <p>Safe paragraph</p>
            <iframe src="evil.com"></iframe>
            <span data-id="123">Safe span</span>
          </div>
        `;
        const result = sanitizeSnapshotHTMLSync(html);

        expect(result).toContain('class="safe"');
        expect(result).toContain('<p>Safe paragraph</p>');
        expect(result).toContain('data-id="123"');
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('<iframe');
      });

      it('handles empty input', () => {
        const result = sanitizeSnapshotHTMLSync('');
        expect(result).toBe('');
      });

      it('handles whitespace only input', () => {
        const result = sanitizeSnapshotHTMLSync('   \n\t   ');
        expect(result.trim()).toBe('');
      });

      it('handles plain text without HTML', () => {
        const result = sanitizeSnapshotHTMLSync('Just plain text');
        expect(result).toBe('Just plain text');
      });
    });
  });

  describe('sanitizeSnapshotHTML (async)', () => {
    // Note: DOMPurify is installed in this monorepo, so these tests use DOMPurify path
    it('sanitizes with DOMPurify when available', async () => {
      const html = '<div onclick="alert(1)">Content</div>';
      const result = await sanitizeSnapshotHTML(html);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Content');
    });

    it('removes script tags', async () => {
      const html = '<div><script>alert("xss")</script>Safe content</div>';
      const result = await sanitizeSnapshotHTML(html);

      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe content');
    });

    it('caches module lookup result for performance', async () => {
      // First call loads and caches DOMPurify
      await sanitizeSnapshotHTML('<div>Test 1</div>');
      // Second call uses cached DOMPurify
      const result = await sanitizeSnapshotHTML('<div>Test 2</div>');

      expect(result).toContain('Test 2');
    });
  });

  describe('sanitizeSnapshotHTML fallback path', () => {
    it('uses fallback when DOMPurify import fails', async () => {
      // Reset module cache and mock dompurify to throw
      vi.resetModules();
      vi.doMock('dompurify', () => {
        throw new Error('Module not found');
      });

      // Dynamic import to get fresh module with mocked dependency
      const { sanitizeSnapshotHTML: sanitizeWithMock } = await import('../src/sanitize');

      const html = '<div onclick="alert(1)">Content</div>';
      const result = await sanitizeWithMock(html);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Content');

      vi.doUnmock('dompurify');
    });
  });

  describe('safeSetInnerHTML', () => {
    it('sanitizes HTML before setting innerHTML', async () => {
      const container = document.createElement('div');
      const dangerousHTML = '<div onclick="alert(1)"><script>evil()</script>Safe</div>';

      await safeSetInnerHTML(container, dangerousHTML);

      expect(container.innerHTML).not.toContain('onclick');
      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).toContain('Safe');
    });

    it('handles empty HTML', async () => {
      const container = document.createElement('div');
      container.innerHTML = 'Original';

      await safeSetInnerHTML(container, '');

      expect(container.innerHTML).toBe('');
    });

    it('preserves safe HTML structure', async () => {
      const container = document.createElement('div');
      const safeHTML = '<div class="wrapper"><p>Paragraph</p><span>Span</span></div>';

      await safeSetInnerHTML(container, safeHTML);

      expect(container.querySelector('.wrapper')).toBeTruthy();
      expect(container.querySelector('p')?.textContent).toBe('Paragraph');
      expect(container.querySelector('span')?.textContent).toBe('Span');
    });
  });

  describe('safeSetInnerHTMLSync', () => {
    it('sanitizes HTML synchronously before setting innerHTML', () => {
      const container = document.createElement('div');
      const dangerousHTML = '<div onmouseover="alert(1)">Content</div>';

      safeSetInnerHTMLSync(container, dangerousHTML);

      expect(container.innerHTML).not.toContain('onmouseover');
      expect(container.innerHTML).toContain('Content');
    });

    it('removes javascript: URLs synchronously', () => {
      const container = document.createElement('div');
      const dangerousHTML = '<a href="javascript:void(0)">Link</a>';

      safeSetInnerHTMLSync(container, dangerousHTML);

      expect(container.innerHTML).not.toContain('javascript:');
    });

    it('handles multiple dangerous elements', () => {
      const container = document.createElement('div');
      const dangerousHTML = `
        <script>alert(1)</script>
        <iframe src="evil.com"></iframe>
        <div onclick="alert(2)">Click</div>
      `;

      safeSetInnerHTMLSync(container, dangerousHTML);

      expect(container.innerHTML).not.toContain('<script>');
      expect(container.innerHTML).not.toContain('<iframe');
      expect(container.innerHTML).not.toContain('onclick');
      expect(container.innerHTML).toContain('Click');
    });
  });

  describe('edge cases', () => {
    it('handles malformed HTML gracefully', () => {
      const malformed = '<div><span>Unclosed';
      const result = sanitizeSnapshotHTMLSync(malformed);

      // DOMParser handles malformed HTML by auto-closing tags
      expect(result).toContain('Unclosed');
    });

    it('handles HTML entities safely', () => {
      const html = '<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>';
      const result = sanitizeSnapshotHTMLSync(html);

      // The text content should be preserved as safe text, not executed as script
      // Either as entities or decoded text - both are safe
      expect(result).toContain('alert(1)');
      expect(result).toContain('<div>');
    });

    it('handles SVG elements', () => {
      const html = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>';
      const result = sanitizeSnapshotHTMLSync(html);

      // SVG structure should be preserved (no dangerous attributes)
      expect(result).toContain('svg');
    });

    it('handles deeply nested structures', () => {
      const html =
        '<div><div><div><div><div><span onclick="x">Deep</span></div></div></div></div></div>';
      const result = sanitizeSnapshotHTMLSync(html);

      expect(result).not.toContain('onclick');
      expect(result).toContain('Deep');
    });

    it('handles multiple script tags', () => {
      const html = `
        <script>first()</script>
        <div>Content</div>
        <script>second()</script>
        <script type="text/javascript">third()</script>
      `;
      const result = sanitizeSnapshotHTMLSync(html);

      expect(result).not.toContain('<script');
      expect(result).not.toContain('first()');
      expect(result).not.toContain('second()');
      expect(result).not.toContain('third()');
      expect(result).toContain('Content');
    });

    it('handles base64 data URLs (non-html)', () => {
      // Safe data URL (image)
      const html = '<img src="data:image/png;base64,iVBORw0KGgo=" />';
      const result = sanitizeSnapshotHTMLSync(html);

      // Image data URLs are safe
      expect(result).toContain('data:image/png');
    });

    it('handles textarea with dangerous content as text', () => {
      // Note: textarea is in DANGEROUS_HTML_TAGS, so it gets removed
      const html = '<textarea><script>alert(1)</script></textarea>';
      const result = sanitizeSnapshotHTMLSync(html);

      expect(result).not.toContain('<textarea');
    });
  });
});
