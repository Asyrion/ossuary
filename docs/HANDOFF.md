# Handoff: where the work stands (2026-10-03)

A note for the next session, so it can pick up exactly where this one stopped. `CLAUDE.md` is still the brief and
`docs/GDD.md` the design; this file only says what is in flight, what waits on the owner, and what was learned on the way.
Delete it, or write it again, at the next handoff.

## The branch and what is live

- Work is on **`claude/m6-plan-docs-5gjp6c`**, pushed, clean. Its last work commit is M6 step 8 (runes as things).
- **`main` (the live Pages site) is at `593af11`**, shipped 2026-10-02 in [Asyrion/ossuary#33](https://github.com/Asyrion/ossuary/pull/33):
  M6 steps 6 and 7, the gamepad fix, the smaller obol, Dr. Jelly as the plague doctor, the minimap's finished rooms, the
  ware panel, and M4.12 steps 1 to 5 with floors 1 to 3 approved. Another session merged the costumes cut back to 19
  (`806a34e`) to `main` while that PR was open; the branch was rebased onto it.
- On the branch only, **not shipped** (ship only when the owner asks: the `ship` skill, the `rules-reviewer` first):
  floor 4's and floor 5's approvals (every floor's foes in their new looks), the drakeling test's fix (its flight waits for
  one long enough to rise: the Pages deploy of `593af11` failed on it once and passed on the rerun), and steps 7 and 8
  (approved 2026-10-03) and step 9, the close: M4.12 whole; then M6 step 8, runes as things (2026-10-03).
- The full browser suite last ran green on the rebased branch before the merge (121 passed); floor 4's approval and floor
  5 were checked by the fantasy-foes, bestiary and M4 foe tests and the unit tests (396).

## What waits on the owner now

**M4.12 is built** (2026-10-03): every foe, ward core and boss in its fantasy look, the Warden in the Owlbear, the names
following the creatures (GDD: Combat and enemies, Fantasy foes). Waiting on the owner: the **play-test**, and their eye on
the sweep's polish (`asset-previews/sweep/`, not in git): the Gloom Raven and the Mandrake nearly black on floor 5's slate,
the Hex Imps dark on floor 3's red herringbone, the Deep Angler dark on its floor, each read by its lights. Not shipped:
ship only when asked (the `ship` skill, the `rules-reviewer` first; it ran on 2026-10-03 and found nothing blocking).

The balance bot's table (`docs/balance.md`, 2026-10-03) moved since 2026-10-01 with M5's close and M6 steps 1 to 7, not
the looks: the Pale Unicorn (`moonstagFawn`, keeps away) now outlasts the bot's cantrip and Frost. One for M6's balance.

**On the owner's yes (per foe; how the floors were done):**

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
   
   Done this way for floor 1: point the gallery entry's `build` at the new look, delete the old builder (and the imports
   it leaves unused), and add the old look's height and parts to `RETIRED` in `fantasyLooks.ts` (measure them with
   `__game.lookContract()` before deleting). `newLooks` then leaves it out of the pairs and sheets.
4. The display names change through `STR` at the close (plan step 9). `foeName(id)` in `strings.ts` reads
   `STR.options[id].name` (M4's foes) or `STR.bestiary[id].name` (M4.5's). Ids never change. If the owner wants the names
   now, do them with the yes; check `STR.foes.counterLines` and the notes for the old names too.

## What comes next (the approved order)

1. ~~M4.12 steps 3 to 8~~ (all built and approved), one floor at a time, each ending with its contact sheet for the owner (`docs/M4.12-plan.md`:
   the rules, and a concept per foe):
   - floor 2's six: Hoarfrost Toad, Kelpie, Reliquary Medusa, Glass Wyrm, Rime Crawler, Spark Wyvern;
   - floor 3's four, and the nest: Salamander, Hex Imp, Rime Drake, Cinder Hornets;
   - floor 4's five: Candle Kobold, Bell Fiend, Gargoyle, Pale Unicorn, Frost Scarab;
   - floor 5's seven: Mandrake, Sky Ray, Void Maw, Dragon Turtle, Gloom Raven, Rime Warg, Tarasque;
   - the six Wardlings, as ward cores: approved 2026-10-03;
   - the bosses' eight looks: approved 2026-10-03, the Warden wearing the Owlbear.
2. ~~M4.12 step 9~~, the close: built 2026-10-03; the owner's play-test waits.
3. ~~M6 step 8 (runes as things)~~: built 2026-10-03 after its plan with the owner. **Step 9, the waystone** (next), then steps 10 to 13 (its room, the shrine's bargain, the run around it, the close), as `docs/M6-plan.md` sets out. The owner asked for steps 5, 7 and 8 each to be planned first, in plan mode,
   before any code. Do the same for the waystone (step 9).

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
- **Draw calls:** measure each new look against its old one (spawn it, then hide its group and take the difference in
  `__game.renderInfo().calls`). Every part that moves on its own is one call per surface it carries, and a material
  whose colour or opacity changes keeps every mesh using it apart: move repeated small parts (eyes, sacs, wings, arms,
  chains) together under one joint, and pulse a glow sprite instead of a material. Floor 1's Quill Kraken was 54 calls
  against the old 26 until its runes stopped changing colour.
- **A part holding parts:** `mergeRig` keeps apart only the objects named in `parts` and what the idle moves. A part
  whose children the behaviour moves (the fawn's `legs`) needs the idle to move each child a little, or they merge into
  the parent and never move.
- **A 45° camera sees a face tipped 45° edge-on:** turn what must be seen (a bell's mouth) straight forward or up.
- **`pkill -f <pattern>` kills the shell running it** when the pattern is in its own command line (`vite`, `node.*vite`): stop the dev server by its PID instead.
- **Never run a second Vite server sharing `node_modules`** (a worktree with it linked): both rewrite
  `node_modules/.vite` and the browser tests fail on 403s. Delete `node_modules/.vite` and restart the server if it
  happens. And `pkill -f vite` kills a shell whose command line names `.vite`.
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
