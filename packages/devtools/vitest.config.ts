import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: ['src/bridge/**/*.ts', 'src/panel/utils/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/**/*types*.ts'],
    },
  },
});
