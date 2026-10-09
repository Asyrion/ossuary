# Dev board next steps (Ossuary)

The proposed order for `ROADMAP.md` (written 2026-10-08). The owner decides; each step is planned before it is built
(CLAUDE.md, working agreements). Each step keeps `npm run devboard:selftest` green and is checked in the browser.

1. **Send to Claude** (C #8, M). Every other idea is easier to ask for once a card can send a task.
   Done when: any card and a "new entry" composer send a task to Claude Code on the PC or as a GitHub issue, and the
   task lists the code-side work.
2. **Code checklist per entry** (C #9, S). This makes "data only" visible on every new foe, artifact and spell.
   Done when: foes, artifacts and spells show each code-side piece with ✓ or "missing", read from the source.
3. **Pictures from the game** (A #1, M). It ends the swatch-only cards.
   Done when: foes, bosses and artifacts show a shot from the game's galleries, refreshed when `src/` changes.
4. **Room template painter** (A #2, L). It is the most-edited content after the numbers, and still edited as strings.
   Done when: any template is painted with live `validateTemplate`, saves are byte-identical where untouched, and the
   room-inspector shot is one click away.
5. **Foe curves and the loot simulator** (B #4 S, #5 M).
   Done when: both tabs exist, with the owner's no-sponge line and the economy test's bounds marked.
6. **Saved loadouts for ▶ Play** (C #11, S).
   Done when: a named loadout (seed, floor, artifacts, spells, potions, level) starts ▶ Play in one click.
7. Then, as the owner chooses: floor preview, the wheel matrix, balance runs on the board, strings and lore, sound and
   music, entry history, and the room inspector on save. The asset pipeline (D #12) waits until the owner writes the
   Tripo Studio and Aseprite pipelines into `docs/assets.md`.
