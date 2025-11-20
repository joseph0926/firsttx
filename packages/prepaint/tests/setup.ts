import 'fake-indexeddb/auto';
import '@testing-library/react';
import { vi } from 'vitest';

const mockFetch = vi.fn(() => {
  const emptyBuffer = new ArrayBuffer(0);
  return {
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(emptyBuffer),
    text: () => Promise.resolve(''),
    json: () => Promise.resolve({}),
    blob: () => Promise.resolve(new Blob()),
  } as Response;
}) as unknown as typeof fetch;

vi.stubGlobal('fetch', mockFetch);

// Prevent happy-dom from attempting real stylesheet fetches when link elements are connected
const LinkProto = (globalThis as unknown as { HTMLLinkElement?: { prototype: HTMLElement } })
  .HTMLLinkElement?.prototype as HTMLElement & {
  connectedCallback?: () => void;
};

const originalConnected = LinkProto?.connectedCallback;
if (LinkProto) {
  LinkProto.connectedCallback = function connectedCallbackPatched() {
    const rel = (this as unknown as HTMLLinkElement).rel;
    if (typeof rel === 'string' && rel.includes('stylesheet')) {
      return;
    }
    if (typeof originalConnected === 'function') {
      return originalConnected.apply(this);
    }
  };
}
