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
| R2 Code that is kept | **Under way:** steps 1 to 6 done; its done-when check (a week of CI) runs |
| R3 The look | **Under way:** step 1, the art bible (`docs/art-bible.md`), decided 2026-10-15; step 2, the proof, next |
| R4 The story | Waits for R3's art bible; holds M7 steps 10 to 13 |
| R5 The vertical slice | Last |

**Next:** R3 step 2, the proof (both routes side by side), while R2's done-when check runs: a week of CI (the full
suite on every PR and nightly, the fast one on `main`) without a flake fix.

## What is live

`main` deploys to GitHub Pages: the full game with five floors, the Seal and Kaelith, daylight, and the Vigil with its
townspeople (M7 steps 1 to 9).

## Waiting on the owner

- R3 step 2, the proof: run by the owner in a local session (Tripo CLI, Blender) from `docs/HANDOFF-R3-proof.md` on the
  branch `r3-art-bible`. The art bible and the proof go to `main` together.

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
