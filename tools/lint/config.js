// The project's ESLint config. It lives here, beside the package that carries ESLint and TypeScript 6 (see
// package.json), so its imports resolve from this folder; the root eslint.config.js only points at it.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

const root = fileURLToPath(new URL('../..', import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'public/**',
      'inspiration/**',
      'docs/**',
      'data/**',
      'test-results/**',
      'playwright-report/**',
      '*-previews/**',
      '**/node_modules/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: root },
    },
    rules: {
      // the typecheck owns unused names (noUnusedLocals, noUnusedParameters, which spare a leading underscore)
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // the dev door: game code never imports src/dev/ (main.ts loads it with a dynamic import(), which this rule doesn't
    // see); the game reaches dev code only through src/devDoor.ts, and dev code may import the game freely
    files: ['src/**/*.ts'],
    ignores: ['src/dev/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(\\.\\.?/)+dev(/|$)',
              message: 'Game code reaches src/dev/ only through src/devDoor.ts (and main.ts its dynamic import).',
            },
          ],
        },
      ],
    },
  },
  {
    // the simulation apart from the UI: world, actors, magic, items, combat, progression, vigil, flow, the loop and the
    // shared state never import src/ui/; they tell the UI what happened through src/events.ts (and notify.ts), open its
    // panels through src/panels.ts, and the loop runs it in its hook slots, which main.ts fills. (A later block replaces
    // the dev door's rule for these files, so it repeats it.)
    files: [
      'src/{world,actors,magic,items,combat,progression,vigil}/**/*.ts',
      'src/flow.ts',
      'src/loop.ts',
      'src/state.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(\\.\\.?/)+dev(/|$)',
              message: 'Game code reaches src/dev/ only through src/devDoor.ts (and main.ts its dynamic import).',
            },
            {
              regex: '^(\\.\\.?/)+ui(/|$)',
              message:
                'The simulation reaches the UI only through src/events.ts (notify.ts) and src/panels.ts; main.ts wires the UI.',
            },
          ],
        },
      ],
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
