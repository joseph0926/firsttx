import type { Plugin } from 'vite';
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface FirstTxPluginOptions {
  inline?: boolean;
  minify?: boolean;
  injectTo?: 'head' | 'head-prepend' | 'body' | 'body-prepend';
  nonce?: string | (() => string);
  overlay?: boolean;
  overlayRoutes?: string[];
  devFlagOverride?: boolean;
}

const NONCE_PATTERN = /^[A-Za-z0-9+/_-]+=*$/;

export function firstTx(options: FirstTxPluginOptions = {}): Plugin {
  const {
    inline = true,
    minify: userMinify,
    injectTo = 'head-prepend',
    nonce,
    overlay,
    overlayRoutes,
    devFlagOverride,
  } = options;

  let bootScriptCode: string | null = null;
  let isDev = false;

  return {
    name: 'vite-plugin-firsttx',
    configResolved(config) {
      isDev =
        typeof devFlagOverride === 'boolean' ? devFlagOverride : config.mode === 'development';
    },
    async buildStart() {
      const minify = userMinify ?? !isDev;
      try {
        const currentDir = dirname(fileURLToPath(import.meta.url));
        const distDir = resolve(currentDir, '..');
        const bootPath = resolve(distDir, 'boot.js');
        const define = {
          'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
          __FIRSTTX_DEV__: JSON.stringify(isDev),
        };
        const result = await build({
          entryPoints: [bootPath],
          bundle: true,
          write: false,
          format: 'iife',
          minify,
          target: 'es2020',
          platform: 'browser',
          globalName: '__firsttx_boot__',
          define,
        });
        if (result.outputFiles && result.outputFiles[0]) {
          bootScriptCode = result.outputFiles[0].text;
        }
      } catch (error) {
        console.error('[FirstTx] Failed to build boot script:', error);
        throw error;
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!bootScriptCode) return html;
        const nonceValue = resolveAndValidateNonce(nonce);

        const cfg: string[] = [];
        if (overlay === true) cfg.push('window.__FIRSTTX_OVERLAY__=true;');
        if (overlayRoutes && overlayRoutes.length > 0) {
          const routes = JSON.stringify(overlayRoutes.join(','));
          cfg.push(
            `(function(){try{if(!localStorage.getItem('firsttx:overlayRoutes')) localStorage.setItem('firsttx:overlayRoutes', ${routes});}catch(e){}})();`,
          );
        }
        const configTag =
          cfg.length > 0
            ? `<script${nonceValue ? ` nonce="${nonceValue}"` : ''}>${cfg.join('')}</script>`
            : '';

        if (inline) {
          const bootTag = `<script${nonceValue ? ` nonce="${nonceValue}"` : ''}>try{${bootScriptCode};__firsttx_boot__.boot();}catch(e){console.error('[FirstTx] Boot script failed:',e);}</script>`;
          return injectScript(html, `${configTag}\n${bootTag}`, injectTo);
        } else {
          const configAndBoot =
            configTag +
            `\n<script${nonceValue ? ` nonce="${nonceValue}"` : ''} src="/firsttx-boot.js"></script>`;
          return injectScript(html, configAndBoot, injectTo);
        }
      },
    },
    resolveId(id) {
      if (!inline && id === '/firsttx-boot.js') return id;
    },
    load(id) {
      if (!inline && id === '/firsttx-boot.js' && bootScriptCode) {
        return { code: bootScriptCode, map: null };
      }
    },
  };
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
