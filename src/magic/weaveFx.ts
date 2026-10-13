/* Weaves and chains set off (M4.10, magic/weaves.ts for the table): the name rises where it happened, in both its schools'
   colours by turns (larger the first time ever, and kept between runs for the book), with both schools' sound. Each one's
   effect is done at its hook (shapes.ts, steam.ts, statusFx.ts, the ground's fire); this is what they share. */
import { G } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { burst } from '../combat/fx';
import { CFG } from '../config';
import { WEAVES, type WeaveId } from './weaves';
import { foundWeave } from './memory';
import { floatText } from './statusFx';

const last = new Map<WeaveId, number>();
/** Weave `id` went off at (x, z): its name rises (once every `CFG.spellFx.weaveName` seconds at most, for those that go on
    and on), bursts of both its schools' light, and its sound. Returns whether it was the first time ever. */
export function weaveAt(id: WeaveId, x: number, z: number) {
  const first = foundWeave(id),
    w = WEAVES[id],
    [a, b] = w.schools;
  burst(x, 0.7, z, SCHOOL_LIGHT[a], 10, 2, 0.04);
  burst(x, 0.7, z, SCHOOL_LIGHT[b], 10, 2, 0.04);
  if (!first && G.simClock - (last.get(id) ?? -99) < CFG.spellFx.weaveName) return false;
  last.set(id, G.simClock);
  floatText(x, 1.9, z, STR.weaves[id].name, w.kind === 'weave' ? 0xfff0c8 : 0xd8e0ff, first ? 52 : 44);
  Sfx.at(x, z).weave(a, b);
  return first;
}
