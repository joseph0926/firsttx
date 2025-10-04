import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '.turbo/**',
      'coverage/**',
      '**/.next/**',
      '**/*.d.ts',
      '**/*.config.ts',
    ],
  },

  {
    files: ['eslint.config.*', '**/*.config.{js,cjs,mjs,ts,cts,mts}', 'turbo.json'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    ...eslint.configs.recommended,
  },

  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    extends: [...tseslint.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
  }),
);
