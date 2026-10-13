/* The Twin Guardians' fight (M4.2, from the Eda lore; GDD: Bosses from the Eda lore). Two colossal bearded guardians of
   sandstone, lion-pawed, crouched like the ones in the gate's towers. They stand as statues, their heads turning after
   the mage (as the Uzulim statues' eyes follow whoever comes near), until the mage comes close to either or strikes one;
   then both wake together. One strikes while the other shields: the shielding twin raises its stone shield and a
   drinking ward (actors/wardShield.ts) and holds its post; bolts glance off it and the ward drinks spells (full, it
   breaks into a Wardling, and spells reach the shielder then). (Built first with the shielder putting itself between
   the mage and its twin; that body-blocked every line on the striker, so it holds its post for now.) The striking twin stalks the mage,
   slams the floor (a ring of stone, and a blow to the mage beside it) and fixes the mage with its gaze (a stream of gold
   straight at them). Every so often they trade: the shield passes across to the other. Below half health (either) they
   call the floor's heavies. When one falls the other rages: no more shield, faster, sooner to strike. The two share the
   boss bar; the fight's reward comes when the second falls (combat/damage.ts). */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { mergeRig } from '../render/rig';
import { spawnShot } from '../combat/projectiles';
import { hurtPlayer } from '../combat/damage';
import { burst } from '../combat/fx';
import { banner } from '../ui/hud';
import { freeSpotNear } from '../world/rooms';
import { twinLook } from './bossLooks';
import { unwardFoe, wardFoe } from './wardShield';
import { makeEnemy } from './enemies';
import { lerp } from '../util';

const C = CFG.enemy.twins,
  GOLD = SCHOOL_LIGHT.hallow,
  RAGE = 0xff7a3a;
/** The first twin while it is being built: the one made meanwhile is the second. */
let first: Enemy | null = null;

/** Build a twin; the first built raises the second beside it, and each knows the other. */
export function buildTwin(e: Enemy) {
  const second = !!first,
    L = twinLook(second),
    P = L.parts;
  e.mats = mergeRig(L.group, L.idle, 'boss:twin' + (second ? 2 : 1), [P.eye, P.ring, P.head, P.armL, P.armR]);
  for (const m of e.mats) m.userData.base = m.emissive.clone();
  e.model = L.group;
  e.idle = L.idle;
  e.shadow = L.shadow;
  e.bossSchool = L.school;
  e.body.add(L.group);
  e.eye = P.eye;
  e.ring = P.ring;
  e.halo = P.halo;
  e.parts = P;
  e.bossAff = { weak: C.weak, resist: C.resist };
  e.contact = 0;
  e.state = 'statue';
  e.st = Infinity;
  P.ring.visible = false;
  P.halo.material.opacity = 0;
  (P.eyeGlow as THREE.Sprite).material.opacity = 0.15;
  if (second) return;
  first = e;
  const a = freeSpotNear(G.current, e.x - C.apart / 2, e.z),
    b = freeSpotNear(G.current, e.x + C.apart / 2, e.z);
  e.x = a.x;
  e.z = a.z;
  const t = makeEnemy('twins', b.x, b.z, 1, e.bossCfg);
  first = null;
  e.twin = t;
  t.twin = e;
  e.swapT = t.swapT = C.swap;
  e.target = { x: a.x, z: a.z };
  t.target = { x: t.x, z: t.z }; // (their posts: the shielder holds its own)
}

/** Both wake together: stone gives, their eyes blaze; the one nearer the mage takes up the shield. */
function wake(e: Enemy) {
  for (const t of [e, e.twin!]) {
    if (t.dead || t.state !== 'statue') continue;
    t.state = 'wake';
    t.st = 0.9;
    t.parts!.ring.visible = true;
    (t.parts!.eyeGlow as THREE.Sprite).material.opacity = 0.7;
    Sfx.at(t.x, t.z).rubble();
    burst(t.x, 1.2, t.z, 0xb8a888, 24, 2.4, 0.07);
  }
  const near = (t: Enemy) => Math.hypot(player.x - t.x, player.z - t.z);
  const shielder = e.twin!.dead || near(e) < near(e.twin!) ? e : e.twin!;
  setRole(shielder, 'shield');
  if (!shielder.twin!.dead) setRole(shielder.twin!, 'strike');
  G.shake = 0.35;
  Sfx.at(e.x, e.z).boom();
}
function setRole(e: Enemy, role: 'shield' | 'strike') {
  e.role = role;
  e.glance = role === 'shield';
  if (e.state !== 'statue') e.contact = role === 'shield' ? C.shieldContact : 2;
  if (role === 'shield') wardFoe(e, C.wardNeed, C.wardSize, 1.1);
  else unwardFoe(e);
}

/** One step of a twin's fight. Returns the way it should face, when that isn't towards the mage. */
export function updateTwin(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const B = e.bossCfg,
    shotMul = B?.shotSpeedMul ?? 1,
    speedMul = B?.speedMul ?? 1,
    P = e.parts!,
    halo = e.halo!,
    t = e.twin!;
  const d = Math.hypot(player.x - e.x, player.z - e.z),
    fast = e.rage ? C.rage.quick : 1;
  // its head turns after the mage, even as stone
  P.head.rotation.y = Math.max(-1, Math.min(1, Math.atan2(player.x - e.x, player.z - e.z) - e.face));
  if (e.state === 'statue') {
    e.vx = e.vz = e.kx = e.kz = 0;
    if (d < C.wake || e.hp < e.maxHp || e.st < 0 || (!t.dead && t.hp < t.maxHp)) wake(e);
    return e.face;
  }
  e.idle?.(e.t);
  e.ring!.rotation.z += dt * (e.state.startsWith('wind') ? 5 : 1.2);
  if (e.state === 'wake') {
    // it stands up out of the stone
    e.vx = e.vz = 0;
    const k = 1 - Math.max(0, e.st) / 0.9;
    P.body.position.x = Math.sin(e.t * 40) * 0.03 * (1 - k);
    halo.material.opacity = 0.3 * k;
    if (e.st <= 0) {
      P.body.position.x = 0;
      e.state = e.role === 'shield' ? 'guard' : 'stalk';
      e.st = 1.2;
    }
    return undefined;
  }
  // the trade: every so often, when the striker is between blows, the shield passes across
  if (!e.rage && e.role === 'strike') e.swapT = e.swapT! - dt;
  if (!e.rage && e.role === 'strike' && e.state === 'stalk' && e.swapT! <= 0 && !t.dead && t.state === 'guard') {
    setRole(e, 'shield');
    setRole(t, 'strike');
    e.state = 'guard';
    t.state = 'stalk';
    t.st = 1;
    e.swapT = t.swapT = C.swap;
    for (let i = 0; i <= 8; i++) burst(lerp(e.x, t.x, i / 8), 1.2, lerp(e.z, t.z, i / 8), 0xd8d0ff, 2, 0.8, 0.04);
    Sfx.at(e.x, e.z).wardDrink();
  }
  if (e.state === 'guard') {
    // the shield up, it goes back to its post and holds it while its twin strikes
    P.armL.rotation.x = lerp(P.armL.rotation.x, -1.1, 0.15);
    P.armR.rotation.x = lerp(P.armR.rotation.x, 0, 0.15);
    halo.material.opacity = 0.3;
    const to = e.target!,
      gx = to.x - e.x,
      gz = to.z - e.z,
      gd = Math.hypot(gx, gz);
    const sp = gd > 0.2 ? C.guardSpeed * speedMul : 0;
    e.vx = gd > 0.01 ? (gx / gd) * sp : 0;
    e.vz = gd > 0.01 ? (gz / gd) * sp : 0;
    return undefined;
  }
  P.armL.rotation.x = lerp(P.armL.rotation.x, 0, 0.15);
  if (e.state === 'stalk') {
    const sp = C.speed * speedMul * (e.rage ? C.rage.speed : 1) * (d > C.keep ? 1 : 0);
    e.vx = ux * sp;
    e.vz = uz * sp; // (it stops at arm's length)
    halo.material.opacity = 0.3;
    P.armR.rotation.x = lerp(P.armR.rotation.x, 0, 0.15);
    P.body.position.y = Math.abs(Math.sin(e.t * 4)) * 0.04;
    if (e.st <= 0) {
      // a slam and a gaze by turns
      e.cycle = e.cycle! + 1;
      e.state = e.cycle % 2 ? 'windSlam' : 'windGaze';
      e.st = (e.state === 'windSlam' ? C.slam.tell : C.gaze.tell) * fast;
      if (e.state === 'windGaze') Sfx.at(e.x, e.z).statueMark();
    }
  } else if (e.state === 'windSlam') {
    // it rears, its right paw high
    e.vx = e.vz = 0;
    const k = 1 - Math.max(0, e.st) / (C.slam.tell * fast);
    P.body.rotation.x = -0.2 * k;
    P.armR.rotation.x = -2.2 * k;
    halo.material.opacity = 0.3 + k * 0.6;
    if (e.st <= 0) {
      P.body.rotation.x = 0;
      const S = C.slam,
        off = Math.random() * Math.PI;
      for (let i = 0; i < S.count; i++) {
        const a = off + (i / S.count) * Math.PI * 2;
        spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), S.speed * shotMul, e.rage ? RAGE : GOLD, 0.5, 1.2);
      }
      if (d < S.reach + player.r) hurtPlayer(S.hurt, e.x, e.z);
      burst(e.x + Math.sin(e.face) * 1, 0.2, e.z + Math.cos(e.face) * 1, 0xb8a888, 28, 3.5, 0.08);
      Sfx.at(e.x, e.z).boom();
      Sfx.at(e.x, e.z).rubble();
      G.shake = 0.35;
      e.state = 'recover';
      e.st = 0.7 * fast;
    }
  } else if (e.state === 'windGaze') {
    // its eyes blaze
    e.vx = e.vz = 0;
    const k = 1 - Math.max(0, e.st) / (C.gaze.tell * fast);
    (P.eyeGlow as THREE.Sprite).material.opacity = 0.7 + k * 0.3;
    (P.eyeGlow as THREE.Sprite).scale.setScalar(0.7 + k * 1.6);
    halo.material.opacity = 0.3 + k * 0.5;
    if (e.st <= 0) {
      e.state = 'gaze';
      e.volleys = C.gaze.count;
      e.st = 0;
    }
  } else if (e.state === 'gaze') {
    // a stream of gold straight at the mage
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      const a = Math.atan2(player.z - e.z, player.x - e.x);
      spawnShot(
        e.x + Math.cos(a) * 0.9,
        e.z + Math.sin(a) * 0.9,
        Math.cos(a),
        Math.sin(a),
        C.gaze.speed * shotMul,
        e.rage ? RAGE : GOLD,
        1.9,
        0.9,
      );
      Sfx.at(e.x, e.z).enemyShot();
      e.volleys = e.volleys! - 1;
      e.st = C.gaze.every;
      if (e.volleys <= 0) {
        e.state = 'recover';
        e.st = 0.6 * fast;
        (P.eyeGlow as THREE.Sprite).scale.setScalar(0.7);
      }
    }
  } else if (e.state === 'recover') {
    e.vx = e.vz = 0;
    P.armR.rotation.x = lerp(P.armR.rotation.x, 0, 0.2);
    if (e.st <= 0) {
      e.state = 'stalk';
      e.st = C.pause * fast;
    }
  }
  return undefined;
}

/** A blow glances off the shielding twin's stone shield. */
export function glance(e: Enemy) {
  e.flash = 0.05;
  burst(e.x, 1, e.z, 0xe8dcc0, 5, 1.6, 0.035);
  Sfx.at(e.x, e.z).wardTink();
}

/** One twin has fallen: the other rages. */
export function twinFell(t: Enemy) {
  if (t.dead) return;
  t.rage = true;
  setRole(t, 'strike');
  if (t.state === 'guard' || t.state === 'statue') {
    t.state = 'stalk';
    t.st = 0.6;
    t.contact = 2;
  }
  t.halo!.material.color.setHex(RAGE);
  t.halo!.material.opacity = 0.6;
  ((t.parts!.eyeGlow as THREE.Sprite).material as THREE.SpriteMaterial).color.setHex(RAGE);
  banner(STR.bosses.twins.rage, '');
  Sfx.at(t.x, t.z).tigerRoar();
  G.shake = 0.4;
}
