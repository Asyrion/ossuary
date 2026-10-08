# Ossuary dev board

A local web page to browse, create, edit, duplicate and delete the game's content in `data/` without editing JSON by
hand: artifacts, potions, reagents, recipes, foes, floors, themes, room templates, creatures, spells, runes, boons and
the magic and loot tuning. Built from the `game-dev-board` skill (`.claude/skills/game-dev-board/SKILL.md`).

```
npm run devboard              # http://127.0.0.1:8770
npm run devboard -- --open    # and open the browser
npm run dev                   # beside it, for the ▶ Play links (http://127.0.0.1:5173)
npm run devboard:selftest     # the board's own checks
```

One instance serves every session and worktree: if `http://127.0.0.1:8770/` answers, it is running; don't start a
second one on another port. Options: `--port`, `--root <checkout>`, `--game <url of the running game>`.

## What it does

- **One tab per kind**, with cards (name, id, colour swatch, the fields that matter), search (`/`) and the count of
  entries with problems.
- **Editor** built from the entries' own values: numbers, yes/no, choices, ticked lists, weighted tables (`sporeling 2`
  a line), grids (a row a line), nested groups, and a JSON view for everything else. Choices come from the string
  unions in `src/` (`School`, `Pool`, `Effect`, `StatKey` …) and from other kinds' ids, pointed at by `hints.json`.
- **Saves change only what you changed**: the files keep their hand layout (`jsonspan.ts`); a one-number edit is a
  one-line diff. **Preview change** shows the diff first.
- **The game's validators** (`validate.ts`: the same `validate*()` calls the unit tests make) run after every save;
  the header chip and the cards show what they report.
- **Used by**: where an id appears in `data/` and in `src/` (as a quoted string). Delete and rename are refused while
  anything uses the id.
- **Safe writes**: an entry is saved only if it is still what the page loaded (else "reload"); every write keeps a
  backup in the temp folder and can be undone from the header; files are replaced atomically.
- **▶ Play** starts the game with the entry through its address options (`?give=`, `?foe=`, `?floor=`, `?room=`,
  `?spells=`, `?boons=`, `?potions=`, `?theme=`); Vite reloads `data/` edits by itself.

A new foe, spell or artifact from the board is data only: what lives in code (a foe's behaviour and look, its name in
`src/strings.ts`, an effect's implementation) still needs a code change, and the dev menu (`src/ui/devMenu.ts`) lists
new data entries by itself.

## Adding a kind

One entry in `kinds.ts` (its file, where the collection sits, list or map, id and label fields, the card's fields, the
Play link), field hints in `hints.json` if some fields name a union or another kind, and its validator in
`validate.ts` if the game has one. No page code.

## Files

| File | What |
|---|---|
| `server.ts` | HTTP on 127.0.0.1, guards (Host check, `X-Dev-Board` header on writes), routes, validation runner |
| `content.ts` | load, save, create, delete, undo, references |
| `jsonspan.ts` | position-keeping JSON parser and the patcher that rewrites only changed spans |
| `kinds.ts`, `hints.json`, `schema.ts` | what is shown and how its fields are edited |
| `validate.ts` | the game's validators, one `VALIDATE_JSON` line |
| `selftest.ts` | edits every entry on a temp copy and restores it byte for byte; guards; HTTP refusals |
| `public/` | the page (plain HTML, CSS and JS, no build step) |

## Later

- **Art**: today every in-game asset is drawn in code or made by the owner in Tripo Studio, so the cards show colour
  swatches. Once the asset pipeline with Tripo Studio and Aseprite is written into the docs (the owner's plan,
  2026-10-08), the board gets a picture per entry, an art checklist per kind and reference-image upload, following
  that pipeline.
- More kinds: music, ambience, sounds and the asset manifest (`data/*.json`), balance views (stat curves per floor).
