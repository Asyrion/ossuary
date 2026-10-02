# Handoff: where the work stands (2026-10-02)

A note for the next session, so it can pick up exactly where this one stopped. `CLAUDE.md` is still the brief and
`docs/GDD.md` the design; this file only says what is in flight, what waits on the owner, and what was learned on the way.
Delete it, or write it again, at the next handoff.

## The branch and what is live

- Work is on **`claude/m6-plan-docs-5gjp6c`**, pushed, clean. Its last commit is `b9d5837` (M4.12 step 2).
- **`main` (the live Pages site) is at `90080f1`**, which has M6 steps 1 to 5. Everything below is on the branch only,
  **not shipped**: ship only when the owner asks (the `ship` skill; the `rules-reviewer` before the PR).
  - M6 step 6 (the general boons) and step 7 (runes on the cast), both built and documented in `docs/M6-plan.md`.
  - The gamepad fix (an Xbox Elite Series 2 didn't work): every connected pad is read, A begins and reaches the menus,
    and a pad says when it's heard. The owner was told it waits to ship.
  - The obol made smaller (24 game pixels across, its faces made again at 48).
  - Dr. Jelly redone as the plague doctor (the owner's pick of three), with his giving animation.
  - The minimap marks finished rooms (a shade darker, a small tick).
  - A merchant's ware shows a small panel when the mage comes near.
  - M4.12's plan (approved), step 1 (the tools) and step 2 (floor 1's ten looks, waiting on the owner).
- The full browser suite last ran green on the branch after M6 step 7 (120 passed). Since then, each change was checked by
  its own browser test, and the unit tests (396) pass on `b9d5837`.

## What waits on the owner now

**M4.12 step 2: floor 1's ten new looks.** The contact sheets were sent. Nothing in the game has changed yet:
`APPROVED` in `src/actors/fantasyLooks.ts` is empty, so foes still wear their old looks. The ten:

| Look id (stays) | Was | Now |
| --- | --- | --- |
| `sporeling` | Sporeling | Spore Fiend |
| `vesperMoth` | Vesper Moth | Seraph Moth |
| `runeBeetle` | Rune Beetle | Runehorn |
| `urnMimic` | Urn Mimic | Urn Mimic |
| `cryptSpider` | Crypt Spider | Gloom Weaver |
| `inkOctopus` | Ink Octopus | Quill Kraken |
| `fireflyBeetle` (the foe `fireflySwarm`) | Firefly Swarm | Lampwyrms |
| `choirLark` | Choir Lark | Caladrius |
| `stormMantis` | Storm Mantis | Mantis Knight |
| `rubbleCrab` | Rubble Crab | Helm Hermit |

Claude's own read, given to the owner: the Mantis Knight, Caladrius, Urn Mimic, Spore Fiend and Runehorn change the most;
the Gloom Weaver and Quill Kraken stay close to their old looks, because those were already fairly fierce.

To see them again: `npm run dev`, then `PW_CHROMIUM=/opt/pw-browsers/chromium npm run foe-sheet -- floor=1 out=<dir>`
(deterministic, seed `SHEET`), or in the game with `?looks=new`, or with the dev menu's Look tab switch and the Galleries
tab's "Fantasy foes (M4.12)" buttons.

**On the owner's yes (per foe):**

1. Add the approved look ids to `APPROVED` in `src/actors/fantasyLooks.ts`. From then on, `buildFoe` dresses that foe in
   its new look.
2. Fix any foe the owner asked to change, send its sheet again (`only=id1,id2`), and wait for the yes.
3. The plan says the old looks are deleted on the yes. They are `MODEL_OPTIONS` in `src/actors/modelOptions.ts` (M4's
   ten: `sporeling`, `vesperMoth`, `runeBeetle`, `urnMimic`) and `BESTIARY_OPTIONS` in `bestiaryLooks.ts` /
   `bestiaryBeasts.ts` (M4.5's: the other six). Before deleting, mind what reads them:
   - `oldLook` in `foes.ts`;
   - `showLookPairs` and `lookContract` in `lookPairs.ts`, and the browser test "fantasy foes (M4.12)", which measures
     every new look against its old one and expects a pair for each;
   - the Galleries tab's enemy model options and bestiary rows;
   - `bigEyes`, which Fen-Nex, the familiars, the boss looks and the serpent still use, so keep it.
   
   A clean way: point the gallery entry's `build` at the new look, drop the old builder, and let the contract and pairs
   cover only the looks not yet approved (or keep each approved look's old height and parts as numbers in the test).
4. The display names change through `STR` at the close (plan step 9). `foeName(id)` in `strings.ts` reads
   `STR.options[id].name` (M4's foes) or `STR.bestiary[id].name` (M4.5's). Ids never change. If the owner wants the names
   now, do them with the yes; check `STR.foes.counterLines` and the notes for the old names too.

## What comes next (the approved order)

1. **M4.12 steps 3 to 8**, one floor at a time, each ending with its contact sheet for the owner (`docs/M4.12-plan.md`:
   the rules, and a concept per foe):
   - floor 2's six: Hoarfrost Toad, Kelpie, Reliquary Medusa, Glass Wyrm, Rime Crawler, Spark Wyvern;
   - floor 3's four, and the nest: Salamander, Hex Imp, Rime Drake, Cinder Hornets;
   - floor 4's five: Candle Kobold, Bell Fiend, Gargoyle, Pale Unicorn, Frost Scarab;
   - floor 5's seven: Mandrake, Sky Ray, Void Maw, Dragon Turtle, Gloom Raven, Rime Warg, Tarasque;
   - the six Wardlings, as ward cores (floor 0 in `lookPairs`);
   - the bosses' eight looks. All three Hollow Warden looks are redone and the owner chooses one. Bosses are not in
     `FOES`, so `lookPairs` and the contract need extending for them: `bossLooks.ts`, the Galleries tab's boss looks, the
     parts each fight moves (`eye`, `ring`, `halo`, the tiger's `plate0` to `plate3`...).
2. **M4.12 step 9**, the close: the names through `STR`, the reviews, the GDD as built, a room sweep, `npm run balance`
   to confirm nothing moved, and the owner's play-test.
3. **M6 step 8 (runes as things)**, then steps 9 to 13 (the waystone, its room, the shrine's bargain, the run around it,
   the close), as `docs/M6-plan.md` sets out. The owner asked for steps 5 and 7 each to be planned first, in plan mode,
   before any code. Do the same for step 8 and the waystone.

## How a floor's looks are made (the routine that worked for floor 1)

- Write `src/actors/fantasyFloorN.ts` exporting `FLOORN_LOOKS` (keyed by the old look id), and spread it into
  `FANTASY_LOOKS` in `fantasyLooks.ts`. `fantasyFloor1.ts` is the model: builders from `beastParts.ts` and
  `render/arcane.ts` (`joint`, `part`, `tube`, `jointed`, `spike`, `slitEyes`, `beads`, `crystal`, `rune`, `lit`, `glow`).
  Each builder returns a `Built` (`group`, `shadow`, `parts`, `idle`).
- **Keep the old look's `parts` by name**, and what its idle and behaviour move. Read the old builder (`modelOptions.ts`
  or `bestiaryBeasts.ts` / `bestiaryCreatures.ts` / `bestiaryElementals.ts`) and the behaviour's `pose` in
  `foes.ts` / `bestiaryFoes.ts` first. `foe-sheet` prints each look's missing parts and its height old → new; keep the new
  height within the test's 0.5× to 2.2× (aim near the old one).
- Shoot the sheets: the dev server running, then
  `PW_CHROMIUM=/opt/pw-browsers/chromium npm run foe-sheet -- floor=N out=<scratchpad>/sheet`. Use `only=a,b` while
  iterating. Look at both sheets: `-texel` (the game's pixel look, blown up 2×, the mage below for scale) and `-off` (a
  close-up).
- The browser test "fantasy foes (M4.12)" covers every entry in `FANTASY_LOOKS` by itself: the contract, the pairs, and
  each foe spawned in its new look and fighting for 3 s. A look id that differs from its foe id needs mapping there (only
  `fireflyBeetle` → `fireflySwarm` so far; check `look` in `data/foes.json`). Run it with
  `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test -g "fantasy foes"`.
- Then typecheck (`npx tsc --noEmit -p .`), run the unit tests, commit, push, and send both sheets to the owner (they're
  for the owner, so send them, don't only mention them). Add a "Built, waiting on the owner's yes" note under the step in
  `docs/M4.12-plan.md`.

**What reads at play distance** (learned on floor 1, under the 45° camera, at a few dozen game pixels a foe):

- Dark bodies with bright emissive features (runes, crystals, slit eyes, spore sacs) read. Pale or mid-grey bodies wash
  out into a blob. The first Runehorn and Spore Fiend both did, until their bodies went dark and the glow went up.
- Shapes that stick out sideways read from above: horns, crests, wings, scythes, a halo. Detail on a face facing forward
  mostly doesn't.
- A hat or hood over a face hides it from above; tip it back. A forward reach is invisible; up and out shows.
- No round googly eyes: slits (`slitEyes`) or small beads (`beads`), lit in the school's light.

## Working notes and pitfalls

- **Browser tooling:** `PW_CHROMIUM=/opt/pw-browsers/chromium` for every Playwright run, `npm run foe-sheet`,
  `npm run inspect` and `npm run balance`. The last three need the dev server (`npm run dev`, port 5173).
- **The full browser suite takes about 14 minutes.** Don't edit `src/` while it runs (Vite reloads and tests flake). Run
  it in the background and wait on it with an until-loop; a foreground `sleep` is blocked.
- **`__manual` mode:** the camera moves only when a frame is drawn. Call `__game.sim(t, true)` before projecting anything
  to the screen, or the positions are a frame stale.
- **Browser tests:** `start(page, query)` adds `autolevel=skip`, so level-up screens never stop a test. Reagent ids are
  camelCase (`graveMoss`, `emberSalt`...); a wrong id throws.
- **A one-line object literal can't hold a `//` comment**: it comments out the rest of the line. Use `/* */` there.
- Commits end with the two trailer lines the session gives (Co-Authored-By and Claude-Session), and never name a model.
- **Owner rules that bite here:**
  - every new feature gets its dev menu entry in the same step;
  - nothing silent;
  - one pixel for everything;
  - tuning in `config.ts`, content in `data/`;
  - the owner sees new looks before they replace old ones;
  - no PR and no shipping unless asked.
