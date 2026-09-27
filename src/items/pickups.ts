/* Pickups on the floor: hearts, obols (single, or a purse), bone keys and glyph stones. Hearts can't be
   taken at full health; resources can't go past the cap. Obols drift to the living mage from close by. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { TILT, scene } from '../render/renderer';
import { M, blob, glow, glowShared, markShared } from '../render/materials';
import { glyphStoneTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { renderHearts, renderPurse } from '../ui/hud';
import { LOOT, RESOURCES, dropValue, type Drop, type Resource } from './loot';

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

/* Shared geometry and materials, made on first use. */
let parts: ReturnType<typeof makeParts> | null = null;
function makeParts() {
  const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
  const obol = shared(new THREE.CylinderGeometry(.19, .19, .04, 20)); obol.rotateX(Math.PI / 2);
  return {
    heart: { full: heartShape(false), half: heartShape(true) },
    heartMat: markShared(new THREE.MeshStandardMaterial({ color: 0xc02a1e, emissive: 0x4a0804, roughness: .35 })),
    obol, obolMat: markShared(new THREE.MeshStandardMaterial({ color: 0xc89a44, metalness: .6, roughness: .35, emissive: 0x4a3008 })),
    sack: shared(new THREE.SphereGeometry(.18, 10, 8)), sackMat: markShared(new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .85, emissive: 0x120a04 })),
    tie: shared(new THREE.CylinderGeometry(.05, .08, .1, 8)),
    bow: shared(new THREE.TorusGeometry(.075, .026, 6, 14)), shaft: shared(new THREE.BoxGeometry(.3, .045, .045)), bit: shared(new THREE.BoxGeometry(.045, .09, .045)),
    stone: shared(new THREE.PlaneGeometry(.52, .52)),
    stoneMat: markShared(new THREE.MeshBasicMaterial({ map: glyphStoneTexture(), transparent: true, depthWrite: false })),
  };
}

function visual(kind: Drop): THREE.Object3D {
  const P = parts ??= makeParts();
  if (kind === 'heart' || kind === 'halfHeart') {
    const m = new THREE.Mesh(kind === 'heart' ? P.heart.full : P.heart.half, P.heartMat); m.rotation.x = -TILT; return m;
  }
  const g = new THREE.Group();
  if (kind === 'coin') g.add(new THREE.Mesh(P.obol, P.obolMat), glowShared(0xffd27a, .8, .6));
  else if (kind === 'purse') {
    const sack = new THREE.Mesh(P.sack, P.sackMat); sack.scale.set(1, .85, 1);
    const tie = new THREE.Mesh(P.tie, P.sackMat); tie.position.y = .17;
    const coin = new THREE.Mesh(P.obol, P.obolMat); coin.position.set(.02, -.02, .17); coin.scale.setScalar(.7);
    g.add(sack, tie, coin, glowShared(0xffd27a, .7, .45));
  } else if (kind === 'key') { // a bone key: bow, shaft and bit
    const bow = new THREE.Mesh(P.bow, M.bone); bow.position.x = -.19;
    const shaft = new THREE.Mesh(P.shaft, M.bone);
    const bit1 = new THREE.Mesh(P.bit, M.bone); bit1.position.set(.12, -.06, 0);
    const bit2 = new THREE.Mesh(P.bit, M.bone); bit2.position.set(.05, -.05, 0); bit2.scale.y = .7;
    g.add(bow, shaft, bit1, bit2, glowShared(0xf0e6cc, .6, .35));
  } else { // a glyph stone, facing the camera
    const stone = new THREE.Mesh(P.stone, P.stoneMat); stone.rotation.x = -TILT;
    g.add(stone, glowShared(0xff9a3a, .75, .55));
  }
  return g;
}

/** Drop something on the floor at (x, z); it falls in from above. */
export function spawnPickup(kind: Drop, x: number, z: number) {
  const g = new THREE.Group(); const m = visual(kind);
  m.position.y = .35; g.add(m, blob(.55)); g.position.set(x, 0, z); scene.add(g);
  G.pickups.push({ kind, x, z, r: .3, g, m, t: Math.random() * 6, drop: .5 });
}
/** A heart; value is in halves (1 = half heart, 2 = full). */
export const spawnHeart = (x: number, z: number, value: number) => spawnPickup(value >= 2 ? 'heart' : 'halfHeart', x, z);

/** Add (or take, with negative amounts) obols, keys or glyphs, within 0 and the cap. */
export function giveResources(v: Partial<Record<Resource, number>>) {
  for (const k of RESOURCES) if (v[k]) player[k] = Math.max(0, Math.min(LOOT.cap, player[k] + v[k]!));
  renderPurse();
}
/** A new run's obols, keys and glyphs. */
export function resetResources() { for (const k of RESOURCES) player[k] = LOOT.start[k]; renderPurse(); }

const SOUND: Record<Drop, () => void> = {
  halfHeart: () => Sfx.pickup(), heart: () => Sfx.pickup(), coin: () => Sfx.coin(), purse: () => Sfx.coin(true), key: () => Sfx.key(), glyph: () => Sfx.glyphPickup(),
};
const SPARK: Record<Drop, number> = { halfHeart: 0xe0473a, heart: 0xe0473a, coin: 0xffd27a, purse: 0xffd27a, key: 0xf0e6cc, glyph: 0xff9a3a };

/** Take a pickup if the mage can use it: hearts below full health, resources below the cap. */
function take(p: typeof G.pickups[number]) {
  const v = dropValue(p.kind);
  if (v.hearts) {
    if (player.hp >= player.maxHp) return false;
    player.hp = Math.min(player.maxHp, player.hp + v.hearts); renderHearts();
  } else {
    const res = RESOURCES.find(k => v[k])!;
    if (player[res] >= LOOT.cap) return false;
    giveResources(v);
  }
  SOUND[p.kind](); burst(p.x, .4, p.z, SPARK[p.kind], 8, 2, .05);
  return true;
}

export function updatePickups(dt: number) {
  const ps = G.pickups;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.t += dt;
    if (p.drop > 0) p.drop -= dt;
    const heart = p.kind === 'heart' || p.kind === 'halfHeart';
    p.m.position.y = .35 + Math.sin(p.t * 3) * .06 + Math.max(0, p.drop) * 1.2;
    p.m.rotation.y = heart || p.kind === 'glyph' ? Math.sin(p.t * 1.6) * .5 : p.kind === 'coin' ? Math.sin(p.t * 2.2) * 1.1 : p.t * 2.4;
    let d = Math.hypot(player.x - p.x, player.z - p.z);
    // obols are drawn to the living: from close by they drift to the mage
    if ((p.kind === 'coin' || p.kind === 'purse') && p.drop <= 0 && d < CFG.pickups.obolDrift && d > .01 && player.coins < LOOT.cap) {
      const step = Math.min(d, (1.5 + (CFG.pickups.obolDrift - d) * 3) * dt);
      p.x += (player.x - p.x) / d * step; p.z += (player.z - p.z) / d * step; p.g.position.set(p.x, 0, p.z);
      d -= step;
    }
    if (d < player.r + p.r && p.drop <= 0) {
      if (take(p)) { scene.remove(p.g); ps.splice(i, 1); }
      else { // can't use it now: nudge it away instead
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
