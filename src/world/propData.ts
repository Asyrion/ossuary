/* The rooms' objects (M3.6: docs/M3.6-plan.md, decision 4): what each is in a template and how it behaves. Pure (no
   three.js): the template parser, the validator, the loot simulation and props.ts (their looks and behaviour) all use it.

   Each object blocks in one of three ways:
     tall  blocks walking and bolts, as a rock does (flyers pass over it);
     low   blocks walking; bolts and foes' shots fly over it, unless it breaks to a bolt, which then stops the bolt;
     soft  can be walked into, and does something to whoever stands in it (slows, hurts);
     hanging  hangs above the floor (a censer on its chain): walked under, and only a bolt reaches it. */
import type { TableName } from '../items/loot';

export type PropKind = 'bones' | 'skulls' | 'sacks' | 'cask' | 'rubble' | 'roots' | 'briar' | 'web' | 'glowcap' | 'pew' | 'desk' | 'scrolls'
  | MechanismKind;
/** The mechanisms (M3.6 step 4, world/mechanisms.ts): objects that answer to magic with more than breaking or burning. */
export type MechanismKind = 'brazier' | 'candles' | 'bell' | 'rune' | 'lodestone' | 'censer' | 'reliquary' | 'tree';
export type PropClass = 'tall' | 'low' | 'soft' | 'hanging';

export interface PropDef {
  /** The template letter. */ char: string;
  class: PropClass;
  /** Bolts it takes to break (0: bolts don't break it); a glyph's blast breaks it, if `blast`. */ hits: number; blast: boolean;
  /** Fire burns it away (and it spreads to what burns beside it). */ burns: boolean;
  /** What it leaves behind when it breaks (data/loot.json). */ loot?: TableName;
}

export const PROPS: Record<PropKind, PropDef> = {
  bones: { char: 'b', class: 'low', hits: 1, blast: true, burns: false, loot: 'remains' },
  skulls: { char: 'k', class: 'low', hits: 2, blast: true, burns: false, loot: 'remains' },
  sacks: { char: 's', class: 'low', hits: 1, blast: true, burns: true, loot: 'bundle' },
  cask: { char: 'c', class: 'tall', hits: 1, blast: true, burns: false },
  rubble: { char: 'r', class: 'low', hits: 0, blast: true, burns: false },
  roots: { char: 't', class: 'tall', hits: 0, blast: false, burns: true },
  briar: { char: 'v', class: 'soft', hits: 0, blast: true, burns: true },
  web: { char: ':', class: 'soft', hits: 0, blast: true, burns: true },
  glowcap: { char: 'g', class: 'low', hits: 1, blast: true, burns: false },
  pew: { char: 'p', class: 'low', hits: 0, blast: false, burns: false },
  desk: { char: 'd', class: 'low', hits: 0, blast: false, burns: true },
  scrolls: { char: 'e', class: 'low', hits: 1, blast: true, burns: true, loot: 'remains' },
  // mechanisms (world/mechanisms.ts)
  brazier: { char: 'f', class: 'low', hits: 0, blast: false, burns: false },
  candles: { char: 'l', class: 'low', hits: 0, blast: true, burns: false },
  bell: { char: 'a', class: 'tall', hits: 0, blast: false, burns: false },
  rune: { char: 'n', class: 'tall', hits: 0, blast: false, burns: false },
  lodestone: { char: 'y', class: 'tall', hits: 0, blast: false, burns: false },
  censer: { char: '*', class: 'hanging', hits: 0, blast: false, burns: false },
  reliquary: { char: 'q', class: 'tall', hits: 0, blast: false, burns: false },
  tree: { char: 'T', class: 'tall', hits: 0, blast: false, burns: true },
};
export const PROP_KINDS = Object.keys(PROPS) as PropKind[];
export const PROP_OF_CHAR: Record<string, PropKind> = Object.fromEntries(PROP_KINDS.map(k => [PROPS[k].char, k]));
export const isProp = (tile: string): tile is PropKind => tile in PROPS;
export const MECHANISMS: MechanismKind[] = ['brazier', 'candles', 'bell', 'rune', 'lodestone', 'censer', 'reliquary', 'tree'];
export const isMechanism = (k: string): k is MechanismKind => (MECHANISMS as string[]).includes(k);
