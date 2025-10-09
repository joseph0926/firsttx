import type { Plugin } from 'vite';
import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

export interface FirstTxPluginOptions {
  /**
   * Whether to inline the boot script
   * @default true
   */
  inline?: boolean;
  /**
   * Whether to minify the boot script
   * @default true in production
   */
  minify?: boolean;
  /**
   * Custom injection position in HTML
   * @default 'head-prepend'
   */
  injectTo?: 'head' | 'head-prepend' | 'body' | 'body-prepend';
}

export function firstTx(options: FirstTxPluginOptions = {}): Plugin {
  const { inline = true, minify: userMinify, injectTo = 'head-prepend' } = options;

  let bootScriptCode: string | null = null;
  let isDev = false;

  return {
    name: 'vite-plugin-firsttx',

    configResolved(config) {
      isDev = config.mode === 'development';

      if (isDev) {
        console.log('[FirstTx] Running in development mode - boot script will not be minified');
      }
    },

    async buildStart() {
      const minify = userMinify ?? !isDev;

      try {
        const currentDir = dirname(fileURLToPath(import.meta.url));

        const distDir = resolve(currentDir, '..');

        const bootPath = resolve(distDir, 'boot.js');

        console.log(`[FirstTx] Building boot script from: ${bootPath}`);

        const result = await build({
          entryPoints: [bootPath],
          bundle: true,
          write: false,
          format: 'iife',
          minify,
          target: 'es2020',
          platform: 'browser',
          globalName: '__firsttx_boot__',
        });

        if (result.outputFiles && result.outputFiles[0]) {
          const code = result.outputFiles[0].text;

          bootScriptCode = code;

          console.log(
            `[FirstTx] Boot script generated (${(bootScriptCode.length / 1024).toFixed(2)}KB)`,
          );
        }
      } catch (error) {
        console.error('[FirstTx] Failed to build boot script:', error);
        throw error;
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!bootScriptCode) {
          if (!isDev) {
            console.error('[FirstTx] Boot script not generated - prepaint will not work');
          }
          return html;
        }

        if (inline) {
          const scriptTag = `<script>try{${bootScriptCode}}catch(e){console.error('[FirstTx] Boot script failed:',e);}</script>`;
          return injectScript(html, scriptTag, injectTo);
        } else {
          const scriptTag = `<script src="/firsttx-boot.js"></script>`;
          return injectScript(html, scriptTag, injectTo);
        }
      },
    },

    resolveId(id) {
      if (!inline && id === '/firsttx-boot.js') {
        return id;
      }
    },

    load(id) {
      if (!inline && id === '/firsttx-boot.js' && bootScriptCode) {
        return {
          code: bootScriptCode,
          map: null,
        };
      }
    },
  };
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
