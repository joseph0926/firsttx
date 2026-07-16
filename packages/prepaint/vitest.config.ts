import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.d.ts', 'src/**/types.ts'],
      thresholds: {
        lines: 79,
        statements: 77,
        functions: 78,
        branches: 66,
      },
    },
  },
});
