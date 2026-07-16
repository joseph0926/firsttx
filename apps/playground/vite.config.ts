import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { firstTx } from '@firsttx/prepaint/plugin/vite';

const METRICS_BASE_URL = process.env.VITE_METRICS_BASE_URL ?? '';
const PREPAINT_ROUTES = [
  '/',
  '/getting-started',
  '/tour',
  '/tour/problem',
  '/tour/prepaint',
  '/tour/local-first',
  '/tour/tx',
  '/tour/next',
  '/prepaint/heavy',
  '/prepaint/route-switching',
  '/prepaint/route-switching/dashboard',
  '/prepaint/route-switching/products',
  '/prepaint/route-switching/analytics',
  '/prepaint/route-switching/settings',
  '/sync/instant-cart',
  '/sync/timing',
  '/sync/staleness',
  '/sync/suspense',
  '/tx/concurrent',
  '/tx/rollback-chain',
  '/tx/network-chaos',
];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    firstTx({
      policy: {
        routes: PREPAINT_ROUTES,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    __PLAYGROUND_METRICS_BASE__: JSON.stringify(METRICS_BASE_URL),
  },
});
