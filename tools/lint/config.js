// The project's ESLint config. It lives here, beside the package that carries ESLint and TypeScript 6 (see
// package.json), so its imports resolve from this folder; the root eslint.config.js only points at it.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const root = new URL('../..', import.meta.url).pathname;

export default tseslint.config(
  {
    ignores: ['dist/**', 'prototype/**', 'public/**', 'inspiration/**', 'docs/**', 'data/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: root },
    },
  },
  {
    // plain JS (the dev board's page, these configs) is outside the tsconfig, so it is linted without types
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  prettier,
);
