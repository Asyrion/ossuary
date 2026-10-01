/* Champion mantles (M4.7, docs/M4.7-plan.md; GDD: Depth for what's built), as rules on plain data: pure (no three.js),
   shared by the game (actors/mantles.ts) and the unit tests. A champion wears the mantle of one school, drawn from its
   floor's weights (`mantles` in data/floors.json); tuning in data/magic.json (`mantles`, `unbound`).

   Kindled (Ember): leaves burning ground where it goes, and can't burn.
   Rimebound (Frost): its touch and its shots chill the mage, and it can't be chilled.
   Stormcharged (Storm): struck, it throws a spark under the mage.
   Hallowed (Hallow): mends the foes round it a little each second (not while it is itself sanctified).
   Hexbound (Umbral): its shots drain mana, and as it falls it curses the ground round it: a ring that drains the mage's
     mana if it is still inside when the ring closes.
   The status of the school that strips it (`stripBy`) takes the mantle off: "Unbound!", and the champion is stunned and
   takes more from every blow for a while. */
import { MAGIC, type MagicTuning } from '../magic/status';
import { SCHOOLS, type School, type SpellStatus } from '../magic/spellData';
import { schoolOf } from './foeData';

export type MantleId = keyof MagicTuning['mantles'];
export const MANTLE_IDS = Object.keys(MAGIC.mantles) as MantleId[];
const STATUSES: readonly SpellStatus[] = ['burn', 'chill', 'shock', 'sanct', 'hex', 'root'];

/** The school a mantle is of (its light, its colour in the champion). */
export const mantleSchool = (id: MantleId, T: MagicTuning = MAGIC) => T.mantles[id].school as School;
/** Whether a status of `kind` landing takes mantle `id` off (it is of the school that strips it). */
export const stripsMantle = (id: MantleId, kind: SpellStatus, T: MagicTuning = MAGIC) => schoolOf({ [kind]: 1 }) === T.mantles[id].stripBy;
/** Whether mantle `id` keeps a status of `kind` off the champion. */
export const mantleImmune = (id: MantleId, kind: SpellStatus, T: MagicTuning = MAGIC) => (T.mantles[id] as { immune?: string }).immune === kind;

/** A mantle drawn by `weights` (a floor's), `roll` from 0 to 1; none when the weights name none. */
export function pickMantle(weights: Partial<Record<string, number>> | undefined, roll: number): MantleId | undefined {
  const list = MANTLE_IDS.map(id => [id, Math.max(0, weights?.[id] ?? 0)] as const).filter(([, w]) => w > 0);
  const total = list.reduce((a, [, w]) => a + w, 0);
  if (!total) return undefined;
  let r = roll * total;
  for (const [id, w] of list) { if ((r -= w) < 0) return id; }
  return list[list.length - 1][0];
}

/** What is wrong with the mantles' tuning, and with the floors' weights for them (empty when all is well). */
export function validateMantles(T: MagicTuning = MAGIC, floors: readonly { mantles?: Partial<Record<string, number>> }[] = []) {
  const out: string[] = [];
  for (const id of MANTLE_IDS) {
    const m = T.mantles[id] as { school: string; stripBy: string; immune?: string };
    if (!SCHOOLS.includes(m.school as School)) out.push(`${id}: school ${m.school}`);
    if (!SCHOOLS.includes(m.stripBy as School)) out.push(`${id}: stripBy ${m.stripBy}`);
    if (m.stripBy === m.school) out.push(`${id}: stripped by its own school`);
    if (m.immune !== undefined && !STATUSES.includes(m.immune as SpellStatus)) out.push(`${id}: immune ${m.immune}`);
    if (m.immune !== undefined && schoolOf({ [m.immune]: 1 }) === m.stripBy) out.push(`${id}: immune to what strips it`);
  }
  floors.forEach((f, i) => { for (const [k, w] of Object.entries(f.mantles ?? {})) if (!(MANTLE_IDS as string[]).includes(k) || !((w ?? 0) >= 0)) out.push(`floor ${i + 1}: mantle ${k} ${w}`); });
  return out;
}
