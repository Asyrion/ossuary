/* What the mage wears: pieces that artifacts put on the mage's model, one per slot (docs/ideas.md: Costumes).
   Pure (no three.js): the pieces and which of them show. The meshes are built and fitted in costume.ts. */

export type CostumeSlot = 'head' | 'shoulders' | 'back' | 'hands' | 'aura';
export const COSTUME_SLOTS: readonly CostumeSlot[] = ['head', 'shoulders', 'back', 'hands', 'aura'];

/** Every piece, by the id an artifact names in `costume`. */
export const COSTUME_PIECES = {
  hood: { slot: 'head' },
} as const satisfies Record<string, { slot: CostumeSlot }>;
export type CostumeId = keyof typeof COSTUME_PIECES;

export const isCostume = (id: string): id is CostumeId => id in COSTUME_PIECES;

/** The pieces worn for what the mage holds, in pickup order: one per slot, and the one taken last wins it
    (a crown taken after the hood would replace the hood). */
export function wornPieces(costumes: readonly (string | undefined)[]): CostumeId[] {
  const bySlot = new Map<CostumeSlot, CostumeId>();
  for (const id of costumes) if (id && isCostume(id)) bySlot.set(COSTUME_PIECES[id].slot, id);
  return COSTUME_SLOTS.flatMap(s => bySlot.get(s) ?? []);
}
