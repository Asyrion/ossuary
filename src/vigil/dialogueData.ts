/* The townspeople's talk as data (M7 step 7; docs/M7-plan.md, decisions 11 and 12): data/dialogue.json holds each
   speaker's lines (the ten freed shades and the Ferryman), each for a moment: `first` (met at the Vigil), `death` or `won`
   (after a run that ended so, some only when a given thing struck last), `boss` (after a run in which a given boss fell),
   `idle` (any other time: what each one knew in life), `reply` (reached only by a choice) and `quest`/`questDone` (kept for
   step 8). A line holds only `when` its conditions on the save are met (what the mage has found, how deep it has gone,
   its runs, wins, who is freed, the flags its choices set). An idle line may tell of something (`fill`): a foe's weakness
   the mage has yet to find, what a boss it has met fears, a reaction it has yet to set off, one at a time, each told
   once before any is told again. Pure: the shape, the picking (`pickLine`) and the checks (`validateDialogue`). */
import data from '../../data/dialogue.json';

export type Moment = 'first' | 'death' | 'won' | 'boss' | 'idle' | 'reply' | 'quest' | 'questDone' | 'gift';
/** (M7 step 8: `gift`, a line said as a gift is given: obols on the eyes, `<who>.eyes1` and `.eyes2`, its memories; a power
    bought, `<who>.power`. Picked by its id, never by `pickLine`.) */
export const MOMENTS: Moment[] = ['first', 'death', 'won', 'boss', 'idle', 'reply', 'quest', 'questDone', 'gift'];
/** What an idle line may tell of, one subject at a time. */
export type Fill = 'weakness' | 'bossFear' | 'reaction';
export const FILLS: Fill[] = ['weakness', 'bossFear', 'reaction'];
/** The words each fill puts into its line's text. */
export const FILL_VARS: Record<Fill, string[]> = { weakness: ['foe', 'school'], bossFear: ['boss', 'school'], reaction: ['reaction', 'a', 'b'] };
export type FlagValue = string | number | boolean;
/** A line's conditions, every one of which must hold. */
export interface When {
  /** Found: a spell learned, a foe met, a foe's weakness found, a reaction set off, a recipe brewed. */
  spell?: string; foe?: string; weak?: string; reaction?: string; recipe?: string;
  /** The deepest floor reached is at least `deepest`, below `shallower`; runs and wins at least so many. */
  deepest?: number; shallower?: number; runs?: number; wins?: number;
  /** That shade is freed too; a flag has this value (true: set at all); a flag isn't set. */
  freed?: string; flag?: Record<string, FlagValue>; noFlag?: string;
  /** The last run: struck last by this (a foe's, boss's or thing's id), or this boss fell in it. */
  struck?: string; boss?: string;
}
/** (`act`: M7 step 8, not in the data: an offer town.ts adds at the end of a talk, obols on the eyes or a power asked for.) */
export interface Choice { label: string; next?: string; set?: Record<string, FlagValue>; act?: string }
export interface Line { id: string; who: string; moment: Moment; text: string; when?: When; fill?: Fill; choices?: Choice[] }
export interface DialogueData { speakers: string[]; lines: Line[] }
export const DIALOGUE = data as unknown as DialogueData;
export const SPEAKERS = DIALOGUE.speakers;
/** The longest a line may be: the panel's three rows. */
export const MAX_LINE = 240;

/** Something an idle line may tell of: its key (the line is heard as `id@key`) and the words it puts in. */
export interface Subject { key: string; vars: Record<string, string> }
/** What the talk knows of the save and this waking. */
export interface TalkContext {
  /** This waking's moment (after a death, a win, or a run that felled a boss), and whether this speaker has said it. */
  moment: 'death' | 'won' | 'boss' | null; momentSaid: boolean;
  /** The last run: what struck last, the bosses it felled. */ struck: string | null; felled: string[];
  found: { spells: string[]; foes: string[]; weak: string[]; reactions: string[]; recipes: string[] };
  deepest: number; runs: number; wins: number; freed: string[]; flags: Record<string, FlagValue>;
  /** The subjects each fill may tell of now, in the order they'd be told. */ subjects: Partial<Record<Fill, Subject[]>>;
  /** Words any line may use: `struck` (what struck last), `boss` (the boss that fell), `name` (the mage's). */ vars: Record<string, string>;
  /** M7 step 8: this speaker's quest: one to give (`offer`), or one whose goal is met (`ready`). */ quest?: 'offer' | 'ready' | null;
}

/** Whether a line's conditions hold. */
export function holds(w: When | undefined, c: TalkContext): boolean {
  if (!w) return true;
  const f = c.found;
  if (w.spell && !f.spells.includes(w.spell)) return false;
  if (w.foe && !f.foes.includes(w.foe)) return false;
  if (w.weak && !f.weak.includes(w.weak)) return false;
  if (w.reaction && !f.reactions.includes(w.reaction)) return false;
  if (w.recipe && !f.recipes.includes(w.recipe)) return false;
  if (w.deepest !== undefined && c.deepest < w.deepest) return false;
  if (w.shallower !== undefined && c.deepest >= w.shallower) return false;
  if (w.runs !== undefined && c.runs < w.runs) return false;
  if (w.wins !== undefined && c.wins < w.wins) return false;
  if (w.freed && !c.freed.includes(w.freed)) return false;
  if (w.flag) for (const [k, v] of Object.entries(w.flag)) if (v === true ? c.flags[k] === undefined || c.flags[k] === false : c.flags[k] !== v) return false;
  if (w.noFlag && c.flags[w.noFlag] !== undefined && c.flags[w.noFlag] !== false) return false;
  if (w.struck && c.struck !== w.struck) return false;
  if (w.boss && !c.felled.includes(w.boss)) return false;
  return true;
}

/** A line picked: the line, the key it is heard by, its text with its words put in, and whether it was unheard. */
export interface Picked { line: Line; key: string; text: string; vars: Record<string, string>; fresh: boolean }
/** A line's text with its words put in (`{foe}`, `{struck}` and the rest). */
export const fillText = (text: string, vars: Record<string, string>) => text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
const specific = (l: Line) => Object.keys(l.when ?? {}).length;

/** What `who` says now: its `first` line until it is heard; then this waking's moment (once a waking: the line whose
    conditions say most about it first, unheard before heard); then an idle line not yet heard (or a subject not yet told
    of), in the data's order; else the idle line heard longest ago. Null when it has nothing at all to say. */
export function pickLine(who: string, c: TalkContext, heard: Record<string, number>, lines: Line[] = DIALOGUE.lines): Picked | null {
  const mine = lines.filter(l => l.who === who && holds(l.when, c));
  const as = (line: Line, s?: Subject): Picked => {
    const key = s ? `${line.id}@${s.key}` : line.id, vars = { ...c.vars, ...s?.vars };
    return { line, key, text: fillText(line.text, vars), vars, fresh: heard[key] === undefined };
  };
  const first = mine.find(l => l.moment === 'first');
  if (first && heard[first.id] === undefined) return as(first);
  const byAge = (a: Picked, b: Picked) => (heard[a.key] ?? -1) - (heard[b.key] ?? -1);
  const done = c.quest === 'ready' && mine.find(l => l.moment === 'questDone'); // (M7 step 8: a quest met is said first)
  if (done) return as(done);
  if (c.moment && !c.momentSaid) {
    const now = mine.filter(l => l.moment === c.moment).sort((a, b) => specific(b) - specific(a));
    const top = now.length ? specific(now[0]) : 0, best = now.filter(l => specific(l) === top).map(l => as(l)).sort(byAge);
    if (best.length) return best[0];
  }
  const quest = c.quest === 'offer' && mine.find(l => l.moment === 'quest'); // (then a quest to give)
  if (quest) return as(quest);
  const idle = mine.filter(l => l.moment === 'idle').flatMap(l => l.fill ? (c.subjects[l.fill] ?? []).map(s => as(l, s)) : [as(l)]);
  return idle.find(p => p.fresh) ?? [...idle].sort(byAge)[0] ?? (first ? as(first) : null);
}
/** The line a choice leads to, its words as the line it came from had them. */
export function lineAfter(id: string, vars: Record<string, string>, heard: Record<string, number>, lines: Line[] = DIALOGUE.lines): Picked | null {
  const line = lines.find(l => l.id === id); if (!line) return null;
  return { line, key: line.id, text: fillText(line.text, vars), vars, fresh: heard[line.id] === undefined };
}
/** Whether `who` has something unheard to say now (the glint over it). */
export const hasNews = (who: string, c: TalkContext, heard: Record<string, number>, lines: Line[] = DIALOGUE.lines) => {
  const p = pickLine(who, c, heard, lines);
  return !!p && (p.fresh || (p.line.moment !== 'idle' && p.line.moment !== 'first'));
};
/** M7 step 8: the lines a gift needs, for the checks: each townsperson's two memories, a power's line, a quest's two. */
export interface GiftLines { folk: string[]; powers: string[]; quests: string[] }
export const giftLinesMissing = (d: DialogueData, g: GiftLines) => {
  const has = (id: string, m: Moment) => d.lines.some(l => l.id === id && l.moment === m);
  return [...g.folk.flatMap(w => [`${w}.eyes1`, `${w}.eyes2`].filter(id => !has(id, 'gift'))), ...g.powers.map(w => `${w}.power`).filter(id => !has(id, 'gift')),
    ...g.quests.flatMap(w => [has(`${w}.quest`, 'quest') ? '' : `${w}.quest`, has(`${w}.questDone`, 'questDone') ? '' : `${w}.questDone`]).filter(Boolean)];
};

/** The ids a line's conditions may name, by kind (the checks use them). */
export interface Known { speakers: string[]; spells: string[]; foes: string[]; bosses: string[]; reactions: string[]; recipes: string[] }
/** What is wrong with the talk, if anything. */
export function validateDialogue(d: DialogueData, known: Known): string[] {
  const errs: string[] = [], ids = new Set<string>(), byId = new Map(d.lines.map(l => [l.id, l]));
  for (const s of known.speakers) if (!d.speakers.includes(s)) errs.push(`no speaker ${s}`);
  for (const s of d.speakers) if (!d.lines.some(l => l.who === s && l.moment === 'first')) errs.push(`${s} has no first line`);
  const reached = new Set<string>();
  for (const l of d.lines) {
    const at = `line ${l.id}`;
    if (ids.has(l.id)) errs.push(`${at}: its id is taken`); ids.add(l.id);
    if (l.id.includes('@')) errs.push(`${at}: an id holds no @`);
    if (!d.speakers.includes(l.who)) errs.push(`${at}: no speaker ${l.who}`);
    if (!MOMENTS.includes(l.moment)) errs.push(`${at}: no moment ${l.moment}`);
    if (!l.text || l.text.length > MAX_LINE) errs.push(`${at}: its text is ${l.text ? 'longer than ' + MAX_LINE : 'empty'}`);
    if (l.fill && !FILLS.includes(l.fill)) errs.push(`${at}: no fill ${l.fill}`);
    if (l.fill && l.moment !== 'idle') errs.push(`${at}: only an idle line tells of something`);
    const words = [...l.text.matchAll(/\{(\w+)\}/g)].map(m => m[1]), may = ['name', ...(l.fill ? FILL_VARS[l.fill] : [])];
    if (l.moment === 'death') may.push('struck'); if (l.moment === 'boss') may.push('boss');
    for (const w of words) if (!may.includes(w) && !(l.moment === 'reply')) errs.push(`${at}: {${w}} isn't a word it has`);
    const w = l.when ?? {};
    const name = (kind: keyof Known, id: string | undefined) => { if (id && !known[kind].includes(id)) errs.push(`${at}: no ${kind.replace(/s$/, '')} ${id}`); };
    name('spells', w.spell); name('foes', w.foe); name('foes', w.weak); name('reactions', w.reaction); name('recipes', w.recipe);
    name('speakers', w.freed); name('bosses', w.boss);
    if (w.struck && !known.foes.includes(w.struck) && !known.bosses.includes(w.struck) && !/^[a-z]+$/.test(w.struck)) errs.push(`${at}: no foe ${w.struck}`);
    if (w.boss && l.moment !== 'boss') errs.push(`${at}: a boss's fall is a boss line's`);
    if (w.struck && l.moment !== 'death') errs.push(`${at}: what struck last is a death line's`);
    if ((l.choices ?? []).length > 2) errs.push(`${at}: two choices at most`);
    for (const ch of l.choices ?? []) {
      if (!ch.label) errs.push(`${at}: a choice with no label`);
      if (ch.next) {
        const n = byId.get(ch.next); reached.add(ch.next);
        if (!n) errs.push(`${at}: its choice leads to no line ${ch.next}`);
        else if (n.moment !== 'reply' || n.who !== l.who) errs.push(`${at}: its choice leads to ${ch.next}, not a reply of its own`);
      }
    }
  }
  for (const l of d.lines) if (l.moment === 'reply' && !reached.has(l.id)) errs.push(`line ${l.id}: no choice leads to it`);
  return errs;
}
