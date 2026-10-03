# Balance: whole floors

Written by `npm run balance -- runs` (tools/balance.ts). 4 seed(s) of a run, each floor started fresh with each build at the level a run expects to reach it at (M6 step 12: `levelAtFloor`, its levels choosing for themselves; no artifacts carried), every fight room entered in turn and cleared by the bot (vaults left sealed); a room is cut off at 90 s, an ordeal or a boss at 180 s. The bot is healed when low, so hard rooms show as hearts lost. Last run: 2026-10-03, 35 min.

## Rooms: mean seconds · hearts lost a room

| Floor | cantrip | ember | frost | storm | hallow | umbral | all | vs floor above |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 16.2 · 1.0 | 12.9 · 0.9 | 18.3 · 1.1 | 14.8 · 0.9 | 14.2 · 1.1 | 13.8 · 0.9 | 15.0 · 1.0 |  |
| 2 | 18.1 · 1.3 | 16.8 · 1.0 | 18.7 · 0.8 | 16.3 · 0.9 | 18.7 · 1.0 | 16.8 · 0.9 | 17.6 · 1.0 | ×1.17 |
| 3 | 29.2 · 4.5 | 24.3 · 3.4 | 25.4 · 3.6 | 21.4 · 3.1 | 25.1 · 3.9 | 24.4 · 4.0 | 25.0 · 3.7 | ×1.42 |
| 4 | 28.9 · 4.6 | 21.0 · 3.5 | 25.5 · 2.9 | 22.8 · 3.3 | 25.9 · 3.6 | 25.1 · 3.7 | 24.9 · 3.6 | ×1.00 |
| 5 | 50.3 · 6.1 | 34.0 · 3.9 | 48.7 · 5.4 | 32.1 · 3.4 | 44.0 · 5.2 | 46.0 · 5.4 | 42.5 · 4.9 | ×1.71 |

## Insight and levels (M6 step 12)

Each floor's start level, the mean insight a fight room gave (kills and its clear), the boss's, and the level the floor ended at (mean over builds and seeds), against the curve's next start level.

| Floor | start | insight a room | boss | ends at | the curve's next |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 16.5 | 60 | 4.0 | 4 |
| 2 | 4 | 23.3 | 130 | 7.0 | 7 |
| 3 | 7 | 40.4 | 232 | 9.0 | 9 |
| 4 | 9 | 44.0 | 360 | 11.0 | 11 |
| 5 | 11 | 55.7 | 540 | 12.0 | 12 |

## Bosses: mean seconds · hearts lost

| Floor | cantrip | ember | frost | storm | hallow | umbral |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 13.9 · 5.0 | 13.9 · 3.6 | 15.2 · 2.8 | 13.9 · 3.8 | 13.3 · 3.8 | 13.8 · 4.3 |
| 2 | 17.9 · 5.3 | 15.5 · 2.9 | 14.7 · 2.9 | 15.3 · 2.8 | 12.3 · 2.0 | 14.6 · 3.0 |
| 3 | 31.5 · 9.4 | 28.4 · 6.8 | 26.7 · 8.1 | 23.7 · 8.1 | 24.2 · 7.4 | 26.6 · 8.1 |
| 4 | 58.5 · 12.1 | 30.6 · 5.4 | 32.3 · 6.8 | 36.3 · 6.4 | 34.3 · 8.0 | 32.0 · 5.5 |
| 5 | 36.5 · 7.4 | 40.9 · 8.0 | 35.3 · 6.8 | 37.3 · 6.3 | 35.6 · 7.9 | 35.5 · 7.4 |

## The longest rooms cleared

- floor 5, hallow: ordeal_hall (ordeal) 139.1 s, 16 ♥: rootling, dustPangolin, stormRay, frostJackalope, voidMote, rootling, rootling, frostJackalope, hydra, voidMote, stormRay, dustPangolin, manticore, gloomRaven, stormRay, rootling
- floor 5, frost: ordeal_hall (ordeal) 134.7 s, 11.5 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, umbral: ordeal_hall (ordeal) 130.7 s, 16 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, frost: ordeal_hall (ordeal) 126.1 s, 16.5 ♥: choirLark, rimeWolf, voidMote, rootling, stormRay, rootling, rootling, frostJackalope, manticore, gloomRaven, stormRay, dustPangolin, manticore, voidMote, gloomRaven, dustPangolin
- floor 5, cantrip: ordeal_hall (ordeal) 117.8 s, 9.5 ♥: dustPangolin, rootling, stormRay, voidMote, rootling, stormRay, rimeWolf, frostJackalope, rootling, rootling, stormRay, gloomRaven, lanternTortoise, dustPangolin, voidMote, gloomRaven, rootling
- floor 5, ember: ordeal_hall (ordeal) 108.5 s, 12 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, umbral: ordeal_hall (ordeal) 101.5 s, 10.5 ♥: dustPangolin, rootling, stormRay, voidMote, rootling, stormRay, rimeWolf, frostJackalope, rootling, rootling, stormRay, gloomRaven, lanternTortoise, dustPangolin, voidMote, gloomRaven, rootling
- floor 5, frost: ordeal_hall (ordeal) 96.9 s, 13 ♥: rootling, dustPangolin, stormRay, frostJackalope, voidMote, rootling, rootling, frostJackalope, hydra, voidMote, stormRay, dustPangolin, manticore, gloomRaven, stormRay, rootling
- floor 4, cantrip: ordeal_hall (ordeal) 95.3 s, 15 ♥: gargoyleWhelp, gargoyleWhelp, harpy, harpy, wickmouse, radiantEye, shadowFox, wickmouse, lodestoneGolem, gargoyleWhelp, chimeBat, harpy, hearthGolem, gargoyleWhelp, harpy, radiantEye, gargoyleWhelp
- floor 5, ember: ordeal_hall (ordeal) 94.7 s, 11.5 ♥: dustPangolin, rootling, stormRay, voidMote, rootling, stormRay, rimeWolf, frostJackalope, rootling, rootling, stormRay, gloomRaven, lanternTortoise, dustPangolin, voidMote, gloomRaven, rootling
- floor 5, hallow: ordeal_hall (ordeal) 91.2 s, 16.5 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, cantrip: tall_pillars (normal, ambush) 90 s, 0 ♥: voidMote, lanternTortoise, dustPangolin, stormRay, rimeWolf, rootling, rootling

## Not cleared in time

- floor 2, seed 0, cantrip: great_cloister (normal), still standing: cisternLurker
- floor 2, seed 0, ember: great_cloister (normal), still standing: cisternLurker
- floor 5, seed 0, cantrip: ordeal_hall (ordeal), still standing: voidMote
- floor 5, seed 0, cantrip: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, cantrip: twin_hounds (normal), still standing: frostJackalope
- floor 5, seed 0, cantrip: swarm (normal), still standing: frostJackalope
- floor 5, seed 0, ember: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, frost: long_colonnade (normal, champion), still standing: frostJackalope
- floor 5, seed 0, frost: gallery (normal, dark), still standing: frostJackalope
- floor 5, seed 0, storm: l_bastion (normal, dark), still standing: frostJackalope
- floor 5, seed 0, hallow: swarm (normal), still standing: frostJackalope
- floor 5, seed 0, umbral: crossing (normal, ambush), still standing: frostJackalope
- floor 2, seed 1, frost: pilgrims_rest (normal, quiet), still standing: glassNewt
- floor 2, seed 1, storm: pilgrims_rest (normal, quiet), still standing: glassNewt
- floor 2, seed 1, hallow: pilgrims_rest (normal, quiet), still standing: glassNewt
- floor 3, seed 1, cantrip: l_hounds (normal), still standing: magmaOoze, waspNest, phoenix, magmaOoze, emberWasp, magmaOoze, emberWasp, emberWasp
- floor 3, seed 1, ember: l_hounds (normal), still standing: waspNest, magmaOoze, phoenix, magmaOoze, emberWasp, emberWasp, emberWasp
- floor 3, seed 1, frost: l_hounds (normal), still standing: rubbleGolem, magmaOoze, waspNest, phoenix, emberWasp, emberWasp, emberWasp
- floor 3, seed 1, storm: l_hounds (normal), still standing: waspNest, phoenix, magmaOoze, emberWasp, emberWasp, magmaOoze, emberWasp
- floor 3, seed 1, hallow: necropolis (normal), still standing: basilisk
- floor 3, seed 1, hallow: l_hounds (normal), still standing: waspNest, magmaOoze, emberWasp, emberWasp, emberWasp
- floor 3, seed 1, umbral: l_hounds (normal), still standing: waspNest, phoenix, magmaOoze, magmaOoze, emberWasp, emberWasp
- floor 4, seed 1, cantrip: sarcophagus (normal), still standing: hearthGolem
- floor 5, seed 1, cantrip: great_cloister (normal, champion), still standing: frostJackalope
- floor 5, seed 1, cantrip: l_hounds (normal), still standing: frostJackalope
- floor 5, seed 1, cantrip: ordeal_hall (ordeal), still standing: voidMote
- floor 5, seed 1, ember: shaft_wisps (normal, ambush), still standing: cinderDjinn
- floor 5, seed 1, frost: great_cloister (normal, champion), still standing: frostJackalope
- floor 5, seed 1, frost: l_hounds (normal), still standing: frostJackalope
- floor 5, seed 1, storm: great_cloister (normal, champion), still standing: frostJackalope
- floor 5, seed 1, umbral: chapel_pews (normal), still standing: frostJackalope
- floor 1, seed 2, frost: pilgrims_rest (normal), still standing: cryptSpider
- floor 1, seed 2, storm: pilgrims_rest (normal), still standing: cryptSpider
- floor 3, seed 2, cantrip: shaft_wisps (normal, champion), still standing: cinderDjinn
- floor 3, seed 2, cantrip: hypostyle (normal, champion), still standing: saltGolem, waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, frost: hypostyle (normal, champion), still standing: waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, hallow: hypostyle (normal, champion), still standing: waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, umbral: hypostyle (normal, champion), still standing: saltGolem, waspNest, emberWasp, emberWasp, emberWasp
- floor 5, seed 2, cantrip: hypostyle (normal, champion), still standing: frostJackalope, frostJackalope
- floor 5, seed 2, cantrip: tall_tombs (normal), still standing: frostJackalope
- floor 5, seed 2, cantrip: l_bastion (normal), still standing: voidMote
- floor 5, seed 2, frost: hypostyle (normal, champion), still standing: frostJackalope
- floor 5, seed 2, frost: ordeal_hall (ordeal), still standing: dustPangolin, voidMote, gloomRaven, rootling
- floor 5, seed 2, frost: l_bastion (normal), still standing: voidMote
- floor 5, seed 2, hallow: ordeal_hall (ordeal), still standing: voidMote
- floor 5, seed 2, hallow: l_bastion (normal), still standing: voidMote
- floor 5, seed 2, umbral: tall_chasm (normal, champion), still standing: frostJackalope
- floor 2, seed 3, frost: pier_court (normal), still standing: brineSerpent
- floor 2, seed 3, hallow: pier_court (normal), still standing: brineSerpent
- floor 2, seed 3, umbral: pier_court (normal), still standing: brineSerpent
- floor 4, seed 3, hallow: mausoleum_tombs (normal, champion), still standing: radiantEye
- floor 5, seed 3, umbral: l_cloister (normal), still standing: frostJackalope
- floor 5, seed 3, umbral: l_hounds (normal), still standing: frostJackalope

## Page errors

- the page crashed on seed 3, floor 3, umbral (fought again on a fresh page)
