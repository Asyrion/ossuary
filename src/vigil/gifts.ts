/* The townspeople's gifts at work (M7 step 8; docs/M7-plan.md, decisions 7, 11 and 12; the data and sums in giftData.ts).
   - **Freed** (`giftOnFree`, from shades.ts): its gift now: a discipline opened, spells learned (to hold at the lectern),
     spells into the libraries' pools, recipes learned; what it gives every descent from then on; its power to ask for.
   - **Every descent** (`giftsAtStart`, from flow.ts's `startGame` once the first floor is built): what the gifts in force,
     the quests done and the powers owned give, said in one line (nothing silent); M7 step 9: the candle lit in the chapel
     (its blessing, for this descent alone) and the garden's reagent. The powers' mana and hearts are folded
     into the mage's numbers (artifacts.ts's `growth`, from giftData's `startOf`).
   - **At the Vigil** (vigil/town.ts, ui/talk.ts): each talk ends with what can be offered: obols laid on its eyes (5, then
     15: a memory each time, the second gift with the last) and its power, for Arcane Dust. A quest is given once the bond
     has begun, and done when its goal is met in the runs since (`questState`). */
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { Rng } from '../rng';
import { line, renderMinimap } from '../ui/hud';
import { giveResources } from '../items/pickups';
import { addPotion, addReagent } from '../items/potions';
import {
  POTIONS,
  POTION_IDS,
  RECIPES,
  REAGENTS,
  REAGENT_IDS,
  pickPotion,
  type PotionId,
  type ReagentId,
} from '../items/alchemyData';
import { learnRecipe } from '../items/alchemyMemory';
import { gainSoul } from '../items/souls';
import { addRune, dealRune, setSockets } from '../magic/runes';
import { learnedSpell } from '../magic/memory';
import { spell } from '../magic/spellData';
import { dropPage } from '../magic/pages';
import { refreshStats } from '../items/artifacts';
import { setBond, setFlag, setPower, spend, takeBlessing, vigil } from './save';
import {
  BOND_MAX,
  TOWNSFOLK,
  blessingOf,
  bondCost,
  folkOf,
  powerOf,
  questMet,
  questOf,
  startOf,
  type Gift,
  type Start,
} from './giftData';
import type { Picked } from './dialogueData';
import { DIALOGUE, lineAfter } from './dialogueData';

const S = () => STR.gifts;
const nameOf = (id: string) => STR.shades.names[id] ?? id;
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1));
const state = () => {
  const v = vigil();
  return { freed: v.freed, bonds: v.bonds, powers: v.powers, flags: v.flags };
};

/** A start in words ("a reagent and 5 obols"). */
export function startWords(st: Start) {
  return Object.entries(st)
    .map(([k, v]) => (S().start[k] as (n: unknown) => string)?.(v))
    .filter(Boolean) as string[];
}
/** A gift in words: what it opens now, and what it gives every descent. */
export function giftWords(g: Gift, by?: string) {
  const out: string[] = [];
  if (g.discipline) out.push(S().discipline(S().disciplines[g.discipline] ?? g.discipline));
  if (g.learn?.length) out.push(S().learn(list(g.learn.map((id) => spell(id).name))));
  if (g.pool?.length) out.push(S().pool(list(g.pool.map((id) => spell(id).name))));
  if (g.recipes?.length) out.push(S().recipes(list(g.recipes.map((id) => POTIONS[id as PotionId]?.name ?? id))));
  if (g.start) out.push(S().each(list(startWords(g.start))));
  const p = by ? powerOf(by) : undefined;
  if (p) out.push(S().power(S().powers[p.id][0]));
  return out;
}

/** What a gift opens at once: its spells learned, its recipes. */
function openGift(g: Gift) {
  for (const id of g.learn ?? []) learnedSpell(id);
  for (const p of g.recipes ?? []) {
    const r = RECIPES.find((x) => x.makes === p);
    if (r) learnRecipe(r.of[0], r.of[1], r.makes);
  }
}

/** A shade freed (shades.ts): its gift, at once, and a line saying what it gives. */
export function giftOnFree(id: string) {
  const f = folkOf(id);
  if (!f) return;
  openGift(f.gift);
  const words = giftWords(f.gift, id);
  line(S().freed(nameOf(id), list(words.length ? words : [S().nothing])), 6);
}

/** M7 step 9: a candle's blessing in words ("your spells a tenth harder", "2 glyphs"). */
export function blessingWords(id: string) {
  const b = blessingOf(id),
    W = S().bless as Record<string, (v: number) => string>;
  return list([...Object.entries(b.bonus ?? {}).map(([k, v]) => W[k]?.(v) ?? k), ...startWords(b.start ?? {})]);
}

/** A descent begins (the first floor built): what the Vigil gives it, in one line: the gifts in force, the powers, the
    candle lit in the chapel for it (M7 step 9: its blessing, burning down with this descent) and the garden's reagent. */
export function giftsAtStart() {
  const v = vigil(),
    blessed = takeBlessing();
  G.run.blessing = blessed;
  const st: Start = { ...startOf(state()) },
    b = blessingOf(blessed);
  for (const [k, n] of Object.entries(b.start ?? {}) as [keyof Start, never][])
    (st as Record<string, unknown>)[k] =
      typeof n === 'number' ? ((st[k] as number | undefined) ?? 0) + (n as number) : n;
  const garden = v.garden && v.freed.includes('embalmer') ? (v.garden as ReagentId) : null;
  if (!Object.keys(st).length && !blessed && !garden) return;
  const rng = Rng.from(G.run.seed, 'vigilGifts'),
    rnd = { next: () => rng.next() };
  for (let i = 0; i < (st.reagents ?? 0); i++) addReagent(REAGENT_IDS[Math.floor(rng.next() * REAGENT_IDS.length)]);
  if (garden) addReagent(garden);
  giveResources({ keys: st.keys ?? 0, glyphs: st.glyphs ?? 0, coins: st.coins ?? 0 });
  for (let i = 0; i < (st.potions ?? 0); i++) addPotion(pickPotion(rnd, POTION_IDS));
  for (let i = 0; i < (st.runes ?? 0); i++) addRune(dealRune());
  if (st.souls) gainSoul(st.souls);
  if (st.socket && player.sockets[0].size < 2) setSockets(0, 2);
  if (st.page) dropPage(G.current, player.x, player.z - 1.4);
  if (st.map) {
    for (const r of G.rooms) r.known = true;
    renderMinimap();
  }
  if (st.maxMana || st.hearts || b.bonus) {
    refreshStats(false);
    player.hp = player.maxHp;
    player.mana = player.stats.maxMana;
  }
  const gifts = startOf(state()),
    words = [...startWords(gifts), ...(garden ? [REAGENTS[garden].name] : [])];
  if (words.length) line(S().fromVigil(list(words)), 6);
  if (blessed) line(STR.vigil.unfold.blessed(nameOf(blessed), blessingWords(blessed)), 6);
}

/* ---------- at the Vigil: the offers, the bonds, the powers, the quests ---------- */

/** What can be offered `who` at the end of a talk: obols on its eyes while its bond isn't whole, its power while unowned. */
export function offersFor(who: string) {
  const v = vigil(),
    out: { label: string; act: string }[] = [];
  if (!v.freed.includes(who)) return out;
  const cost = bondCost(v.bonds[who] ?? 0);
  if (cost !== null) out.push({ label: S().offers.eyes(cost), act: 'eyes' });
  const p = powerOf(who);
  if (p && !v.powers.includes(p.id)) out.push({ label: S().offers.power(S().powers[p.id][0], p.dust), act: 'power' });
  return out.length ? [{ label: S().offers.none, act: 'none' }, ...out] : out;
}
const said = (id: string, vars: Record<string, string> = {}) => lineAfter(id, vars, vigil().heard);
const plain = (who: string, text: string): Picked => ({
  line: { id: '_', who, moment: 'reply', text },
  key: '_',
  text,
  vars: {},
  fresh: false,
});

/** An offer taken in a talk: its line back (a memory, the power's words, or why it can't be done). */
export function actOn(who: string, act: string): Picked | null {
  const v = vigil();
  if (act === 'eyes') {
    const bond = v.bonds[who] ?? 0,
      cost = bondCost(bond);
    if (cost === null) return null;
    if (!spend(0, cost)) return plain(who, S().short.obols(v.obols, cost));
    setBond(who, bond + 1);
    Sfx.coin();
    line(S().bonded(nameOf(who), bond + 1, BOND_MAX), 4);
    if (bond + 1 >= BOND_MAX) {
      const f = folkOf(who);
      if (f) {
        openGift(f.second);
        line(S().second(nameOf(who), list(giftWords(f.second))), 6);
      }
    }
    return said(`${who}.eyes${bond + 1}`);
  }
  if (act === 'power') {
    const p = powerOf(who);
    if (!p || v.powers.includes(p.id)) return null;
    if (!spend(p.dust, 0)) return plain(who, S().short.dust(v.dust, p.dust));
    setPower(p.id, true);
    Sfx.relic();
    line(S().powerTaken(...S().powers[p.id]), 5);
    return said(`${who}.power`);
  }
  return null;
}

/** `who`'s quest now: one to give (its bond begun), given and waiting, met (to be told), done; null if it has none. */
export function questState(who: string): 'offer' | 'open' | 'ready' | 'done' | null {
  const q = questOf(who),
    v = vigil();
  if (!q || !v.freed.includes(who)) return null;
  const f = v.flags['quest.' + who];
  if (f === 'done') return 'done';
  if (f === 'open')
    return questMet(q, v, Number(v.flags['questFrom.' + who] ?? 0), Number(v.flags['questBase.' + who] ?? 0))
      ? 'ready'
      : 'open';
  return (v.bonds[who] ?? 0) >= 1 ? 'offer' : null;
}
/** A quest's line was said: given (its goal counted from now), or done (its reward opened, given every descent after). */
export function questSaid(who: string, moment: 'quest' | 'questDone') {
  const q = questOf(who),
    v = vigil();
  if (!q) return;
  if (moment === 'quest') {
    setFlag('quest.' + who, 'open');
    setFlag('questFrom.' + who, v.runs);
    setFlag('questBase.' + who, v.reactions.length);
    line(S().questGiven(S().quests[q.id]), 6);
  } else {
    setFlag('quest.' + who, 'done');
    openGift(q.reward);
    Sfx.relic();
    line(S().questDone(S().quests[q.id]) + ' · ' + S().each(list(startWords(q.reward.start ?? {}))), 6);
  }
}

/** For the dev menu and the tests: each townsperson's bond, power and quest, what a descent would begin with. */
export function giftsInfo() {
  const v = vigil();
  return {
    folk: Object.fromEntries(
      Object.keys(TOWNSFOLK.folk).map((id) => [
        id,
        { freed: v.freed.includes(id), bond: v.bonds[id] ?? 0, power: powerOf(id)?.id ?? null, quest: questState(id) },
      ]),
    ),
    powers: [...v.powers],
    start: startOf(state()),
    lines: DIALOGUE.lines.filter((l) => l.moment === 'gift').length,
  };
}
/** The dev menu: a power owned or not; a bond set; a quest given or done at once. */
export const givePower = (id: string, owned = true) => setPower(id, owned);
export const bondTo = (who: string, n: number) => {
  setBond(who, Math.max(0, Math.min(BOND_MAX, n)));
  if (n >= BOND_MAX) {
    const f = folkOf(who);
    if (f) openGift(f.second);
  }
};
export function questTo(who: string, to: 'open' | 'done' | null) {
  if (to === null) {
    for (const k of ['quest.', 'questFrom.', 'questBase.']) setFlag(k + who, undefined);
    return;
  }
  if (to === 'open') questSaid(who, 'quest');
  else {
    if (vigil().flags['quest.' + who] !== 'open') questSaid(who, 'quest');
    questSaid(who, 'questDone');
  }
}
