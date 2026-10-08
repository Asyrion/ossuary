# Dev board roadmap (Ossuary)

Written 2026-10-08, after the board's first version (`README.md`): content tabs for 14 kinds of `data/`, lossless saves,
the game's validators after every save, used-by checks, undo, and ▶ Play through the game's address options. This is a
brainstorm of what could come next, in four phases. Nothing here is decided; the owner picks, and a phase that becomes
real gets a plan (and a GitHub milestone if it grows to that size, CLAUDE.md working agreements). `NEXT_STEPS.md`
holds the proposed order.

Size: S (an afternoon), M (one session), L (more than one session).

## Phase A · See what you edit
The cards show colour swatches today, because almost everything in the game is drawn in code.

1. **Pictures from the game (M).** A headless Playwright pass over the game's own galleries (the dev menu's artifact,
   bestiary and boss galleries, `__game.artifactGallery()` and friends). It shoots each look once into a cache, and the
   board shows them on the cards. The pass is re-run when `src/` changes, so a foe's card shows the foe.
2. **Room template painter (L).** The 145 room templates edited as grids. Each letter is drawn as its tile (rock, pit,
   water, oil, the objects and mechanisms, roles R/W/H), with a palette, the shape's outline and door slots, and
   `validateTemplate` running live as you paint. Saving writes the same strings the file holds now.
3. **Floor preview (M).** Run `generateFloor` for a floor and seed in Node, and draw the plan: rooms, types, the boss,
   the secret, the waystone, each room's foes from the floor's tables. "Reroll" tries the next seed. It shows what a
   floor's numbers make before any play session.

## Phase B · Numbers you can trust
4. **Loot and drop simulator (S).** `loot.json`'s tables rolled 10,000 times per source (room clear, urns, remains,
   chests). The result is the share of each drop, the obols per floor and the hearts per run, with the economy test's
   own bounds marked.
5. **Foe curves (M).** Every foe's health against `enemyHp` per floor, its contact damage, speed and pack size, drawn as
   curves per floor. The owner's rule "never tougher foes, no bullet sponges" becomes a visible line no foe should cross.
6. **The wheel and the weaves (S).** The fifteen reactions and the weaves as a matrix (school × school, and what was
   left × what strikes it), each cell linked to its tuning in `magic.json`. Cells with no reaction stand out.
7. **Balance runs on the board (M).** `npm run balance` and `-- runs` started from a button, with their output files
   (`docs/balance.md`, `docs/balance-runs.md`) as tables and charts. The last run's date sits beside each foe and floor.

## Phase C · From idea to game
8. **Send to Claude (M).** As in the Azyrion Tamer board. A task from any card (or a "new foe / artifact / spell"
   composer) goes to Claude Code on the owner's PC (the `claude-cli://` link or a new terminal) or becomes a GitHub
   issue. The task names what the data cannot do alone: a behaviour, a look, the strings, the dev menu entry, the GDD
   section.
9. **Code checklist per entry (S).** For a new foe, artifact or spell, the board lists what still lives in code and
   whether it is there: a behaviour in `BEHAVIOURS`, a look in the galleries, a name in `STR`, counters, the costume
   decision, lore. Each line reads ✓ or "missing".
10. **Strings and lore (M).** The player-facing text in `src/strings.ts` (names, lore cards, toasts) in a tab of its own,
    with the lore limits checked as you type: placeholder names, the Eda names the GDD has adopted, no invented gods or
    places.
11. **Saved loadouts for ▶ Play (S).** A named set of address options (a floor, a seed, artifacts, spells, boons,
    runes, a boss), saved and started in one click, for the play-tests the owner repeats.

## Phase D · The asset pipeline
12. **Tripo Studio and Aseprite pipelines (L).** When the owner writes them into `docs/assets.md` (their plan of
    2026-10-08), the board gets a prompt studio per entry (brief, house style, "Refine with Claude") and pipeline
    buttons: a model upload through `prepare-asset` with its report, `texel-bake` with a before and after, an Aseprite
    redraw step. Each step is shown before anything is installed.
13. **Sound and music tabs (M).** `music.json`, `ambience.json` and `sounds.json` as tabs. A piece or soundscape is
    auditioned in the browser through the game's own synth (`renderAudio`), and the sound files are played from
    `public/`.
14. **Entry history (S).** The git log of an entry's own lines (who changed a foe's health and when, with the commit
    message), and one click to bring an older value back as a normal, undoable edit.
15. **Room inspector on save (M).** After a template or theme edit, the `room-inspector` checks (`npm run inspect`) run
    on just that room. The shot and its findings show on the card.
