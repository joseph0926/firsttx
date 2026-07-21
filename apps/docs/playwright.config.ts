import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.DOCS_PORT ?? 3100);
const clientHost = process.env.DOCS_HOST ?? "127.0.0.1";
const serverHost = process.env.DOCS_SERVER_HOST ?? clientHost;
const baseURL = `http://${clientHost}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `pnpm dev --hostname ${serverHost} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_ENABLE_CHAT: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
