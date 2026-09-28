/* Bosses: placeholder primitive shapes until the Tripo bosses (M4). A floor draws its boss from the pool
   in data/floors.json, never one the run has already met; the floor's boss block scales its health,
   speed and shot speed, how many foes it calls and how often it repeats its aimed attack.

   A boss's helpers fall with it, so no fight drags on while its rewards rise.

   Hollow Warden: walks at the mage; a ring of 12 shots (a second ring below 60%); aimed 3-shot volleys;
     calls rotlings below half health.
   Drowned Abbess: drifts; wails fans of aimed shots; sinks into the floor and follows the mage as a
     ripple that can't be hurt, then a widening ring warns where she surfaces with a ring of shots;
     calls wisps below half health, and surfaces with a second ring.
   Pyre Knight: stalks; crouches and leaps at where the mage stood (the landing spot glows) and lands
     with a shockwave ring; charges in a line until a wall or rock stuns him; sprays cones of embers;
     calls crypt hounds below half health, and his landings send a second ring. */
import * as THREE from 'three';
import { CFG, type BossType, type EnemyType } from '../config';
import type { Enemy } from '../types';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { glow } from '../render/materials';
import { FLOORS } from '../world/generate';
import { freeSpotNear, isFreeAt } from '../world/rooms';
import { spawnShot } from '../combat/projectiles';
import { burst } from '../combat/fx';
import { banner } from '../ui/hud';
import { makeEnemy, stdMat } from './enemies';
import { ease, lerp } from '../util';

type Add = (geo: THREE.BufferGeometry, mat: THREE.Material, px: number, py: number, pz: number, sx?: number, sy?: number, sz?: number) => THREE.Mesh;

const SHOT = { warden: 0xff6a3a, abbess: 0x6fe8d8, pyre: 0xff9a3a };
/** Who each boss calls below half health. */
const SUMMONS: Record<BossType, EnemyType> = { warden: 'rotling', abbess: 'wisp', pyre: 'hound' };

/** A flat ring lying on the floor (the abbess's ripple, the knight's landing mark), hidden at first. */
function floorRing(e: Enemy, color: number, radius: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .05, 6, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03; ring.visible = false; e.group.add(ring);
  return ring;
}

/** Build a boss's body and set its first state. */
export function buildBoss(e: Enemy, add: Add) {
  e.contact = 2; e.isBoss = true; e.cycle = 0; e.summoned = false;
  if (e.type === 'warden') {
    const iron = stdMat(0x3d3b42, { metalness: .6, roughness: .45 }), dark = stdMat(0x1e1c20, { metalness: .4 }), bone = stdMat(0xcfc2a6);
    add(new THREE.CylinderGeometry(.5, .78, 1.4, 8), iron, 0, .72, 0);
    add(new THREE.SphereGeometry(.34, 10, 8), iron, -.6, 1.35, 0, 1, .8, 1); add(new THREE.SphereGeometry(.34, 10, 8), iron, .6, 1.35, 0, 1, .8, 1);
    add(new THREE.CylinderGeometry(.28, .34, .5, 6), dark, 0, 1.7, 0);
    add(new THREE.ConeGeometry(.09, .45, 6), bone, -.26, 2.02, 0).rotation.z = .5;
    add(new THREE.ConeGeometry(.09, .45, 6), bone, .26, 2.02, 0).rotation.z = -.5;
    e.eye = add(new THREE.BoxGeometry(.36, .06, .05), new THREE.MeshBasicMaterial({ color: 0xff5a2a }), 0, 1.74, .3);
    e.ring = new THREE.Mesh(new THREE.TorusGeometry(.55, .035, 6, 32), new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: .8 }));
    e.ring.position.set(0, 1.75, -.25); e.body.add(e.ring);
    e.halo = glow(0xff4a1a, 2.2, .35); e.halo.position.set(0, 1.7, -.2); e.body.add(e.halo);
    e.state = 'walk'; e.st = 2.2;
  } else if (e.type === 'abbess') {
    // a drowned nun: a bell of wet robes, a veiled pale face, a verdigris halo, lamp-green eyes
    const robe = stdMat(0x1d3431, { roughness: .55 }), hem = stdMat(0x28463f, { roughness: .6 }), pale = stdMat(0xc3cdbd), weed = stdMat(0x3f5a2c);
    add(new THREE.ConeGeometry(.8, 1.55, 12), robe, 0, .78, 0);
    add(new THREE.CylinderGeometry(.82, .86, .16, 12), hem, 0, .08, 0);
    add(new THREE.SphereGeometry(.3, 12, 10), pale, 0, 1.62, .04, 1, 1.1, .95);
    add(new THREE.ConeGeometry(.42, .75, 12), hem, 0, 1.78, -.06);                          // veil
    for (const s of [-1, 1]) {
      add(new THREE.SphereGeometry(.11, 8, 6), pale, s * .34, 1.1, .38);                    // hands folded
      add(new THREE.CylinderGeometry(.03, .015, .7, 5), weed, s * .5, .9, .25).rotation.z = s * .2; // weed hanging off the robe
    }
    e.eye = add(new THREE.BoxGeometry(.24, .05, .04), new THREE.MeshBasicMaterial({ color: 0x8ff7e8 }), 0, 1.64, .32);
    e.ring = new THREE.Mesh(new THREE.TorusGeometry(.5, .03, 6, 32), new THREE.MeshBasicMaterial({ color: 0x6fe8d8, transparent: true, opacity: .75 }));
    e.ring.position.set(0, 1.7, -.3); e.body.add(e.ring);
    e.halo = glow(0x3fd8c8, 2.1, .35); e.halo.position.set(0, 1.5, -.2); e.body.add(e.halo);
    e.marker = floorRing(e, 0x6fe8d8, .75);
    e.state = 'drift'; e.st = 2;
  } else if (e.type === 'pyre') {
    // a knight in blackened plate, glowing at the seams, a flame for a plume, a great sword
    const plate = stdMat(0x2b2626, { metalness: .6, roughness: .45, emissive: 0x2a0c02 }), dark = stdMat(0x151212, { metalness: .5 }), steel = stdMat(0x8a8078, { metalness: .8, roughness: .3 });
    add(new THREE.BoxGeometry(.9, .9, .6), plate, 0, 1.05, 0);
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(.3, .62, .34), dark, s * .24, .31, 0);                     // legs
      add(new THREE.SphereGeometry(.3, 8, 6), plate, s * .6, 1.4, 0, 1, .75, 1);           // pauldrons
      add(new THREE.BoxGeometry(.2, .6, .22), dark, s * .62, .98, .05);                    // arms
    }
    add(new THREE.CylinderGeometry(.26, .3, .46, 8), plate, 0, 1.74, 0);                    // helm
    e.eye = add(new THREE.BoxGeometry(.34, .05, .05), new THREE.MeshBasicMaterial({ color: 0xffa040 }), 0, 1.76, .29);
    e.core = add(new THREE.ConeGeometry(.17, .55, 7), new THREE.MeshBasicMaterial({ color: 0xff7a2a }), 0, 2.23, 0); // plume of flame
    const blade = add(new THREE.BoxGeometry(.12, 1.35, .05), steel, .82, .86, .28); blade.rotation.x = .35;
    add(new THREE.BoxGeometry(.4, .07, .1), dark, .82, 1.5, .08);                           // cross guard
    e.halo = glow(0xff5a1a, 2.3, .35); e.halo.position.set(0, 1.6, -.2); e.body.add(e.halo);
    e.marker = floorRing(e, 0xff5a2a, .85);
    e.dir = { x: 0, z: 1 }; e.state = 'stalk'; e.st = 1.8;
  }
}

/** Below half health a boss calls its helpers, once; they have the floor's enemy health. */
function callHelp(e: Enemy) {
  e.summoned = true; Sfx.at(e.x, e.z).boom(); G.shake = .25; banner(STR.bosses[e.type as BossType].summon, '');
  const n = e.bossCfg?.summons ?? 2, cur = G.current, hpMul = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp;
  for (let i = 0; i < n; i++) {
    const p = freeSpotNear(cur, cur.cx + (n > 1 ? -4 + 8 * i / (n - 1) : 0), cur.cz + 1.5);
    makeEnemy(SUMMONS[e.type as BossType], p.x, p.z, hpMul).servant = true;
  }
}

function ringOfShots(e: Enemy, n: number, speed: number, offset: number, size = 1.25) {
  for (let i = 0; i < n; i++) { const a = offset + i / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), speed, SHOT[e.type as BossType], .9, size); }
}
/** `count` shots spread over `spread` radians around the direction to the mage. */
function fan(e: Enemy, count: number, spread: number, speed: number, turn: number, from = .8) {
  const base = Math.atan2(player.z - e.z, player.x - e.x) + turn, ux = Math.cos(base), uz = Math.sin(base);
  for (let i = 0; i < count; i++) {
    const a = base + (count > 1 ? (i / (count - 1) - .5) * spread : 0);
    spawnShot(e.x + ux * from, e.z + uz * from, Math.cos(a), Math.sin(a), speed, SHOT[e.type as BossType], 1, 1.1);
  }
}
/** A second ring a moment later, if the boss is still alive and the fight still on. */
function laterRing(e: Enemy, delay: number, n: number, speed: number, offset: number) {
  after(delay, () => { if (!e.dead && G.state === 'play' && G.enemies.includes(e)) ringOfShots(e, n, speed, offset); });
}

/** One step of a boss's behaviour. Returns the way it should face, when that isn't towards the mage. */
export function updateBoss(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  e.st -= dt;
  if (!e.summoned && e.hp / e.maxHp < .5 && !e.hidden) callHelp(e);
  if (e.type === 'warden') updateWarden(e, dt, ux, uz);
  else if (e.type === 'abbess') updateAbbess(e, dt, ux, uz);
  else if (e.type === 'pyre') return updateKnight(e, dt, ux, uz);
  return undefined;
}

/** After a boss has moved: the knight's landing mark stays put on the floor, and a charging knight that
    ran into something (a wall, rock, pit or closed door) is stunned. */
export function afterBossMove(e: Enemy, hit: boolean) {
  if (e.type !== 'pyre') return;
  const mark = e.marker!;
  if (mark.visible && e.target) mark.position.set(e.target.x - e.x, .03, e.target.z - e.z);
  if (!hit || e.state !== 'charge') return;
  e.state = 'stun'; e.st = 1.1; e.vx = e.vz = 0; e.body.rotation.x = 0;
  G.shake = Math.max(G.shake, .35); Sfx.at(e.x, e.z).boom(); Sfx.at(e.x, e.z).rubble();
  burst(e.x + e.dir!.x * .7, .8, e.z + e.dir!.z * .7, 0xff9a3a, 18, 3, .07);
}

function updateWarden(e: Enemy, dt: number, ux: number, uz: number) {
  const C = CFG.enemy.warden, B = e.bossCfg;
  const speed = C.speed * (B?.speedMul ?? 1), shotMul = B?.shotSpeedMul ?? 1;
  const hpFrac = e.hp / e.maxHp;
  const ring = e.ring!, eye = e.eye!, halo = e.halo!;
  ring.rotation.z += dt * (e.state.startsWith('wind') ? 6 : 1.2);
  if (e.state === 'walk') {
    e.vx = ux * speed * (hpFrac < .5 ? 1.25 : 1); e.vz = uz * speed * (hpFrac < .5 ? 1.25 : 1);
    e.body.position.y = Math.abs(Math.sin(e.t * 4)) * .05; eye.scale.set(1, 1, 1); halo.material.opacity = .35;
    if (e.st <= 0) { e.cycle = e.cycle! + 1; e.state = e.cycle % 2 ? 'windBurst' : 'windAim'; e.st = e.state === 'windBurst' ? .75 : .5; }
  } else if (e.state === 'windBurst' || e.state === 'windAim') {
    e.vx = e.vz = 0; const k = 1 - e.st / .75; halo.material.opacity = .35 + k * .6; eye.scale.set(1 + k, 1 + k * 2, 1);
    e.body.position.y = 0; e.body.position.x = Math.sin(e.t * 50) * .02;
    if (e.st <= 0) {
      e.body.position.x = 0;
      if (e.state === 'windBurst') {
        const off = Math.random() * Math.PI;
        ringOfShots(e, 12, 3.4 * shotMul, off);
        if (hpFrac < .6) laterRing(e, .32, 12, 3 * shotMul, off + Math.PI / 12);
        Sfx.at(e.x, e.z).boom(); G.shake = .18; e.state = 'walk'; e.st = 2.1;
      } else { e.state = 'volley'; e.volleys = B?.volleys ?? 3; e.st = 0; }
    }
  } else if (e.state === 'volley') {
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      fan(e, 3, .56, 4.4 * shotMul, 0);
      Sfx.at(e.x, e.z).enemyShot(); e.volleys = e.volleys! - 1; e.st = .3; if (e.volleys <= 0) { e.state = 'walk'; e.st = 2.4; }
    }
  }
}

function updateAbbess(e: Enemy, dt: number, ux: number, uz: number) {
  const C = CFG.enemy.abbess, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, ripple = e.marker!, mat = ripple.material as THREE.MeshBasicMaterial;
  e.ring!.rotation.z += dt * 1.5; e.halo!.material.opacity = .35;
  if (e.state === 'drift') {
    e.vx = ux * C.speed * speedMul; e.vz = uz * C.speed * speedMul;
    e.body.position.y = .08 + Math.sin(e.t * 2.2) * .06; e.eye!.scale.setScalar(1);
    if (e.st <= 0) { e.cycle = e.cycle! + 1; if (e.cycle % 2) { e.state = 'wail'; e.st = .6; Sfx.at(e.x, e.z).wail(); } else { e.state = 'sink'; e.st = .7; Sfx.at(e.x, e.z).dive(); } }
  } else if (e.state === 'wail') { // telegraph: the eyes flare and she trembles
    e.vx = e.vz = 0; const k = 1 - e.st / .6;
    e.eye!.scale.set(1 + k, 1 + k * 2, 1); e.halo!.material.opacity = .35 + k * .6; e.body.position.x = Math.sin(e.t * 45) * .03;
    if (e.st <= 0) { e.body.position.x = 0; e.state = 'fans'; e.volleys = B?.volleys ?? 3; e.st = 0; }
  } else if (e.state === 'fans') {
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      fan(e, 5, 1, 3.5 * shotMul, e.volleys! % 2 ? .1 : -.1, .6); Sfx.at(e.x, e.z).enemyShot();
      e.volleys = e.volleys! - 1; e.st = .42; if (e.volleys <= 0) { e.state = 'drift'; e.st = 2; }
    }
  } else if (e.state === 'sink') { // down into the water under the floor
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .7;
    e.body.position.y = -2.4 * k * k; ripple.visible = true; mat.opacity = k * .8; ripple.scale.setScalar(.8 + k * .3);
    if (k > .5 && !e.hidden) { e.hidden = true; burst(e.x, .1, e.z, 0x6fe8d8, 16, 2.4, .06); }
    if (e.st <= 0) { e.state = 'under'; e.st = C.under; e.flying = true; }
  } else if (e.state === 'under') { // a ripple gliding after the mage, under rocks and pits alike
    const d = Math.hypot(player.x - e.x, player.z - e.z);
    e.vx = ux * C.dive * speedMul; e.vz = uz * C.dive * speedMul;
    mat.opacity = .55 + Math.sin(e.t * 8) * .15; ripple.scale.setScalar(1.1 + Math.sin(e.t * 6) * .08);
    if (Math.random() < dt * 10) burst(e.x + (Math.random() - .5), .05, e.z + (Math.random() - .5), 0x6fe8d8, 1, .6, .04);
    if (e.st <= 0 || d < .4) { e.state = 'rise'; e.st = .75; Sfx.at(e.x, e.z).charge(); }
  } else if (e.state === 'rise') { // the ring widens where she will come up: the mage's cue to step away
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .75;
    ripple.scale.setScalar(1.1 + k * 1.1); mat.opacity = .5 + Math.abs(Math.sin(e.t * 18)) * .5;
    if (e.st <= 0) {
      if (!isFreeAt(G.current, e.x, e.z)) { const p = freeSpotNear(G.current, e.x, e.z); e.x = p.x; e.z = p.z; }
      e.hidden = false; e.flying = false; e.body.position.y = 0; ripple.visible = false;
      const off = Math.random() * Math.PI;
      ringOfShots(e, 12, 3.2 * shotMul, off);
      if (hurt) laterRing(e, .3, 12, 2.8 * shotMul, off + Math.PI / 12);
      burst(e.x, .3, e.z, 0x6fe8d8, 30, 4, .08); Sfx.at(e.x, e.z).surface(); G.shake = .3;
      e.state = 'recover'; e.st = .7;
    }
  } else if (e.state === 'recover') { // a moment to strike back
    e.vx = e.vz = 0; e.body.position.y = .08;
    if (e.st <= 0) { e.state = 'drift'; e.st = hurt ? 1.4 : 2; }
  }
}

function updateKnight(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const C = CFG.enemy.pyre, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, mark = e.marker!, mat = mark.material as THREE.MeshBasicMaterial;
  e.core!.scale.set(1, .85 + Math.sin(e.t * 17) * .12 + Math.sin(e.t * 29) * .08, 1); // the plume flickers
  e.halo!.material.opacity = .35;
  if (e.state === 'stalk') {
    const sp = C.speed * speedMul * (hurt ? 1.25 : 1);
    e.vx = ux * sp; e.vz = uz * sp; e.body.position.y = Math.abs(Math.sin(e.t * 5)) * .05; e.body.scale.y = 1; e.eye!.scale.setScalar(1);
    if (e.st <= 0) {
      e.cycle = e.cycle! + 1;
      const next = ['leap', 'spray', 'charge', 'spray'][e.cycle % 4];
      if (next === 'leap') {
        const p = freeSpotNear(G.current, player.x, player.z);
        e.target = { x: p.x, z: p.z }; e.state = 'crouch'; e.st = .55; mark.visible = true; Sfx.at(e.x, e.z).charge();
      } else if (next === 'charge') { e.state = 'aim'; e.st = .6; Sfx.at(e.x, e.z).charge(); }
      else { e.state = 'windSpray'; e.st = .45; }
    }
  } else if (e.state === 'crouch') {
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .55;
    e.body.scale.y = 1 - .22 * k; mat.opacity = .3 + k * .5;
    if (e.st <= 0) { e.state = 'air'; e.st = .85; e.from = { x: e.x, z: e.z }; e.hidden = true; e.flying = true; e.body.scale.y = 1; Sfx.at(e.x, e.z).leap(); }
  } else if (e.state === 'air') { // an arc over everything onto the mark
    const k = 1 - Math.max(0, e.st) / .85, t = e.target!, f = e.from!;
    e.vx = e.vz = 0; e.kx = e.kz = 0;
    e.x = lerp(f.x, t.x, ease(k)); e.z = lerp(f.z, t.z, ease(k));
    e.body.position.y = 4 * 2.6 * k * (1 - k);
    mat.opacity = .5 + Math.abs(Math.sin(e.t * 16)) * .5; mark.scale.setScalar(1 + (1 - k) * .4);
    if (e.st <= 0) {
      e.x = t.x; e.z = t.z; e.body.position.y = 0; e.hidden = false; e.flying = false; mark.visible = false; mark.scale.setScalar(1);
      const off = Math.random() * Math.PI;
      ringOfShots(e, 14, 3.4 * shotMul, off);
      if (hurt) laterRing(e, .3, 14, 2.9 * shotMul, off + Math.PI / 14);
      burst(e.x, .2, e.z, 0x5a4a40, 30, 4.5, .09); burst(e.x, .4, e.z, 0xff9a3a, 14, 3, .06);
      Sfx.at(e.x, e.z).boom(); Sfx.at(e.x, e.z).rubble(); G.shake = .45;
      e.state = 'recover'; e.st = .7;
    }
  } else if (e.state === 'aim') { // turns on the mage, shaking, visor flaring; the line is set at the end
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .6;
    e.eye!.scale.set(1 + k, 1 + k * 2, 1); e.halo!.material.opacity = .35 + k * .6; e.body.position.x = Math.sin(e.t * 50) * .03;
    e.dir = { x: ux, z: uz };
    if (e.st <= 0) { e.body.position.x = 0; e.state = 'charge'; e.st = 2.2; }
  } else if (e.state === 'charge') {
    const d = e.dir!; e.vx = d.x * C.charge * speedMul; e.vz = d.z * C.charge * speedMul; e.body.rotation.x = .2;
    if (Math.random() < dt * 30) burst(e.x, .15, e.z, 0xff7a2a, 1, 1, .05);
    if (e.st <= 0) { e.state = 'stalk'; e.st = 1.6; e.body.rotation.x = 0; }
    return Math.atan2(d.x, d.z);
  } else if (e.state === 'stun') { // ran into a wall: dazed and open to bolts
    e.vx = e.vz = 0; e.body.rotation.z = Math.sin(e.t * 20) * .08;
    if (e.st <= 0) { e.body.rotation.z = 0; e.state = 'stalk'; e.st = 1.6; }
    return e.face;
  } else if (e.state === 'windSpray') {
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .45;
    e.eye!.scale.set(1 + k, 1 + k, 1); e.halo!.material.opacity = .35 + k * .6;
    if (e.st <= 0) { e.state = 'spray'; e.volleys = B?.volleys ?? 3; e.st = 0; }
  } else if (e.state === 'spray') {
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      fan(e, 5, .9, 4.2 * shotMul, e.volleys! % 2 ? .09 : -.09); Sfx.at(e.x, e.z).ember();
      e.volleys = e.volleys! - 1; e.st = .34; if (e.volleys <= 0) { e.state = 'stalk'; e.st = 2; }
    }
  } else if (e.state === 'recover') {
    e.vx = e.vz = 0; e.body.scale.y = 1 - .15 * Math.max(0, e.st) / .7;
    if (e.st <= 0) { e.body.scale.y = 1; e.state = 'stalk'; e.st = 1.6; }
  }
  return undefined;
}
