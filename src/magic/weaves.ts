/* Weaves and chains (M4.10, docs/M4.10-plan.md; GDD: M4.10 as built). A weave is a spell striking what another spell left
   in the room (an ice wall, a seal's burning ground, holy ground, Wardlight's motes, the Static Mantle, a toll's mark); a
   chain is what a reaction left (a steam cloud, black ice, an Overload's blast, the Shatter's shards, an Eclipse's black
   sun) meeting a third school. This is the pure table (unit-tested); each is set off where it happens (shapes.ts, steam.ts,
   statusFx.ts, the ground's fire) through `weaveAt` in weaveFx.ts, its tuning in `weaves` in data/magic.json. */
import type { School, SpellDef } from './spellData';

export type WeaveId = 'steamCurtain' | 'conductor' | 'overloadSeal' | 'blackPyre' | 'eclipseGround' | 'hallowedHail' | 'lanternFan'
  | 'liveWade' | 'refraction' | 'tollChain' | 'thundercloud' | 'incense' | 'miasma' | 'blackMelt' | 'hailburst' | 'moltenGlass' | 'corona';
/** What was left in the room: a spell's (the first six) or a reaction's (the rest). */
export type Left = 'wall' | 'seal' | 'zone' | 'orbit' | 'mantle' | 'toll' | 'steam' | 'blackice' | 'overload' | 'shards' | 'eclipse';
/** What strikes it: a spell's shape, the water the mage wades, or a school. */
export type By = 'beam' | 'chain' | 'bolt' | 'grasp' | 'shotgun' | 'smite' | 'water' | School;

export interface WeaveDef {
  left: Left; by: By;
  /** A weave (two spells) or a chain (a reaction's leavings and a third school). */ kind: 'weave' | 'chain';
  /** The schools it is made of, for its colours and its sound. */ schools: [School, School];
}
export const WEAVES: Record<WeaveId, WeaveDef> = {
  steamCurtain: { left: 'wall', by: 'beam', kind: 'weave', schools: ['frost', 'ember'] },
  conductor: { left: 'wall', by: 'chain', kind: 'weave', schools: ['frost', 'storm'] },
  overloadSeal: { left: 'seal', by: 'chain', kind: 'weave', schools: ['ember', 'storm'] },
  blackPyre: { left: 'seal', by: 'bolt', kind: 'weave', schools: ['ember', 'umbral'] },
  eclipseGround: { left: 'zone', by: 'grasp', kind: 'weave', schools: ['hallow', 'umbral'] },
  hallowedHail: { left: 'zone', by: 'shotgun', kind: 'weave', schools: ['hallow', 'frost'] },
  lanternFan: { left: 'orbit', by: 'beam', kind: 'weave', schools: ['hallow', 'ember'] },
  liveWade: { left: 'mantle', by: 'water', kind: 'weave', schools: ['storm', 'frost'] },
  refraction: { left: 'wall', by: 'smite', kind: 'weave', schools: ['frost', 'hallow'] },
  tollChain: { left: 'toll', by: 'chain', kind: 'weave', schools: ['umbral', 'storm'] },
  thundercloud: { left: 'steam', by: 'storm', kind: 'chain', schools: ['frost', 'storm'] },
  incense: { left: 'steam', by: 'hallow', kind: 'chain', schools: ['frost', 'hallow'] },
  miasma: { left: 'steam', by: 'umbral', kind: 'chain', schools: ['frost', 'umbral'] },
  blackMelt: { left: 'blackice', by: 'ember', kind: 'chain', schools: ['umbral', 'ember'] },
  hailburst: { left: 'overload', by: 'frost', kind: 'chain', schools: ['storm', 'frost'] },
  moltenGlass: { left: 'shards', by: 'ember', kind: 'chain', schools: ['frost', 'ember'] },
  corona: { left: 'eclipse', by: 'storm', kind: 'chain', schools: ['umbral', 'storm'] },
};
export const WEAVE_IDS = Object.keys(WEAVES) as WeaveId[];

/** The weave or chain set off when `by` strikes what `left` left, if any. */
export const weaveOf = (left: Left, by: By): WeaveId | undefined => WEAVE_IDS.find(id => WEAVES[id].left === left && WEAVES[id].by === by);

/** What each spell shape leaves in the room for another to strike. */
const LEFT_BY_SHAPE: Partial<Record<SpellDef['shape'], Left>> = { wall: 'wall', placed: 'seal', zone: 'zone', orbit: 'orbit', self: 'mantle', mark: 'toll' };
/** The weaves a spell takes part in (M3.7's panels list them): what it leaves that another strikes, or what it strikes. A
    Hex Bolt is the only bolt that weaves; chains are a reaction's, not a spell's. */
export function weavesOf(def: Pick<SpellDef, 'shape' | 'school'>): WeaveId[] {
  const left = LEFT_BY_SHAPE[def.shape];
  return WEAVE_IDS.filter(id => {
    const w = WEAVES[id]; if (w.kind !== 'weave') return false;
    return w.left === left || (w.by === def.shape && (def.shape !== 'bolt' || def.school === 'umbral'));
  });
}

/** What is wrong with the table or its tuning (empty when all is well): a pair set off twice, a weave with no tuning. */
export function validateWeaves(tuning: Record<string, unknown>) {
  const out: string[] = [], seen = new Set<string>();
  for (const id of WEAVE_IDS) {
    const k = WEAVES[id].left + '+' + WEAVES[id].by;
    if (seen.has(k)) out.push(`${id}: ${k} twice`); seen.add(k);
    if (!tuning[id] || typeof tuning[id] !== 'object') out.push(`${id}: no tuning`);
  }
  for (const k of Object.keys(tuning)) if (!(WEAVE_IDS as string[]).includes(k)) out.push(`tuning for ${k}, no such weave`);
  return out;
}
