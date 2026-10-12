/* Transformations (M4.6, docs/archive/M4.6-plan.md; GDD: Artifacts, Costumes and transformations): three artifacts of a family
   (`family` in data/artifacts.json) transform the mage for the rest of the run, with a look (costumePieces.ts) and a gift
   (an effect in `player.stats.effects`, from `giftEffects`). Pure: the table, which have formed, and the checks. */
import type { Effect } from './artifactData';

export type TransformId = 'pyromancer' | 'frostborn' | 'stormcaller' | 'lightbearer' | 'shadowstep' | 'runescribe' | 'pilgrim' | 'beastcaller' | 'alchemist';
/** Each transformation: its school's light (its aura, the tint of the robes), and the effects its gift adds. */
export const TRANSFORMS: Record<TransformId, { light: number; gift: Effect[] }> = {
  pyromancer: { light: 0xff7a2a, gift: ['emberStrike'] },
  frostborn: { light: 0x8fd8ff, gift: ['frostTouch'] },
  stormcaller: { light: 0x8a7aff, gift: ['stormLeap'] },
  lightbearer: { light: 0xffd878, gift: ['pitWalker', 'float'] },
  shadowstep: { light: 0x9a5aff, gift: ['blink'] },
  runescribe: { light: 0x6ae0c8, gift: ['runeBurst'] },
  pilgrim: { light: 0xd8b070, gift: ['graveLantern', 'pilgrimPath'] },
  beastcaller: { light: 0xf0c890, gift: ['beastcaller'] },
  alchemist: { light: 0x7ae070, gift: ['splitThrow'] }, // (M5: thrown potions split in two)
};
export const TRANSFORM_IDS = Object.keys(TRANSFORMS) as TransformId[];
export const isTransform = (id: string): id is TransformId => id in TRANSFORMS;

/** How many artifacts of a family form it. */
export const TRANSFORM_NEEDS = 3;

/** The transformations formed by what is held (in pickup order): each family with `TRANSFORM_NEEDS` of its artifacts,
    in the order their last needed artifact was taken. `already` (formed earlier in the run) stay formed and keep their
    place, even if an artifact of them was given up since (a focus swapped back). */
export function formed(held: readonly { id: string; family?: string }[], already: readonly TransformId[] = []): TransformId[] {
  const out = [...already], count = new Map<string, Set<string>>();
  for (const a of held) {
    if (!a.family || !isTransform(a.family)) continue;
    const set = count.get(a.family) ?? new Set(); set.add(a.id); count.set(a.family, set);
    if (set.size >= TRANSFORM_NEEDS && !out.includes(a.family)) out.push(a.family);
  }
  return out;
}

/** The effects the formed transformations' gifts add (to the artifacts' own). */
export const giftEffects = (ts: readonly TransformId[]) => new Set<Effect>(ts.flatMap(t => TRANSFORMS[t].gift));

/** What is wrong with the families named in the artifacts (empty when all is well): a family no transformation has, or a
    transformation with too few artifacts to form. */
export function validateFamilies(defs: readonly { id: string; family?: string }[]) {
  const errs: string[] = [];
  for (const d of defs) if (d.family && !isTransform(d.family)) errs.push(`${d.id}: no transformation "${d.family}"`);
  for (const t of TRANSFORM_IDS) { const n = defs.filter(d => d.family === t).length; if (n < TRANSFORM_NEEDS) errs.push(`${t}: only ${n} artifacts`); }
  return errs;
}
