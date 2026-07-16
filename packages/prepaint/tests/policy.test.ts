import { describe, expect, it } from 'vitest';
import {
  getSnapshotPayloadBytes,
  isRouteAllowed,
  normalizePrepaintPolicy,
  serializePrepaintPolicy,
  shouldPruneSnapshot,
  validatePrepaintPolicy,
} from '../src/policy';
import { STORAGE_CONFIG, type Snapshot } from '../src/types';

describe('Prepaint policy', () => {
  it('disables capture and restore when policy or routes are missing', () => {
    expect(normalizePrepaintPolicy(undefined)).toBeNull();
    expect(normalizePrepaintPolicy({ routes: [] })).toBeNull();
  });

  it('applies the opt-in defaults', () => {
    expect(normalizePrepaintPolicy({ routes: ['/dashboard'] })).toEqual({
      routes: ['/dashboard'],
      ttlMs: STORAGE_CONFIG.MAX_SNAPSHOT_AGE,
      maxSnapshotBytes: STORAGE_CONFIG.MAX_SNAPSHOT_BYTES,
      includeStyles: true,
    });
  });

  it('deduplicates exact routes without enabling prefix matches', () => {
    const policy = normalizePrepaintPolicy({ routes: ['/cart', '/cart'] });

    expect(policy?.routes).toEqual(['/cart']);
    expect(isRouteAllowed(policy, '/cart')).toBe(true);
    expect(isRouteAllowed(policy, '/cart/items')).toBe(false);
  });

  it('rejects invalid limits and relative routes', () => {
    expect(() => validatePrepaintPolicy({ routes: ['dashboard'] })).toThrow('absolute pathname');
    expect(() => validatePrepaintPolicy({ routes: ['/'], ttlMs: 0 })).toThrow('ttlMs');
    expect(() =>
      validatePrepaintPolicy({ routes: ['/'], maxSnapshotBytes: Number.MAX_VALUE }),
    ).toThrow('maxSnapshotBytes');
  });

  it('measures the UTF-8 payload including stored styles', () => {
    const withoutStyles = getSnapshotPayloadBytes({ body: '<div>한</div>' });
    const withStyles = getSnapshotPayloadBytes({
      body: '<div>한</div>',
      styles: [{ type: 'inline', content: '.x{color:red}' }],
    });

    expect(withoutStyles).toBeGreaterThan('<div>한</div>'.length);
    expect(withStyles).toBeGreaterThan(withoutStyles);
  });

  it('prunes disallowed, expired, oversized, and style-bearing records', () => {
    const snapshot: Snapshot = {
      route: '/allowed',
      body: '<div>Saved</div>',
      timestamp: 1000,
      styles: [{ type: 'inline', content: '.x{}' }],
    };

    const basePolicy = validatePrepaintPolicy({
      routes: ['/allowed'],
      ttlMs: 1000,
      maxSnapshotBytes: 10_000,
      includeStyles: true,
    });

    expect(shouldPruneSnapshot(snapshot, basePolicy, 1500)).toBe(false);
    expect(shouldPruneSnapshot({ ...snapshot, route: '/blocked' }, basePolicy, 1500)).toBe(true);
    expect(shouldPruneSnapshot(snapshot, basePolicy, 2501)).toBe(true);
    expect(
      shouldPruneSnapshot(
        snapshot,
        validatePrepaintPolicy({
          routes: ['/allowed'],
          maxSnapshotBytes: 1,
        }),
        1500,
      ),
    ).toBe(true);
    expect(
      shouldPruneSnapshot(
        snapshot,
        validatePrepaintPolicy({
          routes: ['/allowed'],
          includeStyles: false,
        }),
        1500,
      ),
    ).toBe(true);
  });

  it('escapes policy values before embedding them in a script', () => {
    const serialized = serializePrepaintPolicy({ routes: ['/</script>\u2028'] });

    expect(serialized).not.toContain('</script>');
    expect(serialized).not.toContain('\u2028');
    expect(serialized).toContain('\\u003c');
    expect(serialized).toContain('\\u2028');
  });
});
