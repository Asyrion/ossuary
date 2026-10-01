# Balance: whole floors

Written by `npm run balance -- runs` (tools/balance.ts). 3 seed(s) of a run, each floor started fresh with each build (no artifacts carried), every fight room entered in turn and cleared by the bot (vaults left sealed); a room is cut off at 90 s, an ordeal or a boss at 180 s. The bot is healed when low, so hard rooms show as hearts lost. Last run: 2026-10-01, 15 min.

## Rooms: mean seconds · hearts lost a room

| Floor | cantrip | ember | frost | storm | hallow | umbral | all | vs floor above |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 17.7 · 1.3 | 14.0 · 0.8 | 16.4 · 1.2 | 13.6 · 0.8 | 15.8 · 0.8 | 14.8 · 0.8 | 15.4 · 0.9 |  |
| 2 | 17.0 · 1.4 | 16.1 · 1.0 | 15.9 · 1.0 | 12.1 · 0.9 | 15.6 · 1.1 | 16.8 · 1.3 | 15.6 · 1.1 | ×1.01 |
| 3 | 28.2 · 5.5 | 26.4 · 4.4 | 21.4 · 3.8 | 22.1 · 3.7 | 26.8 · 4.8 | 25.9 · 4.9 | 25.1 · 4.5 | ×1.61 |
| 4 | 26.8 · 3.5 | 25.9 · 2.8 | 22.5 · 2.4 | 24.9 · 3.1 | 27.2 · 2.9 | 24.6 · 3.4 | 25.3 · 3.0 | ×1.01 |
| 5 | 62.2 · 6.7 | 37.0 · 4.1 | 49.8 · 5.6 | 38.1 · 4.1 | 54.9 · 5.7 | 50.8 · 5.3 | 48.8 · 5.2 | ×1.93 |

## Bosses: mean seconds · hearts lost

| Floor | cantrip | ember | frost | storm | hallow | umbral |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 20.5 · 3.5 | 16.8 · 2.8 | 17.6 · 3.8 | 15.8 · 3.0 | 15.5 · 2.8 | 16.3 · 4.0 |
| 2 | 19.6 · 4.3 | 17.7 · 3.5 | 20.8 · 4.7 | 17.6 · 4.8 | 16.5 · 2.3 | 14.9 · 3.3 |
| 3 | 33.8 · 8.8 | 26.6 · 6.3 | 23.9 · 7.3 | 23.5 · 9.3 | 25.1 · 8.7 | 22.5 · 6.7 |
| 4 | 32.9 · 6.3 | 39.8 · 7.5 | 33.7 · 6.7 | 32.3 · 5.0 | 41.1 · 7.7 | 46.1 · 9.8 |
| 5 | 43.0 · 6.8 | 37.8 · 6.5 | 43.3 · 7.7 | 47.9 · 8.2 | 39.8 · 5.7 | 44.6 · 8.5 |

## The longest rooms cleared

- floor 5, hallow: ordeal_hall (ordeal) 157.8 s, 16.5 ♥: rootling, manticore, voidMote, rimeWolf, stormRay, rootling, rootling, rootling, manticore, gloomRaven, voidMote, lanternTortoise, dustPangolin, gloomRaven, voidMote, dustPangolin
- floor 5, frost: ordeal_hall (ordeal) 151.6 s, 12.5 ♥: rootling, manticore, voidMote, rimeWolf, stormRay, rootling, rootling, rootling, manticore, gloomRaven, voidMote, lanternTortoise, dustPangolin, gloomRaven, voidMote, dustPangolin
- floor 5, hallow: ordeal_hall (ordeal) 150.2 s, 18.5 ♥: lanternTortoise, manticore, stormRay, rootling, stormRay, rootling, frostJackalope, frostJackalope, manticore, stormRay, stormRay, rootling, manticore, gloomRaven, stormRay, manticore
- floor 5, umbral: ordeal_hall (ordeal) 148.7 s, 17 ♥: stormRay, lanternTortoise, rootling, stormRay, rootling, frostJackalope, rimeWolf, gloomRaven, frostJackalope, manticore, gloomRaven, voidMote, dustPangolin, manticore, stormRay, gloomRaven, dustPangolin
- floor 5, ember: ordeal_hall (ordeal) 127.8 s, 12 ♥: stormRay, lanternTortoise, rootling, stormRay, rootling, frostJackalope, rimeWolf, gloomRaven, frostJackalope, manticore, gloomRaven, voidMote, dustPangolin, manticore, stormRay, gloomRaven, dustPangolin
- floor 3, ember: ordeal_hall (ordeal) 113.2 s, 18.5 ♥: cinderDjinn, phoenix, rubbleGolem, magmaOoze, magmaOoze, magmaOoze, cinderDjinn, cinderSalamander, saltGolem, cinderDjinn, hexImp, cinderSalamander
- floor 5, storm: ordeal_hall (ordeal) 112.4 s, 9.5 ♥: rootling, manticore, voidMote, rimeWolf, stormRay, rootling, rootling, rootling, manticore, gloomRaven, voidMote, lanternTortoise, dustPangolin, gloomRaven, voidMote, dustPangolin
- floor 5, frost: ordeal_hall (ordeal) 111.6 s, 16 ♥: stormRay, lanternTortoise, rootling, stormRay, rootling, frostJackalope, rimeWolf, gloomRaven, frostJackalope, manticore, gloomRaven, voidMote, dustPangolin, manticore, stormRay, gloomRaven, dustPangolin
- floor 5, frost: ordeal_hall (ordeal) 107.1 s, 16.5 ♥: lanternTortoise, manticore, stormRay, rootling, stormRay, rootling, frostJackalope, frostJackalope, manticore, stormRay, stormRay, rootling, manticore, gloomRaven, stormRay, manticore
- floor 5, cantrip: ordeal_hall (ordeal) 92.1 s, 12 ♥: lanternTortoise, manticore, stormRay, rootling, stormRay, rootling, frostJackalope, frostJackalope, manticore, stormRay, stormRay, rootling, manticore, gloomRaven, stormRay, manticore
- floor 5, storm: ordeal_hall (ordeal) 90.4 s, 11 ♥: stormRay, lanternTortoise, rootling, stormRay, rootling, frostJackalope, rimeWolf, gloomRaven, frostJackalope, manticore, gloomRaven, voidMote, dustPangolin, manticore, stormRay, gloomRaven, dustPangolin
- floor 5, cantrip: landing_moor (normal, ambush) 90 s, 0 ♥: frostJackalope, stormRay, lanternTortoise, stormRay, rimeWolf

## Not cleared in time

- floor 5, seed 0, cantrip: ossuary_niches (normal, champion), still standing: frostJackalope
- floor 5, seed 0, umbral: ossuary_niches (normal, champion), still standing: frostJackalope
- floor 4, seed 1, ember: l_cloister (normal), still standing: harpy
- floor 4, seed 1, frost: l_cloister (normal), still standing: harpy
- floor 4, seed 1, storm: l_cloister (normal), still standing: harpy
- floor 5, seed 1, cantrip: great_cloister (normal, ambush), still standing: frostJackalope, voidMote
- floor 5, seed 1, cantrip: shaft_pillars (normal), still standing: cinderDjinn
- floor 5, seed 1, cantrip: corridor_pits (normal), still standing: frostJackalope
- floor 5, seed 1, cantrip: landing_moor (normal, dark), still standing: voidMote
- floor 5, seed 1, cantrip: ordeal_hall (ordeal), still standing: voidMote
- floor 5, seed 1, ember: great_cloister (normal, ambush), still standing: gloomRaven, frostJackalope
- floor 5, seed 1, frost: corridor_pits (normal), still standing: frostJackalope
- floor 5, seed 1, storm: great_cloister (normal, ambush), still standing: frostJackalope
- floor 5, seed 1, hallow: corridor_pits (normal), still standing: frostJackalope
- floor 5, seed 1, hallow: landing_moor (normal, dark), still standing: voidMote
- floor 5, seed 1, hallow: ordeal_hall (ordeal), still standing: manticore, gloomRaven, dustPangolin
- floor 5, seed 1, umbral: great_cloister (normal, ambush), still standing: gloomRaven, frostJackalope
- floor 5, seed 1, umbral: corridor_pits (normal), still standing: frostJackalope
- floor 2, seed 2, ember: mausoleum_tombs (normal), still standing: mireToad
- floor 5, seed 2, cantrip: ordeal_hall (ordeal), still standing: voidMote
- floor 5, seed 2, cantrip: great_hall (normal, champion), still standing: voidMote, frostJackalope, frostJackalope
- floor 5, seed 2, hallow: sarcophagus (normal, dark), still standing: voidMote
- floor 5, seed 2, umbral: great_hall (normal, champion), still standing: frostJackalope, frostJackalope

## Page errors

- the page crashed on seed 2, floor 2, hallow (fought again on a fresh page)
