import { defineConfig } from 'vite';

// GitHub Pages serves the site from /<repo>/. In Actions GITHUB_REPOSITORY is "owner/repo".
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'ossuary';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? `/${repo}/` : '/',
  build: { target: 'es2022', chunkSizeWarningLimit: 1000 },
  // (asset-previews/ and test-results/ are scratch: pictures downloading there locked a file the watcher stat'ed and
  // took the dev server down)
  server: { host: true, watch: { ignored: ['**/asset-previews/**', '**/test-results/**'] } },
}));
