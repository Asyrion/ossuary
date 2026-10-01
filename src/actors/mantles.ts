/* Champion mantles in the game (M4.7, docs/M4.7-plan.md; the rules are actors/mantleData.ts, tuning in data/magic.json).
   A mantled champion shows its school: its aura and the glow in its body in the school's light, a ring of runes turning
   under it, and its mantle's name rising as it comes (the first time in a run, a line says what the mantle does and what
   unbinds it). Each step a Kindled champion lays burning ground as it goes and a Hallowed one mends the foes round it;
   struck, a Stormcharged one throws a spark under the mage; falling, a Hexbound one curses the ground round it. The status
   of the school that strips it (statusFx.ts's `inflict`) unbinds it: "Unbound!", stunned, and open to every blow for a
   while (`damageEnemy`). Its shots chill or hex through `shotsBy` (projectiles.ts), its touch chills (enemies.ts). */
import * as THREE from 'three';
import type { Enemy } from '../types';
import { G, after, player } from '../state';
import { CFG } from '../config';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { MAGIC, canHeal, newStatus } from '../magic/status';
import { SCHOOL_LIGHT, lit, runeRing } from '../render/arcane';
import { disposeTree } from '../render/materials';
import { burst } from '../combat/fx';
import { ringFx, strikeFx } from '../magic/spellFx';
import { floatText } from '../magic/statusFx';
import { gainMana } from '../magic/spells';
import { hexDrained } from '../ui/afflictions';
import { line } from '../ui/hud';
import { layFire, laySpark } from './foes';
import { mantleSchool, type MantleId } from './mantleData';

const M = MAGIC.mantles;
const lightOf = (id: MantleId) => SCHOOL_LIGHT[mantleSchool(id)];

/** Put mantle `id` on champion `e` (just built): the school's light in its body and aura, the rune ring under it, its
    name rising as it comes, and, the first time in a run, the line that says what it does. */
export function giveMantle(e: Enemy, id: MantleId) {
  const light = lightOf(id), tint = new THREE.Color(light).multiplyScalar(.16);
  e.mantle = id; e.mantleT = 0;
  for (const m of e.mats) { m.userData.base = tint.clone(); m.emissive.copy(tint); }
  e.aura?.material.color.set(light);
  e.mantleRing = runeRing(e.group, light, e.r * 1.35 / e.scale, [0, .04, 0], 6, [0, 0, 0], lit(light)); // (in its colour, not added light, which a lit floor washes white)
  after(.7, () => { if (e.mantle === id && !e.dead) floatText(e.x, 1.9, e.z, STR.foes.mantles[id].name, light); });
  if (!G.run.hinted.has('mantle:' + id)) { G.run.hinted.add('mantle:' + id); after(.7, () => line(STR.foes.mantles[id].line, CFG.afflict.lineShow)); }
}

/** A status of the school that strips it landed on `e`: the mantle goes, the champion is stunned and open a while. */
export function unbind(e: Enemy) {
  const id = e.mantle; if (!id) return;
  const light = lightOf(id), U = MAGIC.unbound, CH = CFG.champion;
  e.mantle = undefined; e.unbound = U.time;
  const s = e.status ??= newStatus(); s.stun = Math.max(s.stun, U.stun);
  if (e.mantleRing) { e.group.remove(e.mantleRing); disposeTree(e.mantleRing); e.mantleRing = undefined; }
  for (const m of e.mats) { const c = new THREE.Color(CH.tint); m.userData.base = c; m.emissive.copy(c); }
  e.aura?.material.color.set(CH.aura);
  floatText(e.x, 1.9, e.z, STR.foes.unbound, light, 34);
  burst(e.x, .9, e.z, light, 22, 3, .05); ringFx(e.x, .1, e.z, light, .3, 1.8, CFG.spellFx.ring, true);
  Sfx.at(e.x, e.z).unbound();
}

/** A status its mantle keeps off landed on `e`: a puff in its light, and now and then the word. */
export function shrugOff(e: Enemy) {
  burst(e.x, .8, e.z, lightOf(e.mantle!), 4, 1.2, .03);
  if (G.simClock - (e.saidAt ?? -9) > 1.5) { e.saidAt = G.simClock; floatText(e.x, 1.7, e.z, STR.foes.shrugs, lightOf(e.mantle!)); }
}

/** `e` was struck by the mage: a Stormcharged champion throws a spark under the mage (now and then). */
export function mantleStruck(e: Enemy) {
  if (e.mantle !== 'stormcharged' || e.dead || (e.mantleT ?? 0) > 0) return;
  const S = M.stormcharged; e.mantleT = S.sparkEvery;
  laySpark(G.current, player.x, player.z, S.sparkTime, e.foe?.id); strikeFx({ x: e.x, y: 1, z: e.z }, { x: player.x, y: .05, z: player.z }, SCHOOL_LIGHT.storm, .22, true);
  Sfx.at(e.x, e.z).zap();
}

/** `e` fell: a Hexbound champion's curse closes on the ground round it, draining the mage's mana if it is still inside. */
export function mantleFell(e: Enemy) {
  if (e.mantle !== 'hexbound') return;
  const H = M.hexbound, x = e.x, z = e.z, room = G.current, violet = SCHOOL_LIGHT.umbral;
  ringFx(x, .08, z, violet, H.curseReach, .2, H.curseDelay, true); burst(x, .5, z, violet, 16, 1.6, .04); Sfx.at(x, z).curse();
  after(H.curseDelay, () => {
    if (G.current !== room || G.state !== 'play') return;
    burst(x, .3, z, violet, 20, H.curseReach, .05);
    if (Math.hypot(player.x - x, player.z - z) < H.curseReach) { const took = Math.min(player.mana, H.curse); gainMana(-H.curse); hexDrained(took); }
  });
}

/** Every step, for the mantled champions in the room: their rings turn, a Kindled one lays fire where it goes, a Hallowed
    one mends the foes round it; and the unbound ones close up again. */
export function updateMantles(dt: number) {
  for (const e of G.enemies) {
    if (e.unbound) e.unbound = Math.max(0, e.unbound - dt);
    if (!e.mantle || e.dead || e.spawn > 0) continue;
    e.mantleT = (e.mantleT ?? 0) - dt;
    if (e.mantleRing) e.mantleRing.rotation.y += dt * .8;
    // (Stormcharged and Hallowed are near in colour: the storm's ring flickers and throws sparks, the holy one's breathes
    // and sheds motes, so the two read apart)
    if (e.mantle === 'stormcharged') {
      if (e.mantleRing) e.mantleRing.visible = Math.floor(G.simClock * 13 + e.x * 3) % 5 !== 0;
      if (Math.random() < dt * 4) burst(e.x + (Math.random() - .5) * e.r * 2, .15, e.z + (Math.random() - .5) * e.r * 2, SCHOOL_LIGHT.storm, 2, 2.2, .025);
    } else if (e.mantle === 'hallowed') {
      if (e.mantleRing) e.mantleRing.scale.setScalar(1 + Math.sin(G.simClock * 2.4) * .08);
      if (Math.random() < dt * 2.5) burst(e.x + (Math.random() - .5) * e.r * 1.6, .3, e.z + (Math.random() - .5) * e.r * 1.6, SCHOOL_LIGHT.hallow, 1, .5, .03);
    }
    if (e.mantle === 'kindled' && e.mantleT <= 0 && Math.hypot(e.vx, e.vz) > .3 && !e.hidden) { e.mantleT = M.kindled.trailEvery; layFire(G.current, e.x, e.z, M.kindled.trailTime, e.foe?.id); }
    if (e.mantle === 'hallowed' && e.mantleT <= 0) {
      e.mantleT = M.hallowed.mendEvery;
      if ((e.status?.sanct ?? 0) > 0) continue; // (its own school's light on it stills its mending)
      for (const o of G.enemies) {
        if (o === e || o.dead || o.hidden || o.hp >= o.maxHp || !canHeal(o.status) || Math.hypot(o.x - e.x, o.z - e.z) > M.hallowed.mendReach) continue;
        o.hp = Math.min(o.maxHp, o.hp + M.hallowed.mend * (o.isBoss ? M.hallowed.bossShare : 1)); burst(o.x, .9, o.z, SCHOOL_LIGHT.hallow, 5, 1.2, .03);
      }
    }
  }
}
