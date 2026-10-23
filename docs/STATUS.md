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
| R2 Code that is kept | **Under way:** steps 1 to 6 done; its done-when check (a week without a flake fix) runs on the full browser suite run locally before every PR, since CI was made lean on 2026-10-22 (no nightly, no browser suite on PRs) |
| R3 The look | **Floor 1 done:** step 1, the art bible (`docs/art-bible.md`), decided 2026-10-15; step 2, the proof, done 2026-10-15 (models at the texel, the code kit recoloured); floor 1: its rooms (steps A to D) and its actors (E1 to E3: outline and rim, light in steps, reading the foes) accepted 2026-10-19 and 20 (art bible 4.9 to 4.14), its spells and its foes' magic (F1 to F3) accepted 2026-10-20 and 21 (4.15); its items, item effects and artifacts done 2026-10-21 (4.16); the HUD and screens (step 5) built in framed panels (4.17); **floor 1 accepted by the owner 2026-10-21**, shipped the same day; floor 2 shipped 2026-10-22 (PR #67, live): its rooms (A to D) built 2026-10-21 (4.18), its eight weakest foes made in Tripo (4.19), then the kelpie, the brine serpent and its two bosses (all accepted 2026-10-21), its spells, foes' magic and items accepted 2026-10-22 (4.20: the items and rooms from Tripo models and pictures, made floor faces, pits drawn as holes on every floor); floor 2 shipped; **floor 3 accepted by the owner 2026-10-22** (4.21 to 4.25: its rooms, its foes and bosses made in Tripo, its fire, pools, items and figures); **floor 4 accepted by the owner 2026-10-22** (4.26 to 4.28: its rooms, its foes and the Hart made in Tripo, its magic drawn for a pale floor); **floor 5 accepted by the owner 2026-10-22** (4.29 to 4.31: its rooms, its foes and the Deep Angler made in Tripo, its magic drawn for a dark shore); R3's five floors are done (floor 1 stays as accepted); **the polish round built 2026-10-23** (below), for the owner's play-test |
| R4 The story | Waits for R3 (its art bible is decided); holds M7 steps 10 to 13 |
| R5 The vertical slice | Last |

**R3's polish round, built 2026-10-23** (branch `r3-polish`): floor 1 brought in line with floors 2 to 5 (ten foes made
in Tripo; 4.19's way); the last bosses built in code made in Tripo (the Pillar Dragon's and the jelly serpent's heads);
the Hallowed Hart, the Hollow Warden, the War-Tiger, the Drowned Abbess, the Pyre Knight, both Twin Guardians (the second
rigged in Blender on the first's skeleton) and Kaelith fight as rigged creatures (`docs/creatures.md`, with how to
rebuild each from Tripo); Fen-Nex as two rigged creatures (art bible 4.32); all 61 artifact icons drawn in Aseprite
(4.6); the splash picture made (4.20); floor 3's torch glows in bands and daylight kept off pools (4.22); the waystone
room's cairns (4.20); the Hex Imps lifted, the frost jackalope darker, the ember wasp remade, the broken oars back as
floor 5's sixth relic (4.29).

**Next:** the owner's play-test of the polish round; nothing from its list is left to build. Then R3 closes and R4 (the
story) opens. Known weak points to look at in it: the second Twin Guardian's fists and inner thighs stretch in the
slam's highest frames and its feet slide a little in the walk (`docs/creatures.md`). R2's done-when check runs beside
it: a week without a flake fix in the full browser suite, run locally before every PR.

## What is live

`main` deploys to GitHub Pages: the full game with five floors, the Seal and Kaelith, daylight, and the Vigil with its
townspeople (M7 steps 1 to 9).

## Waiting on the owner

- The play-test of R3's polish round (above). Open design questions are gathered in the reset plan's phases as they
  come up.

## Known issues carried into the reset

From the last sweeps and balance runs (taken over from the old handoff note). R3 (the look) and R2 (tests) pick them up.

- Hard to read (to check in the polish round's play-test): foes' dark stains can read as holes in the floor (every mark
  is turned toward the floor's shadow since 4.16); the dark foes the art bible's survey named lost on dark floors were
  lifted (the Mandrake, as the rootling, the Gloom Raven and the Deep Angler in 4.30, the Hex Imps 2026-10-23).
- Balance: the Pale Unicorn (`moonstagFawn`) outlasts the bot's cantrip and Frost (`docs/balance.md`). The bot leaves some
  rooms uncleared (the Frost Jackalope, wasp nests behind cover): its own limits, not stuck rooms.

## Milestones

Built and closed: M0 to M6 (with M3.5 to M3.7 and M4.1 to M4.12). Open: M7 Descent and the Vigil (steps 10 to 13 move
into R4), M8 Eda (after R5), R1 to R5. Finished plans are in `docs/archive/`.
