# Ossuary (hobby prototype)

Isaac-style roguelike set in Eda, built with three.js and Tripo3D models.

## Setup on Windows

1. Install Git for Windows and Node.js 24 (LTS or newer).
2. In PowerShell, in this folder:
   ```
   npm install
   npx playwright install chromium
   npm run dev
   ```
3. Open the URL Vite prints (http://localhost:5173). `--host` is on, so a phone on the same Wi-Fi can use
   the network URL too.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` (base path `/<repo>/` for GitHub Pages) |
| `npm run preview` | Serve the built `dist/` locally at `/ossuary/` |
| `npm test` | Playwright smoke test: starts a run, clears room A, checks for console errors |
| `npm run prepare-asset -- in.glb [name.glb]` | Shrink a Tripo GLB's textures into `public/assets/` and print a report |
| `npm run compare` | Screenshots of four rooms in the port and in prototype 0.3, into `test-results/compare/` (needs `npm run dev` running) |

## Deploying to GitHub Pages

1. Create an empty GitHub repository (the Vite base path follows its name automatically in Actions).
2. `git remote add origin https://github.com/<you>/<repo>.git` and `git push -u origin main`.
3. In the repository: Settings → Pages → Source: **GitHub Actions**.

Every push to `main` runs the smoke test, builds and deploys to `https://<you>.github.io/<repo>/`.

`prototype/ossuary-0.3-playable.html` is the single-file prototype the port was checked against. With the
dev server running it is at http://localhost:5173/prototype/ossuary-0.3-playable.html.
