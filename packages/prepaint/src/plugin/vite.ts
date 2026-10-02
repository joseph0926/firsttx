import type { Plugin } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serializePrepaintPolicy } from '../policy';
import type { PrepaintPolicy } from '../types';

export interface FirstTxPluginOptions {
  inline?: boolean;
  minify?: boolean;
  injectTo?: 'head' | 'head-prepend' | 'body' | 'body-prepend';
  nonce?: string | (() => string);
  policy?: PrepaintPolicy;
  /** @deprecated Snapshot restore always uses an overlay. */
  overlay?: boolean;
  /** @deprecated Snapshot restore always uses an overlay. */
  overlayRoutes?: string[];
  devFlagOverride?: boolean;
}

const NONCE_PATTERN = /^[A-Za-z0-9+/_-]+=*$/;

export function firstTx(options: FirstTxPluginOptions = {}): Plugin {
  const {
    inline = false,
    minify: userMinify,
    injectTo = 'head-prepend',
    nonce,
    devFlagOverride,
  } = options;
  const serializedPolicy = serializePrepaintPolicy(options.policy);

  let bootScriptCode: string | null = null;
  let isDev = false;
  let isBuild = false;
  let base = '/';

  return {
    name: 'vite-plugin-firsttx',
    configResolved(config) {
      isDev =
        typeof devFlagOverride === 'boolean' ? devFlagOverride : config.mode === 'development';
      isBuild = config.command === 'build';
      base = config.base || '/';
    },
    async buildStart() {
      const minify = userMinify ?? !isDev;
      // Prebuilt by tsup.config.ts; dist/plugin/vite.js reads from dist/boot/.
      const bootFileName = `boot.${isDev ? 'dev' : 'prod'}${minify ? '.min' : ''}.js`;
      try {
        const distDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
        bootScriptCode = await readFile(resolve(distDir, 'boot', bootFileName), 'utf8');
      } catch (error) {
        console.error('[FirstTx] Failed to load boot script:', error);
        throw error;
      }
      if (!inline && isBuild && this?.emitFile) {
        this.emitFile({
          type: 'asset',
          fileName: 'firsttx-boot.js',
          source: createExecutableBootScript(bootScriptCode, serializedPolicy),
        });
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!bootScriptCode) return html;
        const nonceValue = resolveAndValidateNonce(nonce);

        if (inline) {
          const executableCode = createExecutableBootScript(bootScriptCode, serializedPolicy);
          const bootTag = `<script${nonceValue ? ` nonce="${nonceValue}"` : ''}>${executableCode}</script>`;
          return injectScript(html, bootTag, injectTo);
        } else {
          const bootTag = `<script vite-ignore${nonceValue ? ` nonce="${nonceValue}"` : ''} src="${base}firsttx-boot.js"></script>`;
          return injectScript(html, bootTag, injectTo);
        }
      },
    },
    configureServer(server) {
      if (inline) return;
      server.middlewares.use('/firsttx-boot.js', (_request, response, next) => {
        if (!bootScriptCode) {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.end(createExecutableBootScript(bootScriptCode, serializedPolicy));
      });
    },
  };
}

function createExecutableBootScript(bootScriptCode: string, serializedPolicy: string): string {
  return `${bootScriptCode};try{globalThis.__FIRSTTX_PREPAINT_POLICY__=${serializedPolicy};__firsttx_boot__.boot(globalThis.__FIRSTTX_PREPAINT_POLICY__);}catch(e){console.error('[FirstTx] Boot script failed:',e);}`;
}

function resolveAndValidateNonce(nonceOption: FirstTxPluginOptions['nonce']): string | undefined {
  const nonceValue = typeof nonceOption === 'function' ? nonceOption() : nonceOption;

  if (!nonceValue) {
    return undefined;
  }

  const normalizedNonce = nonceValue.trim();
  if (!normalizedNonce) {
    return undefined;
  }

  if (!NONCE_PATTERN.test(normalizedNonce)) {
    throw new Error(
      '[FirstTx] Invalid nonce value. Use only base64/base64url characters for CSP nonce.',
    );
  }

  return normalizedNonce;
}

function injectScript(html: string, scriptTag: string, position: string): string {
  switch (position) {
    case 'head-prepend':
      return html.replace(/<head[^>]*>/, `$&\n  ${scriptTag}`);
    case 'head':
      return html.replace(/<\/head>/, `  ${scriptTag}\n$&`);
    case 'body-prepend':
      return html.replace(/<body[^>]*>/, `$&\n  ${scriptTag}`);
    case 'body':
      return html.replace(/<\/body>/, `  ${scriptTag}\n$&`);
    default:
      return html.replace(/<head[^>]*>/, `$&\n  ${scriptTag}`);
  }
}
