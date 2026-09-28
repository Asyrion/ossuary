/* Bolts (the mage's cantrip) and enemy shots.

   The cantrip is a small pipeline: the focus decides how many bolts leave per cast and which path they
   take (straight, bounce off walls, boomerang back to the mage); every modifier from the other artifacts
   (damage, size, colour, piercing, rock breaking) applies to every bolt, whatever the path. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Bolt, Box, RockBox } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { basicMat, blob, glowShared, sphereGeo } from '../render/materials';
import { blockers } from '../world/collision';
import { hitRock, strikeUrn } from '../world/rooms';
import { shootDir } from '../input';
import { heroCast } from '../actors/hero';
import { damageEnemy, hurtPlayer } from './damage';
import { detonateGlyph, glyphNear } from './glyphs';
import { burst } from './fx';
import type { BoltPath } from '../items/artifactData';

interface BoltSpec { x: number; z: number; vx: number; vz: number; damage: number; range: number; scale: number; color: number; path: BoltPath; pierce: number; bounces: number; secondary: boolean }

function makeBolt(s: BoltSpec) {
  const mesh = new THREE.Group(); const y = .6;
  const shadow = blob(.35 * Math.min(1.4, s.scale)); shadow.position.y = -y + .015;
  mesh.add(new THREE.Mesh(sphereGeo(.1 * s.scale), basicMat(s.color)), glowShared(s.color, .75 * s.scale, .9), shadow);
  mesh.position.set(s.x, y, s.z); scene.add(mesh);
  const b: Bolt = {
    x: s.x, z: s.z, y, vx: s.vx, vz: s.vz, speed: Math.hypot(s.vx, s.vz), dist: 0, range: s.range, r: .12 * s.scale, mesh,
    damage: s.damage, color: s.color, path: s.path, pierce: s.pierce, bounces: s.bounces, returning: false, hit: new Set(), secondary: s.secondary,
  };
  G.bolts.push(b);
  return b;
}

/** Cast the cantrip in the current shooting direction, in the focus's pattern. */
export function spawnBolt() {
  const dir = shootDir(); if (!dir) return;
  const st = player.stats, p = st.pattern;
  const px = -dir.z, pz = dir.x; // sideways
  const vx = dir.x * st.shotSpeed + player.vx * CFG.hero.shotInherit, vz = dir.z * st.shotSpeed + player.vz * CFG.hero.shotInherit;
  // one bolt alternates between two "eyes"; several bolts fly side by side
  player.eye *= -1;
  const offsets = p.count === 1 ? [.1 * player.eye] : Array.from({ length: p.count }, (_, i) => (i - (p.count - 1) / 2) * p.spread);
  for (const off of offsets) {
    makeBolt({
      x: player.x + dir.x * .3 + px * off, z: player.z + dir.z * .3 + pz * off, vx, vz,
      damage: st.damage, range: st.range, scale: st.boltScale, color: st.boltColor,
      path: p.path, pierce: st.pierce, bounces: p.bounces, secondary: false,
    });
  }
  player.squash = 1; heroCast(); Sfx.shoot();
}

/** A ring of small burst bolts (Saint's Knucklebone on a death, Mourning Bell when hit). */
export function spawnBurst(x: number, z: number, count: number, offsetAngle = 0) {
  const B = CFG.artifacts.burst, st = player.stats;
  for (let i = 0; i < count; i++) {
    const a = offsetAngle + i / count * Math.PI * 2;
    makeBolt({
      x: x + Math.cos(a) * .3, z: z + Math.sin(a) * .3, vx: Math.cos(a) * B.speed, vz: Math.sin(a) * B.speed,
      damage: st.damage * B.damageMul, range: B.range, scale: B.scale, color: st.boltColor,
      path: 'straight', pierce: 0, bounces: 0, secondary: true,
    });
  }
}

/** Enemy projectile. */
export function spawnShot(x: number, z: number, dx: number, dz: number, speed: number, color: number, y = .55, size = 1) {
  const mesh = new THREE.Group();
  const sh = blob(.4); sh.position.y = -y + .015;
  mesh.add(new THREE.Mesh(sphereGeo(.13 * size), basicMat(color)), glowShared(color, .9 * size, .9), sh);
  scene.add(mesh); G.shots.push({ x, z, y, vx: dx * speed, vz: dz * speed, r: .14 * size, color, mesh });
}

export function clearProjectiles() {
  for (const b of G.bolts) scene.remove(b.mesh); G.bolts.length = 0;
  for (const s of G.shots) scene.remove(s.mesh); G.shots.length = 0;
}

const boxAt = (x: number, z: number, boxes: Box[]) => boxes.find(b => Math.abs(x - b.x) < b.hx && Math.abs(z - b.z) < b.hz);

function removeBolt(i: number, fizzle = true) {
  const b = G.bolts[i]; scene.remove(b.mesh); G.bolts.splice(i, 1);
  if (fizzle) { burst(b.x, Math.max(.1, b.y), b.z, b.color, b.secondary ? 3 : 5, 1.6, .05); Sfx.splash(); }
}

export function updateBolts(dt: number) {
  const room = G.current, solids = blockers(room, 'bolt');
  const breaker = player.stats.effects.has('rockBreaker');
  for (let i = G.bolts.length - 1; i >= 0; i--) {
    const b = G.bolts[i];
    if (b.path === 'boomerang' && b.returning) { // fly home to the mage, through everything
      const dx = player.x - b.x, dz = player.z - b.z, d = Math.hypot(dx, dz);
      if (d < .45) { removeBolt(i, false); continue; } // caught
      b.vx = dx / d * b.speed; b.vz = dz / d * b.speed;
    }
    const ox = b.x, oz = b.z;
    b.x += b.vx * dt; b.z += b.vz * dt; b.dist += b.speed * dt;
    let kill = false;
    if (b.path === 'boomerang') {
      b.y = .6;
      if (!b.returning && b.dist >= b.range) { b.returning = true; b.hit.clear(); }
      if (b.dist > b.range * 4) kill = true; // safety: never fly forever
    } else { // straight and bounce: drop to the floor over the last 30% of the range
      const R = b.range, fall = b.dist > R * .7 ? (b.dist - R * .7) / (R * .3) : 0;
      b.y = .6 * (1 - fall * fall);
      kill = b.dist >= R || b.y <= .05;
    }
    // walls, doors and rocks
    const box = !kill && !(b.path === 'boomerang' && b.returning) ? boxAt(b.x, b.z, solids) : undefined;
    if (box) {
      const rock = box as RockBox;
      if (rock.urn) strikeUrn(room, rock, false);                       // any bolt breaks an urn
      else if (breaker && room.rocks.includes(rock)) hitRock(room, rock); // Mason's Chisel cracks rocks
      if (b.path === 'bounce' && b.bounces > 0) {
        // reflect on the axis that ran into the box, from the last free position
        const hitX = !!boxAt(b.x, oz, solids), hitZ = !!boxAt(ox, b.z, solids);
        if (hitX || !hitZ) b.vx = -b.vx;
        if (hitZ || !hitX) b.vz = -b.vz;
        b.x = ox; b.z = oz; b.bounces--; b.hit.clear(); Sfx.splash();
      } else if (b.path === 'boomerang') { b.x = ox; b.z = oz; b.returning = true; b.hit.clear(); }
      else kill = true;
    }
    // enemies: each is hit at most once per pass; piercing and boomerangs carry on
    if (!kill) for (const e of G.enemies) {
      if (e.dead || e.spawn > 0 || e.hidden || b.hit.has(e)) continue;
      const ey = e.flying ? .8 : .5;
      if (Math.hypot(b.x - e.x, b.z - e.z) >= e.r + b.r || Math.abs(b.y - ey) >= 1.4) continue;
      damageEnemy(e, b.damage, b.vx / b.speed, b.vz / b.speed);
      b.hit.add(e);
      if (b.path === 'boomerang') continue;
      if (b.pierce > 0) { b.pierce--; continue; }
      kill = true; break;
    }
    // the mage's bolts set off blast glyphs they cross (not the one at the mage's feet as the bolt leaves)
    if (!kill && b.dist > CFG.glyph.boltArm) {
      const gl = glyphNear(b.x, b.z);
      if (gl) { detonateGlyph(gl); if (b.path !== 'boomerang') kill = true; }
    }
    b.mesh.position.set(b.x, b.y, b.z); b.mesh.children[2].position.y = -b.y + .015;
    if (kill) removeBolt(i);
  }
}

export function updateShots(dt: number) {
  const solids = blockers(G.current, 'bolt');
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i]; s.x += s.vx * dt; s.z += s.vz * dt; s.mesh.position.set(s.x, s.y, s.z);
    let kill = !!boxAt(s.x, s.z, solids);
    if (!kill && Math.hypot(player.x - s.x, player.z - s.z) < player.r + s.r) { hurtPlayer(1, s.x - s.vx, s.z - s.vz); kill = true; }
    if (kill) { scene.remove(s.mesh); G.shots.splice(i, 1); burst(s.x, s.y, s.z, s.color, 4, 1.2, .05); }
  }
}
