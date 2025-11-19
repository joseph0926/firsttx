import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYGROUND_PORT ?? 5173);
const serverHost = process.env.PLAYGROUND_SERVER_HOST ?? '0.0.0.0';
const clientHost = process.env.PLAYGROUND_HOST ?? '127.0.0.1';
const baseURL = `http://${clientHost}:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ['line'],
        [
          'html',
          {
            open: 'never',
          },
        ],
      ]
    : 'list',
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm dev --host ${serverHost} --port ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
