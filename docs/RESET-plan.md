# The reset: getting Ossuary back on track (approved 2026-10-12)

A roadmap proposed to the owner on 2026-10-12, after a full audit of the repo and of the Tripo pipeline in
Asyrion/Godot-Tamer. The owner took all four decisions on 2026-10-12 (below), asking on the third that the story not copy Hades. It
replaces `docs/HANDOFF.md` and the "Current state" line in `CLAUDE.md` as the one place that says what
comes next.

The goal stays the GDD's, sharpened: **a story-driven roguelite with RPG elements, its identity magic**, in the
browser, keyboard and gamepad first. The game's systems are its strength and are kept; what this plan changes is how
the project is run, how the code is kept, how the game looks, and that the story becomes a backbone instead of a
coat of text.

## Where it stands (the audit, 2026-10-12)

**What is strong.** The systems. 61 foes with their own behaviour, 10 bosses, 15 spells in six schools, 15 reactions
and 17 weaves, 61 artifacts, 12 potions with brewing, 18 boons, 7 runes, 145 room templates, 15 themes, rooms that
answer to magic, music and soundscapes made in code. Strict TypeScript that typechecks clean in two seconds, a seeded
generator under unit tests, a dev menu and dev board. The game is fun to the owner; that is the asset to protect.

**What went wrong.** Nine milestones were built on top of each other, each "built, the owner's play-test next", none
closed by a play-test. The work drifted from proving a loop to adding systems.

| Area | Finding |
| --- | --- |
| Status | Five places tell five stories: `CLAUDE.md` (a 9,200-character "Current state" line), `docs/HANDOFF.md` (dated 2026-10-04, says M7 is only planned), the GDD's roadmap, `README.md`, GitHub milestones. `main` has M6 whole and M7 steps 1 and 2; **M7 steps 3 to 9 (21 commits, 140 files, built 2026-10-06 to 10-09) sit only on `claude/m7-descent-vigil-plan-8i27rp`**, never brought to `main` (found 2026-10-12, after the audit, which read `main`). |
| `CLAUDE.md` | 1,016 lines, 121 KB: a changelog of every step, repeating the GDD and the plans. Every session pays for it in context, and the facts that matter are hard to find. |
| Docs | GDD 1,860 lines; 20 milestone plans, 3,454 lines, all still in `docs/` beside the live ones. |
| Code shape | 200 files, 36k lines. One mutable global (`G`, `player`) imported by 82 files; 70 files in one import cycle; simulation code imports the HUD (36 files). |
| Dev code in the game | `window.__game` (260 lines of `main.ts`), 15 `DEV` switches read in 33 files, a 693-line dev menu with 97 imports, look galleries and test harnesses (`reactionTest.ts`, `weaveTest.ts`, `boonTest.ts`) in game folders: about 2,000 lines. |
| Old paths never removed | `?kit=old` branches in 21 files; foe looks old/new/approved (22 of 61 foes still on old looks); five pixel-row modes beside the texel; four creature looks. Every switch doubles what must be tested. |
| Code as narrative | ~1,500 milestone names, 82 dates and 75 "the owner" in code comments; 788 lines over 200 characters. History belongs in git. |
| Tests | 285 unit tests (good). All 127 browser tests in one 5,222-line file, ~15 minutes, breaking whenever floor layouts change: most of the last 51 commits are flake fixes. No ESLint, no Prettier. |
| Art direction | Tripo, then everything in code (2026-09-30), then Tripo creatures again (2026-10-05) that only stand in a gallery. Two owlbears. 12 MB of comparison GLBs shipped to Pages. `data/assets.json` loads nothing but coins. |
| The look (screenshots of 2026-10-12) | Rooms read brown on brown (floor 1, 3) or grey-green (floor 2), low contrast, a third of the screen black. Foes built from primitives read as toys beside the room. The HUD is plain dark boxes. The mage is the best-looking thing on screen. |
| Story | On `main`: no dialogue system, no NPC who speaks, no story beats across runs. On the M7 branch: daylight after Kaelith, one save (`ossuary.vigil`), the Vigil as a place, chained shades freed in runs, townspeople with dialogue, their gifts, bonds and powers, the unfolding, and thirteen of the owner's Tripo models (townspeople, the Ferryman, Dr. Jelly, Kaelith) animated in code. Steps 10 to 13 (the Great Circle and the Ferryman, echoes, the grimoire and the rest, the close) are not built. The narrative is the title, floor banners, four lines of Asyrion's arc and item lore. The owner's lore is split: four real pages in `docs/` (the two gates, the Huruhui, Boketto), the rest stubs, and ~45 more notes and three PDFs in `inspiration/EDA/` (60 MB tracked in git), with no index. |

## What Godot-Tamer brings (Asyrion/Godot-Tamer, read 2026-10-12)

The pipeline found there with Fable is **mostly 2D**: the Tripo CLI (`tripo image`, Studio credits) drives Tripo's image
model (Nano Banana 2) to make design locks, backgrounds, effect sheets and character sheets as pixel art; Python
(`tools/pipeline/pixel.py`, `build_hires.py`) finds the drawn pixel grid, keys the background, fits named material
ramps in OKLab, downscales with ink priority and closes a coloured outline; Aseprite (headless, Lua) finishes it. The
game draws PNG strips with JSON (frames, anchors, tags), never a model at runtime.

A second route was built and piloted there: **Tripo image-to-3D, Tripo rig and preset clips, a Blender orthographic
render (lit and flat passes), then `tools/bake/pixelize.py`** (material family from the flat pass, shade step from the
lit one, majority vote, closed outline, hard alpha). Godot-Tamer rejected it for its side-view battle acting (Tripo's
presets are "a lean and a flinch"), and drew its animation by hand with Sonnet helpers instead.

What makes its look work is written down (`docs/14_ART_STYLE.md` there): hue-shifted ramps (shadows to teal, lights
to amber), 4 to 6 colours a material, 16 to 24 a creature, closed outlines in the darkest shade of the local hue,
one key light from the top left, cool shadows never black, no soft alpha, integer scale.

**For Ossuary** almost all of it is engine-agnostic (Python, PNG and JSON, the prompts, the Blender script with yaw and
pitch as parameters). Only the installers and shaders are Godot's. The 3D-bake route fits Ossuary better than it fit
Godot-Tamer: a top-down game needs the same creature from several directions at a fixed 45° camera, which a render
gives for free and an image model does not, and at Ossuary's size (a foe 30 to 60 pixels tall) a lean and a flinch
read well enough. Ossuary already has what Godot-Tamer lacked: its own clips made in code on Tripo rigs
(`tools/animate-creature.ts`, the owlbear, dragonling and chameleon). Joined, the two make a full line: **design lock
(Nano Banana) → Tripo 3D → Ossuary's rig and clips → Blender bake at the game's camera → Godot-Tamer's pixelize → sprite
sheets.** Rooms, tiles, icons and effects can take Godot-Tamer's 2D route directly.

## Decisions (taken with the owner, 2026-10-12)

The owner took each recommendation; the third with a condition, written into it.

1. **Engine.** *Taken: stay on three.js and TypeScript in the browser.* The 36k lines of systems are the game;
   a move to Godot would rebuild all of it to gain an art pipeline that is engine-agnostic anyway. Godot would only win
   if the game were to leave the browser for good.
2. **How creatures and the mage are drawn.** *Taken: pre-rendered pixel-art sprites from the 3D-bake line above*,
   shown as billboards in the 3D room (the room, light, water, fire and spells stay 3D). Alternatives: (b) keep live 3D
   models in the pixel pass (today's way: soft, muddy at this size); (c) sprites drawn by the image model alone (best
   single pictures, but four directions of one creature rarely match). Phase 3 step 2's proof still stands (b) beside
   it once, so the owner sees the gain before the roll-out.
3. **The story's shape.** *Taken: the story moves on with every run, won or lost, and death is part of it; but not
   Hades* (the owner: "originality and the focus on magic could make the difference"). What Hades does (a family hub,
   gods handing out boons, relationships told in talk after each death) is not the model. Ossuary's story is told
   **through magic**; the principles for the story bible (Phase 4), to be worked out with the owner:
   - **Magic remembers.** The vault's magic holds what happened: a grimoire page is a Warden's memory, a reaction found
     the first time shows a glimpse of who made it, a school cast into a seal or a ward answers with a voice. The story
     is found by casting, not only by talking.
   - **What the mage knows is the story's progress.** Spell knowledge, reactions, weaves and the bestiary are already
     kept between runs; each threshold of knowledge opens the next piece (a line, a vision, a door in the Seal, a shade
     who can be freed). Learning the magic and learning the truth are one thing.
   - **The schools are a choice of who Asyrion becomes.** Asyrion's arc from apprentice to chaos mage is shaped by the
     schools mastered across runs (Hallow and Umbral pulling apart, Verdant the Huruhui's way), and so are Kaelith's
     words and the endings.
   - **Death is a crossing, not a return home.** The Ferryman takes the mage back up, for a price; what the vault
     kept from the mage's last run (its echo) waits below.
   - **The Vigil is where the freed speak, not where boons are given.** Boons stay a matter of levels, runes and
     bargains; the shades at the Vigil tell what the vault took from them and ask for what only magic can do.
4. **Scope of the redraw.** *Taken: a core roster.* Redrawing 61 foes and 10 bosses before anyone plays a run
   would repeat the drift. Keep about 6 foes a floor and 5 bosses (one a floor, plus Kaelith), chosen by how good
   their fight is; the rest wait in the data, switched off, and come back drawn one by one later.

## The phases

Each phase ends with something the owner can play or read. **Feature freeze until Phase 5**: no new systems, only
cleaning, the look and the story.

### Phase 0: one baseline (small, now)

1. Bring M7 steps 3 to 9 from `claude/m7-descent-vigil-plan-8i27rp` into this branch (*done 2026-10-12*: merged, 493
   unit and 139 browser tests green, one test's luck fixed), then ship to `main` (the `ship` skill, when the owner says), so live,
   branches and docs start from the same game. Then delete the merged branches.
2. The owner plays one full run and writes down the five things that bother most and the five that delight most.
   These steer Phases 3 to 5 more than any audit.
3. Freeze features (the decisions were taken on 2026-10-12).

*Done when:* `main` is the game and the play notes are in `docs/playtest-notes.md`.

*Done 2026-10-12:* M7's steps 3 to 9 shipped to `main` ([Asyrion/ossuary#52](https://github.com/Asyrion/ossuary/pull/52)),
the twelve stale branches deleted, CI made parallel on the way ([Asyrion/ossuary#53](https://github.com/Asyrion/ossuary/pull/53):
a change goes from PR to live in about 8 minutes instead of 40), and the owner's opening view taken as the play notes.

### Phase 1: the docs tell the truth (Sonnet)

1. **`CLAUDE.md` down to a brief of about 150 lines:** what the game is, how to run and test it, the code map (one line
   a folder), the rules that matter (tuning in `config.ts`, content in `data/`, strings in `strings.ts`, nothing
   silent, no foe health as difficulty), the agents and skills. The per-system prose moves to `docs/architecture.md`,
   one section a system, kept to what the code does, not when.
2. **One status:** GitHub milestones and issues are the status (they already exist); `docs/STATUS.md` is a short page
   that links them and names the one thing next. `HANDOFF.md` and the "Current state" line go.
3. **Plans archived:** M1 to M6 plans to `docs/archive/`; the GDD's "as built" sections stay, its history moves out.
4. **The lore in one place:** `docs/lore/` with an index (`docs/lore/README.md`): each page, how complete it is, what
   the game already uses from it. The lore notes in `inspiration/EDA/` copied in as Markdown; images and PDFs out of
   git into Git LFS or the owner's drive (60 MB tracked today).

*Done when:* a new session can learn the project from `CLAUDE.md` and `STATUS.md` alone.

### Phase 2: the code is kept (Opus plans, Sonnet and Haiku carry)

Small steps, each one green in CI, none changing how the game plays.

1. **Lint and format:** ESLint (typescript-eslint) and Prettier at 120 columns, run once over the code (Haiku: a
   mechanical pass), then in CI.
2. **Old paths out:** the old room kit (`?kit=old`, 21 files), the old foe looks (after the owner's last approvals, or
   their new looks taken as they are), the pixel-row modes beside texel and fine, the extra creature looks, the
   comparison GLBs, the `rotling`, `prototype/` and `npm run compare`. (Kaelith's look was chosen on 2026-10-06: the Winged Watcher.)
3. **Dev code fenced:** `__game`, the dev menu, galleries and test harnesses move to `src/dev/`, loaded by a dynamic
   import, so the game's own modules never import them (the hooks stay in production builds, as the owner wants, but
   behind one door). The rule "every feature gets a dev entry" stays, written against that door.
4. **Simulation apart from the UI:** a small typed event bus (`emit('hurt', …)`, `on('roomCleared', …)`) so world,
   actors, magic and items stop importing `ui/hud`; then the big cycle is cut where it runs through the UI and flow.
   `G` is split into typed slices (`run`, `room`, `stats`) with their owners; no rewrite of the game's logic.
5. **Comments are for the code:** milestone names, dates and "the owner said" leave the comments (git and the GDD keep
   them); comments say why, not when.
6. **Tests that hold:** `smoke.spec.ts` split by system into files; a fast suite (about 20 tests, under 3 minutes) on
   every push and the full suite nightly; tests find rooms by what they hold, never by a seed's layout; the big files
   (`bestiaryFoes.ts` 1,498 lines) split by floor as the looks already are.

*Done when:* lint and typecheck clean, no import from game code into `src/dev/` or from simulation into `ui/`, the
fast suite green in under 3 minutes, a week of CI without a flake fix.

### Phase 3: the look (the heart of the reset)

1. **Art bible** (`docs/art-bible.md`, replacing the house style in `docs/assets.md` and `docs/effects.md`'s colour
   rules): Godot-Tamer's rules adapted to a candle-lit vault seen from above: a palette per floor with hue-shifted
   ramps, closed coloured outlines, the key light, cool shadows, how much of the screen may be dark, how loud the HUD
   is, one size table (mage, foes, bosses, tiles in pixels). Made with the owner from three or four reference pictures.
2. **The proof:** Godot-Tamer's tools ported to `tools/art/` (Python: `pixel.py`, `pixelize.py`, the Blender render;
   the Tripo CLI on the owner's machine, as there). One room of floor 1, the mage, one foe and the Warden, drawn both
   ways (Decision 2), side by side. The owner chooses. Budget: one round of four images a picture, one reroll at most.
3. **The sprite runtime** (if sprites win): a billboard actor in three.js that plays a sheet by direction and clip, with
   the hit flash, statuses' tints and telegraphs the foes have today; behaviours untouched (they move the actor, the
   sprite only shows it).
4. **The rooms:** the floors' palettes from the art bible, more light and colour, contrast that reads; tiles and wall
   pieces from the 2D route where they beat the code-drawn ones; rooms dressed less empty.
5. **The HUD and screens:** framed panels, pixel-art icons, the title, level-up, inventory and end screens in one style.
6. **Roll-out by floor:** floor 1 whole (its core roster, its boss, its rooms, its effects), then the owner plays it;
   then floors 2 to 5, a floor a step. Sonnet helpers do the cleanup and sheet assembly, as in Godot-Tamer.

*Done when:* floor 1 looks like one game in the new style, at 60 fps, and the owner says so.

### Phase 4: the story (the backbone)

1. **Story bible** (`docs/story.md`), written with the owner from the lore and the principles of Decision 3: why
   Asyrion goes down, what Kaelith sealed and why it matters, what the Wardens hid, what each school's magic remembers,
   the thresholds of knowledge that move the story, the acts across runs, the endings by the schools mastered. Who speaks: the Ferryman, Dr.
   Jelly, the Wandering Merchant, Fen-Nex, the freed shades, Kaelith. The open questions of the GDD answered or cut.
2. **A dialogue and memory system**, grown from the one M7 step 7 built for the townspeople: lines and visions as data (`data/dialogue/*.json`), conditions on what the run
   and the past runs hold (bosses met, deaths, spells and reactions known, schools mastered, shades freed), triggered
   by talk and by magic (a cast into a seal, a reaction found, a page read), portraits from the art line, a box in the art bible's style.
   Every line in `strings.ts`'s spirit: one place, easy to rename.
3. **Story in the run:** one beat a floor (a memory in the magic, a voice, a find), boss lines that change with history, the
   lore cards tied to the story bible.
4. **The Vigil** (M7 Part B, steps 5 to 9 built): reviewed against the story bible, its talk rewritten where the story
   asks; steps 10 to 13 (the Great Circle and the Ferryman, echoes, the grimoire and the rest, the close) planned again
   on this base. The owner's spur for it (2026-10-12): Moonlighter's village between runs, given a magic twist; the
   ideas are in `docs/ideas.md`, Between runs, after Moonlighter.
5. **Kaelith and the endings** (the fight and daylight built in M7; the endings by the schools mastered are new).

*Done when:* five runs in a row each tell the player something new.

### Phase 5: the vertical slice, then onwards

The whole loop (Vigil → floors 1 to 5 → the Seal → back) in the new look with the story's first act, play-tested by
the owner and, if they like, two or three others. Only then new systems again, from the GDD and `docs/ideas.md`, each
milestone closed by a play-test before the next one opens.

## How the work is split between models

| Work | Model |
| --- | --- |
| Plans, architecture cuts (event bus, `G` slices), the art bible and story bible with the owner, reviews | Opus |
| Docs moves, the architecture page, splitting tests, porting the Python tools, the sprite runtime, room palettes, dialogue data | Sonnet subagents |
| Mechanical passes: lint fixes, comment cleaning, renames, file moves, sheet assembly checks | Haiku subagents |
| The `rules-reviewer` before every PR, the `room-inspector` after every look change | as today |

## GitHub milestones

Each phase is a GitHub milestone (`npm run milestone -- list`): R0 One baseline, R1 Docs that tell the truth, R2 Code
that is kept, R3 The look, R4 The story, R5 The vertical slice. M7 stays open: its steps 1 to 9 are built (3 to 9 on
its branch until R0), steps 10 to 13 are planned again inside R4, and it closes with R4. M8 waits behind R5.

## New working agreements (proposed)

- A milestone is closed by the owner's play-test, not by "built". Nothing new opens while one waits.
- A switch between an old and a new way lives until the owner chooses, and no longer: the loser is deleted in the same
  step.
- `CLAUDE.md` stays a brief (about 150 lines); what a system does goes in `docs/architecture.md`, what happened in git.
- Status lives on GitHub and in `docs/STATUS.md`, nowhere else.
