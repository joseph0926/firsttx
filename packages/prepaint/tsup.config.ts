import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    boot: 'src/boot.ts',
    'plugin/vite': 'src/plugin/vite.ts',
    'plugin/esbuild': 'src/plugin/esbuild.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  minify: false,
});
