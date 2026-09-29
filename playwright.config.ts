import { defineConfig } from '@playwright/test';

const PORT = 5174;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  reporter: process.env.CI ? [['list'], ['github']] : 'list', // (list: each test's time in the CI log)
  use: {
    baseURL: `http://localhost:${PORT}/`,
    viewport: { width: 1280, height: 720 },
    browserName: 'chromium',
    // software WebGL so the test runs on machines and CI runners without a GPU; PW_CHROMIUM points at a Chromium
    // binary where Playwright's own isn't installed (cloud sessions: /opt/pw-browsers/...)
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], executablePath: process.env.PW_CHROMIUM || undefined },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
