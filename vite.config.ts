import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/. In Actions GITHUB_REPOSITORY is "owner/repo".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'ossuary';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? `/${repo}/` : '/',
  build: { target: 'es2022', chunkSizeWarningLimit: 1000 },
  server: { host: true },
}));
