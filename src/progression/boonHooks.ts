/* M6 step 5: what the school boons' hooks ask (docs/archive/M6-plan.md; the rules are boonData.ts). The statuses, blows, spells,
   pools and props that carry a boon out import this light module: a boon's rank and numbers, the statuses' tuning with
   the boons taken (`magicNow`), whether a fight is on, and how a boon shows it is at work (Nothing silent): its name rises
   where it acts, once a room, in its colour; a line says what it did the first time in a run; its school's note sounds.
   The half hearts boons mend share a budget a room (`boonMend`). */
import { CFG } from '../config';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { line, renderHearts } from '../notify';
import { burst } from '../combat/fx';
import { floatText } from '../magic/statusFx';
import { heroDrink } from '../actors/hero';
import { MAGIC } from '../magic/status';
import type { SpellStatus } from '../magic/spellData';
import { afterglowOf, boon, boonParams, boonTuning, statusMul } from './boonData';

/** The rank of boon `id` taken this run (0 if not). */
export const boonRank = (id: string) => G.run.boons[id] ?? 0;
/** Boon `id`'s number `key` at its rank now (0 while it isn't taken). */
export const boonParam = (id: string, key: string) => {
  const r = boonRank(id);
  return r ? (boonParams(id, r)[key] ?? 0) : 0;
};
/** Boon `id`'s multiplier `key` at its rank now (1 while it isn't taken). */
export const boonMul = (id: string, key: string) => {
  const r = boonRank(id);
  return r ? (boonParams(id, r)[key] ?? 1) : 1;
};

let tuned = { key: '0:0', T: MAGIC };
/** The statuses' tuning now: data/magic.json's, with Deep Winter's freeze and Gathering Dark's hex (made again only when
    their ranks change). */
export function magicNow() {
  const key = boonRank('deepWinter') + ':' + boonRank('gatheringDark');
  if (tuned.key !== key) tuned = { key, T: boonTuning(MAGIC, G.run.boons) };
  return tuned.T;
}
/** How much longer status `kind` holds with the boons taken (Banked Coals, Perennial, Laid Bare). */
export const boonStatusMul = (kind: SpellStatus) => statusMul(kind, G.run.boons);
/** Whether a fight is on: the doors locked, or anything still standing (a dev dummy too). */
export const inFight = () => !!G.room.current?.locked || G.room.enemies.some((e) => !e.dead);

const css = (c: string) => parseInt(c.slice(1), 16);
/** Boon `id` at work at (x, z): counted (the tests read it); its name rises there once a room, a line says what it did
    the first time in a run, and its school's note sounds. */
export function boonActs(id: string, x = player.x, z = player.z) {
  const def = boon(id);
  actsHere(id, 'boon:' + id, def.name, def.color, STR.boons.acts[id] ?? def.text, x, z, () =>
    Sfx.at(x, z).boon(def.school ?? 'hallow'),
  );
}
/** What the mage carries at work at (x, z) (a boon; M6 step 7: a rune): counted under `key` in `G.run.acted`; `name` rises
    there once a room in `color`, `text` shows the first time in a run (`hint`), and `sound` plays with the name. */
export function actsHere(
  key: string,
  hint: string,
  name: string,
  color: string,
  text: string,
  x: number,
  z: number,
  sound: () => void,
) {
  G.run.acted[key] = (G.run.acted[key] ?? 0) + 1;
  const said = (G.room.current.boonsSaid ??= new Set());
  if (said.has(key)) return;
  said.add(key);
  floatText(x, 1.4, z, name, css(color), 44); // (a name: it stacks over a reaction's rising from the same spot)
  if (!G.run.hinted.has(hint)) {
    G.run.hinted.add(hint);
    line(text, CFG.afflict.lineShow);
  }
  sound();
}

/** Boon `id` mends `halves` half hearts, the light coming from (x, z): not at full health, and no more than
    `CFG.boons.mendPerRoom` a room from every boon together (the first time that stops one in a run, a line says so).
    Whether it mended. */
export function boonMend(id: string, halves: number, x: number, z: number) {
  if (player.dead || player.hp >= player.maxHp) return false;
  const room = G.room.current,
    left = CFG.boons.mendPerRoom - (room.boonMended ?? 0);
  if (left <= 0) {
    if (!G.run.hinted.has('boonMendSpent')) {
      G.run.hinted.add('boonMendSpent');
      line(STR.boons.mendSpent, CFG.afflict.lineShow);
    }
    return false;
  }
  const n = Math.min(halves, left, player.maxHp - player.hp),
    color = css(boon(id).color);
  room.boonMended = (room.boonMended ?? 0) + n;
  player.hp += n;
  renderHearts();
  heroDrink();
  burst(x, 0.7, z, color, 10, 1.6, 0.05);
  burst(player.x, 0.9, player.z, color, 12, 1.6, 0.05);
  burst(player.x, 1, player.z, 0xff8a8a, 6, 1.2, 0.04);
  if (Math.hypot(x - player.x, z - player.z) > 0.5)
    for (let k = 1; k <= 5; k++)
      after(k * 0.05, () => {
        const t = k / 6;
        burst(x + (player.x - x) * t, 0.8, z + (player.z - z) * t, k % 2 ? color : 0xd0303a, 2, 0.5, 0.04);
      }); // (from where it came, a trail to the mage)
  floatText(player.x, 1.5, player.z, '+', 0xff8a8a, 40);
  boonActs(id, player.x, player.z);
  return true;
}

/** What the dev hooks read: how often each boon has acted this run, and the names risen in this room. */
export const boonsActed = () => ({ ...G.run.acted });
export const boonsSaid = () => [...(G.room.current?.boonsSaid ?? [])];

/** Votive Heart: the first Hallow spell cast in a fight while hurt mends (once a room; castSpell, the dev menu's bench). */
export function votiveCast() {
  const room = G.room.current;
  if (!boonRank('votiveHeart') || room.votive || !inFight() || player.hp >= player.maxHp) return;
  if (boonMend('votiveHeart', boonParam('votiveHeart', 'mend'), player.x, player.z)) room.votive = true;
}
/** Thirsting Hex: a blow from the mage spent a hex stack on a foe at (x, z); every so many, half a heart (a count kept while
    the mage is unhurt or the room's mends are spent, so the next stack spent mends). */
export function thirstHex(x: number, z: number) {
  if (!boonRank('thirstingHex')) return;
  if (++G.run.thirst < boonParam('thirstingHex', 'every') || player.hp >= player.maxHp) return;
  if (boonMend('thirstingHex', boonParam('thirstingHex', 'mend'), x, z)) G.run.thirst = 0;
}
/** Laid Bare: whether a foe's guard is gone (sanctified, the boon taken). */
export const laidBare = (sanct: number) => sanct > 0 && boonRank('laidBare') > 0;

/** Afterglow (step 6): a spell cast leaves part of its statuses in the hand for the next cantrip casts. */
export function afterglowCast(status: Partial<Record<SpellStatus, number>> | undefined, color: string) {
  if (!boonRank('afterglow') || !status || !Object.keys(status).length) return;
  G.run.afterglow = {
    status: afterglowOf(status, boonParam('afterglow', 'share')),
    left: boonParam('afterglow', 'casts'),
    color: css(color),
  };
}
/** The cantrip's next cast takes the afterglow's statuses, if any are left (its name rises the first time in a room). */
export function takeAfterglow() {
  const a = G.run.afterglow;
  if (!a || a.left <= 0) return null;
  if (--a.left <= 0) G.run.afterglow = null;
  boonActs('afterglow');
  return a;
}
