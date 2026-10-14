/* Fantasy foes (docs/archive/M4.12-plan.md): creatures of fantasy, each fight
   unchanged. A look is kept here by the look it replaces (a foe's `look` or its id), and
   every foe that has one wears it (`buildFoe`). A look keeps the parts its foe's behaviour
   moves, by name (`parts`). */
import type { Built } from './beastParts';
import { disposeTree } from '../render/materials';
import { FLOOR1_LOOKS } from './fantasyFloor1';
import { FLOOR2_LOOKS } from './fantasyFloor2';
import { FLOOR3_LOOKS } from './fantasyFloor3';
import { FLOOR4_LOOKS } from './fantasyFloor4';
import { FLOOR5_LOOKS } from './fantasyFloor5';
import { WARDLING_LOOKS } from './fantasyWardlings';

/** The fantasy looks, by the look id they replace. */
export const FANTASY_LOOKS: Partial<Record<string, () => Built>> = {
  ...FLOOR1_LOOKS,
  ...FLOOR2_LOOKS,
  ...FLOOR3_LOOKS,
  ...FLOOR4_LOOKS,
  ...FLOOR5_LOOKS,
  ...WARDLING_LOOKS,
};

/** The parts each foe's behaviour moves, by look id: its look must keep them by name, or the behaviour reads nothing. */
export const MOVED_PARTS: Readonly<Record<string, readonly string[]>> = {
  sporeling: [],
  vesperMoth: [],
  runeBeetle: ['halfL', 'halfR', 'inner'],
  urnMimic: ['lid', 'peek', 'inside'],
  cryptSpider: ['body', 'abdomen'],
  inkOctopus: ['body', 'mantle'],
  fireflyBeetle: ['body'],
  choirLark: ['body', 'head'],
  stormMantis: ['chest', 'head'],
  rubbleCrab: ['body', 'big', 'small'],
  mireToad: ['body', 'throat'],
  cisternLurker: ['rise', 'lures', 'lures2', 'disc'],
  lanternJelly: ['bell', 'light'],
  glassNewt: ['body', 'head'],
  rimeSnail: ['body', 'head', 'shell'],
  stormDarter: ['body'],
  cinderSalamander: [],
  hexImp: [],
  rimeDrakeling: ['ground'],
  emberWasp: ['body', 'tail'],
  waspNest: ['body'],
  wickmouse: ['flame'],
  chimeBat: ['bell'],
  gargoyleWhelp: ['head', 'shine', 'wings', 'wings2', 'eyeL', 'eyeR'],
  moonstagFawn: ['head', 'aura', 'legs'],
  rimeScarab: ['body', 'ball'],
  rootling: ['body', 'mound'],
  stormRay: [],
  voidMote: ['body'],
  lanternTortoise: ['head', 'legs', 'light'],
  gloomRaven: ['body', 'head'],
  rimeWolf: ['body', 'head', 'tail'],
  dustPangolin: ['body', 'head'],
  ...Object.fromEntries(
    ['wardEmber', 'wardFrost', 'wardStorm', 'wardHallow', 'wardUmbral', 'wardVerdant'].map((id) => [
      id,
      ['body', 'light'],
    ]),
  ),
};

/** For each fantasy look: the parts its foe's behaviour moves that the look lacks (the dev hook `lookContract`). */
export function lookContract() {
  return Object.entries(FANTASY_LOOKS).map(([id, build]) => {
    const b = build!(),
      has = Object.keys(b.parts ?? {});
    disposeTree(b.group); // (its geometries and materials, the shared ones aside)
    return { id, missing: (MOVED_PARTS[id] ?? []).filter((p) => !has.includes(p)), known: id in MOVED_PARTS };
  });
}
