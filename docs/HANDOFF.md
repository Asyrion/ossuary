# Handoff: where the work stands (2026-10-04)

A note for the next session, so it can pick up exactly where this one stopped. `CLAUDE.md` is still the brief and
`docs/GDD.md` the design; this file only says what is in flight, what waits on the owner, and what was learned on the way.
Delete it, or write it again, at the next handoff.

## The branch and what is live

- Work is on **`claude/m6-plan-docs-5gjp6c`** (the session branch `claude/m6-plan-docs-5gjp6c-htduau` kept the same; push
  both). GitHub prints "Cannot update this protected ref" on a push that went through: check `git log -1 origin/<branch>`.
- **`main` (the live Pages site)** has M4.12 whole and M6 steps 1 to 9, shipped 2026-10-03 in
  [Asyrion/ossuary#36](https://github.com/Asyrion/ossuary/pull/36), and another session's owlbear made in Tripo on top.
- On the branch only, **not shipped**: M6 steps 10 to 13 (the waystone room, the shrine's bargain, the run around it with
  harder runs, the close). **M6 is built** and closed on GitHub. Ship only when the owner asks: the `ship` skill, with the
  `rules-reviewer` first (it ran on 2026-10-04 over steps 10 to 13 and found nothing blocking; its nits are fixed).
- **GitHub milestones** (the owner's rule, 2026-10-03): `npm run milestone -- list`. M0 to M6 closed, M7 and M8 open. A
  new roadmap milestone is opened in the step that adds it (`npm run milestone -- open "M9 Name" "Its goal"`), a finished
  one closed in the step that marks it built.

## What waits on the owner

- **Ship M6** when they ask (the play-test build). The screenshots of the close went to them in the session: the level-up
  screen, the runed hands, the waystone room and its screen, the shrine's bargain stone and its deal.
- **Play-tests:** M6 (levels, boons, runes, the waystone, the bargain, and the harder runs: three more rooms a floor,
  hearts half as likely, the pressure dials raised; never more foe health, the owner's rule), M4.12's fantasy foes, M5, the
  soundscapes and music (`docs/sound-plan.md`), M4.6's looks.
- **Polish the owner may want** (from the sweeps, not blocking): the Gloom Raven and the Mandrake nearly black on floor 5's
  slate, the Hex Imps dark on floor 3's red herringbone, the Deep Angler dark on its floor. From M6's closing sweep
  (2026-10-04, `docs/M6-plan.md` step 13; its shots in `test-results/inspect-m6-*`, not in git): the `waystone_cairns`
  cairns read as rubble while the room waits dark, the bargain stone is brown on floor 1's brown walls (only under
  `?room=`: shrines are on floors 2 and 4), and foes' dark stains can read as holes in the floor (from before M6).
- **Balance to watch:** the Pale Unicorn (`moonstagFawn`) outlasts the bot's cantrip and Frost (`docs/balance.md`). The
  bot leaves some rooms uncleared (the Frost Jackalope, wasp nests behind cover): the bot's limits, not stuck rooms.

## What comes next

**M7 Descent and the Vigil** (GDD: Roadmap; RPG progression, Between runs: the Vigil). Plan it with the owner first, in
plan mode, as every milestone was: a `docs/M7-plan.md` with decisions, pieces and steps, approved before any code. What the
GDD already holds: the final boss; the hub between runs (shades freed in runs become its townspeople with a small dialogue
system, or are bound as a familiar for one run; it unfolds to the spells the mage knows; the Great Circle of vows, gifts and
omens before a run; the Ferryman's crossing as the way down; echoes of past runs; grimoire, bestiary and disciplines);
permanent upgrades (options first, a few powers, offset by deeper floors and the vows). What M7 takes over from the
browser's `localStorage`: spell knowledge (`ossuary.knowledge`), the bestiary (`ossuary.bestiary`), reactions, weaves and
recipes found. The lore it may use: the Vigil at the cave mouth and Kaelith the Shadow Sentinel (adopted from the owner's
lore drop for M7); the rest of the owner's names wait for M8.

## How M6's steps went (the routine that worked)

- Each step: plan mode with the owner (two questions at most, the recommended option first), then build, a browser test,
  the room inspector where rooms look different, a "Built" note under the step in the plan, CLAUDE.md, commit and push.
- **Balance with the bot:** `PW_CHROMIUM=/opt/pw-browsers/chromium OSSUARY_URL=http://localhost:5173/ npm run balance --
  runs seeds=4` (about 20 minutes a build; writes `docs/balance-runs.md`). It starts each floor at its level
  (`levelAtFloor`), so a change to the level curve (`CFG.levels.at`) needs `CFG.levels.floorInsight` checked too (a unit
  test holds it within 10% of the measured medians). The economy test (`tests/unit/loot.test.ts`) holds obols, hearts and
  relics a floor in the GDD's bands: a change to room counts moves them all.
- **Generator layouts move with room counts:** browser tests that assumed a seed's layout (which room is where) broke when
  floors grew. Place the mage relative to the room it is in, and choose rooms by what they hold, not by index.

## Working notes and pitfalls

- **Browser tooling:** `PW_CHROMIUM=/opt/pw-browsers/chromium` for every Playwright run, `npm run foe-sheet`,
  `npm run inspect` and `npm run balance`. The last three need the dev server (`npm run dev`, port 5173).
- **The full browser suite takes about 15 minutes.** Don't edit `src/` while it, the bot or an inspection runs (Vite
  reloads and they flake). Run it in the background and wait on it with an until-loop; a foreground `sleep` is blocked.
- **A `+` in a URL query is a space:** `?runes=e:lasting+vein` arrives as `lasting vein`, so the parser splits on both.
  Mind it for any new URL option.
- **`__manual` mode:** the camera moves only when a frame is drawn. Call `__game.sim(t, true)` before projecting anything
  to the screen, or the positions are a frame stale.
- **Browser tests:** `start(page, query)` adds `autolevel=skip`, so level-up screens never stop a test. Reagent ids are
  camelCase (`graveMoss`, `emberSalt`...); a wrong id throws.
- **A one-line object literal can't hold a `//` comment**: it comments out the rest of the line. Use `/* */` there.
- **`pkill -f <pattern>` kills the shell running it** when the pattern is in its own command line (`vite`): stop the dev
  server by its PID. Never run a second Vite server sharing `node_modules` (both rewrite `node_modules/.vite`).
- **What reads at play distance** (learned on M4.12's looks, under the 45° camera): dark bodies with bright emissive
  features read, pale bodies wash out; shapes sticking out sideways read from above, detail on a forward face doesn't; a
  face tipped 45° is edge-on, so turn what must be seen straight forward or up. Keep draw calls near: parts that move on
  their own cost a call per surface, and a material whose colour changes keeps its meshes apart (pulse a glow instead).
- Commits end with the two trailer lines the session gives (Co-Authored-By and Claude-Session), and never name a model.
- **Owner rules that bite here:**
  - every new feature gets its dev menu entry in the same step;
  - nothing silent;
  - one pixel for everything;
  - tuning in `config.ts`, content in `data/`;
  - the owner sees new looks before they replace old ones;
  - harder never means foes with more health;
  - milestones on GitHub, opened and closed in the steps that change them;
  - no PR and no shipping unless asked.
