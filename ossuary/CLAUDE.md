# Ossuary: project brief for Claude Code

Ossuary is a hobby browser/mobile game: a top-down roguelike in the style of The Binding of Isaac, set in
the owner's fantasy world **Eda** (high fantasy turned dark, medieval). Characters are made in **Tripo3D**
and exported as GLB. The owner (Azyrion) designs; you build.

The full game design document and the Tripo asset checklist live as living docs in the owner's claude.ai
project "Tripo3D-GameDev". This file holds what you need to work in the repo.

## Current state: prototype 0.3

- `prototype/ossuary-0.3-source.html`: the whole game in one file (about 1,300 lines, three.js r147 UMD).
  The hero model is injected at build time where it says `__HERO_GLB_B64__`. Read this, don't run it.
- `prototype/ossuary-0.3-playable.html`: the same file with the hero embedded. Opens in a browser as-is
  and is the **reference for behaviour and look** during the port.
- `assets/hero_default.glb`: the hero (17,655 triangles, 65-bone Mixamo-style rig, textures already
  reduced to 1,024 px JPEG). Clips: `standing_relax`, `run`, `cast_a_spell`, `hit_to_body_01`, `fall`.
- `tools/prepare_asset_reference.py`: the Python script used so far to shrink GLB textures. Port its job to
  Node (see M0).

Prototype content: one hand-built floor of six rooms (start, 3 combat, treasure, boss), 3 enemy types plus
a boss (placeholder primitive shapes), one relic, hearts, minimap, boss bar, keyboard/gamepad/touch
twin-stick input, synthesised sound, pause/title/end screens, drag-and-drop GLB hero swapping.

## Milestone M0: move to a proper project (do this first)

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

- **M1 core loop:** Isaac-style floor generation (random walk on a 9 × 8 grid, dead ends become special
  rooms, farthest is the boss), 15+ room templates as JSON (13 × 7 char grids + difficulty), 10 relics as
  data with stat modifiers and stackable effects.
- **M2:** three Tripo enemies and one boss replace the placeholders, using the hero's animation controller.
- **M3:** coins, keys, bombs, shop, locked and secret rooms. **M4:** three floors and a final boss.
  **M5:** Eda names, floor themes, sound and music.

## Working agreements

- Plan before large changes; keep commits small with clear messages.
- Before calling something done, verify it in the browser (Playwright screenshots are fine).
- Tuning values live in `config.ts`; content lives in `data/`. Don't scatter magic numbers.
- Performance target: 60 fps on a mid-range Android phone in landscape. Share geometries and materials
  for projectiles and particles; dispose what you remove.
- The owner is an IT professional, comfortable with PowerShell, and writes in English or German.
