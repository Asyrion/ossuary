import { defineConfig } from '@playwright/test';

const PORT = 5174;
// a dev server already running elsewhere (OSSUARY_URL, as the tools take it): the tests use it and start none of their own,
// so two Vite servers never run on one node_modules
const BASE = process.env.OSSUARY_URL || `http://localhost:${PORT}/`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  // every test on its own, so the spec files spread over the workers and CI's shards (--shard=n/3); two workers a CI
  // runner, as each page renders in software and a third starves the others (tests with 4 on 4 cores timed out)
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : 'list', // (list: each test's time in the CI log)
  use: {
    baseURL: BASE,
    viewport: { width: 1280, height: 720 },
    browserName: 'chromium',
    // software WebGL so the test runs on machines and CI runners without a GPU; PW_CHROMIUM points at a Chromium
    // binary where Playwright's own isn't installed (cloud sessions: /opt/pw-browsers/...)
    launchOptions: {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      executablePath: process.env.PW_CHROMIUM || undefined,
    },
  },
  webServer: process.env.OSSUARY_URL
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
