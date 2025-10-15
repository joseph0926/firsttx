import type { SnapshotStyle } from './types';

export function normalizeSnapshotStyleEntry(style: SnapshotStyle | string): SnapshotStyle | null {
  if (typeof style === 'string') {
    if (style.trim().length === 0) return null;
    return { type: 'inline', content: style };
  }
  if (style.type === 'inline') {
    if (!style.content || style.content.trim().length === 0) return null;
    return { type: 'inline', content: style.content };
  }
  if (!style.href) return null;
  const normalized: SnapshotStyle = { type: 'external', href: style.href };
  if (style.content && style.content.length > 0) {
    normalized.content = style.content;
  }
  return normalized;
}
