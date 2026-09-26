# Ossuary: project brief for Claude Code

Ossuary is a hobby browser/mobile game: a top-down roguelike in the style of The Binding of Isaac, set in
the owner's fantasy world **Eda** (high fantasy turned dark, medieval). Characters are made in **Tripo3D**
and exported as GLB. The owner (Azyrion) designs; you build.

**`docs/GDD.md` is the source of truth for game design.** Read the relevant section before starting a
milestone; if this file disagrees with it on design, the GDD wins. The Tripo asset checklist lives in the
owner's claude.ai project "Tripo3D-GameDev". This file holds what you need to work in the repo.

## Current state: 0.4 (M0 done)

The prototype has been ported to Vite + TypeScript (strict) + three.js r186 with the layout below; it
plays like 0.3. See `README.md` for scripts and deployment.

- `src/`: the game, split as in the M0 layout. Plus `state.ts` (shared mutable state `G` and `player`,
  and sim-time timers `after()`), `flow.ts` (game states, floor setup, room transitions, `warp`),
  `loop.ts` (fixed 1/60 step), `strings.ts` (all player-facing text; HTML uses `data-s` keys) and
  `types.ts`.
- `src/actors/clipRoles.ts` and `src/actors/baseDetect.ts` hold the clip-name matching, hips-offset and
  round-base tests with no three.js dependency; the game and `tools/prepare-asset.ts` both use them.
- `data/floor1.json` (rooms, rocks, foes, which relic a treasure room holds) and `data/relics.json`
  (relic stats, name, pickup line, colour).
- `public/assets/hero_default.glb`: the hero (17,655 triangles, 65-bone Mixamo-style rig, 1,024 px JPEG
  textures). Clips: `standing_relax`, `run`, `cast_a_spell`, `hit_to_body_01`, `fall`.
- `prototype/`: the 0.3 single file (`-source` to read, `-playable` to run). Still the reference for look
  and behaviour; `npm run compare` screenshots the same rooms in both.
- Lights were re-tuned for physically based lighting: decay exponents dropped to 0.5 so the falloff
  matches r147's legacy curve, intensities matched to the prototype within about 5% by region
  brightness (`CFG.lights`).
- Gameplay delays (the warden's second ring, the pause before the death screen) run on simulation time,
  so they pause with the game and advance under `__game.sim()`.
- Dev hooks (`window.__game`, `window.__manual`) are also in production builds, for testing on a phone.
  `warp()` does not despawn the previous room's foes (as in 0.3).

Prototype content: one hand-built floor of six rooms (start, 3 combat, treasure, boss), 3 enemy types plus
a boss (placeholder primitive shapes), one relic, hearts, minimap, boss bar, keyboard/gamepad/touch
twin-stick input, synthesised sound, pause/title/end screens, drag-and-drop GLB hero swapping.

## Milestone M0: move to a proper project (done)

Goal: the same game, playable, in a maintainable project. No new features.

1. Vite + TypeScript (strict) + **current three.js** from npm, ES modules.
2. Split the prototype into modules:

   ```
   src/
     main.ts          boot, game loop (fixed 1/60 step, max dt 1/30), states
     config.ts        the CFG tuning block, unchanged values
     render/          renderer, camera, lights, procedural textures
     world/           floor data, rooms, walls, doors, collision
     actors/          hero, enemies, animation controller
     combat/          bolts, enemy shots, damage, particles, decals
     items/           relic, pickups
     input/           keyboard, gamepad, touch
     ui/              HUD, minimap, banner, menus (HTML/CSS overlay as now)
     audio/           WebAudio synth effects
   data/              floor1.json (rooms, rocks, foes), relics.json
   public/assets/     hero_default.glb (loaded at runtime, never base64)
   tools/             prepare-asset (Node)
   ```
3. Move hard-coded content to JSON: the `FLOOR` table (rooms, rocks, foes) and the Ember Sigil relic.
4. `tools/prepare-asset`: a Node script using `@gltf-transform/core` + `@gltf-transform/functions`
   (+ `sharp`) that takes a Tripo GLB and writes an optimised copy to `public/assets/`: textures resized to
   1,024 px and JPEG, then prints a report: triangle count, rigged yes/no, clip names and the role each
   would be matched to, whether the hips track has a horizontal offset, whether a round base is present.
5. Deploy to **GitHub Pages** with a GitHub Actions workflow (set Vite `base` to the repo name).
6. Keep the dev hooks: `window.__game` with `sim(seconds)`, `draw()`, `warp(gx, gy)`, `keys`, `arrowOrder`,
   `player`, `enemies`, `camera`. Add a Playwright smoke test that starts a run, clears room A with the
   hooks and checks there are no console errors.

**Done when:** `npm run dev` plays exactly like the playable prototype; `npm run build` succeeds; the Pages
URL loads on a phone in landscape; the smoke test passes.

## three.js upgrade notes (r147 → current)

- Colour management is on by default now: delete `THREE.ColorManagement.legacyMode = false`.
- `renderer.outputEncoding = sRGBEncoding` → `renderer.outputColorSpace = THREE.SRGBColorSpace`;
  canvas textures: `texture.encoding` → `texture.colorSpace = THREE.SRGBColorSpace`.
- Lights are physically based now. Point-light and hemisphere intensities from the prototype will look
  far too dark. Re-tune by eye against the playable prototype (screenshots side by side).
- `GLTFLoader` comes from `three/addons/loaders/GLTFLoader.js`.
- WebGPU is optional; stay on `WebGLRenderer` for M0 unless it's a drop-in.

## Techniques that must survive the port

These were each found by testing real Tripo exports. Keep them, with the same behaviour.

| Function in the prototype | What it does | Why |
| --- | --- | --- |
| `prepareHero` | Normalises any GLB to 1.3 units tall, centred, feet on the floor | Tripo sizes vary |
| `stripMiniatureBase` | Detects and cuts a round base off static meshes | Tripo figurines often stand on a base |
| `setHero` | Recognises clips by name keywords (idle/stand/relax, run/walk, cast/spell/attack, hit/hurt, fall/death) | Tripo names vary (`standing_relax.001`) |
| `bodyPart` | Splits clips into upper body (spine and above) and lower body | Run with legs while casting with arms |
| `alignUpperToHips` | Moves an overlay clip's hip rotation into the spine | `cast_a_spell` turns the whole body 75° at the hips |
| `centreHips` | Removes horizontal hip offsets from clips | `run` shifts the body 0.28 units forward |
| `castWindow` | Finds the fastest forward hand thrust and replays only that 0.6 s window per shot | The cast clip is 5.4 s long |
| `updateHeroAnim` | Blends weights: lower = idle/run by speed; upper = base, cast, hit; death overrides | Clean layering |
| Drag-and-drop / Load hero .glb | Swap the hero at runtime and show a report in the pause menu | Quick Tripo tests |

Run clip playback speed is `CFG.hero.runAnimSpeed` (3.6 at full speed).

## Design facts to keep consistent

- Room interior 13 × 7 tiles, 1 tile = 1 unit, walls 1 thick, doors centred, 1.44 wide.
- Orthographic camera tilted 45°, fitted to the room; pans between rooms in 0.42 s; only the current room
  is drawn. North wall tall (1.35), south wall low (0.5).
- Four-direction casting, eight-direction movement, 3 hearts counted in halves, 1 s invulnerability.
- Hearts can't be picked up at full health. Doors lock while enemies live.
- Placeholder names (Ossuary, Rotling, Wisp, Crypt hound, Hollow Warden, Ember Sigil) will be replaced with
  Eda lore later; keep all player-facing strings in one place to make that easy.

## After M0: roadmap

Order and scope from `docs/GDD.md` (Roadmap and milestones); details are in the GDD. Every milestone
ships placeholder sounds for what it adds; spatial audio and the mixer arrive with M2 (GDD: Audio design).

- **M1 Core loop:** generated floors, 15+ room templates, 10 artifacts and 3 foci as data.
- **M2 Magic:** mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions, library room.
- **M3 Tripo enemies:** 3 enemies and 1 boss from Tripo, with elemental affinities.
- **M4 Alchemy:** potion belt, drink or throw, identification, 4 reagents, alchemy table.
- **M5 RPG growth:** XP, levels, attributes, 12 boons, runes and waystones.
- **M6 Descent and Sanctum:** 3 floors, final boss, Sanctum with grimoire, bestiary and disciplines.
- **M7 Eda:** lore names, floor biomes, adaptive music, ambience beds and final mix.

## Working agreements

- Plan before large changes; keep commits small with clear messages.
- Before calling something done, verify it in the browser (Playwright screenshots are fine).
- Tuning values live in `config.ts`; content lives in `data/`. Don't scatter magic numbers.
- Performance target: 60 fps on a mid-range Android phone in landscape. Share geometries and materials
  for projectiles and particles; dispose what you remove.
- The owner is an IT professional, comfortable with PowerShell, and writes in English or German.
