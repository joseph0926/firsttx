import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    background: 'src/extension/background.ts',
    content: 'src/extension/content.ts',
    devtools: 'src/extension/devtools.ts',
    bridge: 'src/bridge/index.ts',
  },
  format: ['iife'],
  outDir: 'dist',
  clean: false,
  minify: true,
  sourcemap: true,
  target: 'es2022',
  platform: 'browser',
  splitting: false,
  esbuildOptions(options) {
    options.outExtension = { '.js': '.js' };
  },
});
