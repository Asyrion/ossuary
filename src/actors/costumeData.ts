/* What the mage wears (M4.6, docs/M4.6-plan.md; GDD: Artifacts, Costumes and transformations): the pieces artifacts put
   on the mage's model, one per slot. Pure (no three.js): the slots, the pieces, and which of them show. The meshes are
   built and fitted in costume.ts.

   An artifact's `costume` (data/artifacts.json) names either a piece built for the body (the hood, a crown of thorns,
   manacles) or a slot where the artifact's own model is carried (a lantern at the belt, a sigil on the back): `"belt"`.
   Every focus is held in the casting hand besides, which is not a slot. */

export type CostumeSlot = 'head' | 'face' | 'shoulders' | 'back' | 'hands' | 'belt' | 'feet' | 'aura';
export const COSTUME_SLOTS: readonly CostumeSlot[] = ['head', 'face', 'shoulders', 'back', 'hands', 'belt', 'feet', 'aura'];
/** Where an artifact's own model can be carried (`"costume": "belt"`), and the slot each spot fills: on a shoulder or
    hung on the chest (a pendant), on the back, at the off hand's wrist, at the hip. */
export const CARRY = { shoulder: 'shoulders', chest: 'shoulders', back: 'back', wrist: 'hands', belt: 'belt' } as const satisfies Record<string, CostumeSlot>;
export type CarrySpot = keyof typeof CARRY;

/** Every piece built for the body, by the id an artifact names in `costume`; `curse`: it has a cursed look and a cleansed
    one (a cursed artifact shows its curse until a shrine cleanses it). */
export const COSTUME_PIECES = {
  hood: { slot: 'head' }, thorns: { slot: 'head', curse: true }, halo: { slot: 'head' }, antlers: { slot: 'head' },
  drownedMask: { slot: 'face', curse: true }, lens: { slot: 'face' }, thirdEye: { slot: 'face' },
  feathers: { slot: 'shoulders' }, stole: { slot: 'shoulders', curse: true },
  manacles: { slot: 'hands', curse: true }, frostRing: { slot: 'hands' }, band: { slot: 'hands' }, beads: { slot: 'hands' }, knot: { slot: 'hands' },
  boots: { slot: 'feet' },
} as const satisfies Record<string, { slot: CostumeSlot; curse?: true }>;
export type CostumeId = keyof typeof COSTUME_PIECES;

export const isPiece = (id: string): id is CostumeId => id in COSTUME_PIECES;
export const isCarry = (id: string): id is CarrySpot => id in CARRY;
/** Whether an artifact's `costume` names something it can wear. */
export const isCostume = (id: string) => isPiece(id) || isCarry(id);
/** The slot a `costume` fills. */
export const slotOf = (costume: string): CostumeSlot => isPiece(costume) ? COSTUME_PIECES[costume].slot : CARRY[costume as CarrySpot];

/** A piece worn: in `slot`, from artifact `from`; `piece` is the piece built for the body, or `carried` (the artifact's own
    model, `at` where); `cursed` while a cursed artifact is uncleansed, `cleansed` once a shrine has cleansed it. */
export interface Worn { slot: CostumeSlot; piece: CostumeId | 'carried'; at?: CarrySpot; from: string; cursed: boolean; cleansed: boolean }

/** What shows for what the mage holds, in pickup order: one piece per slot, the one taken last winning it (a crown taken
    after the hood replaces the hood). */
export function wornLooks(held: readonly { id: string; costume?: string; kind?: string }[], cleansed: readonly string[] = []): Worn[] {
  const bySlot = new Map<CostumeSlot, Worn>();
  for (const a of held) {
    if (!a.costume || !isCostume(a.costume)) continue;
    const wasCleansed = cleansed.includes(a.id);
    const piece = isPiece(a.costume) ? a.costume : 'carried';
    bySlot.set(slotOf(a.costume), { slot: slotOf(a.costume), piece, ...(piece === 'carried' && { at: a.costume as CarrySpot }), from: a.id, cursed: a.kind === 'cursed' && !wasCleansed, cleansed: wasCleansed });
  }
  return COSTUME_SLOTS.flatMap(s => bySlot.get(s) ?? []);
}

/** The pieces worn, as ids (for the tests and the dev hooks): a built piece's id, or the carrying artifact's. */
export const wornIds = (worn: readonly Worn[]) => worn.map(w => w.piece === 'carried' ? w.from : w.piece);

/** The old shape of the rule, from a list of `costume` values alone (kept for the artifacts' tests): built pieces only. */
export function wornPieces(costumes: readonly (string | undefined)[]): CostumeId[] {
  return wornLooks(costumes.map((c, i) => ({ id: String(i), costume: c }))).flatMap(w => w.piece === 'carried' ? [] : [w.piece]);
}
