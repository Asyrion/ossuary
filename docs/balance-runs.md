# Balance: whole floors

Written by `npm run balance -- runs` (tools/balance.ts). 3 seed(s) of a run, each floor started fresh with each build at the level a run expects to reach it at (M6 step 12: `levelAtFloor`, its levels choosing for themselves; no artifacts carried), every fight room entered in turn and cleared by the bot (vaults left sealed); a room is cut off at 90 s, an ordeal or a boss at 180 s. The bot is healed when low, so hard rooms show as hearts lost. Last run: 2026-10-03, 24 min.

## Rooms: mean seconds · hearts lost a room

| Floor | cantrip | ember | frost | storm | hallow | umbral | all | vs floor above |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 14.3 · 0.9 | 13.2 · 0.7 | 15.3 · 0.9 | 11.2 · 0.6 | 15.1 · 1.0 | 12.4 · 0.7 | 13.6 · 0.8 |  |
| 2 | 18.8 · 1.2 | 20.6 · 0.9 | 19.1 · 0.9 | 18.8 · 0.8 | 19.4 · 1.2 | 21.0 · 1.1 | 19.6 · 1.0 | ×1.45 |
| 3 | 27.5 · 4.1 | 25.3 · 3.8 | 22.6 · 3.2 | 22.5 · 3.1 | 25.6 · 3.6 | 23.8 · 3.6 | 24.6 · 3.6 | ×1.25 |
| 4 | 26.6 · 4.3 | 22.2 · 3.4 | 20.3 · 2.7 | 21.3 · 3.1 | 25.4 · 3.4 | 22.8 · 3.4 | 23.1 · 3.4 | ×0.94 |
| 5 | 54.3 · 5.8 | 36.5 · 4.0 | 41.4 · 4.3 | 33.2 · 3.3 | 41.1 · 4.1 | 42.0 · 4.5 | 41.4 · 4.3 | ×1.79 |

## Insight and levels (M6 step 12)

Each floor's start level, the mean insight a fight room gave (kills and its clear), the boss's, and the level the floor ended at (mean over builds and seeds), against the curve's next start level.

| Floor | start | insight a room | boss | ends at | the curve's next |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 16.5 | 60 | 4.0 | 4 |
| 2 | 4 | 23.1 | 130 | 7.0 | 7 |
| 3 | 7 | 38.9 | 231 | 9.0 | 9 |
| 4 | 9 | 44.0 | 360 | 11.0 | 11 |
| 5 | 11 | 53.7 | 540 | 12.0 | 12 |

## Bosses: mean seconds · hearts lost

| Floor | cantrip | ember | frost | storm | hallow | umbral |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 13.5 · 5.2 | 11.3 · 4.2 | 12.9 · 3.5 | 13.3 · 2.7 | 13.0 · 4.5 | 13.3 · 3.3 |
| 2 | 18.0 · 3.7 | 14.3 · 2.5 | 13.5 · 2.2 | 15.6 · 2.7 | 15.6 · 2.8 | 15.7 · 3.3 |
| 3 | 26.5 · 9.2 | 23.4 · 9.8 | 24.9 · 6.8 | 21.2 · 6.0 | 24.9 · 8.0 | 22.8 · 7.3 |
| 4 | 36.5 · 7.2 | 32.0 · 7.7 | 33.0 · 7.3 | 30.1 · 8.3 | 32.8 · 8.8 | 29.9 · 6.8 |
| 5 | 41.8 · 7.0 | 32.8 · 6.7 | 34.0 · 7.3 | 34.9 · 6.5 | 37.7 · 6.3 | 39.7 · 8.0 |

## The longest rooms cleared

- floor 5, cantrip: ordeal_hall (ordeal) 161.4 s, 17 ♥: dustPangolin, rootling, stormRay, rootling, stormRay, rimeWolf, frostJackalope, rootling, rootling, stormRay, gloomRaven, lanternTortoise, dustPangolin, voidMote, gloomRaven, rootling
- floor 5, hallow: ordeal_hall (ordeal) 145.5 s, 15.5 ♥: dustPangolin, rootling, stormRay, rootling, stormRay, rimeWolf, frostJackalope, rootling, rootling, stormRay, gloomRaven, lanternTortoise, dustPangolin, voidMote, gloomRaven, rootling
- floor 4, hallow: ordeal_hall (ordeal) 133.3 s, 21.5 ♥: moonstagFawn, hearthGolem, gargoyleWhelp, shadowFox, wickmouse, lodestoneGolem, radiantEye, rimeScarab, gargoyleWhelp, harpy, moonstagFawn, gargoyleWhelp, gargoyleWhelp, harpy, moonstagFawn, gargoyleWhelp
- floor 5, ember: ordeal_hall (ordeal) 126.2 s, 13 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, umbral: ordeal_hall (ordeal) 109.9 s, 13.5 ♥: choirLark, rimeWolf, voidMote, rootling, stormRay, rootling, rootling, frostJackalope, manticore, gloomRaven, stormRay, dustPangolin, manticore, voidMote, gloomRaven, dustPangolin
- floor 5, ember: ordeal_hall (ordeal) 104.8 s, 13.5 ♥: choirLark, rimeWolf, voidMote, rootling, stormRay, rootling, rootling, frostJackalope, manticore, gloomRaven, stormRay, dustPangolin, manticore, voidMote, gloomRaven, dustPangolin
- floor 5, storm: ordeal_hall (ordeal) 101.6 s, 13 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, hallow: ordeal_hall (ordeal) 96.9 s, 11 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, umbral: ordeal_hall (ordeal) 91.9 s, 13 ♥: lanternTortoise, rootling, gloomRaven, voidMote, rimeWolf, gloomRaven, rootling, rootling, rootling, rootling, voidMote, voidMote, rootling, manticore, stormRay, stormRay, manticore
- floor 5, cantrip: tall_pillars (normal, ambush) 90 s, 0 ♥: voidMote, lanternTortoise, dustPangolin, stormRay, rimeWolf, rootling, rootling
- floor 5, ember: tall_pillars (normal, ambush) 90 s, 0 ♥: voidMote, lanternTortoise, dustPangolin, stormRay, rimeWolf, rootling, rootling
- floor 5, frost: tall_pillars (normal, ambush) 90 s, 0 ♥: voidMote, lanternTortoise, dustPangolin, stormRay, rimeWolf, rootling, rootling

## Not cleared in time

- floor 2, seed 0, cantrip: great_cloister (normal), still standing: cisternLurker
- floor 2, seed 0, ember: great_cloister (normal), still standing: cisternLurker
- floor 2, seed 0, storm: great_cloister (normal), still standing: cisternLurker
- floor 2, seed 0, hallow: great_cloister (normal), still standing: cisternLurker
- floor 2, seed 0, umbral: great_cloister (normal), still standing: cisternLurker
- floor 5, seed 0, cantrip: ordeal_hall (ordeal), still standing: voidMote
- floor 5, seed 0, cantrip: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, cantrip: gallery (normal, dark), still standing: frostJackalope
- floor 5, seed 0, frost: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, frost: twin_hounds (normal), still standing: frostJackalope
- floor 5, seed 0, frost: crossing (normal, ambush), still standing: frostJackalope
- floor 5, seed 0, storm: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, hallow: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, umbral: corridor_pits (normal, champion), still standing: frostJackalope
- floor 5, seed 0, umbral: l_bastion (normal, dark), still standing: frostJackalope
- floor 2, seed 1, frost: pilgrims_rest (normal, quiet), still standing: glassNewt
- floor 2, seed 1, storm: pilgrims_rest (normal, quiet), still standing: glassNewt
- floor 2, seed 1, umbral: pilgrims_rest (normal, quiet), still standing: glassNewt
- floor 3, seed 1, cantrip: necropolis (normal), still standing: waspNest, magmaOoze, emberWasp, emberWasp, emberWasp
- floor 3, seed 1, cantrip: l_hounds (normal), still standing: magmaOoze, waspNest, phoenix, emberWasp, emberWasp, emberWasp
- floor 3, seed 1, ember: l_hounds (normal), still standing: magmaOoze, waspNest, phoenix, magmaOoze, emberWasp, emberWasp
- floor 3, seed 1, frost: l_hounds (normal), still standing: rubbleGolem, waspNest, phoenix, emberWasp, emberWasp, magmaOoze
- floor 3, seed 1, storm: l_hounds (normal), still standing: magmaOoze, waspNest, phoenix, emberWasp, magmaOoze, emberWasp, emberWasp
- floor 3, seed 1, hallow: l_hounds (normal), still standing: waspNest, magmaOoze, emberWasp, emberWasp, emberWasp
- floor 3, seed 1, umbral: necropolis (normal), still standing: basilisk
- floor 3, seed 1, umbral: l_hounds (normal), still standing: phoenix, emberWasp, emberWasp
- floor 5, seed 1, cantrip: great_cloister (normal, champion), still standing: frostJackalope
- floor 5, seed 1, cantrip: tall_pillars (normal, champion), still standing: choirLark, voidMote
- floor 5, seed 1, frost: great_cloister (normal, champion), still standing: frostJackalope
- floor 5, seed 1, umbral: great_cloister (normal, champion), still standing: frostJackalope
- floor 3, seed 2, cantrip: hypostyle (normal, champion), still standing: saltGolem, waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, frost: hypostyle (normal, champion), still standing: hexImp, saltGolem, waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, storm: hypostyle (normal, champion), still standing: saltGolem, cinderSalamander, waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, hallow: hypostyle (normal, champion), still standing: waspNest, emberWasp, emberWasp, emberWasp
- floor 3, seed 2, umbral: hypostyle (normal, champion), still standing: rimeDrakeling, waspNest, emberWasp, emberWasp, emberWasp
- floor 5, seed 2, cantrip: long_colonnade (normal), still standing: frostJackalope
- floor 5, seed 2, cantrip: nave (normal, champion), still standing: frostJackalope
- floor 5, seed 2, cantrip: tall_chasm (normal, champion), still standing: frostJackalope
- floor 5, seed 2, cantrip: l_bastion (normal), still standing: voidMote
- floor 5, seed 2, frost: tall_chasm (normal, champion), still standing: frostJackalope
- floor 5, seed 2, hallow: hypostyle (normal, champion), still standing: frostJackalope, frostJackalope
- floor 5, seed 2, umbral: tall_tombs (normal), still standing: frostJackalope

## Page errors

None.
