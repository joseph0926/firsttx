import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

const METRICS_BASE_URL = process.env.VITE_METRICS_BASE_URL ?? '';

export default defineConfig({
  plugins: [react(), tailwindcss(), firstTx()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __PLAYGROUND_METRICS_BASE__: JSON.stringify(METRICS_BASE_URL),
  },
});
