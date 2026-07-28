import { describe, it, expect } from 'vitest';
import * as prepaint from '../src/index';

/**
 * 패키지 entry가 실제로 무엇을 내보내는지 고정한다.
 * 문서가 존재하지 않는 export를 안내하던 사례가 있었으므로
 * (`safeSetInnerHTML`, `@firsttx/prepaint/boot`) 표면을 명시적으로 잠근다.
 */
describe('public surface', () => {
  const EXPECTED = [
    'BootError',
    'CaptureError',
    'HydrationError',
    'PrepaintError',
    'PrepaintStorageError',
    'boot',
    'convertDOMException',
    'createFirstTxRoot',
    'handoff',
    'setupCapture',
  ];

  it('exports exactly the documented runtime surface', () => {
    expect(Object.keys(prepaint).sort()).toEqual([...EXPECTED].sort());
  });

  it('exports callables, not placeholders', () => {
    for (const name of EXPECTED) {
      expect(typeof prepaint[name as keyof typeof prepaint], name).toBe('function');
    }
  });

  it('does not expose sanitize internals', () => {
    const keys = Object.keys(prepaint);
    expect(keys).not.toContain('sanitizeSnapshotHTML');
    expect(keys).not.toContain('sanitizeSnapshotHTMLSync');
    expect(keys).not.toContain('safeSetInnerHTML');
    expect(keys).not.toContain('safeSetInnerHTMLSync');
  });
});
