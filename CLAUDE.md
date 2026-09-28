# Ossuary: project brief for Claude Code

Ossuary is a hobby desktop-browser game: a top-down roguelike in the style of The Binding of Isaac, set in
the owner's fantasy world **Eda** (high fantasy turned dark, medieval). Characters are made in **Tripo3D**
and exported as GLB. The owner (Azyrion) designs; you build.

**`docs/GDD.md` is the source of truth for game design.** Read the relevant section before starting a
milestone; if this file disagrees with it on design, the GDD wins. `docs/ideas.md` is an idea bank of
unscheduled designs (pickup families and more); an idea only counts once it moves into the GDD. Every
system borrowed from Isaac gets a magic take (GDD: What separates Ossuary from an Isaac clone). The Tripo
asset checklist lives in the owner's claude.ai project "Tripo3D-GameDev". This file holds what you need to
work in the repo.

## Current state: M2 done (see `docs/M2-plan.md`); M1 built (`docs/M1-plan.md`); M3 next

The prototype was ported to Vite + TypeScript (strict) + three.js r186 in M0; M1 turned it into
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
  `data/floors.json` (room counts, difficulty weights, enemy health, altar and vault chances, which floors have
  a shrine, the vault's warden, boss tuning and look per floor),
  `data/templates/*.json` (room grids: `.` floor, `#` rock, `o` pit, `i` pillar, `=` stone tomb, `u` urn,
  `$` rune-sealed urn, `R W H` enemies, `B` boss; `x` outside an L's missing corner; ordeal templates list
  their enemies per wave in `waves`; `special.json` holds ordeals, altars, merchants, vaults, secret rooms and shrines,
  `shapes.json` the larger and narrow rooms) and
  `data/artifacts.json` (foci, passive and cursed artifacts: stats, effects, pools, colours, icons; a cursed
  artifact's price is its `curse`, which a shrine removes while halving the gift).
- Artifacts: `src/items/artifactData.ts` (pure: data, `computeStats` combining, picking) and
  `src/items/artifacts.ts` (pedestals, taking and focus swap, per-floor budget). The mage's stats are
  `player.stats`, recomputed on every pickup (and cleansing: `player.cleansed`); read those, not `CFG.hero`,
  for anything artifacts change.
  The cantrip pipeline is in `src/combat/projectiles.ts` (fans, the serpent's weave, strong casts, split
  bolts); companions that artifacts bind (the Candle Moth, the Weeping Skull) in `src/combat/familiars.ts`.
  New artifacts are data plus, for a new mechanic, an `Effect` or stat key in `artifactData.ts`, and an icon
  in `hud.ts` (33 artifacts and the starting wand; 15 more ideas in `docs/ideas.md`). An artifact's `gives`
  hands over obols, keys or glyphs once, when it's taken. The economy artifacts (step 6 of M2) reach into the
  systems they bend: `freeVault` in `world/vault.ts`, `ferryman` in `flow.ts` (`onRoomCleared`), `glyphWard`
  and `blastMul` in `combat/glyphs.ts`, `graveLantern` in `world/secret.ts` and the minimap, `pedlar` in
  `items/merchant.ts`; the Miser's Purse's `obolDamage` makes `player.stats` depend on obols held, so
  `giveResources` recomputes them when the hoard crosses a ten.
- Tests: `npm run test:unit` (Vitest: generator rules on hundreds of seeds, every template validated),
  `npm run test:e2e` (Playwright smoke tests), `npm test` runs both.
- URL options: `?seed=K3F9QX` replays a run's floors, `?floor=2` starts deeper, `?room=<template id>`
  plays one template (for reviewing rooms), `?variant=dark` dresses it in a room variant (quiet,
  champion, ambush, dark), `?give=bone_lens,twin_staff` starts with artifacts, `?boss=pyre` makes
  every floor's boss that one (warden, abbess, pyre), `?loot=coins:20,keys:2,glyphs:5` hands out obols,
  keys and glyphs. `?room=merchant_plain`, `?room=vault_urns` and `?room=secret_cell` put a shop, a sealed
  vault, a secret room (behind a cracked wall) or a shrine (`?room=shrine_henge`) next to the start.
  `__game.map()` prints the floor, `__game.give(...ids)` hands out artifacts, `__game.loot({ glyphs: 3 })`
  resources, `__game.drop('purse')` drops a pickup ahead of the mage, `__game.clearRoom()`
  ends the current fight, `__game.openSecret()` breaks open the floor's secret room,
  `__game.cleanse()` cleanses the oldest curse held at once, `__game.rite` reads the shrine's rite under way.
- The dev menu (`src/ui/devMenu.ts`; the key left of 1, or F2) pauses the game and does the same from
  buttons: heal, god mode (`DEV.god` in `state.ts`), resources, drops, artifacts, foes, this floor's
  special rooms (a sealed vault leads to its warded door), test rooms, boss fights and new runs, and taking or
  cleansing a curse. Its lists come from the data, so new artifacts,
  drops, room types and bosses show up by themselves; give a new room type a name in `STR.dev.roomNames`.
- Lore cards (`src/ui/lore.ts`): picking something up shows its icon, name, kind, effect and lore in the
  lower right corner, soulslike but plainer. Artifacts every time (`lore` in `data/artifacts.json`, required by
  the validator), items and containers the first time in a run (`STR.lore.items`, one for every drop). Anything
  new the mage can take (spells in M3, potions in M5) gets lore and shows it through `showLore`. The lore is a
  placeholder until the Eda lore arrives: keep it to the dungeon (chapel, crypts, sextons, pilgrims, the
  Ferryman) and invent no gods, factions or places.
- `public/assets/hero_default.glb`: the hero for the play-tests (18,632 triangles, 65-bone Mixamo-style rig,
  1,024 px JPEG textures). Clips: `standing_relax`, `run`, `walk` (slow movement), `cast_a_spell`,
  `hit_to_body_01`, `fall` and `defeat_03` (two deaths, one at random), `Drink Potion` (when healed) and
  `Eat` (a fidget after standing still a while).
- `prototype/`: the 0.3 single file (`-source` to read, `-playable` to run). Still the reference for look
  and behaviour; `npm run compare` screenshots the same rooms in both.
- Lights were re-tuned for physically based lighting: decay exponents dropped to 0.5 so the falloff
  matches r147's legacy curve, intensities matched to the prototype within about 5% by region
  brightness (`CFG.lights`).
- The end screen (`showEndScreen` in `src/ui/screens.ts`) sums up a run (obols found are `G.stats.obols`); "Replay this seed" starts a new
  run on the same seed.
- M2 (Plunder) takes the magic first: obols (coins, `coins` in code), bone keys and blast glyphs instead
  of bombs. Loot tables are in `data/loot.json` (pure `src/items/loot.ts`, economy simulated in
  `tests/unit/loot.test.ts`); glyphs are in `src/combat/glyphs.ts` (chalked with Space or LT, set off by the
  fuse or the mage's own bolts, chaining; tuning in `CFG.glyph`); pickups, coffers and warded reliquary
  chests in `src/items/pickups.ts`; urns (a room's "rocks" with `urn` set) in `src/world/rooms.ts`
  (`strikeUrn`). The merchant (a bound shade, wares in ward circles, a warded shop) is in
  `src/items/merchant.ts`, the locked vault (a warded door: a key, or two blasts that wake a warden) in
  `src/world/vault.ts`; stock, prices and the vault's hoard are in `data/loot.json`. Secret rooms (a
  forgotten mage's cell behind cracked walls that ring hollow to bolts and break to a glyph's blast) are in
  `src/world/secret.ts`: the generator adds one per floor on top of the room count, and each hidden doorway
  is a door with `secret` set (closed, a wall piece filling it) until `openSecret` opens both sides. The
  shrine (floor 2) is in `src/world/shrine.ts`: an offering stone per curse held; walking into one (10 obols)
  draws the curse out as a wisp that bolts only strike inside the shrine's circle (`strikeWisp`, `blastWisp`);
  four strikes in 10 s cleanse the artifact (`cleanseArtifact` in `items/artifacts.ts`), otherwise it flees
  back into its stone. Tuning in `CFG.shrine`, the price in `data/loot.json`.
- The per-floor artifact budget (`CFG.artifacts.maxPerFloor`, 6): the generator marks which rooms hold one
  (`artifact` on each planned room: always the treasure room, ordeal and boss; the merchant, vault and altar
  in a shuffled order while the budget lasts). `buildFloor` reserves them all; room-clear drops take what
  is left. A gilded reliquary chest (rare; only a key opens it) and the secret room hold artifacts outside
  the budget (`offerBeyondBudget`). While a room's doors are locked, its artifacts can't be taken.
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

Run clip playback speed is `CFG.hero.runAnimSpeed` (3.0 at full speed, measured from the run clip's stride so
the feet don't slide: the feet's ground speed while planted, against `CFG.hero.speed`); a
walk, when the model has one, takes over below `CFG.hero.walkToRun` of full speed at `walkAnimSpeed`. A model
with a walk but no run runs with its walk. Extras used when present: a second death clip (one of the two
at random), a drink (played when healed, only the draught around the raised flask) and an eat (a fidget
after `CFG.hero.fidget` seconds standing still). A rig with no death clip topples over like a static model.

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
- **M2 Plunder:** obols, bone keys and blast glyphs; merchant, secret room, locked vault, shrine cleansing;
  urns, chests.
- **M3 Magic:** mana, 2 spell slots, 6 spells across 3 schools, status effects, 2 reactions, library room.
- **M4 Tripo enemies:** 3 enemies and 1 boss from Tripo, with elemental affinities.
- **M5 Alchemy:** potion belt, drink or throw, identification, 4 reagents, alchemy table.
- **M6 RPG growth:** XP, levels, attributes, 12 boons, runes and waystones.
- **M7 Descent and Sanctum:** final boss, Sanctum with grimoire, bestiary and disciplines.
- **M8 Eda:** lore names, floor biomes, adaptive music, ambience beds and final mix.

## Working agreements

- Plan before large changes; keep commits small with clear messages.
- **Every new feature gets its dev menu entry in the same step** (`src/ui/devMenu.ts`): a way to spawn,
  give, reach or trigger it, so testing stays quick. Things listed from data show up by themselves; new
  kinds of things (a room type, a mechanic, a switch) need a button or a line in `refresh()`. The HUD and the
  title screen's controls show the menu's key during the play-tests (`#devHint`, `STR.dev.hint`,
  `STR.controls.dev`); remove them when they're over.
- Before calling something done, verify it in the browser (Playwright screenshots are fine).
- Tuning values live in `config.ts`; content lives in `data/`. Don't scatter magic numbers.
- Performance target: 60 fps in desktop browsers on mid-range hardware, including integrated graphics.
  Share geometries and materials for projectiles and particles; dispose what you remove.
- The owner is an IT professional, comfortable with PowerShell; work on this project is in English.
