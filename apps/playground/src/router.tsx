import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router';
import RootLayout from './pages/root.layout';
import HomePage from './pages/home.page';
import { ThemeProvider } from './components/theme-provider';
import { Analytics } from '@vercel/analytics/react';

const routerObjects: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'getting-started',
        lazy: async () => {
          const { default: Component } = await import('./pages/getting-started');
          return { Component };
        },
      },
      {
        path: 'prepaint',
        children: [
          {
            path: 'heavy',
            lazy: async () => {
              const { default: Component } = await import('./pages/prepaint/heavy.page');
              return { Component };
            },
          },
          {
            path: 'route-switching',
            lazy: async () => {
              const { default: Component } = await import('./pages/prepaint/route-switching');
              return { Component };
            },
            children: [
              {
                path: 'dashboard',
                lazy: async () => {
                  const { DashboardRoute: Component } =
                    await import('./pages/prepaint/route-switching');
                  return { Component };
                },
              },
              {
                path: 'products',
                lazy: async () => {
                  const { ProductsRoute: Component } =
                    await import('./pages/prepaint/route-switching');
                  return { Component };
                },
              },
              {
                path: 'analytics',
                lazy: async () => {
                  const { AnalyticsRoute: Component } =
                    await import('./pages/prepaint/route-switching');
                  return { Component };
                },
              },
              {
                path: 'settings',
                lazy: async () => {
                  const { SettingsRoute: Component } =
                    await import('./pages/prepaint/route-switching');
                  return { Component };
                },
              },
            ],
          },
        ],
      },
      {
        path: 'sync',
        children: [
          {
            path: 'instant-cart',
            lazy: async () => {
              const { default: Component } = await import('./pages/sync/instant-cart');
              return { Component };
            },
          },
          {
            path: 'timing',
            lazy: async () => {
              const { default: Component } = await import('./pages/sync/timing');
              return { Component };
            },
          },
          {
            path: 'staleness',
            lazy: async () => {
              const { default: Component } = await import('./pages/sync/staleness');
              return { Component };
            },
          },
          {
            path: 'suspense',
            lazy: async () => {
              const { default: Component } = await import('./pages/sync/suspense-demo');
              return { Component };
            },
          },
        ],
      },
      {
        path: 'tx',
        children: [
          {
            path: 'concurrent',
            lazy: async () => {
              const { default: Component } = await import('./pages/tx/concurrent');
              return { Component };
            },
          },
          {
            path: 'rollback-chain',
            lazy: async () => {
              const { default: Component } = await import('./pages/tx/rollback-chain');
              return { Component };
            },
          },
          {
            path: 'network-chaos',
            lazy: async () => {
              const { default: Component } = await import('./pages/tx/network-chaos');
              return { Component };
            },
          },
        ],
      },
    ],
  },
];

const router = createBrowserRouter(routerObjects);

export default function Router() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
      <Analytics />
    </ThemeProvider>
  );
}
