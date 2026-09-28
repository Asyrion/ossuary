/* Companions that artifacts bind to the mage. The Candle Moth, a pale moth drawn to the mage's lantern,
   flutters about them and stings the nearest foe with a lesser bolt now and then. The Weeping Skull circles
   the mage at chest height, swallowing enemy shots it meets and biting foes it passes through. Both come and
   go with their artifact (a new run takes them away). */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { M, disposeTree, glow } from '../render/materials';
import { burst } from './fx';
import { damageEnemy } from './damage';
import { fireSecondary } from './projectiles';

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
}
