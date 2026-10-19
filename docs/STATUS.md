# Status

The one place that says where the project stands. GitHub milestones and issues on
[Asyrion/ossuary](https://github.com/Asyrion/ossuary/milestones) are the tracker of record; this page links them and names
what comes next. Keep it short: what a system does lives in `docs/architecture.md`, what happened in git.

## Now

**The reset** (`docs/RESET-plan.md`, approved 2026-10-12). A feature freeze holds until its phase R5: no new systems, only
cleaning, the look and the story.

| Phase | State |
| --- | --- |
| R0 One baseline | Done 2026-10-12 |
| R1 Docs that tell the truth | Built 2026-10-12; the owner's read next |
| R2 Code that is kept | **Under way:** steps 1 to 6 done; its done-when check (a week of CI without a flake fix) runs again from 2026-10-19, after the fix for issue #63 |
| R3 The look | **Under way:** step 1, the art bible (`docs/art-bible.md`), decided 2026-10-15; step 2, the proof, done 2026-10-15 (models at the texel, the code kit recoloured); floor 1 under way: its rooms' steps A to C (light and palette, outlines and materials, dressing) accepted 2026-10-19 (art bible 4.9, 4.10), step D (wall faces) next |
| R4 The story | Waits for R3 (its art bible is decided); holds M7 steps 10 to 13 |
| R5 The vertical slice | Last |

**Next:** floor 1 in the new look, in the owner's order (2026-10-19): its rooms first (step 4: the floor's palette in
the light and the materials, with a light touch in the pixel look's shading for cool shadows), then its foes and the
Warden (step 3, the actors' pass), its spells, and its items, item effects and artifacts. R2's done-when check runs
beside it: a week of CI (the full suite on every PR and nightly, the fast one on `main`) without a flake fix.

## What is live

`main` deploys to GitHub Pages: the full game with five floors, the Seal and Kaelith, daylight, and the Vigil with its
townspeople (M7 steps 1 to 9).

## Waiting on the owner

- Nothing blocking. Open design questions are gathered in the reset plan's phases as they come up.

## Known issues carried into the reset

From the last sweeps and balance runs (taken over from the old handoff note). R3 (the look) and R2 (tests) pick them up.

- Hard to read: the Gloom Raven and the Mandrake nearly black on floor 5's slate, the Hex Imps dark on floor 3's red
  herringbone, the Deep Angler dark on its floor; foes' dark stains can read as holes in the floor.
- The `waystone_cairns` cairns read as rubble while the room waits dark; the bargain stone is brown on floor 1's brown
  walls (seen only under `?room=`, since shrines are on floors 2 and 4).
- Balance: the Pale Unicorn (`moonstagFawn`) outlasts the bot's cantrip and Frost (`docs/balance.md`). The bot leaves some
  rooms uncleared (the Frost Jackalope, wasp nests behind cover): its own limits, not stuck rooms.

## Milestones

Built and closed: M0 to M6 (with M3.5 to M3.7 and M4.1 to M4.12). Open: M7 Descent and the Vigil (steps 10 to 13 move
into R4), M8 Eda (after R5), R1 to R5. Finished plans are in `docs/archive/`.
