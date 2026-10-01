import { defineConfig } from 'vitest/config';

export default defineConfig({
  // (the generator's and the economy's sweeps build hundreds of floors in one test, a few seconds on a fast machine: a
  // slower CI runner shouldn't fail them on vitest's 5 s default)
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node', testTimeout: 30000 },
});
