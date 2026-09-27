# M1 plan: Core loop

Approved 2026-09-26. Design lives in `docs/GDD.md` (Artifacts, Floors and rooms); this file tracks the
build. Each step ends playable, with unit and browser tests passing, and is pushed to GitHub Pages.

## Groundwork (all steps)

- [x] Seeded runs: generation, artifact pools and loot use seeded random streams; seed in the pause menu;
      `?seed=` replays a run's floors
- [x] Generator stores rooms as lists of cells from the start, so step 4 adds shapes without a rewrite
- [x] Content as data: `data/floors.json`, `data/templates/*.json`, `data/artifacts.json` (replaces
      `relics.json`); tuning in `config.ts`
- [x] Vitest unit tests: generator invariants, template validation, artifact data and combining; CI runs
      unit and Playwright tests
- [x] Dev shortcuts: `?room=<template>`, `?floor=<n>`, `?give=<ids>`, `__game.map()`, `__game.give()`

## Step 1: Three generated floors (standard rooms)

- [x] Isaac-style generator on the 9 × 8 grid; room counts per floor from data; boss in the farthest dead
      end, treasure in another; retries until the rules hold
- [x] Room templates from data (3 prototype rooms converted, 10 new normal rooms, start, treasure and boss
      templates); pits (block walking, not bolts; wisps fly over)
- [x] Floor difficulty baseline picks templates and scales enemy health
- [x] Trapdoor after the boss; tougher Warden on floors 2 and 3; winning after floor 3
- [x] Minimap for generated floors, floor banner
- [x] Smoke test on a fixed seed: clear a room, descend a floor
- [x] After play-testing: each floor gets its own look (tile and wall colours, stains, torch style and
      light colour) from `data/floors.json`

## Step 2: Artifacts

- [x] Artifact data, stats recomputed from base plus modifiers; "relic" renamed to artifact
- [x] Cantrip pipeline: focus pattern (twin, bounce, boomerang) plus modifiers (pierce, size, damage, rate)
- [x] Triggers: on kill (Knucklebone), on hurt (Bell), rock damage (Chisel)
- [x] Mask of the Drowned vision, Chain of the Penitent, Pilgrim's Boots over pits, Reliquary Shard
- [x] Pools, 3 to 5 per floor, once per run, fallback; boss choice of 2; rare room-clear drops; focus swap
- [x] Pedestal visuals, cursed glow, HUD icons, pickup banner

## Step 3: Ordeal and Bone Altar

- [x] Ordeal: skull door, locked doors, 2 or 3 waves with banners, artifact after the last wave
- [x] Bone Altar: bone arch door, floating price, costs a heart container, refused at one container
- [x] Generator: ordeal on every floor, altar when a spare dead end exists (chance per floor in data)

## Step 4: Room shapes

- [x] Tile masks and outline walls for corridors, long, tall, great and L-shaped halls; doors on cell edges
- [x] Camera follows the mage in larger rooms and stops at the walls
- [x] Pool of four torch lights assigned to the nearest torches
- [x] Generator places shapes; minimap draws them; the boss sometimes gets a great hall
- [x] Templates for every shape (2+ each), random mirroring; 41 templates in all
- [x] GDD: correct inside sizes to 28 × 7, 13 × 16, 28 × 16

## Step 5: Room variants and difficulty

- [x] Quiet, champion, ambush and dark variants
- [x] Variant chances per floor from data; no hard variants next to the floor 1 start

## Step 6: Polish and balance

- [ ] 20+ templates
- [ ] End screen: floors reached, time, kills, artifacts, seed
- [ ] Placeholder sounds for new events
- [ ] Balance pass after play-tests; GDD and CLAUDE.md brought up to date
- [x] Play-test: larger halls felt too big; the camera pulls back 20% in them (`camHallView`)
