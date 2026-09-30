/* Blast glyphs (GDD: Coins, keys and blast glyphs), the mage's answer to Isaac's bombs. The mage chalks a
   glyph at their feet (Space, or LT on a gamepad). It flares when its fuse burns out, or at once when one
   of the mage's own bolts strikes it, so the focus shapes how glyphs are used: bouncing bolts set them off
   round corners, the crook's bolt on its way back, twin bolts two at a time.

   A blast hurts every foe in reach (bosses too), knocks them back, breaks rocks, snuffs out enemy shots,
   sets off other glyphs in reach, and costs the mage a full heart if caught in it. It burns in the colour
   of the mage's bolts, so artifacts that change the bolts show in the glyphs too. The Glyphwright's Chalk
   widens the reach (and the ring that shows it); with the Warding Band the fuse burns faster, a ward rings
   the mage's feet as they chalk, and turns their own blasts aside. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Box, Glyph } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { disposeTree, glow } from '../render/materials';
import { glyphTexture } from '../render/textures';
import { WARD_COLOR, hitRock, strikeUrn } from '../world/rooms';
import { blastProps, strikeProp } from '../world/props';
import { caveIn } from '../world/themes';
import { blastSeal } from '../world/vault';
import { openSecret } from '../world/secret';
import { blastWisp } from '../world/shrine';
import { toast } from '../ui/hud';
import { STR } from '../strings';
import { giveResources, isContainer, openContainer } from '../items/pickups';
import { damageEnemy, hurtPlayer } from './damage';
import { addDecal, burst } from './fx';
import { clamp } from '../util';
import { breakPlate } from '../actors/bosses';
import { fireAt } from '../world/pools';

const C = CFG.glyph;
let geo: { rune: THREE.PlaneGeometry; reach: THREE.RingGeometry; wave: THREE.RingGeometry } | null = null;
function shapes() {
  if (geo) return geo;
  const rune = new THREE.PlaneGeometry(1.25, 1.25); rune.rotateX(-Math.PI / 2);
  const reach = new THREE.RingGeometry(C.radius - .05, C.radius, 56); reach.rotateX(-Math.PI / 2);
  const wave = new THREE.RingGeometry(.86, 1, 56); wave.rotateX(-Math.PI / 2);
  for (const g of [rune, reach, wave]) g.userData.shared = true;
  return geo = { rune, reach, wave };
}
const flat = (color: number, opacity: number, map?: THREE.Texture) =>
  new THREE.MeshBasicMaterial({ color, ...(map ? { map } : {}), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** Rings spreading out and fading: blasts' shockwaves (out to the blast's reach), and the Warding Band's ward. */
const waves: { g: THREE.Group; ring: THREE.Mesh; flash: THREE.Sprite; t: number; from: number; to: number; dur: number }[] = [];

/** The Warding Band's ward: a pale blue ring at the mage's feet. */
function wardRing(x: number, z: number) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const ring = new THREE.Mesh(shapes().wave, flat(WARD_COLOR, .9)); ring.position.y = .04;
  const flash = glow(WARD_COLOR, 1.4, .6); flash.position.y = .3;
  g.add(ring, flash); scene.add(g); waves.push({ g, ring, flash, t: 0, from: .35, to: .85, dur: .5 });
}
let cooldown = 0;

/** Chalk a glyph at the mage's feet, if they have one. */
export function placeGlyph() {
  if (cooldown > 0 || G.trans || G.state !== 'play') return false;
  if (player.glyphs <= 0) { Sfx.noGlyph(); cooldown = .3; return false; }
  if (G.current.type === 'merchant') { // the shop is warded: the chalk won't take, and nothing is spent
    burst(player.x, .1, player.z, WARD_COLOR, 8, 1.4, .04); Sfx.wardTink(); toast(STR.toast.shopWarded, 3); cooldown = .6;
    return false;
  }
  giveResources({ glyphs: -1 }); cooldown = C.cooldown;
  const color = player.stats.boltColor, s = shapes(), warded = player.stats.effects.has('glyphWard');
  const fuse = warded ? CFG.artifacts.wardingBand.fuse : C.fuse, radius = C.radius * player.stats.blastMul;
  const g = new THREE.Group(); g.position.set(player.x, 0, player.z);
  const rune = new THREE.Mesh(s.rune, flat(color, .9, glyphTexture())); rune.position.y = .02;
  const reach = new THREE.Mesh(s.reach, flat(color, .15)); reach.position.y = .015; reach.scale.setScalar(player.stats.blastMul); // how far the blast will reach
  const gl = glow(color, 1.4, .5); gl.position.y = .15;
  g.add(rune, reach, gl); scene.add(g);
  G.glyphs.push({ x: player.x, z: player.z, t: 0, fuse, fuseMax: fuse, radius, color, g, rune, reach, glow: gl, lastTick: 0, spent: false });
  burst(player.x, .1, player.z, color, 6, 1.2, .04); Sfx.inscribe();
  if (warded) wardRing(player.x, player.z);
  return true;
}

/** The first live glyph within `r` of (x, z). */
export function glyphNear(x: number, z: number, r = C.boltReach) {
  return G.glyphs.find(gl => !gl.spent && Math.hypot(gl.x - x, gl.z - z) < r);
}

/** Set a glyph off now (a bolt struck it, or its fuse ran out). */
export function detonateGlyph(gl: Glyph) {
  if (gl.spent) return;
  gl.spent = true; scene.remove(gl.g); disposeTree(gl.g);
  blast(gl.x, gl.z, gl.color, gl.radius);
  fireAt(gl.x, gl.z, gl.radius * .7); // and lights the oil around it
}

const touches = (b: Box, x: number, z: number, r: number) =>
  Math.hypot(x - clamp(x, b.x - b.hx, b.x + b.hx), z - clamp(z, b.z - b.hz, b.z + b.hz)) < r;

function blast(x: number, z: number, color: number, R: number) {
  const room = G.current;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden) continue;
    const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
    if (d > R + e.r) continue;
    const ux = d > .01 ? dx / d : 1, uz = d > .01 ? dz / d : 0;
    damageEnemy(e, C.damage, ux, uz);
    if (!e.isBoss) { e.kx += ux * C.knockback; e.kz += uz * C.knockback; }
    else if (e.plates) breakPlate(e); // (M4.2: the War-Tiger loses a plate)
  }
  for (const rock of room.rocks.slice()) {
    if (!touches(rock, x, z, R)) continue;
    if (rock.urn) strikeUrn(room, rock, true);          // urns, rune-sealed ones too
    else if (rock.prop) strikeProp(room, rock, true);   // piles, casks, glowcaps
    else if (rock.breakable) hitRock(room, rock, true);
  }
  blastProps(room, x, z, R); // rubble cleared, briars and cobwebs torn away
  caveIn(room, x, z); // in the collapsed crypt, more of the ceiling comes down
  for (const p of G.pickups) if (isContainer(p.kind) && !p.opened && Math.hypot(p.x - x, p.z - z) < R + .3) openContainer(p, true); // chests burn
  for (const d of room.doors) if (d.seal?.sealed && touches(d.box, x, z, R)) blastSeal(d.seal);       // a vault's ward cracks
  for (const d of room.doors) if (d.secret && !d.secret.open && touches(d.box, x, z, R)) openSecret(d); // a cracked wall breaks open
  blastWisp(x, z, R); // a shrine's curse, inside the circle
  for (let i = G.shots.length - 1; i >= 0; i--) { // enemy shots in reach unravel
    const s = G.shots[i];
    if (Math.hypot(s.x - x, s.z - z) < R) { scene.remove(s.mesh); G.shots.splice(i, 1); burst(s.x, s.y, s.z, s.color, 3, 1, .04); }
  }
  for (const o of G.glyphs) if (!o.spent && Math.hypot(o.x - x, o.z - z) <= R) o.fuse = Math.min(o.fuse, C.chainDelay);
  if (Math.hypot(player.x - x, player.z - z) < R + player.r * .5) { // caught in it: the Warding Band turns it aside
    if (player.stats.effects.has('glyphWard')) { wardRing(player.x, player.z); Sfx.wardTink(); } else hurtPlayer(C.selfDamage, x, z);
  }
  // the look: a shockwave out to the reach, a flash, sparks in the bolt colour, dust and a scorch mark
  const s = shapes(), g = new THREE.Group(); g.position.set(x, 0, z);
  const ring = new THREE.Mesh(s.wave, flat(color, .9)); ring.position.y = .05;
  const flash = glow(color, R * 2.6, .9); flash.position.y = .4;
  g.add(ring, flash); scene.add(g); waves.push({ g, ring, flash, t: 0, from: .3, to: R, dur: .3 });
  burst(x, .3, z, color, 22, 4.5, .07); burst(x, .2, z, 0x4a4038, 12, 3, .08);
  addDecal(x, z, 0x14100c, 1.1);
  G.shake = Math.max(G.shake, .35); Sfx.at(x, z).blast();
}

export function updateGlyphs(dt: number) {
  cooldown -= dt;
  for (const gl of G.glyphs) {
    if (gl.spent) continue;
    gl.t += dt; gl.fuse -= dt;
    if (gl.fuse <= 0) { detonateGlyph(gl); continue; }
    // the telegraph: the rune turns and flickers faster as the fuse burns down, ticking as it goes
    const k = clamp(1 - gl.fuse / gl.fuseMax, 0, 1), phase = gl.t * (3 + k * 11) * (1 + k);
    const flicker = .5 + .5 * Math.sin(phase * Math.PI * 2);
    const tick = Math.floor(phase);
    if (tick > gl.lastTick) { gl.lastTick = tick; Sfx.fuseTick(k); }
    gl.rune.scale.setScalar(Math.min(1, .3 + gl.t / .15 * .7));
    gl.rune.rotation.y += dt * (.6 + k * 3);
    (gl.rune.material as THREE.MeshBasicMaterial).opacity = .55 + .45 * flicker;
    (gl.reach.material as THREE.MeshBasicMaterial).opacity = .1 + .25 * k + .1 * flicker;
    gl.glow.material.opacity = .35 + .55 * flicker * (.4 + k * .6);
  }
  if (G.glyphs.some(gl => gl.spent)) G.glyphs = G.glyphs.filter(gl => !gl.spent);
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]; w.t += dt; const k = w.t / w.dur;
    if (k >= 1) { scene.remove(w.g); disposeTree(w.g); waves.splice(i, 1); continue; }
    w.ring.scale.setScalar(w.from + (w.to - w.from) * Math.sqrt(k));
    (w.ring.material as THREE.MeshBasicMaterial).opacity = .9 * (1 - k);
    w.flash.material.opacity = .9 * (1 - k) * (1 - k);
  }
}

/** Remove every glyph and shockwave (leaving a room, a new floor). */
export function clearGlyphs() {
  for (const gl of G.glyphs) { scene.remove(gl.g); disposeTree(gl.g); }
  for (const w of waves) { scene.remove(w.g); disposeTree(w.g); }
  G.glyphs.length = 0; waves.length = 0; cooldown = 0;
}
