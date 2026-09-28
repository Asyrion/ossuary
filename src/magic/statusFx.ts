/* Status effects on foes, in the game: applying them (the rules are in magic/status.ts), how each shows on any
   foe (flames licking up from a burning one, a blue tint deepening with each chill stack, a block of ice around
   a frozen one, sparks crackling on a shocked one), the burn's damage, the shock's leap to a neighbour, and the
   two reactions: Shatter bursts a frozen foe into ice shards that fly at its neighbours, Overload blows a
   burning foe apart and throws everything near it back. Reactions name themselves in the air, so players learn
   them. The training dummy (dev menu) shows its statuses and every hit it takes. */
import * as THREE from 'three';
import type { Enemy } from '../types';
import { G } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { glow, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { fireSecondary } from '../combat/projectiles';
import { MAGIC, applyStatus, consumeShock, newStatus, tickStatus, type Reaction } from './status';
import type { StatusKind } from './spellData';

const R = MAGIC.reactions;
const ICE = 0xbfe6ff, FIRE = 0xff7a2a, SPARK = 0xf0e890;

/** Apply a spell's statuses to a foe, and carry out what they set off. */
export function inflict(e: Enemy, status: Partial<Record<StatusKind, number>> | undefined) {
  if (!status || e.dead) return;
  for (const [kind, amount] of Object.entries(status) as [StatusKind, number][]) {
    if (e.dead) return;
    const res = applyStatus(e.status ??= newStatus(), kind, amount, !!e.isBoss);
    if (res.froze) { Sfx.freeze(); burst(e.x, .6, e.z, ICE, 12, 1.6, .05); }
    if (res.stunned) burst(e.x, .9, e.z, SPARK, 6, 2, .03);
    if (res.reaction) react(e, res.reaction);
  }
}

/** A hit landed on a shocked foe: the mark leaps to the nearest other foe with part of the hit. */
export function shockLeap(e: Enemy, dmg: number) {
  if (!consumeShock(e.status)) return;
  let best: Enemy | null = null, bd = MAGIC.shock.leapRange;
  for (const o of G.enemies) {
    if (o === e || o.dead || o.spawn > 0 || o.hidden) continue;
    const d = Math.hypot(o.x - e.x, o.z - e.z); if (d < bd) { bd = d; best = o; }
  }
  if (!best) return;
  sparkLine(e, best);
  damageEnemy(best, dmg * MAGIC.shock.leapShare, (best.x - e.x) / (bd || 1), (best.z - e.z) / (bd || 1), .3, 'spell');
}

function react(e: Enemy, r: Reaction) {
  floatText(e.x, 1.7, e.z, STR.reactions[r], r === 'shatter' ? ICE : 0xffc060);
  if (r === 'shatter') {
    removeIce(e);
    const S = R.shatter;
    for (let i = 0; i < S.shards; i++) {
      const a = i / S.shards * Math.PI * 2 + .3, x = e.x + Math.cos(a) * (e.r + .25), z = e.z + Math.sin(a) * (e.r + .25);
      fireSecondary(x, z, Math.cos(a), Math.sin(a), { damage: S.shardDamage, range: S.shardRange, scale: .6, color: ICE, speed: 9 });
    }
    burst(e.x, .6, e.z, ICE, 24, 3, .06); burst(e.x, .6, e.z, 0xffffff, 10, 2, .04);
    Sfx.shatter(); G.shake = Math.max(G.shake, .2);
    damageEnemy(e, S.damage, 0, 0, 0, 'spell');
  } else {
    const O = R.overload;
    flash(e.x, e.z, 0xffb050, O.radius);
    for (const o of G.enemies) {
      if (o.dead || o.spawn > 0 || o.hidden) continue;
      const dx = o.x - e.x, dz = o.z - e.z, d = Math.hypot(dx, dz);
      if (d > O.radius + o.r) continue;
      const ux = d > .01 ? dx / d : 1, uz = d > .01 ? dz / d : 0;
      damageEnemy(o, O.damage, ux, uz, 0, 'spell');
      if (!o.isBoss && o !== e) { o.kx += ux * O.knockback; o.kz += uz * O.knockback; }
    }
    burst(e.x, .6, e.z, FIRE, 22, 4, .07); burst(e.x, .8, e.z, SPARK, 14, 3.5, .04);
    Sfx.overload(); G.shake = Math.max(G.shake, .35);
  }
}

/* ---------- every step ---------- */

let ice: { geo: THREE.IcosahedronGeometry; mat: THREE.MeshStandardMaterial } | null = null;
function addIce(e: Enemy) {
  if (e.ice) return;
  ice ??= {
    geo: markShared(new THREE.IcosahedronGeometry(1, 0)),
    mat: markShared(new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: .45, roughness: .1, metalness: .1, emissive: 0x1a3a5a, flatShading: true, depthWrite: false })),
  };
  const m = new THREE.Mesh(ice.geo, ice.mat), s = e.r * 1.5 / e.scale;
  m.scale.set(s, s * 1.4, s); m.position.y = (e.flying ? .8 : .5) / e.scale; m.rotation.y = Math.random() * 3;
  e.group.add(m); e.ice = m;
}
function removeIce(e: Enemy) { if (e.ice) { e.group.remove(e.ice); e.ice = undefined; burst(e.x, .6, e.z, ICE, 10, 2, .05); } }

/** Statuses run their course: burn damage, thawing, and the look of each on the foe. */
export function updateStatuses(dt: number, now: number) {
  for (const e of G.enemies) {
    const s = e.status;
    if (!s || e.dead) continue;
    const { burnDamage, thawed } = tickStatus(s, dt);
    if (burnDamage > 0) damageEnemy(e, burnDamage, 0, 0, 0, 'spell');
    if (e.dead) continue;
    if (s.frozen > 0) addIce(e); else if (e.ice) { removeIce(e); if (thawed) Sfx.thaw(); }
    const y = e.flying ? .85 : .5;
    if (s.burn > 0 && Math.random() < dt * 14) burst(e.x + (Math.random() - .5) * e.r, y + .2, e.z + (Math.random() - .5) * e.r, Math.random() < .5 ? FIRE : 0xffc060, 1, .7, .05);
    if ((s.shock > 0 || s.stun > 0) && Math.random() < dt * 8) burst(e.x + (Math.random() - .5) * e.r * 2, y + .3, e.z + (Math.random() - .5) * e.r * 2, SPARK, 2, 2.4, .025);
    if (e.type === 'dummy') dummyLabel(e, now);
  }
  updateFloats(dt);
}

const tint = new THREE.Color();
/** The glow a foe's statuses give its body (the hit flash still wins), or null: icy blue while frozen, a bluer
    tint with each chill stack, a flickering ember glow while burning, a flicker of yellow while shocked. */
export function statusTint(e: Enemy, now: number): [THREE.Color, number] | null {
  const s = e.status; if (!s) return null;
  if (s.frozen > 0) return [tint.setHex(0x4a8ad8), .85];
  if (s.burn > 0) return [tint.setHex(0xff5a10), .45 + Math.sin(now * 17 + e.x) * .2];
  if (s.stun > 0 || (s.shock > 0 && Math.sin(now * 40) > .6)) return [tint.setHex(0xe8e070), .6];
  if (s.chill > 0) return [tint.setHex(0x3a6aa8), Math.min(.7, .3 * s.chill)];
  return null;
}

/* ---------- floating words, sparks and flashes ---------- */

const floats: { s: THREE.Sprite; t: number; y: number }[] = [];
const textTex = new Map<string, THREE.CanvasTexture>();
function textTexture(text: string, color: number, size = 44) {
  const key = `${text}|${color}|${size}`;
  let tex = textTex.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d')!;
    g.font = `600 ${size}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(8,6,4,.9)'; g.strokeText(text, 128, 34);
    g.fillStyle = `#${color.toString(16).padStart(6, '0')}`; g.fillText(text, 128, 34);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; textTex.set(key, tex);
    if (textTex.size > 200) { const first = textTex.keys().next().value!; textTex.get(first)!.dispose(); textTex.delete(first); }
  }
  return tex;
}
/** A word rising from a spot and fading: a reaction's name, a hit on the dummy. */
export function floatText(x: number, y: number, z: number, text: string, color: number, size = 44) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, color, size), transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(1.6, .4, 1); s.position.set(x, y, z); s.renderOrder = 10; scene.add(s);
  floats.push({ s, t: 0, y });
}
function updateFloats(dt: number) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt;
    if (f.t > .9) { scene.remove(f.s); f.s.material.dispose(); floats.splice(i, 1); continue; }
    f.s.position.y = f.y + f.t * .8; f.s.material.opacity = Math.min(1, (.9 - f.t) * 3);
  }
}

/** A quick spark between two foes (the shock leaping). */
function sparkLine(a: Enemy, b: Enemy) {
  const n = 5;
  for (let i = 1; i < n; i++) { const k = i / n; burst(a.x + (b.x - a.x) * k, .8, a.z + (b.z - a.z) * k, SPARK, 1, .6, .03); }
  Sfx.arc(1);
}
const flashes: { s: THREE.Sprite; t: number; size: number }[] = [];
function flash(x: number, z: number, color: number, radius: number) {
  const s = glow(color, radius * 2.4, .95); s.position.set(x, .5, z); scene.add(s); flashes.push({ s, t: 0, size: radius * 2.4 });
}
function updateFlashes(dt: number) {
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i]; f.t += dt; const k = f.t / .35;
    if (k >= 1) { scene.remove(f.s); f.s.material.dispose(); flashes.splice(i, 1); continue; }
    f.s.scale.setScalar(f.size * (.6 + .4 * k)); f.s.material.opacity = .95 * (1 - k);
  }
}

/** The training dummy's label: its statuses, redrawn when they change. */
function dummyLabel(e: Enemy, _now: number) {
  const s = e.status!, parts: string[] = [];
  if (s.burn > 0) parts.push(`${STR.statusNames.burn} ${s.burn.toFixed(1)}`);
  if (s.frozen > 0) parts.push(STR.statusNames.frozen);
  else if (s.chill > 0) parts.push(`${STR.statusNames.chill} ${s.chill}`);
  if (s.shock > 0) parts.push(STR.statusNames.shock);
  const text = parts.join(' · ');
  if (e.label?.userData.text === text) return;
  if (e.label) { e.group.remove(e.label); e.label.material.dispose(); e.label = undefined; }
  if (!text) return;
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, 0xe8dcc2, 26), transparent: true, depthWrite: false, depthTest: false }));
  lab.scale.set(2.2, .55, 1); lab.position.y = 2.1; lab.renderOrder = 10; lab.userData.text = text;
  e.group.add(lab); e.label = lab;
}

/** A hit on the training dummy: the damage rises from it. */
export function dummyHit(e: Enemy, dmg: number) { floatText(e.x + (Math.random() - .5) * .4, 1.5, e.z, dmg.toFixed(1), 0xf0d9b4, 34); }

/** Every step, outside the enemy loop: flashes fade. */
export function updateStatusFx(dt: number) { updateFlashes(dt); }

/** A new floor or run: no words or flashes left in the air. */
export function clearStatusFx() {
  for (const f of floats) { scene.remove(f.s); f.s.material.dispose(); } floats.length = 0;
  for (const f of flashes) { scene.remove(f.s); f.s.material.dispose(); } flashes.length = 0;
}
