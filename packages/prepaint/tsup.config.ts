import { defineConfig, type Options } from 'tsup';

// The Vite plugin reads one of these prebuilt boot scripts instead of bundling
// src/boot.ts at the host app's build time, so it works on any Vite version
// without an esbuild dependency. Keep the file names in sync with plugin/vite.ts.
const bootVariants = [
  { name: 'boot.dev', dev: true, minify: false },
  { name: 'boot.dev.min', dev: true, minify: true },
  { name: 'boot.prod', dev: false, minify: false },
  { name: 'boot.prod.min', dev: false, minify: true },
];

const bootBuilds: Options[] = bootVariants.map((variant) => ({
  entry: { [`boot/${variant.name}`]: 'src/boot.ts' },
  format: ['iife'],
  globalName: '__firsttx_boot__',
  platform: 'browser',
  target: 'es2020',
  minify: variant.minify,
  define: {
    'process.env.NODE_ENV': JSON.stringify(variant.dev ? 'development' : 'production'),
    __FIRSTTX_DEV__: JSON.stringify(variant.dev),
  },
  outExtension: () => ({ js: '.js' }),
  clean: false,
}));

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'plugin/vite': 'src/plugin/vite.ts',
    },
    format: ['esm'],
    dts: true,
    clean: false,
    sourcemap: true,
    treeshake: true,
    splitting: false,
    minify: false,
    external: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  ...bootBuilds,
]);
