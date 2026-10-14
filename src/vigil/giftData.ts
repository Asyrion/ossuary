/* What the townspeople give (docs/M7-plan.md, decisions 7, 11 and 12), as data (data/townsfolk.json): each
   one's gift when freed and its second gift once its bond is deepened in full (obols laid on its eyes, `bonds`: the obols
   for each step), the six powers (each a townsperson's, bought once with Arcane Dust), the three quests, and the six
   disciplines (loadouts: a starting spell and focus; the Great Circle offers them). Pure: the shape, what a
   run begins with from all of it (`startOf`), a quest's goal checked on the save (`questMet`), and the checks. */
import data from '../../data/townsfolk.json';

/** What a run begins with (summed over every gift, quest and power that gives it). */
export interface Start {
  reagents?: number;
  keys?: number;
  glyphs?: number;
  coins?: number;
  potions?: number;
  runes?: number;
  page?: number;
  /** A soul mote of this kind (the last given wins). */ souls?: 'pale' | 'black' | 'hallowed';
  /** The first floor's map known. */ map?: number;
  /** Powers: more maximum mana, heart containers, a second socket on the first slot. */ maxMana?: number;
  hearts?: number;
  socket?: number;
}
export interface Gift {
  discipline?: string;
  learn?: string[];
  pool?: string[];
  recipes?: string[];
  start?: Start;
}
export interface PowerDef {
  id: string;
  by: string;
  dust: number;
  start: Start;
}
export interface QuestDef {
  id: string;
  by: string;
  goal: { carried?: string; reactions?: number; deepest?: number };
  reward: Gift;
}
export interface Discipline {
  id: string;
  school: string;
  spell: string;
  focus: string;
  by?: string;
}
/** What a townsperson's candle lit in the chapel gives the one descent it burns for: a small step on the
    mage's numbers (`bonus`, folded in with the attributes', artifacts.ts's `growth`), or what the descent begins with. */
export interface Blessing {
  bonus?: Partial<Record<BlessKey, number>>;
  start?: Start;
}
export const BLESS_KEYS = ['spellDamageMul', 'regenMul', 'speedMul', 'fireDelayMul', 'mana', 'heartHalves'] as const;
export type BlessKey = (typeof BLESS_KEYS)[number];
export interface Townsfolk {
  bonds: number[];
  disciplines: Discipline[];
  powers: PowerDef[];
  quests: QuestDef[];
  folk: Record<string, { gift: Gift; second: Gift; blessing: Blessing }>;
}
export const TOWNSFOLK = data as unknown as Townsfolk;

export const folkOf = (id: string) => TOWNSFOLK.folk[id];
/** The blessing of `id`'s candle (none for no one). */
export const blessingOf = (id: string | null | undefined): Blessing => (id && TOWNSFOLK.folk[id]?.blessing) || {};
/** A blessing's step on the mage's numbers, folded into the attributes' (a multiplier multiplied, a count added). */
export function blessBonus<T extends Record<BlessKey, number>>(b: Blessing, onto: T): T {
  const out = { ...onto };
  for (const [k, v] of Object.entries(b.bonus ?? {}) as [BlessKey, number][])
    (out as Record<BlessKey, number>)[k] = k.endsWith('Mul') ? out[k] * v : out[k] + v;
  return out;
}
export const powerOf = (by: string) => TOWNSFOLK.powers.find((p) => p.by === by);
export const power = (id: string) => TOWNSFOLK.powers.find((p) => p.id === id);
export const questOf = (by: string) => TOWNSFOLK.quests.find((q) => q.by === by);
/** The obols a bond's next step costs (null once it is whole). */
export const bondCost = (bond: number, T: Townsfolk = TOWNSFOLK) => T.bonds[bond] ?? null;
export const BOND_MAX = TOWNSFOLK.bonds.length;
/** The disciplines open: the Pyromancer's, and each freed townsperson's. */
export const disciplinesOpen = (freed: readonly string[], T: Townsfolk = TOWNSFOLK) =>
  T.disciplines.filter((d) => !d.by || freed.includes(d.by)).map((d) => d.id);

/** What the save says of the townspeople, for the sums below. */
export interface FolkState {
  freed: readonly string[];
  bonds: Readonly<Record<string, number>>;
  powers: readonly string[];
  flags: Readonly<Record<string, unknown>>;
}
/** Every gift in force: each freed one's first, its second once its bond is whole, each quest done. */
export function giftsInForce(s: FolkState, T: Townsfolk = TOWNSFOLK): Gift[] {
  const out: Gift[] = [];
  for (const id of s.freed) {
    const f = T.folk[id];
    if (!f) continue;
    out.push(f.gift);
    if ((s.bonds[id] ?? 0) >= T.bonds.length) out.push(f.second);
  }
  for (const q of T.quests) if (s.flags['quest.' + q.by] === 'done') out.push(q.reward);
  return out;
}
/** What a run begins with: the gifts in force and the powers owned, added up. */
export function startOf(s: FolkState, T: Townsfolk = TOWNSFOLK): Start {
  const out: Start = {};
  const add = (st?: Start) => {
    for (const [k, v] of Object.entries(st ?? {}) as [keyof Start, Start[keyof Start]][]) {
      if (k === 'souls') out.souls = v as Start['souls'];
      else (out as Record<string, number>)[k] = ((out as Record<string, number>)[k] ?? 0) + (v as number);
    }
  };
  for (const g of giftsInForce(s, T)) add(g.start);
  for (const p of T.powers) if (s.powers.includes(p.id)) add(p.start);
  return out;
}

/** Whether a quest's goal is met: its artifact carried at a run's end, reactions found since it was given, or a depth
    reached, each in the runs since it was given (`since`: the runs then; `base`: the reactions found then). */
export function questMet(
  q: QuestDef,
  save: {
    runs: number;
    echoes: readonly { carried: readonly string[]; floor: number }[];
    reactions: readonly string[];
  },
  since: number,
  base: number,
) {
  const after = save.echoes.slice(0, Math.max(0, save.runs - since));
  if (q.goal.carried) return after.some((r) => r.carried.includes(q.goal.carried!));
  if (q.goal.reactions !== undefined) return save.reactions.length - base >= q.goal.reactions;
  if (q.goal.deepest !== undefined) return after.some((r) => r.floor >= q.goal.deepest!);
  return false;
}

/** The ids the checks need: the townspeople, spells, potions, artifacts (and which are foci), schools. */
export interface GiftKnown {
  folk: string[];
  spells: string[];
  potions: string[];
  artifacts: string[];
  foci: string[];
  schools: string[];
}
/** What is wrong with the gifts, if anything. */
export function validateTownsfolk(T: Townsfolk, k: GiftKnown): string[] {
  const errs: string[] = [];
  for (const id of k.folk) if (!T.folk[id]) errs.push(`no gifts for ${id}`);
  const gift = (at: string, g: Gift) => {
    if (g.discipline && !T.disciplines.some((d) => d.id === g.discipline))
      errs.push(`${at}: no discipline ${g.discipline}`);
    for (const s of [...(g.learn ?? []), ...(g.pool ?? [])])
      if (!k.spells.includes(s)) errs.push(`${at}: no spell ${s}`);
    for (const p of g.recipes ?? []) if (!k.potions.includes(p)) errs.push(`${at}: no potion ${p}`);
    for (const [key, v] of Object.entries(g.start ?? {}))
      if (key !== 'souls' && !(typeof v === 'number' && v > 0)) errs.push(`${at}: start ${key} isn't a count`);
  };
  for (const [id, f] of Object.entries(T.folk)) {
    if (!k.folk.includes(id)) errs.push(`gifts for ${id}, who is no townsperson`);
    gift(`${id}'s gift`, f.gift);
    gift(`${id}'s second gift`, f.second);
  }
  for (const [id, f] of Object.entries(T.folk)) {
    // (each one's candle blesses one descent, a little)
    const b = f.blessing;
    if (!b || (!b.bonus && !b.start)) {
      errs.push(`${id}: no blessing`);
      continue;
    }
    for (const [k, v] of Object.entries(b.bonus ?? {})) {
      if (!(BLESS_KEYS as readonly string[]).includes(k)) errs.push(`${id}'s blessing: no ${k}`);
      else if (k.endsWith('Mul') ? !(v >= 0.8 && v <= 1.3 && v !== 1) : !(v > 0 && v <= 10))
        errs.push(`${id}'s blessing: ${k} ${v} is no small step`);
    }
    gift(`${id}'s blessing`, { start: b.start });
  }
  if (T.powers.length !== 6) errs.push('six powers');
  for (const p of T.powers) {
    if (!k.folk.includes(p.by)) errs.push(`power ${p.id}: no townsperson ${p.by}`);
    if (!(p.dust >= 100 && p.dust <= 200)) errs.push(`power ${p.id}: 100 to 200 Dust`);
    if (T.powers.filter((o) => o.by === p.by).length > 1) errs.push(`${p.by} gives more than one power`);
    gift(`power ${p.id}`, { start: p.start });
  }
  for (const q of T.quests) {
    if (!k.folk.includes(q.by)) errs.push(`quest ${q.id}: no townsperson ${q.by}`);
    if (q.goal.carried && !k.artifacts.includes(q.goal.carried))
      errs.push(`quest ${q.id}: no artifact ${q.goal.carried}`);
    if (Object.keys(q.goal).length !== 1) errs.push(`quest ${q.id}: one goal`);
    gift(`quest ${q.id}'s reward`, q.reward);
  }
  if (T.quests.length !== 3) errs.push('three quests');
  const schools = new Set<string>();
  for (const d of T.disciplines) {
    if (!k.spells.includes(d.spell)) errs.push(`discipline ${d.id}: no spell ${d.spell}`);
    if (!k.foci.includes(d.focus)) errs.push(`discipline ${d.id}: ${d.focus} is no focus`);
    if (!k.schools.includes(d.school)) errs.push(`discipline ${d.id}: no school ${d.school}`);
    if (d.by && !k.folk.includes(d.by)) errs.push(`discipline ${d.id}: no townsperson ${d.by}`);
    schools.add(d.school);
  }
  if (schools.size !== T.disciplines.length) errs.push('one discipline a school');
  if (!T.disciplines.some((d) => !d.by)) errs.push('one discipline open from the start');
  if (!(T.bonds.length >= 1 && T.bonds.every((b, i) => b > 0 && (i === 0 || b > T.bonds[i - 1]))))
    errs.push('bonds cost more at each step');
  return errs;
}
