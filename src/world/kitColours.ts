/* A floor's own colours for the room kit's shared materials (`MAT`, kitParts.ts) and the objects' colour table (`C`,
   objectLooks.ts): `materials` in a floor's look names the ones it changes, by key (art bible 4.1: floor 1's wood, iron,
   bronze, bone and verdigris in its ramps); the rest keep the kit's own. A name in both changes both. Set before the
   floor's rooms are built: a piece's colour is painted into its vertices when its still parts are merged. */
import type * as THREE from 'three';
import type { FloorLook, ItemTones } from '../types';
import { MAT } from './kitParts';
import { C } from './objectLooks';

const mats = MAT as Record<string, THREE.Material & { color?: THREE.Color }>;
const matOwn = new Map(
  Object.entries(mats)
    .filter(([, m]) => m.color)
    .map(([k, m]) => [k, m.color!.getHex()]),
);
const table = C as Record<string, number>;
const tableOwn = { ...table };
const hex = (c: string) => parseInt(c.slice(1), 16);

let tones: ItemTones = {};
/** The floor's own tones for the things lying on it (`items` in its look): set with its colours, empty where it names
    none. */
export const itemTones = (): Readonly<ItemTones> => tones;

/** Paint the kit's shared materials and the objects' colours in a floor's `materials` (the kit's own where it names none). */
export function applyKitColours(look: FloorLook) {
  const want = look.materials ?? {};
  tones = look.items ?? {};
  for (const k of Object.keys(want))
    if (!matOwn.has(k) && !(k in tableOwn))
      console.error(`floor look "${look.name}": materials names unknown colour "${k}"`); // (a browser test fails on it)
  for (const [k, own] of matOwn) mats[k].color!.setHex(want[k] ? hex(want[k]) : own);
  for (const k of Object.keys(tableOwn)) table[k] = want[k] ? hex(want[k]) : tableOwn[k];
}
