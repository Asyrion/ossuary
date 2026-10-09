/* M7 step 7: the townspeople's talk panel (docs/M7-plan.md, decision 12), along the bottom of the screen with the Vigil
   still showing above it: the speaker's icon (rendered from its figure), its name, its line written out a little at a time
   (`CFG.vigil.town.typeRate`, run from the step so it waits with the game), and up to two choices. Enter or Space (A) shows
   the whole line, then goes on (a choice taken, or the talk closed); the arrows or the d-pad choose; Esc (B) closes. The
   game waits while it is open. Each line shown is heard (the save's `heard`), and a choice sets its flags. vigil/town.ts
   opens it; it knows nothing of who stands where. */
import { CFG } from '../config';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { $ } from '../util';
import { showScreen } from './screens';
import { esc } from './spellPanel';
import { hearLine, setFlag, vigil } from '../vigil/save';
import { lineAfter, type Picked } from '../vigil/dialogueData';

interface Talk { who: string; name: string; icon: string; line: Picked; shown: number; chosen: number }
let talk: Talk | null = null;
interface TalkActions {
  pause(): void; resume(): void;
  /** M7 step 8 (vigil/gifts.ts): what can be offered a speaker at the end of a talk, and an offer taken (its line back). */
  offers?(who: string): { label: string; act: string }[]; act?(who: string, act: string): Picked | null;
}
let actions: TalkActions = { pause: () => {}, resume: () => {} };

/** How the game pauses and goes on (flow's, from main.ts), and the gifts' offers. */
export function initTalk(a: TalkActions) { actions = a; }
/** A line that leaves the talk open-ended (no choices of its own) ends with the speaker's offers, if it has any. */
function withOffers(who: string, p: Picked): Picked {
  if (p.line.choices?.length) return p;
  const o = actions.offers?.(who) ?? []; if (!o.length) return p;
  return { ...p, line: { ...p.line, choices: o.map(x => ({ label: x.label, act: x.act })) } };
}
export const talkOpen = () => !!talk;
/** Who is talking now (their figure gestures), if anyone. */
export const talkingNow = () => talk?.who ?? null;

/** Open the talk: `who` (named `name`, its icon `icon`) says `line`; `also`: keys heard with it (its moment said this run).
    `top`: the speaker stands in the lower half of the screen, so the panel goes at the top, not over it. */
export function openTalk(who: string, name: string, icon: string, line: Picked, also: string[] = [], top = false) {
  if (!talk) actions.pause();
  talk = { who, name, icon, line: withOffers(who, line), shown: 0, chosen: 0 };
  hear(line); for (const k of also) hearLine(k);
  $('scrTalk').classList.toggle('top', top);
  showScreen('talk'); render();
}
function hear(p: Picked) { if (p.key !== '_') hearLine(p.key); } // (`_`: a line made on the spot, a refusal)
export function closeTalk() { if (!talk) return; talk = null; actions.resume(); }

/** Each step (even while the game waits): the line written out a little more. */
export function updateTalk(dt: number) {
  if (!talk || talk.shown >= talk.line.text.length) return;
  talk.shown = Math.min(talk.line.text.length, talk.shown + dt * CFG.vigil.town.typeRate);
  render();
}
const whole = () => !!talk && talk.shown >= talk.line.text.length;

function render() {
  const t = talk; if (!t) return;
  ($('talkIcon') as HTMLImageElement).src = t.icon;
  $('talkName').textContent = t.name;
  const n = Math.floor(t.shown), text = t.line.text;
  $('talkLine').innerHTML = esc(text.slice(0, n)) + `<span class="unseen" style="visibility:hidden">${esc(text.slice(n))}</span>`;
  const choices = whole() ? t.line.line.choices ?? [] : [];
  const box = $('talkChoices');
  box.innerHTML = choices.map((c, i) => `<li role="option" data-i="${i}" aria-selected="${i === t.chosen}"><b>${esc(STR.town.choose(i + 1))}</b>${esc(c.label)}</li>`).join('');
  for (const li of box.querySelectorAll<HTMLElement>('li')) li.onclick = () => { if (!talk) return; talk.chosen = Number(li.dataset.i); say(talk.chosen); };
}

/** Enter: the whole line at once; then the choice taken, or the talk closed. */
export function goOn() {
  const t = talk; if (!t) return;
  if (!whole()) { t.shown = t.line.text.length; render(); return; }
  if (t.line.line.choices?.length) say(t.chosen); else closeTalk();
}
/** Take choice `i`: its flags set, then the line it leads to (or the talk ends). */
export function say(i: number) {
  const t = talk, c = t?.line.line.choices?.[i]; if (!t || !c) return false;
  for (const [k, v] of Object.entries(c.set ?? {})) setFlag(k, v);
  Sfx.potionChoose();
  const next = c.act ? (c.act === 'none' ? null : actions.act?.(t.who, c.act) ?? null) : c.next ? lineAfter(c.next, t.line.vars, vigil().heard) : null; // (M7 step 8: an offer taken)
  if (!next) { closeTalk(); return true; }
  t.line = withOffers(t.who, next); t.shown = 0; t.chosen = 0; hear(next); render(); return true;
}
function choose(d: number) {
  const t = talk, n = t?.line.line.choices?.length ?? 0; if (!t || !n || !whole()) return;
  t.chosen = (t.chosen + d + n) % n; Sfx.potionChoose(); render();
}

export function talkKey(code: string) {
  if (!talk) return false;
  if (code === 'Enter' || code === 'Space' || code === 'NumpadEnter') goOn();
  else if (code === 'ArrowUp' || code === 'ArrowLeft' || code === 'KeyW' || code === 'KeyA') choose(-1);
  else if (code === 'ArrowDown' || code === 'ArrowRight' || code === 'KeyS' || code === 'KeyD') choose(1);
  else if (code === 'Digit1' || code === 'Digit2') { if (whole()) say(Number(code.slice(5)) - 1); }
  else if (code === 'Escape') closeTalk();
  else return false;
  return true;
}
export function talkPad(i: number) {
  if (!talk) return false;
  if (i === 0) goOn(); else if (i === 1) closeTalk(); else if (i === 12 || i === 14) choose(-1); else if (i === 13 || i === 15) choose(1); else return false;
  return true;
}

/** For the tests and the dev menu: who speaks, the line (its id, text and how much shows) and the choices. */
export function talkNow() {
  const t = talk; if (!t) return { open: false as const };
  return { open: true as const, top: $('scrTalk').classList.contains('top'), who: t.who, name: t.name, line: t.line.line.id, key: t.line.key, text: t.line.text, shown: Math.floor(t.shown), whole: whole(),
    choices: (t.line.line.choices ?? []).map(c => c.label), chosen: t.chosen };
}
