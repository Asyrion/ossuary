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
| `npm test` | Unit tests (Vitest) and browser smoke tests (Playwright) |
| `npm run test:unit` | Unit tests only: floor generator rules, room template checks |
| `npm run test:e2e` | Browser smoke tests only: clear a room, descend a floor, beat each boss, the end screen, no console errors |
| `npm run prepare-asset -- in.glb [name.glb]` | Shrink a Tripo GLB's textures into `public/assets/` and print a report |
| `npm run compare` | Screenshots of four rooms in the port and in prototype 0.3, into `test-results/compare/` (needs `npm run dev` running) |

## Testing a run

Add these to the address (locally or on the Pages site):

- `?seed=K3F9QX` plays the floors of that seed (the seed of a run is shown in the pause menu)
- `?floor=2` starts on floor 2
- `?room=pit_maze` plays a single room template (ids are in `data/templates/`)
- `?variant=ambush` plays that room as a variant: `quiet`, `champion`, `ambush` or `dark`
- `?give=twin_staff,bone_lens` starts the run holding those artifacts (ids are in `data/artifacts.json`)
- `?boss=pyre` makes every floor's boss that one: `warden`, `abbess` or `pyre`
- `?loot=coins:20,keys:2,glyphs:5` starts with extra obols, bone keys and blast glyphs

Options combine, e.g. `?room=crypt_a&variant=champion&give=shepherds_crook`, or `?room=boss_tombs&boss=abbess&floor=3`
for the Drowned Abbess with floor 3 tuning. The end screen's "Replay this seed" starts the same run again.

## Deploying to GitHub Pages

1. Create an empty GitHub repository (the Vite base path follows its name automatically in Actions).
2. `git remote add origin https://github.com/<you>/<repo>.git` and `git push -u origin main`.
3. In the repository: Settings → Pages → Source: **GitHub Actions**.

Every push to `main` runs the smoke test, builds and deploys to `https://<you>.github.io/<repo>/`.

`prototype/ossuary-0.3-playable.html` is the single-file prototype the port was checked against. With the
dev server running it is at http://localhost:5173/prototype/ossuary-0.3-playable.html.
