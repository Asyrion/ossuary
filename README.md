# Ossuary (hobby prototype)

Isaac-style roguelike set in Eda, built with three.js and Tripo3D models.

## Documents

| File | What's in it |
| --- | --- |
| `docs/STATUS.md` | Where the project stands and what comes next |
| `docs/RESET-plan.md` | The current plan: the reset, phases R0 to R5 |
| `docs/GDD.md` | The game design: the source of truth |
| `docs/architecture.md` | How the code is built: each system's files, data, tuning and hooks |
| `docs/lore/` | The owner's Eda lore, with an index |
| `docs/assets.md` | Making assets: tools, house style, budgets, the pipeline from an image to the game, the asset log |
| `docs/ideas.md` | Ideas not scheduled yet |
| `docs/archive/` | Finished milestone plans |
| `CREDITS.md` | Every shipped asset's source and licence |

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
| `npm run prepare-asset -- in.glb --kind prop --id urn` | Check a model against its kind's budget (`data/assets.json`), fix what it can (centre, base, facing, triangles, textures), write it into `public/assets/` and print a report |
| `npm run prepare-texture -- in.png --kind floor --id crypt` | Make a floor or wall tile (seams and light checked, a 2 × 2 preview) or an icon (`--kind icon`, a sheet at 28 and 44 px) for `public/assets/` |
| `npm run animate-creature -- <id> in.glb` | Animate a rigged Tripo creature in code (`docs/creatures.md`): its faces turned outward, its skin bound again, its recipe's clips baked, its texture padded, into `public/assets/creatures/`; `-- --bones in.glb` reads a new model's rig first |
| `npm run creature-preview -- <id>` | A short video of an animated creature with its sounds, into `creature-previews/` (needs `npm run dev` running) |
| `npx tsx tools/make-standins.ts` | Remake the stand-in assets the browser tests load (`tests/fixtures/assets/`), through the same scripts |
| `npm run compare` | Screenshots of four rooms in the port and in prototype 0.3, into `test-results/compare/` (needs `npm run dev` running) |
| `npm run inspect -- <targets>` | Screenshots of templates, themes, every object or a whole floor and a contact sheet, into `test-results/inspect/` (the room inspector's tool; needs `npm run dev` running). `changed` picks the rooms from the diff; `--against origin/main` shoots them on main too and marks what changed; checks flag a hidden mage, pools that read like pits and dark rooms |
| `npm run review-checks -- [range]` | What a script can find in a diff against the project's rules, plus the typecheck and unit tests (the rules reviewer's tool) |

## Testing a run

In a run, press the key left of 1 (`` ` `` on English keyboards, `^` on German ones) or F2 for the **dev
menu**. It pauses the game and lets you heal, turn on god mode, hand out obols, keys, glyphs and artifacts,
drop any pickup or chest (a gilded one too), spawn foes, jump to this floor's special rooms, reveal the map,
end a fight, go down a floor, or start a test room, a boss fight or a new run (optionally keeping what you
carry). Esc or the same key closes it. It works on the Pages site too.

Or add these to the address (locally or on the Pages site):

- `?seed=K3F9QX` plays the floors of that seed (the seed of a run is shown in the pause menu)
- `?floor=2` starts on floor 2
- `?room=pit_maze` plays a single room template (ids are in `data/templates/`)
- `?variant=ambush` plays that room as a variant: `quiet`, `champion`, `ambush` or `dark`
- `?give=twin_staff,bone_lens` starts the run holding those artifacts (ids are in `data/artifacts.json`)
- `?boss=pyre` makes every floor's boss that one: `warden`, `abbess` or `pyre`
- `?loot=coins:20,keys:2,glyphs:5` starts with extra obols, bone keys and blast glyphs
- `?spells=arc` starts with those spells in the slots (Q, then E; ids are in `data/spells.json`)

Options combine, e.g. `?room=crypt_a&variant=champion&give=shepherds_crook`, or `?room=boss_tombs&boss=abbess&floor=3`
for the Drowned Abbess with floor 3 tuning. The end screen's "Replay this seed" starts the same run again.

## Deploying to GitHub Pages

1. Create an empty GitHub repository (the Vite base path follows its name automatically in Actions).
2. `git remote add origin https://github.com/<you>/<repo>.git` and `git push -u origin main`.
3. In the repository: Settings → Pages → Source: **GitHub Actions**.

Every push to `main` runs the smoke test, builds and deploys to `https://<you>.github.io/<repo>/`.

`prototype/ossuary-0.3-playable.html` is the single-file prototype the port was checked against. With the
dev server running it is at http://localhost:5173/prototype/ossuary-0.3-playable.html.
