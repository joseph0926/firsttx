import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.mjs', '.js', '.mts', '.jsx', '.json'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'json-summary', 'lcov'],
      include: ['src/bridge/**/*.ts', 'src/panel/utils/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*types*.ts'],
      thresholds: {
        lines: 14,
        statements: 13,
        functions: 32,
        branches: 12,
      },
    },
  },
});
