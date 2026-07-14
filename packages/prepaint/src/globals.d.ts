declare global {
  interface Window {
    /** @deprecated Snapshot restore always uses an overlay. */
    __FIRSTTX_OVERLAY__?: boolean;
    __FIRSTTX_ROUTE_KEY__?: string | (() => string);
    __FIRSTTX_SENSITIVE_SELECTORS__?: string[];
  }
}

export {};
