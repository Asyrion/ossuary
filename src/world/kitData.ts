/* The room kit's kinds (M3.5 step 3, the owner's ask after the proof: "visual variety"): each floor's look lists two or
   three kinds of wall, floor, wall light and brazier, weighted (`kit` in each look in data/floors.json); every room draws
   one of each on its seed, so two rooms side by side rarely match. A theme can pin a kind (its `look.kit`), and the dev
   menu can force one on the whole floor to compare. Pure: no three.js. */

export const WALL_KINDS = ['bricks', 'ashlar', 'bones', 'tide', 'rubble', 'basalt', 'beams', 'marble', 'gilded', 'tracery', 'slate', 'drystone', 'pilings'] as const;
export const FLOOR_KINDS = ['flags', 'cobbles', 'graves', 'mosaic', 'basalt', 'herringbone', 'checker', 'inlay', 'boards', 'shingle'] as const;
export const TORCH_KINDS = ['bracket', 'skull', 'candelabra', 'lantern', 'witchlight', 'brazier', 'mask', 'basket', 'sconce', 'crown', 'pole', 'cairn'] as const;
export const BRAZIER_KINDS = ['tripod', 'font', 'basket', 'column', 'plinth', 'cauldron', 'chalice', 'censer', 'boat', 'urn'] as const;
export type WallKind = (typeof WALL_KINDS)[number];
export type FloorKind = (typeof FLOOR_KINDS)[number];
export type TorchKind = (typeof TORCH_KINDS)[number];
export type BrazierKind = (typeof BRAZIER_KINDS)[number];

/** A look's kinds and how often each is drawn. */
export interface KitWeights { wall: Partial<Record<WallKind, number>>; floor: Partial<Record<FloorKind, number>>; torch: Partial<Record<TorchKind, number>>; brazier: Partial<Record<BrazierKind, number>> }
/** The kinds a room drew. */
export interface Kinds { wall: WallKind; floor: FloorKind; torch: TorchKind; brazier: BrazierKind }
export type KitPart = keyof Kinds;
export const KIT_PARTS: KitPart[] = ['wall', 'floor', 'torch', 'brazier'];
const KNOWN: Record<KitPart, readonly string[]> = { wall: WALL_KINDS, floor: FLOOR_KINDS, torch: TORCH_KINDS, brazier: BRAZIER_KINDS };

/** The kinds a look offers for one part, in the order listed. */
export const kindsOf = <P extends KitPart>(kit: KitWeights, part: P) => Object.keys(kit[part]).filter(k => (kit[part] as Record<string, number>)[k] > 0) as Kinds[P][];

/** One of each part for a room, drawn on its seed (the same room always draws the same); `force` pins any. */
export function pickKinds(kit: KitWeights, seed: number, force: Partial<Kinds> = {}): Kinds {
  let s = (seed ^ 0x5bd1e995) >>> 0;
  const R = () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = <P extends KitPart>(part: P): Kinds[P] => {
    const r = R(); // (drawn for every part, forced or not, so forcing one doesn't change the others)
    if (force[part]) return force[part]!;
    const w = kit[part] as Record<string, number>, list = kindsOf(kit, part), total = list.reduce((a, k) => a + w[k], 0);
    let x = r * total;
    for (const k of list) { x -= w[k]; if (x < 0) return k; }
    return list[list.length - 1];
  };
  return { wall: pick('wall'), floor: pick('floor'), torch: pick('torch'), brazier: pick('brazier') };
}

/** Problems with a look's kit (unknown kinds, a part with none); empty when valid. */
export function validateKit(name: string, kit: Partial<KitWeights> | undefined, full = true): string[] {
  const errs: string[] = [];
  if (!kit) return full ? [`look "${name}" has no kit`] : [];
  for (const part of KIT_PARTS) {
    const w = kit[part] as Record<string, number> | undefined;
    if (!w) { if (full) errs.push(`look "${name}": kit.${part} lists no kinds`); continue; }
    for (const [k, v] of Object.entries(w)) {
      if (!KNOWN[part].includes(k)) errs.push(`look "${name}": kit.${part} names unknown kind "${k}"`);
      if (!(v > 0)) errs.push(`look "${name}": kit.${part}.${k} needs a weight above 0`);
    }
    if (!Object.keys(w).length) errs.push(`look "${name}": kit.${part} lists no kinds`);
  }
  return errs;
}
