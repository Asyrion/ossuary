# Ossuary: project brief for Claude Code

Ossuary is a hobby desktop-browser game by Azyrion (the owner, who designs; you build): a top-down roguelite with RPG
elements in the style of The Binding of Isaac, set in the owner's fantasy world **Eda** (high fantasy turned dark). Its
identity is magic: spells, runes, artifacts, potions and the room itself react to each other. Azyrion, an apprentice mage,
descends into the Wardens' vault beneath the Gate of Uzulim; between runs the mage wakes at the Vigil.

**Where things stand:** `docs/STATUS.md` (one page; GitHub milestones are the tracker of record). **The reset**
(`docs/RESET-plan.md`, approved 2026-10-12) is the current plan, and a **feature freeze** holds until its phase R5: no new
systems, only cleaning, the look and the story.

## The documents

| Document | What it is |
| --- | --- |
| `docs/STATUS.md` | Where the project stands and what is next. Update it when a phase or step finishes. |
| `docs/RESET-plan.md` | The plan now: phases R0 to R5, the owner's decisions, the working agreements it adds. |
| `docs/GDD.md` | **Source of truth for design.** Read its section before working on a system; it wins over this file on design. |
| `docs/architecture.md` | What the code does and where: each system's files, data, tuning, hooks, and how to add one. |
| `docs/lore/` | The owner's Eda lore, with an index. A name enters the game only once the GDD adopts it. |
| `docs/playtest-notes.md` | What the owner finds in play, newest first. |
| `docs/ideas.md` | Idea bank; an idea counts only once it moves into the GDD. |
| `docs/assets.md`, `docs/creatures.md`, `docs/effects.md` | Asset pipeline and budgets, Tripo creatures, the house style for magic effects. |
| `docs/M7-plan.md` | The open milestone's plan (steps 10 to 13 move into R4). Finished plans: `docs/archive/`. |

## Run and test

- `npm run dev` (Vite, port 5173), `npm run build` (typecheck and build), `npm run typecheck`.
- `npm run format` (Prettier, 120 columns) and `npm run lint` (ESLint, type-checked; `npm run lint:install` once, it
  has its own package in `tools/lint/`). Code is committed formatted and lint-clean.
- `npm run test:unit` (Vitest, ~500 tests, under a minute), `npm run test:e2e` (Playwright, 148 tests in a file a
  system, fully parallel, about 11 minutes), `npm run test:fast` (the 22 tagged `@fast`, under 2 minutes), `npm test`
  unit and e2e. In a cloud session set `PW_CHROMIUM=/opt/pw-browsers/chromium` for every Playwright run and for
  `npm run inspect`, `foe-sheet` and `balance` (those three need the dev server running).
- Browser tests are deterministic: `start()` seeds `Math.random`, every test names its `?seed=`, rooms are found by what
  they are (docs/architecture.md, Testing).
- CI (`.github/workflows/deploy.yml`): a PR runs `build` (typecheck, unit tests, build), `lint` and the full suite in
  three `e2e` shards; a push to `main` runs `build`, `lint` and the fast suite; `nightly.yml` runs the full suite on
  `main` each night and opens an issue when it fails. On `main` the Pages deploy waits for `build` only. A PR takes about 7 minutes, a merge is live 2 minutes later.
- Other tools: `npm run` lists them; `docs/architecture.md`, Tools, says what each is for.

## Code map

`src/` (TypeScript strict, three.js r186): `main.ts` boot and the wiring of the UI, `loop.ts` fixed 1/60 step, `flow.ts`
game states and floors, `state.ts` shared state `G` and `player`, `config.ts` all tuning (`CFG`), `strings.ts` all
player-facing text (`STR`), `types.ts`, `events.ts`/`notify.ts`/`panels.ts` the game's events and the panel door.
Folders: `world/` (generation, rooms, objects, mechanisms, themes, special rooms), `actors/` (mage, foes, bosses,
looks), `magic/` (spells, statuses, reactions, weaves, runes), `items/` (artifacts, pickups, potions, merchant),
`combat/` (bolts, glyphs, familiars), `progression/` (insight, levels, boons), `vigil/` (the hub and its save),
`render/` (renderer, pixel look, textures, fire), `audio/`, `ui/` (HUD, menus), `input/`, `assets/`. Dev code (`__game`,
the dev menu, galleries, harnesses) is in `dev/`, a separate chunk the game reaches only through `devDoor.ts`. Content
is in `data/` (JSON, each kind with a validator), tools in `tools/`, tests in `tests/unit` and `tests/e2e`. Details:
`docs/architecture.md`.

## Rules

- **Content in `data/`, tuning in `config.ts`, player-facing text in `strings.ts`.** No magic numbers scattered in code.
- **Nothing silent:** every mechanic shows the player it is happening, even if only in a word or a line (chips beside
  the mana bar, a word rising over a foe). A mechanic isn't done until it shows.
- **Difficulty never comes from more foe health.**
- **Every system borrowed from Isaac gets a magic take**: it answers to spells, schools, glyphs or the room, never only
  to walking over it (GDD: What separates Ossuary from an Isaac clone).
- **One pixel for everything:** the game is drawn at the room kit's texel and blown up. New things are drawn at it; their
  glows are stepped; icons are pixel art. Every Tripo model wears its texture as pixel art (`tools/texel-bake.ts`).
- **Every new feature gets its dev menu entry in the same step** (`src/dev/menu.ts`, in its tab), so it can be spawned,
  given or triggered. Dev code stays in `src/dev/`; the game reaches it only through `src/devDoor.ts`. While the freeze
  holds this applies to what the reset builds. The HUD and the title show the dev menu's key while play-tests run
  (`#devHint`); remove it when they are over.
- **The simulation reaches the UI only through `events.ts` (`notify.ts`) and `panels.ts`**: world, actors, magic,
  items, combat, progression, vigil, `flow.ts`, `loop.ts` and `state.ts` never import `src/ui/` (lint fails); `main.ts`
  wires the UI (docs/architecture.md, Events and the panel door).
- **The owner sees new looks before they replace old ones**; the look that loses is deleted in the same step (no switch
  between an old and a new way outlives the owner's choice).
- **Lore limits:** name only what the GDD adopted from the owner's lore (`docs/lore/`); invent no gods, factions or places.
- Runs replay from their seed: anything that shapes a run (floors, rooms, loot, deals) draws from a named stream in
  `src/rng.ts`; only combat and visual jitter may use `Math.random`.
- Desktop browser first (keyboard, gamepad). The old touch controls are frozen: don't extend them.
- Performance: 60 fps on mid-range hardware with integrated graphics. Share geometries and materials, dispose what you
  remove, keep draw calls in mind.
- Verify in the browser before calling something done (Playwright screenshots are fine).
- Work in English. The owner writes German in chat; answer in their language, keep the repo in English.

## Design facts

- A room cell is 13 × 7 tiles, 1 tile = 1 unit, walls 1 thick, doors 1.44 wide; larger rooms combine cells.
- Orthographic camera tilted 45°, fitted to one-cell rooms, following the mage in larger ones and pulled back 20% there;
  it pans between rooms in 0.42 s; only the current room is drawn. North wall tall (1.35), south wall low (0.5).
- Four-direction casting, eight-direction movement, 3 hearts counted in halves, 1 s invulnerability after a hit.
- Doors lock while foes live. Hearts can't be taken at full health, mana vials at full mana (a first-time line says why).

## Hero model techniques

These were found by testing real Tripo exports; keep their behaviour (`src/actors/`, `tools/prepare-asset.ts`).

| Function | What it does | Why |
| --- | --- | --- |
| `prepareHero` | Normalises any GLB to 1.3 units tall, centred, feet on the floor | Tripo sizes vary |
| `stripMiniatureBase` | Detects and cuts a round base off static meshes | Tripo figurines stand on a base |
| `setHero` | Recognises clips by name keywords (idle, run/walk, cast, hit, fall/death) | Tripo names vary |
| `bodyPart` | Splits clips into upper and lower body | Run with the legs while casting with the arms |
| `alignUpperToHips` | Moves an overlay clip's hip rotation into the spine | `cast_a_spell` turns the body 75° |
| `centreHips` | Removes horizontal hip offsets from clips | `run` shifts the body forward |
| `castWindow` | Replays only the fastest hand thrust (0.6 s) of the cast clip per shot | The clip is 5.4 s long |
| `updateHeroAnim` | Blends lower (idle/run by speed) and upper (base, cast, hit) layers; death overrides | Clean layering |

## Pitfalls

- Don't edit `src/` while the browser suite, the balance bot or an inspection runs: Vite reloads and they flake. Run long
  jobs in the background and wait on their notification.
- Stop a dev server by its PID: `pkill -f vite` kills the shell running it. Never run two Vite servers on one
  `node_modules`.
- A `+` in a URL query arrives as a space (`?runes=e:lasting+vein`); parsers split on both.
- Under `window.__manual` (the browser tests) the camera moves only when a frame is drawn: call `__game.sim(t, true)` before
  projecting to the screen. `start(page, query)` in the tests adds `autolevel=skip`.
- Browser tests find rooms by what they hold, never by a seed's layout, and never depend on a random roll (a test that
  passes by luck is a bug in the test). Never skip or quarantine a test to get green.
- A one-line object literal can't hold a `//` comment; use `/* */`.
- What reads at play distance under the 45° camera: dark bodies with bright emissive features; shapes that stick out
  sideways. Pale bodies wash out, and detail on a forward face is lost.
- In a cloud session GitHub may print "Cannot update this protected ref" on a push that went through: check
  `git log -1 origin/<branch>`. Branches other than the session's own can't be deleted from a cloud session.

## Agents and skills

The owner asked for these to be used without being asked each time.

- **`rules-reviewer`** (subagent): before opening every PR, on `origin/main...HEAD`; fix its blocking findings. It starts
  from `npm run review-checks` (tell it `--no-tests` when the typecheck and unit tests just ran).
- **`room-inspector`** (subagent): after every change to how rooms look, on what changed (`npm run inspect`); a closing
  sweep before a play-test build. Fix its blocking findings; list the polish for the owner.
- **`ship`** (skill): when the owner asks to open a PR and merge it. Never ship without being asked.
- **`tripo-prompts`** (skill): prompts for a character or creature made in Tripo Studio and animated in code.
- **`game-dev-board`** (skill): the generic recipe behind the dev board.
- Subagents: Opus plans, designs and reviews; Sonnet carries well-briefed work (docs, tests, tools, data); Haiku does
  mechanical passes (lint fixes, renames, moves). Give each a self-contained brief: the files it owns and must not touch.

## Dev board

`npm run devboard` serves http://127.0.0.1:8770, a local page to browse and edit the content in `data/`, checked by the
game's own validators on every save (`tools/devboard/README.md`). On the owner's machine, check it answers at session
start and start it in the background if not (`dev-board` in `.claude/launch.json`); never a second instance. A new kind
of content in `data/` gets its entry in `tools/devboard/kinds.ts` and its check in `tools/devboard/validate.ts` in the
same step; `npm run devboard:selftest` must pass when the board changes.

## Working agreements

- Plan before large changes; keep commits small, with clear messages ending in the session's trailer lines. Never name a
  model in commits, PRs or code.
- A milestone is closed by the owner's play-test, not by "built". Nothing new opens while one waits.
- Status lives on GitHub and in `docs/STATUS.md`, nowhere else. This file stays a brief of about 150 lines: what a system
  does goes in `docs/architecture.md`, what happened in git. Comments in code say why, not when.
- **Milestones live on GitHub** with the titles of the GDD's roadmap (and the reset's R0 to R5): open one in the step that
  adds it (`npm run milestone -- open "M9 Name" "Its goal"`), close it in the step that finishes it
  (`npm run milestone -- close M9`); `npm run milestone -- list` shows them.
- No PR and no shipping unless the owner asks.
- The owner is an IT professional, comfortable with PowerShell.
