import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResolvedConfig } from 'vite';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  const readFile = vi.fn();
  return { ...actual, readFile, default: { ...actual, readFile } };
});

// Import after mocking
import { firstTx, type FirstTxPluginOptions } from '../src/plugin/vite';
import { readFile } from 'node:fs/promises';

const mockedReadFile = vi.mocked(readFile);

function readBootFileName(): string | undefined {
  const path = mockedReadFile.mock.calls[0]?.[0];
  return typeof path === 'string' ? path.split(/[\\/]/).slice(-2).join('/') : undefined;
}

describe('firstTx Vite Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReadFile.mockResolvedValue('console.log("boot script");');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('plugin creation', () => {
    it('creates plugin with correct name', () => {
      const plugin = firstTx();
      expect(plugin.name).toBe('vite-plugin-firsttx');
    });

    it('creates plugin with default options', () => {
      const plugin = firstTx();
      expect(plugin).toBeDefined();
      expect(typeof plugin.configResolved).toBe('function');
      expect(typeof plugin.buildStart).toBe('function');
      expect(plugin.transformIndexHtml).toBeDefined();
    });

    it('accepts custom options', () => {
      const options: FirstTxPluginOptions = {
        inline: false,
        minify: true,
        injectTo: 'body',
        nonce: 'test-nonce',
        overlay: true,
        overlayRoutes: ['/cart', '/checkout'],
        policy: { routes: ['/cart', '/checkout'] },
        devFlagOverride: true,
      };
      const plugin = firstTx(options);
      expect(plugin).toBeDefined();
    });
  });

  describe('config', () => {
    type ConfigHook = (
      config: Record<string, unknown>,
      env: { mode: string; command: string },
    ) => { define?: Record<string, string> };

    function appDevFlag(options: FirstTxPluginOptions, mode: string): string | undefined {
      const config = firstTx(options).config as unknown as ConfigHook;
      return config({}, { mode, command: 'build' }).define?.__FIRSTTX_DEV__;
    }

    it('defines the dev flag for the app bundle in development mode', () => {
      expect(appDevFlag({}, 'development')).toBe('true');
    });

    it('defines the dev flag as false in production mode', () => {
      expect(appDevFlag({}, 'production')).toBe('false');
    });

    it('applies devFlagOverride to the app bundle the same way as the boot script', () => {
      expect(appDevFlag({ devFlagOverride: true }, 'production')).toBe('true');
    });
  });

  describe('configResolved', () => {
    it('loads the unminified dev boot script in development mode', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;

      configResolved({ mode: 'development' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      expect(readBootFileName()).toBe('boot/boot.dev.js');
    });

    it('loads the minified prod boot script in production mode', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;

      configResolved({ mode: 'production', command: 'build' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      expect(readBootFileName()).toBe('boot/boot.prod.min.js');
    });

    it('respects devFlagOverride option', async () => {
      const plugin = firstTx({ devFlagOverride: true });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;

      configResolved({ mode: 'production', command: 'build' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      expect(readBootFileName()).toBe('boot/boot.dev.js');
    });
  });

  describe('buildStart', () => {
    it('uses minify option from user config', async () => {
      const plugin = firstTx({ minify: false });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      expect(readBootFileName()).toBe('boot/boot.prod.js');
    });

    it('throws when the prebuilt boot script cannot be read', async () => {
      mockedReadFile.mockRejectedValueOnce(new Error('ENOENT'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;

      await expect(buildStart()).rejects.toThrow('ENOENT');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FirstTx] Failed to load boot script:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('transformIndexHtml', () => {
    async function getTransformHandler(
      options: FirstTxPluginOptions = {},
    ): Promise<(html: string) => string> {
      const plugin = firstTx(options);
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const transformIndexHtml = plugin.transformIndexHtml as {
        order: string;
        handler: (html: string) => string;
      };
      return transformIndexHtml.handler;
    }

    it('injects an inline script when explicitly enabled', async () => {
      const handler = await getTransformHandler({ inline: true });
      const html = '<html><head><title>Test</title></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('<head>');
      expect(result).toContain('__firsttx_boot__.boot(globalThis.__FIRSTTX_PREPAINT_POLICY__)');
      expect(result).toMatch(/<head>\s*<script>/);
    });

    it('injects script to head position', async () => {
      const handler = await getTransformHandler({ injectTo: 'head', inline: true });
      const html = '<html><head><title>Test</title></head><body></body></html>';

      const result = handler(html);

      expect(result).toMatch(/<\/head>/);
      expect(result).toContain('__firsttx_boot__.boot(globalThis.__FIRSTTX_PREPAINT_POLICY__)');
    });

    it('injects script to body-prepend position', async () => {
      const handler = await getTransformHandler({ injectTo: 'body-prepend', inline: true });
      const html = '<html><head></head><body><div>Content</div></body></html>';

      const result = handler(html);

      expect(result).toMatch(/<body>\s*<script>/);
    });

    it('injects script to body position', async () => {
      const handler = await getTransformHandler({ injectTo: 'body', inline: true });
      const html = '<html><head></head><body><div>Content</div></body></html>';

      const result = handler(html);

      expect(result).toMatch(/<script>.*<\/script>\s*<\/body>/s);
    });

    it('adds nonce attribute when provided as string', async () => {
      const handler = await getTransformHandler({ nonce: 'abc123' });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('nonce="abc123"');
    });

    it('trims nonce attribute when surrounding whitespace exists', async () => {
      const handler = await getTransformHandler({ nonce: '  abc123  ' });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('nonce="abc123"');
    });

    it('calls nonce function when provided', async () => {
      const nonceFn = vi.fn().mockReturnValue('dynamic-nonce');
      const handler = await getTransformHandler({ nonce: nonceFn });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(nonceFn).toHaveBeenCalled();
      expect(result).toContain('nonce="dynamic-nonce"');
    });

    it('throws for unsafe nonce characters', async () => {
      const handler = await getTransformHandler({ nonce: 'abc"onload="x' });
      const html = '<html><head></head><body></body></html>';

      expect(() => handler(html)).toThrow('[FirstTx] Invalid nonce value');
    });

    it('rejects invalid snapshot policy values', () => {
      expect(() => firstTx({ policy: { routes: ['dashboard'] } })).toThrow(
        '[FirstTx] Invalid prepaint policy',
      );
      expect(() => firstTx({ policy: { routes: ['/'], ttlMs: 0 } })).toThrow(
        '[FirstTx] Invalid prepaint policy',
      );
    });

    it('escapes policy values in inline output', async () => {
      const handler = await getTransformHandler({
        inline: true,
        policy: { routes: ['/</script>\u2028'] },
      });
      const result = handler('<html><head></head><body></body></html>');

      expect(result).not.toContain('</script>\u2028');
      expect(result).toContain('\\u003c/script\\u003e\\u2028');
    });

    it('keeps deprecated overlay options as no-ops', async () => {
      const handler = await getTransformHandler({
        overlay: true,
        overlayRoutes: ['/cart', '/checkout'],
      });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).not.toContain('window.__FIRSTTX_OVERLAY__');
      expect(result).not.toContain('firsttx:overlayRoutes');
    });

    it('wraps boot script in try-catch', async () => {
      const handler = await getTransformHandler({ inline: true });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('try{');
      expect(result).toContain('}catch(e){');
      expect(result).toContain('[FirstTx] Boot script failed:');
    });
  });

  describe('dev flag global', () => {
    it('sets the dev flag global in the inline boot script on the dev server', async () => {
      const plugin = firstTx({ inline: true });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'development', command: 'serve' } as ResolvedConfig);
      await (plugin.buildStart as () => Promise<void>)();

      const transformIndexHtml = plugin.transformIndexHtml as {
        handler: (html: string) => string;
      };
      const result = transformIndexHtml.handler('<html><head></head><body></body></html>');

      expect(result).toContain('globalThis.__FIRSTTX_DEV__=true;');
    });

    it('does not set the dev flag global in the emitted production boot asset', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production', command: 'build' } as ResolvedConfig);

      const emitFile = vi.fn();
      const buildStart = plugin.buildStart as unknown as (this: {
        emitFile: typeof emitFile;
      }) => Promise<void>;
      await buildStart.call({ emitFile });

      const emitted = emitFile.mock.calls[0]?.[0] as { source?: unknown } | undefined;
      expect(String(emitted?.source)).not.toContain('__FIRSTTX_DEV__');
    });
  });

  describe('non-inline mode', () => {
    it('uses an external script by default', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const transformIndexHtml = plugin.transformIndexHtml as {
        order: string;
        handler: (html: string) => string;
      };
      const result = transformIndexHtml.handler('<html><head></head><body></body></html>');

      expect(result).toContain('<script vite-ignore');
      expect(result).toContain('src="/firsttx-boot.js"');
      expect(result).not.toContain('__firsttx_boot__.boot()');
    });

    it('emits a self-starting boot asset', async () => {
      const plugin = firstTx({ policy: { routes: ['/cart'] } });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production', command: 'build' } as ResolvedConfig);

      const emitFile = vi.fn((file: unknown) => String(file));
      const buildStart = plugin.buildStart as unknown as (this: {
        emitFile: typeof emitFile;
      }) => Promise<void>;
      await buildStart.call({ emitFile });

      expect(emitFile).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'asset', fileName: 'firsttx-boot.js' }),
      );
      const emitted = emitFile.mock.calls[0]?.[0];
      if (!emitted || typeof emitted !== 'object' || !('source' in emitted)) {
        throw new Error('Expected an emitted asset source');
      }
      const source = String(emitted.source);
      expect(source).toContain('console.log("boot script");');
      expect(source).toContain('globalThis.__FIRSTTX_PREPAINT_POLICY__=');
      expect(source).toContain('"routes":["/cart"]');
      expect(source).toContain('__firsttx_boot__.boot(globalThis.__FIRSTTX_PREPAINT_POLICY__)');
    });

    it('does not emit an external asset in inline mode', async () => {
      const plugin = firstTx({ inline: true });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production', command: 'build' } as ResolvedConfig);

      const emitFile = vi.fn();
      const buildStart = plugin.buildStart as unknown as (this: {
        emitFile: typeof emitFile;
      }) => Promise<void>;
      await buildStart.call({ emitFile });

      expect(emitFile).not.toHaveBeenCalled();
    });
  });
});

describe('injectScript helper', () => {
  // Test via transformIndexHtml since injectScript is not exported
  async function testInjectPosition(
    position: 'head' | 'head-prepend' | 'body' | 'body-prepend',
    html: string,
  ): Promise<string> {
    vi.mocked(readFile).mockResolvedValueOnce('boot();');

    const plugin = firstTx({ injectTo: position, inline: true });
    const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
    configResolved({ mode: 'production' } as ResolvedConfig);

    const buildStart = plugin.buildStart as () => Promise<void>;
    await buildStart();

    const transformIndexHtml = plugin.transformIndexHtml as {
      order: string;
      handler: (html: string) => string;
    };
    return transformIndexHtml.handler(html);
  }

  it('handles head with attributes', async () => {
    const html = '<html><head lang="en"><title>Test</title></head><body></body></html>';
    const result = await testInjectPosition('head-prepend', html);

    expect(result).toContain('<head lang="en">');
    expect(result).toMatch(/<head lang="en">\s*<script>/);
  });

  it('handles body with attributes', async () => {
    const html = '<html><head></head><body class="dark"><div>Content</div></body></html>';
    const result = await testInjectPosition('body-prepend', html);

    expect(result).toContain('<body class="dark">');
    expect(result).toMatch(/<body class="dark">\s*<script>/);
  });

  it('defaults to head-prepend for unknown position', async () => {
    vi.mocked(readFile).mockResolvedValueOnce('boot();');

    const plugin = firstTx({ injectTo: 'unknown' as 'head', inline: true });
    const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
    configResolved({ mode: 'production' } as ResolvedConfig);

    const buildStart = plugin.buildStart as () => Promise<void>;
    await buildStart();

    const transformIndexHtml = plugin.transformIndexHtml as {
      order: string;
      handler: (html: string) => string;
    };
    const result = transformIndexHtml.handler('<html><head></head><body></body></html>');

    expect(result).toMatch(/<head>\s*<script>/);
  });
});
