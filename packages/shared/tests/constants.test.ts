import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TTL_MS,
  DEFAULT_TRANSACTION_TIMEOUT_MS,
  DEFAULT_MAX_BUFFER_SIZE,
  DEFAULT_RETRY_DELAY_MS,
  MAX_SNAPSHOT_AGE_MS,
  DANGEROUS_HTML_TAGS,
  DANGEROUS_ATTRIBUTES,
} from '../src/constants';

describe('constants', () => {
  describe('time constants', () => {
    it('DEFAULT_TTL_MS should be 5 minutes', () => {
      expect(DEFAULT_TTL_MS).toBe(5 * 60 * 1000);
      expect(DEFAULT_TTL_MS).toBe(300_000);
    });

    it('DEFAULT_TRANSACTION_TIMEOUT_MS should be 30 seconds', () => {
      expect(DEFAULT_TRANSACTION_TIMEOUT_MS).toBe(30_000);
    });

    it('DEFAULT_RETRY_DELAY_MS should be 100ms', () => {
      expect(DEFAULT_RETRY_DELAY_MS).toBe(100);
    });

    it('MAX_SNAPSHOT_AGE_MS should be 24 hours', () => {
      expect(MAX_SNAPSHOT_AGE_MS).toBe(24 * 60 * 60 * 1000);
      expect(MAX_SNAPSHOT_AGE_MS).toBe(86_400_000);
    });
  });

  describe('buffer constants', () => {
    it('DEFAULT_MAX_BUFFER_SIZE should be 500', () => {
      expect(DEFAULT_MAX_BUFFER_SIZE).toBe(500);
    });
  });

  describe('DANGEROUS_HTML_TAGS', () => {
    it('should include script tag', () => {
      expect(DANGEROUS_HTML_TAGS).toContain('script');
    });

    it('should include iframe tag', () => {
      expect(DANGEROUS_HTML_TAGS).toContain('iframe');
    });

    it('should include form-related tags', () => {
      expect(DANGEROUS_HTML_TAGS).toContain('form');
      expect(DANGEROUS_HTML_TAGS).toContain('input');
      expect(DANGEROUS_HTML_TAGS).toContain('button');
      expect(DANGEROUS_HTML_TAGS).toContain('textarea');
      expect(DANGEROUS_HTML_TAGS).toContain('select');
    });

    it('should include embedding tags', () => {
      expect(DANGEROUS_HTML_TAGS).toContain('object');
      expect(DANGEROUS_HTML_TAGS).toContain('embed');
    });

    it('should include meta/link/base tags', () => {
      expect(DANGEROUS_HTML_TAGS).toContain('meta');
      expect(DANGEROUS_HTML_TAGS).toContain('link');
      expect(DANGEROUS_HTML_TAGS).toContain('base');
    });

    it('should include frame tags', () => {
      expect(DANGEROUS_HTML_TAGS).toContain('frame');
      expect(DANGEROUS_HTML_TAGS).toContain('frameset');
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(DANGEROUS_HTML_TAGS)).toBe(true);
      expect(DANGEROUS_HTML_TAGS.length).toBeGreaterThan(0);
    });
  });

  describe('DANGEROUS_ATTRIBUTES', () => {
    it('should include common event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onclick');
      expect(DANGEROUS_ATTRIBUTES).toContain('onload');
      expect(DANGEROUS_ATTRIBUTES).toContain('onerror');
    });

    it('should include mouse event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onmouseover');
      expect(DANGEROUS_ATTRIBUTES).toContain('onmouseout');
      expect(DANGEROUS_ATTRIBUTES).toContain('onmouseenter');
      expect(DANGEROUS_ATTRIBUTES).toContain('onmouseleave');
    });

    it('should include focus event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onfocus');
      expect(DANGEROUS_ATTRIBUTES).toContain('onblur');
    });

    it('should include form event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onchange');
      expect(DANGEROUS_ATTRIBUTES).toContain('onsubmit');
      expect(DANGEROUS_ATTRIBUTES).toContain('oninput');
      expect(DANGEROUS_ATTRIBUTES).toContain('onreset');
    });

    it('should include keyboard event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onkeydown');
      expect(DANGEROUS_ATTRIBUTES).toContain('onkeyup');
      expect(DANGEROUS_ATTRIBUTES).toContain('onkeypress');
    });

    it('should include touch event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('ontouchstart');
      expect(DANGEROUS_ATTRIBUTES).toContain('ontouchend');
      expect(DANGEROUS_ATTRIBUTES).toContain('ontouchmove');
    });

    it('should include pointer event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onpointerdown');
      expect(DANGEROUS_ATTRIBUTES).toContain('onpointerup');
      expect(DANGEROUS_ATTRIBUTES).toContain('onpointermove');
    });

    it('should include drag event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('ondrag');
      expect(DANGEROUS_ATTRIBUTES).toContain('ondrop');
      expect(DANGEROUS_ATTRIBUTES).toContain('ondragstart');
      expect(DANGEROUS_ATTRIBUTES).toContain('ondragend');
    });

    it('should include animation/transition event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onanimationstart');
      expect(DANGEROUS_ATTRIBUTES).toContain('onanimationend');
      expect(DANGEROUS_ATTRIBUTES).toContain('onanimationiteration');
      expect(DANGEROUS_ATTRIBUTES).toContain('ontransitionend');
    });

    it('should include media event handlers', () => {
      expect(DANGEROUS_ATTRIBUTES).toContain('onplay');
      expect(DANGEROUS_ATTRIBUTES).toContain('onpause');
      expect(DANGEROUS_ATTRIBUTES).toContain('onended');
      expect(DANGEROUS_ATTRIBUTES).toContain('onvolumechange');
    });

    it('should be a readonly array', () => {
      expect(Array.isArray(DANGEROUS_ATTRIBUTES)).toBe(true);
      expect(DANGEROUS_ATTRIBUTES.length).toBeGreaterThan(0);
    });

    it('should have all attributes starting with "on"', () => {
      DANGEROUS_ATTRIBUTES.forEach((attr) => {
        expect(attr.startsWith('on')).toBe(true);
      });
    });
  });
});
