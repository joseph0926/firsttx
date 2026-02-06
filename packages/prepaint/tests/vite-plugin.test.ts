import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResolvedConfig } from 'vite';

// Mock esbuild before importing the plugin
vi.mock('esbuild', () => ({
  build: vi.fn().mockResolvedValue({
    outputFiles: [
      { text: 'console.log("boot script");', path: '', contents: new Uint8Array(), hash: '' },
    ],
  }),
}));

// Import after mocking
import { firstTx, type FirstTxPluginOptions } from '../src/plugin/vite';
import { build } from 'esbuild';

const mockedBuild = vi.mocked(build);

describe('firstTx Vite Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedBuild.mockResolvedValue({
      outputFiles: [
        { text: 'console.log("boot script");', path: '', contents: new Uint8Array(), hash: '' },
      ],
      errors: [],
      warnings: [],
      metafile: undefined,
      mangleCache: undefined,
    });
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
        devFlagOverride: true,
      };
      const plugin = firstTx(options);
      expect(plugin).toBeDefined();
    });
  });

  describe('configResolved', () => {
    it('sets isDev to true in development mode', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;

      configResolved({ mode: 'development' } as ResolvedConfig);

      // Verify by checking buildStart behavior
      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const buildCall = mockedBuild.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(buildCall?.minify).toBe(false);
      expect((buildCall?.define as Record<string, unknown>)?.__FIRSTTX_DEV__).toBe('true');
    });

    it('sets isDev to false in production mode', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;

      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const buildCall = mockedBuild.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(buildCall?.minify).toBe(true);
      expect((buildCall?.define as Record<string, unknown>)?.__FIRSTTX_DEV__).toBe('false');
    });

    it('respects devFlagOverride option', async () => {
      const plugin = firstTx({ devFlagOverride: true });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;

      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const buildCall = mockedBuild.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect((buildCall?.define as Record<string, unknown>)?.__FIRSTTX_DEV__).toBe('true');
    });
  });

  describe('buildStart', () => {
    it('builds boot script with esbuild', async () => {
      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          bundle: true,
          write: false,
          format: 'iife',
          target: 'es2020',
          platform: 'browser',
          globalName: '__firsttx_boot__',
        }),
      );
    });

    it('uses minify option from user config', async () => {
      const plugin = firstTx({ minify: false });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      expect(mockedBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          minify: false,
        }),
      );
    });

    it('throws error when esbuild fails', async () => {
      mockedBuild.mockRejectedValueOnce(new Error('esbuild failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;

      await expect(buildStart()).rejects.toThrow('esbuild failed');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[FirstTx] Failed to build boot script:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('handles empty output files gracefully', async () => {
      mockedBuild.mockResolvedValueOnce({
        outputFiles: [],
        errors: [],
        warnings: [],
        metafile: undefined,
        mangleCache: undefined,
      });

      const plugin = firstTx();
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      // transformIndexHtml should return original html when no boot script
      const transformIndexHtml = plugin.transformIndexHtml as {
        order: string;
        handler: (html: string) => string;
      };
      const result = transformIndexHtml.handler('<html><head></head><body></body></html>');
      expect(result).toBe('<html><head></head><body></body></html>');
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

    it('injects inline script to head-prepend by default', async () => {
      const handler = await getTransformHandler();
      const html = '<html><head><title>Test</title></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('<head>');
      expect(result).toContain('__firsttx_boot__.boot()');
      expect(result).toMatch(/<head>\s*<script>/);
    });

    it('injects script to head position', async () => {
      const handler = await getTransformHandler({ injectTo: 'head' });
      const html = '<html><head><title>Test</title></head><body></body></html>';

      const result = handler(html);

      expect(result).toMatch(/<\/head>/);
      expect(result).toContain('__firsttx_boot__.boot()');
    });

    it('injects script to body-prepend position', async () => {
      const handler = await getTransformHandler({ injectTo: 'body-prepend' });
      const html = '<html><head></head><body><div>Content</div></body></html>';

      const result = handler(html);

      expect(result).toMatch(/<body>\s*<script>/);
    });

    it('injects script to body position', async () => {
      const handler = await getTransformHandler({ injectTo: 'body' });
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

    it('adds overlay flag script when overlay is true', async () => {
      const handler = await getTransformHandler({ overlay: true });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('window.__FIRSTTX_OVERLAY__=true');
    });

    it('adds overlayRoutes to localStorage when provided', async () => {
      const handler = await getTransformHandler({ overlayRoutes: ['/cart', '/checkout'] });
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('firsttx:overlayRoutes');
      expect(result).toContain('/cart,/checkout');
    });

    it('wraps boot script in try-catch', async () => {
      const handler = await getTransformHandler();
      const html = '<html><head></head><body></body></html>';

      const result = handler(html);

      expect(result).toContain('try{');
      expect(result).toContain('}catch(e){');
      expect(result).toContain('[FirstTx] Boot script failed:');
    });
  });

  describe('non-inline mode', () => {
    it('uses external script when inline is false', async () => {
      const plugin = firstTx({ inline: false });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const transformIndexHtml = plugin.transformIndexHtml as {
        order: string;
        handler: (html: string) => string;
      };
      const result = transformIndexHtml.handler('<html><head></head><body></body></html>');

      expect(result).toContain('src="/firsttx-boot.js"');
      expect(result).not.toContain('__firsttx_boot__.boot()');
    });

    it('resolves virtual module id', () => {
      const plugin = firstTx({ inline: false });
      const resolveId = plugin.resolveId as (id: string) => string | undefined;

      expect(resolveId('/firsttx-boot.js')).toBe('/firsttx-boot.js');
      expect(resolveId('/other.js')).toBeUndefined();
    });

    it('does not resolve virtual module when inline is true', () => {
      const plugin = firstTx({ inline: true });
      const resolveId = plugin.resolveId as (id: string) => string | undefined;

      expect(resolveId('/firsttx-boot.js')).toBeUndefined();
    });

    it('loads virtual module with boot script code', async () => {
      const plugin = firstTx({ inline: false });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const load = plugin.load as (id: string) => { code: string; map: null } | undefined;
      const result = load('/firsttx-boot.js');

      expect(result).toEqual({
        code: 'console.log("boot script");',
        map: null,
      });
    });

    it('does not load non-virtual modules', async () => {
      const plugin = firstTx({ inline: false });
      const configResolved = plugin.configResolved as (config: ResolvedConfig) => void;
      configResolved({ mode: 'production' } as ResolvedConfig);

      const buildStart = plugin.buildStart as () => Promise<void>;
      await buildStart();

      const load = plugin.load as (id: string) => { code: string; map: null } | undefined;

      expect(load('/other.js')).toBeUndefined();
    });
  });
});

describe('injectScript helper', () => {
  // Test via transformIndexHtml since injectScript is not exported
  async function testInjectPosition(
    position: 'head' | 'head-prepend' | 'body' | 'body-prepend',
    html: string,
  ): Promise<string> {
    vi.mocked(build).mockResolvedValueOnce({
      outputFiles: [{ text: 'boot();', path: '', contents: new Uint8Array(), hash: '' }],
      errors: [],
      warnings: [],
      metafile: undefined,
      mangleCache: undefined,
    });

    const plugin = firstTx({ injectTo: position });
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
    vi.mocked(build).mockResolvedValueOnce({
      outputFiles: [{ text: 'boot();', path: '', contents: new Uint8Array(), hash: '' }],
      errors: [],
      warnings: [],
      metafile: undefined,
      mangleCache: undefined,
    });

    const plugin = firstTx({ injectTo: 'unknown' as 'head' });
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
