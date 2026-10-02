/* The bestiary (M4.5, docs/M4.5-plan.md): thirty-five creatures for the owner to see before they become foes. The first
   drafts were small round critters with big eyes; the owner asked for fantasy animals and creatures that read at a glance
   as what they are, fierce rather than cute, at their real size, and no undead (2026-10-01). The looks are built in
   bestiaryBeasts.ts (animals of the dungeon), bestiaryCreatures.ts (creatures of myth) and bestiaryElementals.ts (golems
   and living elements) from the parts in beastParts.ts. Names and the fight each brings are placeholders in STR.bestiary;
   the Galleries tab stands them in rows by kind. */
import type { School } from '../render/arcane';
import type { Built } from './beastParts';
import { FLOOR1_LOOKS, lampwyrmSwarm } from './fantasyFloor1';
import { FLOOR2_LOOKS } from './fantasyFloor2';
import { FLOOR3_LOOKS } from './fantasyFloor3';
import { puffcap, rimeScarab, gloomRaven, rimeWolf, dustPangolin, frostJackalope } from './bestiaryBeasts';
import { grimoireMimic, brineSerpent, phoenix, basilisk, griffin, radiantEye, harpy, shadowFox, hydra, manticore } from './bestiaryCreatures';
import { puddleElemental, thunderhead, cinderDjinn, magmaOoze, saltGolem, rubbleGolem, lodestoneGolem, hearthGolem, glacierGolem, rubbleStone } from './bestiaryElementals';

export type { Built };
export type BestiaryKind = 'beast' | 'creature' | 'elemental';

/** The thirty-five, floor by floor, each with its kind, school (the light it carries; earth and water borrow Storm's and
    Frost's), floor and whether it is an elite. */
export const BESTIARY_OPTIONS = [
  { id: 'cryptSpider', kind: 'beast', school: 'umbral', floor: 1, build: FLOOR1_LOOKS.cryptSpider },
  { id: 'inkOctopus', kind: 'beast', school: 'umbral', floor: 1, build: FLOOR1_LOOKS.inkOctopus },
  { id: 'grimoireMimic', kind: 'creature', school: 'umbral', floor: 1, build: grimoireMimic },
  { id: 'fireflySwarm', kind: 'beast', school: 'hallow', floor: 1, build: lampwyrmSwarm },
  { id: 'choirLark', kind: 'beast', school: 'hallow', floor: 1, build: FLOOR1_LOOKS.choirLark },
  { id: 'stormMantis', kind: 'beast', school: 'storm', floor: 1, build: FLOOR1_LOOKS.stormMantis },
  { id: 'rubbleCrab', kind: 'beast', school: 'storm', floor: 1, build: FLOOR1_LOOKS.rubbleCrab },
  { id: 'rimeSnail', kind: 'beast', school: 'frost', floor: 2, build: FLOOR2_LOOKS.rimeSnail },
  { id: 'glassNewt', kind: 'beast', school: 'frost', floor: 2, build: FLOOR2_LOOKS.glassNewt },
  { id: 'brineSerpent', kind: 'creature', school: 'frost', floor: 2, build: brineSerpent },
  { id: 'puddleElemental', kind: 'elemental', school: 'frost', floor: 2, build: puddleElemental },
  { id: 'thunderhead', kind: 'elemental', school: 'storm', floor: 2, build: thunderhead },
  { id: 'stormDarter', kind: 'beast', school: 'storm', floor: 2, build: FLOOR2_LOOKS.stormDarter },
  { id: 'puffcap', kind: 'beast', school: 'umbral', floor: 2, build: puffcap },
  { id: 'emberWasp', kind: 'beast', school: 'ember', floor: 3, build: FLOOR3_LOOKS.emberWasp },
  { id: 'cinderDjinn', kind: 'elemental', school: 'ember', floor: 3, build: cinderDjinn },
  { id: 'magmaOoze', kind: 'elemental', school: 'ember', floor: 3, build: magmaOoze },
  { id: 'phoenix', kind: 'creature', school: 'ember', floor: 3, elite: true, build: phoenix },
  { id: 'basilisk', kind: 'creature', school: 'umbral', floor: 3, build: basilisk },
  { id: 'saltGolem', kind: 'elemental', school: 'frost', floor: 3, build: saltGolem },
  { id: 'rubbleGolem', kind: 'elemental', school: 'storm', floor: 3, build: rubbleGolem },
  { id: 'griffin', kind: 'creature', school: 'hallow', floor: 4, elite: true, build: griffin },
  { id: 'radiantEye', kind: 'creature', school: 'hallow', floor: 4, build: radiantEye },
  { id: 'harpy', kind: 'creature', school: 'storm', floor: 4, build: harpy },
  { id: 'lodestoneGolem', kind: 'elemental', school: 'storm', floor: 4, build: lodestoneGolem },
  { id: 'hearthGolem', kind: 'elemental', school: 'ember', floor: 4, elite: true, build: hearthGolem },
  { id: 'shadowFox', kind: 'creature', school: 'umbral', floor: 4, build: shadowFox },
  { id: 'rimeScarab', kind: 'beast', school: 'frost', floor: 4, build: rimeScarab },
  { id: 'glacierGolem', kind: 'elemental', school: 'frost', floor: 5, elite: true, build: glacierGolem },
  { id: 'hydra', kind: 'creature', school: 'umbral', floor: 5, elite: true, build: hydra },
  { id: 'gloomRaven', kind: 'beast', school: 'umbral', floor: 5, build: gloomRaven },
  { id: 'rimeWolf', kind: 'beast', school: 'frost', floor: 5, build: rimeWolf },
  { id: 'dustPangolin', kind: 'beast', school: 'umbral', floor: 5, build: dustPangolin },
  { id: 'frostJackalope', kind: 'beast', school: 'frost', floor: 5, build: frostJackalope },
  { id: 'manticore', kind: 'creature', school: 'umbral', floor: 5, build: manticore },
] as const satisfies readonly { id: string; kind: BestiaryKind; school: School; floor: number; elite?: boolean; build: () => Built }[];
export type BestiaryOptionId = (typeof BESTIARY_OPTIONS)[number]['id'];
/** Looks a foe wears that the gallery doesn't stand (data/foes.json's `look`, or its id): one beetle of the firefly swarm,
    a wasps' nest, a rubble golem's rolling stone. */
export const FOE_LOOKS: Record<string, () => Built> = { fireflyBeetle: FLOOR1_LOOKS.fireflyBeetle, waspNest: FLOOR3_LOOKS.waspNest, rubbleStone };
