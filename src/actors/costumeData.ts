/* What the mage wears (M4.6, docs/M4.6-plan.md; GDD: Artifacts, Costumes and transformations): the pieces artifacts put
   on the mage's model, one per slot. Pure (no three.js): the slots, the pieces, and which of them show. The meshes are
   built and fitted in costume.ts.

   An artifact's `costume` (data/artifacts.json) names either a piece built for the body (the hood, a crown of thorns,
   manacles) or a slot where the artifact's own model is carried (a lantern at the belt, a pendant on the chest): `"belt"`;
   or `"none"`: it leaves the mage as it is (the owner, 2026-10-02: only what it is logical to wear shows, so the mage
   doesn't drown in pieces). Every focus is held in the casting hand besides, which is not a slot. */

export type CostumeSlot = 'head' | 'face' | 'shoulders' | 'back' | 'hands' | 'belt' | 'feet' | 'aura' | 'orbit' | 'offhand';
/** The slots: the GDD's seven and the feet; `orbit` (what circles the mage) and `offhand` (what the hand that doesn't cast
    holds) are Asyrion's arc's alone. */
export const COSTUME_SLOTS: readonly CostumeSlot[] = ['head', 'face', 'shoulders', 'back', 'hands', 'belt', 'feet', 'aura', 'orbit', 'offhand'];
/** Where an artifact's own model can be carried (`"costume": "belt"`), and the slot each spot fills: on a shoulder or
    hung on the chest (a pendant), on the back, at the off hand's wrist, at the hip. */
export const CARRY = { shoulder: 'shoulders', chest: 'shoulders', back: 'back', wrist: 'hands', belt: 'belt' } as const satisfies Record<string, CostumeSlot>;
export type CarrySpot = keyof typeof CARRY;

/** Every piece built for the body, by the id an artifact names in `costume`; `curse`: it has a cursed look and a cleansed
    one (a cursed artifact shows its curse until a shrine cleanses it). */
export const COSTUME_PIECES = {
  hood: { slot: 'head' }, thorns: { slot: 'head', curse: true }, halo: { slot: 'head' },
  drownedMask: { slot: 'face', curse: true }, lens: { slot: 'face' },
  stole: { slot: 'shoulders', curse: true },
  manacles: { slot: 'hands', curse: true }, frostRing: { slot: 'hands' }, band: { slot: 'hands' }, beads: { slot: 'hands' },
  boots: { slot: 'feet' },
  // M4.6's transformations' own (TRANSFORM_LOOKS): crowns of flame and ice, rime on the shoulders, marks of storm on the face
  // and spirals down the arms, wings of candle-light, a cloak of shadow and violet eyes, a floating grimoire, burning
  // footsteps, the Beastcaller's circlet of antlers, and the aura in the transformation's light (`transform`: theirs
  // alone, no artifact's `costume`)
  antlers: { slot: 'head', transform: true },
  flameCrown: { slot: 'head', transform: true }, iceCrown: { slot: 'head', transform: true }, rimeMantle: { slot: 'shoulders', transform: true },
  stormMarks: { slot: 'face', transform: true }, stormSpirals: { slot: 'hands', transform: true }, lightWings: { slot: 'back', transform: true },
  shadowCloak: { slot: 'back', transform: true }, shadowEyes: { slot: 'face', transform: true }, grimoire: { slot: 'back', transform: true },
  emberSteps: { slot: 'feet', transform: true }, aura: { slot: 'aura', transform: true },
  // M5's Alchemist: a bandolier of vials across the chest, a stained apron at the waist
  bandolier: { slot: 'shoulders', transform: true }, apron: { slot: 'belt', transform: true },
  // Asyrion's arc (ARC_PIECES): the chaos mage's bronze-worked bracers, a dark coat's collar and shoulders, red rune orbs in
  // gold rings, and a flame in the off hand with arcs of wind (`arc`: theirs alone)
  bracers: { slot: 'hands', arc: true }, chaosCollar: { slot: 'shoulders', arc: true }, runeOrbs: { slot: 'orbit', arc: true }, chaosFlame: { slot: 'offhand', arc: true },
} as const satisfies Record<string, { slot: CostumeSlot; curse?: true; transform?: true; arc?: true }>;
export type CostumeId = keyof typeof COSTUME_PIECES;

export const isPiece = (id: string): id is CostumeId => id in COSTUME_PIECES;
export const isCarry = (id: string): id is CarrySpot => id in CARRY;
/** `costume: "none"`: the artifact leaves the mage as it is. */
export const NO_COSTUME = 'none';
/** The artifacts that wear nothing because they already show round the mage, and what shows instead. Every other
    artifact has a `costume` (a piece, a spot, or `"none"`) or is a focus (held in the casting hand): a new artifact
    decides, and the validator (`validateArtifacts`) refuses one that hasn't (the owner's ask, 2026-10-01; since
    2026-10-02 a piece only where it is logical to wear the thing: clothes, jewellery, what hangs at a belt). */
export const SHOWS_OTHERWISE: Readonly<Record<string, string>> = {
  candle_moth: 'the moth fluttering round the mage',
  weeping_skull: 'the skull circling the mage',
  fennex_rune: "Fen-Nex at the mage's heel",
  twin_vigil_candles: 'the two flames at the shoulders',
  salt_circle: 'the ring of salt at the feet',
};

/** Whether an artifact's `costume` names something it can wear (not a transformation's own piece, nor `"none"`). */
export const isCostume = (id: string) => (isPiece(id) && !('transform' in COSTUME_PIECES[id]) && !('arc' in COSTUME_PIECES[id])) || isCarry(id);
/** The slot a `costume` fills. */
export const slotOf = (costume: string): CostumeSlot => isPiece(costume) ? COSTUME_PIECES[costume].slot : CARRY[costume as CarrySpot];

/** A piece worn: in `slot`, from artifact `from` (or from transformation `from`, `transform` set); `piece` is the piece
    built for the body, or `carried` (the artifact's own model, `at` where); `cursed` while a cursed artifact is
    uncleansed, `cleansed` once a shrine has cleansed it. */
export interface Worn { slot: CostumeSlot; piece: CostumeId | 'carried'; at?: CarrySpot; from: string; cursed: boolean; cleansed: boolean; transform?: true; arc?: true }

/** Asyrion's arc (M4.6; GDD: Artifacts, Asyrion's arc): the chaos mage's pieces each stage brings, in the slots no artifact
    or transformation holds. */
export const ARC_PIECES: readonly (readonly CostumeId[])[] = [['bracers'], ['chaosCollar'], ['runeOrbs'], ['chaosFlame']];
/** The arc's stage for `held` artifacts: how many of the thresholds `at` (CFG.arc.at) it has reached. */
export const arcStage = (held: number, at: readonly number[]) => at.filter(n => held >= n).length;

/** What each transformation's look puts on (M4.6; docs/M4.6-plan.md, The transformations): pieces built for it, or an
    artifact's own model carried somewhere (the Pilgrim's lantern). Over what the artifacts show in those slots. */
export const TRANSFORM_LOOKS: Record<string, readonly (CostumeId | { at: CarrySpot; from: string })[]> = {
  pyromancer: ['flameCrown', 'emberSteps', 'aura'],
  frostborn: ['iceCrown', 'rimeMantle', 'aura'],
  stormcaller: ['stormMarks', 'stormSpirals', 'aura'],
  lightbearer: ['halo', 'lightWings', 'aura'],
  shadowstep: ['shadowCloak', 'shadowEyes', 'aura'],
  runescribe: ['grimoire', 'aura'],
  pilgrim: ['hood', 'boots', { at: 'belt', from: 'grave_lantern' }, 'aura'],
  beastcaller: ['antlers', 'aura'],
  alchemist: ['bandolier', 'apron', 'aura'],
};

/** What shows for what the mage holds, in pickup order: the arc's pieces up to stage `arc` where nothing else is worn; one
    piece per slot, the one taken last winning it (a crown taken after the hood replaces the hood); then the look of
    transformation `look` (the latest formed) over them. */
export function wornLooks(held: readonly { id: string; costume?: string; kind?: string }[], cleansed: readonly string[] = [], look?: string, arc = 0): Worn[] {
  const bySlot = new Map<CostumeSlot, Worn>();
  for (const p of ARC_PIECES.slice(0, arc).flat()) bySlot.set(COSTUME_PIECES[p].slot, { slot: COSTUME_PIECES[p].slot, piece: p, from: 'arc', cursed: false, cleansed: false, arc: true });
  for (const a of held) {
    if (!a.costume || !isCostume(a.costume)) continue;
    const wasCleansed = cleansed.includes(a.id);
    const piece = isPiece(a.costume) ? a.costume : 'carried';
    bySlot.set(slotOf(a.costume), { slot: slotOf(a.costume), piece, ...(piece === 'carried' && { at: a.costume as CarrySpot }), from: a.id, cursed: a.kind === 'cursed' && !wasCleansed, cleansed: wasCleansed });
  }
  for (const p of (look && TRANSFORM_LOOKS[look]) || []) {
    if (typeof p === 'string') bySlot.set(COSTUME_PIECES[p].slot, { slot: COSTUME_PIECES[p].slot, piece: p, from: look!, cursed: false, cleansed: false, transform: true });
    else bySlot.set(CARRY[p.at], { slot: CARRY[p.at], piece: 'carried', at: p.at, from: p.from, cursed: false, cleansed: false, transform: true });
  }
  return COSTUME_SLOTS.flatMap(s => bySlot.get(s) ?? []);
}

/** The pieces worn, as ids (for the tests and the dev hooks): a built piece's id, or the carrying artifact's. */
export const wornIds = (worn: readonly Worn[]) => worn.map(w => w.piece === 'carried' ? w.from : w.piece);

/** The old shape of the rule, from a list of `costume` values alone (kept for the artifacts' tests): built pieces only. */
export function wornPieces(costumes: readonly (string | undefined)[]): CostumeId[] {
  return wornLooks(costumes.map((c, i) => ({ id: String(i), costume: c }))).flatMap(w => w.piece === 'carried' ? [] : [w.piece]);
}
