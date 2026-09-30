/* Companions that artifacts bind to the mage. The Candle Moth, a pale moth drawn to the mage's lantern,
   flutters about them and stings the nearest foe with a lesser bolt now and then. The Weeping Skull circles
   the mage at chest height, swallowing enemy shots it meets and biting foes it passes through. Both come and
   go with their artifact (a new run takes them away). M4.1 binds two more things to the mage: the Twin Vigil Candles'
   flames at the shoulders, which brighten as the mage stands still (the bolts' strength is in projectiles.ts), and the
   Salt Circle, a ring that forms round a mage who stands still a moment and that walking foes can't cross (`saltHolds`,
   from the foes' movement), until the mage steps out of it. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { M, disposeTree, glow, markShared } from '../render/materials';
import { firePalette, makeFire } from '../render/fire';
import { burst } from './fx';
import { damageEnemy } from './damage';
import { fireSecondary } from './projectiles';
import { updateFennex } from './fennex';

const A = CFG.artifacts;
let moth: { g: THREE.Group; wings: THREE.Mesh[]; t: number; cd: number } | null = null;
let skull: { g: THREE.Group; tear: THREE.Sprite; a: number; bitten: Map<Enemy, number> } | null = null;

function makeMoth() {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xf0e8c8, transparent: true, opacity: .85, side: THREE.DoubleSide });
  const wings = [-1, 1].map(s => {
    const w = new THREE.Mesh(new THREE.CircleGeometry(.13, 10), mat); w.scale.set(1, .7, 1); w.position.x = s * .1; w.rotation.x = -Math.PI / 2; return w;
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.025, .1, 3, 6), new THREE.MeshBasicMaterial({ color: 0xa89878 })); body.rotation.x = Math.PI / 2;
  g.add(...wings, body, glow(0xffe8a8, .9, .55)); scene.add(g);
  return { g, wings, t: 0, cd: A.moth.every };
}

function makeSkull() {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), M.bone); head.scale.set(1, .92, 1.05);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.17, .07, .12), M.bone); jaw.position.set(0, -.13, .03);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(.17, .045, .03), M.wallTop); eyes.position.set(0, -.01, .14);
  const tear = glow(0x9fd0ff, .5, .8); tear.position.set(.05, -.06, .16);
  g.add(head, jaw, eyes, tear, glow(0xa8c8e0, .9, .35)); scene.add(g);
  return { g, tear, a: 0, bitten: new Map<Enemy, number>() };
}

/** The Twin Vigil Candles: a small flame over each shoulder, and its glow. */
let candles: { g: THREE.Group; flames: THREE.Group[]; lights: THREE.Sprite[] } | null = null;
const CANDLE = firePalette(0xffd878, 0xff9a3a);
function makeCandles() {
  const g = new THREE.Group(), flames: THREE.Group[] = [], lights: THREE.Sprite[] = [];
  for (const s of [-1, 1]) {
    const f = makeFire([{ x: 0, y: 0, z: 0, h: .16, w: .06, beat: s + 1 }], CANDLE, 2, .25); f.position.set(s * .3, 1.12, -.02);
    const l = glow(0xffd070, .55, .5); l.position.set(s * .3, 1.2, -.02);
    g.add(f, l); flames.push(f); lights.push(l);
  }
  scene.add(g);
  return { g, flames, lights };
}

/** The Salt Circle: where it lies, how long it has, and whether it is breaking. */
let salt: { g: THREE.Group; grains: THREE.InstancedMesh; x: number; z: number; t: number; gone: number } | null = null;
let saltParts: { ring: THREE.TorusGeometry; grains: THREE.BufferGeometry; glow: THREE.RingGeometry; mat: THREE.MeshStandardMaterial; ward: THREE.MeshBasicMaterial } | null = null;
function makeSalt(x: number, z: number) {
  const R = A.salt.radius;
  const P = saltParts ??= (() => {
    const ring = new THREE.TorusGeometry(R, .06, 4, 56); ring.rotateX(Math.PI / 2); ring.scale(1, .35, 1); ring.userData.shared = true;
    const grains = new THREE.OctahedronGeometry(.045, 0); grains.userData.shared = true;
    const gl = new THREE.RingGeometry(R - .18, R + .1, 48); gl.rotateX(-Math.PI / 2); gl.userData.shared = true;
    return { ring, grains, glow: gl,
      mat: markShared(new THREE.MeshStandardMaterial({ color: 0xf2eee2, roughness: .9, emissive: 0x3a3a34 })),
      ward: markShared(new THREE.MeshBasicMaterial({ color: 0xfff4d8, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending })) };
  })();
  const g = new THREE.Group(); g.position.set(x, .02, z);
  g.add(new THREE.Mesh(P.ring, P.mat), new THREE.Mesh(P.glow, P.ward));
  const grains = new THREE.InstancedMesh(P.grains, P.mat, 36);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2 + (i % 3) * .05, r = R + ((i * 7) % 5 - 2) * .03; m.compose(new THREE.Vector3(Math.cos(a) * r, .02, Math.sin(a) * r), q.setFromEuler(e.set(i, i * 2, 0)), new THREE.Vector3(1, .6, 1)); grains.setMatrixAt(i, m); }
  g.add(grains); g.scale.setScalar(.01); scene.add(g);
  burst(x, .2, z, 0xf2eee2, 18, 1.6, .03); Sfx.saltForm();
  return { g, grains, x, z, t: 0, gone: 0 };
}
/** The salt goes: its look, and its grains' instance buffer. */
const dropSalt = () => { salt?.grains.dispose(); return drop(salt); };
/** Walking foes (not a boss) can't cross the salt: one that would is set back at its edge, and one inside when it formed is
    thrust out. */
export function saltHolds(e: Enemy) {
  if (!salt || salt.gone || e.flying || e.isBoss || e.hidden) return;
  const dx = e.x - salt.x, dz = e.z - salt.z, d = Math.hypot(dx, dz) || .001, edge = A.salt.radius + e.r;
  if (d >= edge) return;
  e.x = salt.x + dx / d * edge; e.z = salt.z + dz / d * edge; e.vx = e.vz = 0;
}
/** Seconds the Salt Circle has lain (0 when there is none). */
export const saltCircle = () => salt && !salt.gone ? { x: salt.x, z: salt.z, t: salt.t } : null;

const drop = (o: { g: THREE.Group } | null) => { if (o) { scene.remove(o.g); disposeTree(o.g); } return null; };

/** The nearest foe the moth can see: in this room, awake, within reach. */
function nearestFoe(x: number, z: number, reach: number) {
  let best: Enemy | null = null, bd = reach;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden) continue;
    const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; best = e; }
  }
  return best;
}

/** Move the companions with the mage; `acting` is false while paused, in a pan or dying (they only hover). */
export function updateFamiliars(dt: number, now: number, acting: boolean) {
  const fx = player.stats.effects;
  updateFennex(dt, acting); // (M4.2: Fen-Nex, combat/fennex.ts)
  if (fx.has('moth')) {
    moth ??= makeMoth();
    const M_ = A.moth, a = now * 1.7;
    moth.g.position.set(player.x + Math.cos(a) * M_.orbit, 1.15 + Math.sin(now * 5) * .08, player.z + Math.sin(a) * M_.orbit * .8);
    moth.g.rotation.y = -a;
    for (const [i, w] of moth.wings.entries()) w.rotation.z = (i ? 1 : -1) * (.3 + Math.abs(Math.sin(now * 22)) * .9);
    if (acting) {
      moth.cd -= dt;
      const foe = moth.cd <= 0 ? nearestFoe(moth.g.position.x, moth.g.position.z, M_.range) : null;
      if (foe) {
        moth.cd = M_.every; const p = moth.g.position;
        fireSecondary(p.x, p.z, foe.x - p.x, foe.z - p.z, { damage: player.stats.damage * M_.damageMul, range: M_.range + 1, scale: .55, color: 0xffe8a8, speed: M_.speed });
        Sfx.moth();
      }
    }
  } else moth = drop(moth);

  if (fx.has('orbital')) {
    skull ??= makeSkull();
    const S = A.skull;
    skull.a += dt * S.spin;
    const x = player.x + Math.cos(skull.a) * S.orbit, z = player.z + Math.sin(skull.a) * S.orbit;
    skull.g.position.set(x, .75 + Math.sin(now * 3) * .05, z); skull.g.rotation.y = -skull.a + Math.PI;
    skull.tear.material.opacity = .5 + Math.sin(now * 4) * .3;
    if (acting) {
      for (let i = G.shots.length - 1; i >= 0; i--) { // it swallows enemy shots
        const s = G.shots[i];
        if (Math.hypot(s.x - x, s.z - z) < S.reach + s.r) { scene.remove(s.mesh); G.shots.splice(i, 1); burst(s.x, s.y, s.z, 0x9fd0ff, 5, 1.2, .04); }
      }
      for (const e of G.enemies) { // and bites what it passes through, resting between bites
        if (e.dead || e.spawn > 0 || e.hidden) continue;
        const last = skull.bitten.get(e) ?? -Infinity;
        if (now - last < S.every || Math.hypot(e.x - x, e.z - z) > e.r + S.reach) continue;
        skull.bitten.set(e, now); damageEnemy(e, S.damage, (e.x - player.x) / S.orbit, (e.z - player.z) / S.orbit, .4); Sfx.skullBite();
      }
      for (const e of skull.bitten.keys()) if (e.dead) skull.bitten.delete(e);
    }
  } else skull = drop(skull);

  if (fx.has('stillCandles')) { // brighter the longer the mage stands still, full once the bolts are steadied
    candles ??= makeCandles();
    const k = Math.min(1, player.still / A.still.after);
    candles.g.position.set(player.x, 0, player.z);
    candles.flames.forEach(f => f.scale.setScalar(.5 + .5 * k));
    candles.lights.forEach((l, i) => { l.material.opacity = .15 + .55 * k + Math.sin(now * 9 + i * 2) * .05; l.scale.setScalar(.35 + .35 * k); });
  } else candles = drop(candles);

  if (fx.has('saltCircle')) {
    if (!salt && acting && player.still >= A.salt.after) salt = makeSalt(player.x, player.z);
    if (salt) {
      salt.t += dt;
      if (!salt.gone && Math.hypot(player.x - salt.x, player.z - salt.z) > A.salt.radius + A.salt.keep) { salt.gone = .01; Sfx.saltBreak(); burst(salt.x, .2, salt.z, 0xf2eee2, 10, 1.2, .03); } // stepped out: it scatters
      if (salt.gone) { salt.gone += dt; salt.g.scale.setScalar(Math.max(.01, 1 - salt.gone * 4)); if (salt.gone > .25) salt = dropSalt(); }
      else salt.g.scale.setScalar(Math.min(1, salt.t * 5));
    }
  } else salt = dropSalt();
}
