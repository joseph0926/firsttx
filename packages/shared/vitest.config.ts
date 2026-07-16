import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 97,
        branches: 86,
      },
    },
  },
});
