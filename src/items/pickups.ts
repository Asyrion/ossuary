import * as THREE from 'three';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { TILT, scene } from '../render/renderer';
import { blob, glow, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { renderHearts } from '../ui/hud';

function heartShape(half: boolean) {
  const s = new THREE.Shape();
  if (half) { s.moveTo(0, .18); s.bezierCurveTo(-.12, .34, -.34, .28, -.34, .1); s.bezierCurveTo(-.34, -.05, -.05, -.22, 0, -.3); s.lineTo(0, .18); }
  else {
    s.moveTo(0, -.3); s.bezierCurveTo(.05, -.22, .34, -.05, .34, .1); s.bezierCurveTo(.34, .28, .12, .34, 0, .18);
    s.bezierCurveTo(-.12, .34, -.34, .28, -.34, .1); s.bezierCurveTo(-.34, -.05, -.05, -.22, 0, -.3);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 });
  if (!half) g.center(); else g.translate(0, 0, -.05);
  g.userData.shared = true;
  return g;
}
const HEART_GEO = { full: heartShape(false), half: heartShape(true) };
const heartMat = markShared(new THREE.MeshStandardMaterial({ color: 0xc02a1e, emissive: 0x4a0804, roughness: .35 }));

/** Heart on the floor; value is in halves (1 = half heart, 2 = full). */
export function spawnHeart(x: number, z: number, value: number) {
  const g = new THREE.Group(); const m = new THREE.Mesh(value === 2 ? HEART_GEO.full : HEART_GEO.half, heartMat);
  m.rotation.x = -TILT; m.position.y = .35; g.add(m, blob(.55)); g.position.set(x, 0, z); scene.add(g);
  G.pickups.push({ kind: 'heart', value, x, z, r: .3, g, m, t: Math.random() * 6, drop: .5 });
}

export function updatePickups(dt: number) {
  const ps = G.pickups;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.t += dt;
    if (p.drop > 0) p.drop -= dt;
    p.m.position.y = .35 + Math.sin(p.t * 3) * .06 + Math.max(0, p.drop) * 1.2; p.m.rotation.y = Math.sin(p.t * 1.6) * .5;
    const d = Math.hypot(player.x - p.x, player.z - p.z);
    if (d < player.r + p.r && p.drop <= 0) {
      if (player.hp < player.maxHp) {
        player.hp = Math.min(player.maxHp, player.hp + p.value); renderHearts(); Sfx.pickup();
        scene.remove(p.g); ps.splice(i, 1); burst(p.x, .4, p.z, 0xe0473a, 8, 2, .05);
      } else { // full health: nudge it away instead
        const nx = (p.x - player.x) / (d || 1), nz = (p.z - player.z) / (d || 1);
        p.x += nx * .05; p.z += nz * .05; p.g.position.set(p.x, 0, p.z);
      }
    }
  }
}

/** The way down that opens when the boss dies. */
export function makeTrapdoor(x: number, z: number) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.7, .06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffb35a }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .05;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.66, 32), new THREE.MeshBasicMaterial({ color: 0x0a0604 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = .02;
  const gl = glow(0xff8a30, 2.6, .55); gl.position.y = .4;
  g.add(disc, ring, gl); g.position.set(x, 0, z); scene.add(g);
  G.trapdoor = { g, x, z, ring, t: 0 };
}

export function updateTrapdoor(dt: number) {
  const p = G.trapdoor; if (!p) return;
  p.t += dt; p.ring.scale.setScalar(1 + Math.sin(p.t * 3) * .04);
}
