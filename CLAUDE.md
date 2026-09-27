# Ossuary: project brief for Claude Code

Ossuary is a hobby desktop-browser game: a top-down roguelike in the style of The Binding of Isaac, set in
the owner's fantasy world **Eda** (high fantasy turned dark, medieval). Characters are made in **Tripo3D**
and exported as GLB. The owner (Azyrion) designs; you build.

**`docs/GDD.md` is the source of truth for game design.** Read the relevant section before starting a
milestone; if this file disagrees with it on design, the GDD wins. The Tripo asset checklist lives in the
owner's claude.ai project "Tripo3D-GameDev". This file holds what you need to work in the repo.

## Current state: M1 in progress (see `docs/M1-plan.md`)

The prototype was ported to Vite + TypeScript (strict) + three.js r186 in M0; M1 is turning it into
generated three-floor runs. See `README.md` for scripts and deployment.

- `src/`: the game, split as in the M0 layout. Plus `state.ts` (shared mutable state `G` and `player`,
  and sim-time timers `after()`), `flow.ts` (game states, floor setup, room transitions, `warp`),
  `loop.ts` (fixed 1/60 step), `strings.ts` (all player-facing text; HTML uses `data-s` keys) and
  `types.ts`.
- `src/actors/clipRoles.ts` and `src/actors/baseDetect.ts` hold the clip-name matching, hips-offset and
  round-base tests with no three.js dependency; the game and `tools/prepare-asset.ts` both use them.
- Runs are seeded (`src/rng.ts`: named streams per system). `src/world/generate.ts` builds each floor
  (pure, unit-tested); `src/world/shapes.ts` defines room shapes (cells, tile mask, door slots);
  `src/world/templates.ts` parses and validates room templates. `src/world/rooms.ts` traces walls along
  any outline and cuts doors into them; the camera follows the mage in rooms larger than the view
  (`cameraTargetFor`) and pulls back in multi-cell halls (`viewScaleFor`, `CFG.camHallView`); four
  torch lights move to the torches nearest the mage. Content:
  `data/floors.json` (room counts, difficulty weights, enemy health, boss tuning and look per floor),
  `data/templates/*.json` (room grids: `.` floor, `#` rock, `o` pit, `i` pillar, `=` stone tomb,
  `R W H` enemies, `B` boss; `x` outside an L's missing corner; ordeal templates list their enemies per
  wave in `waves`; `special.json` holds ordeals and altars, `shapes.json` the larger and narrow rooms) and
  `data/artifacts.json` (foci, passive and cursed artifacts: stats, effects, pools, colours, icons).
- Artifacts: `src/items/artifactData.ts` (pure: data, `computeStats` combining, picking) and
  `src/items/artifacts.ts` (pedestals, taking and focus swap, per-floor budget). The mage's stats are
  `player.stats`, recomputed on every pickup; read those, not `CFG.hero`, for anything artifacts change.
  The cantrip pipeline is in `src/combat/projectiles.ts`.
- Tests: `npm run test:unit` (Vitest: generator rules on hundreds of seeds, every template validated),
  `npm run test:e2e` (Playwright smoke tests), `npm test` runs both.
- URL options: `?seed=K3F9QX` replays a run's floors, `?floor=2` starts deeper, `?room=<template id>`
  plays one template (for reviewing rooms), `?variant=dark` dresses it in a room variant (quiet,
  champion, ambush, dark), `?give=bone_lens,twin_staff` starts with artifacts, `?boss=pyre` makes
  every floor's boss that one (warden, abbess, pyre).
  `__game.map()` prints the floor, `__game.give(...ids)` hands out artifacts, `__game.clearRoom()`
  ends the current fight.
- `public/assets/hero_default.glb`: the hero (17,655 triangles, 65-bone Mixamo-style rig, 1,024 px JPEG
  textures). Clips: `standing_relax`, `run`, `cast_a_spell`, `hit_to_body_01`, `fall`.
- `prototype/`: the 0.3 single file (`-source` to read, `-playable` to run). Still the reference for look
  and behaviour; `npm run compare` screenshots the same rooms in both.
- Lights were re-tuned for physically based lighting: decay exponents dropped to 0.5 so the falloff
  matches r147's legacy curve, intensities matched to the prototype within about 5% by region
  brightness (`CFG.lights`).
- Bosses are in `src/actors/bosses.ts` (placeholder shapes until M4): each floor draws one from its pool
  in `data/floors.json`, never one the run has met. A boss with `hidden` set (the abbess under the floor,
  the knight in mid-leap) can't be hit and doesn't hurt on contact.
- Gameplay delays (the warden's second ring, the pause before the death screen) run on simulation time,
  so they pause with the game and advance under `__game.sim()`.
- Dev hooks (`window.__game`, `window.__manual`) are also in production builds, for testing the deployed site.
  `warp(id)` or `warp(gx, gy)` does not despawn the previous room's foes (as in 0.3).

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

- Room cell 13 × 7 tiles, 1 tile = 1 unit, walls 1 thick, doors centred, 1.44 wide. From M1, larger rooms
  combine cells (GDD: Room shapes).
- Orthographic camera tilted 45°, fitted to one-cell rooms and following the mage in larger ones, pulled
  back 20% there; pans between rooms in 0.42 s, blending the zoom; only the current room is drawn. North
  wall tall (1.35), south wall low (0.5).
- Desktop browser first (keyboard, gamepad). The 0.3 touch controls stay but are frozen: don't extend or
  test them, and add no touch UI for new actions until a mobile port.
- Four-direction casting, eight-direction movement, 3 hearts counted in halves, 1 s invulnerability.
- Hearts can't be picked up at full health. Doors lock while enemies live.
- Placeholder names (Ossuary, Rotling, Wisp, Crypt hound, Hollow Warden, Drowned Abbess, Pyre Knight,
  Ember Sigil) will be replaced with Eda lore later; keep all player-facing strings in one place to make that easy.

## After M0: roadmap

Order and scope from `docs/GDD.md` (Roadmap and milestones); details are in the GDD. Every milestone
ships placeholder sounds for what it adds; spatial audio and the mixer arrive with M3 (GDD: Audio design).

- **M1 Core loop:** three generated floors (varied maps, room counts and room shapes), 20+ room templates,
  room variants from quiet to ordeal, bone altars, 3 to 5 artifacts per floor from 10 artifacts and 3 foci.
- **M2 Plunder:** coins, keys and bombs; merchant, secret room, locked vault, shrine cleansing; urns, chests.
- **M3 Magic:** mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions, library room.
- **M4 Tripo enemies:** 3 enemies and 1 boss from Tripo, with elemental affinities.
- **M5 Alchemy:** potion belt, drink or throw, identification, 4 reagents, alchemy table.
- **M6 RPG growth:** XP, levels, attributes, 12 boons, runes and waystones.
- **M7 Descent and Sanctum:** final boss, Sanctum with grimoire, bestiary and disciplines.
- **M8 Eda:** lore names, floor biomes, adaptive music, ambience beds and final mix.

## Working agreements

- Plan before large changes; keep commits small with clear messages.
- Before calling something done, verify it in the browser (Playwright screenshots are fine).
- Tuning values live in `config.ts`; content lives in `data/`. Don't scatter magic numbers.
- Performance target: 60 fps in desktop browsers on mid-range hardware, including integrated graphics.
  Share geometries and materials for projectiles and particles; dispose what you remove.
- The owner is an IT professional, comfortable with PowerShell; work on this project is in English.
