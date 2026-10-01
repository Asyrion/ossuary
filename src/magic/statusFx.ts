/* Status effects on foes, in the game: applying them (the rules are in magic/status.ts), how each shows on any
   foe (flames licking up from a burning one, a blue tint deepening with each chill stack, a block of ice around
   a frozen one, sparks crackling on a shocked one), the burn's damage, the shock's leap to a neighbour, and the
   two reactions: Shatter bursts a frozen foe into ice shards that fly at its neighbours, Overload blows a
   burning foe apart and throws everything near it back. M4.1 adds Hallow's and Umbral's: a sanctified foe glows gold,
   a hexed one violet, a rooted one is held by the shadow at its feet; Eclipse hangs a black sun over a foe it takes out
   of the fight and strikes it when it comes back, Blackfire burns violet and never goes out. Reactions name themselves
   in the air, so players learn them. The training dummy (dev menu) shows its statuses and every hit it takes. */
import * as THREE from 'three';
import type { Enemy } from '../types';
import { CFG } from '../config';
import { G } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { disposeTree, glow, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy, drink } from '../combat/damage';
import { drinksStatus } from '../actors/foeData';
import { fireSpellBolt } from '../combat/projectiles';
import { MAGIC, applyStatus, consumeShock, newStatus, tickStatus, type Reaction } from './status';
import { STATUS_KINDS, type SpellStatus, type StatusKind } from './spellData';
import { SCHOOL_LIGHT } from '../render/arcane';
import { touchPools } from '../world/pools';
import { ringFx, strikeFx } from './spellFx';
import { breakPlate } from '../actors/bosses';
import { foeAfflicted } from '../actors/foes';
import { steamAt } from './steam';

const R = MAGIC.reactions;
const ICE = 0xbfe6ff, FIRE = 0xff7a2a, SPARK = 0xf0e890, GOLD = SCHOOL_LIGHT.hallow, VIOLET = SCHOOL_LIGHT.umbral, BLACKFIRE = 0x8a3ae0, STEAM = 0xe8f2f8;

/** Apply a spell's statuses to a foe, and carry out what they set off. */
export function inflict(e: Enemy, status: Partial<Record<SpellStatus, number>> | undefined) {
  if (!status || e.dead || e.ward) return; // (M4.2: a drinking ward keeps statuses off the foe inside it)
  for (const [kind, amount] of Object.entries(status) as [SpellStatus, number][]) {
    if (e.dead) return;
    if (kind === 'shock' && e.plates && (e.status?.chill ?? 0) >= MAGIC.chill.bossMaxStacks) { e.status!.chill = 0; react(e, 'shatter'); breakPlate(e); continue; } // (M4.2: a shock on the War-Tiger's rimed plates shatters one)
    if (drinksStatus(e.foe, kind)) { // (M4.5: an elemental drinks its own school's status; the ground under it still hears it)
      drink(e, amount * CFG.bestiary.statusHeal); foeAfflicted(e, kind); if ((STATUS_KINDS as string[]).includes(kind)) touchPools(e, kind as StatusKind); continue;
    }
    const res = applyStatus(e.status ??= newStatus(), kind, amount, !!e.isBoss);
    if (res.froze) { Sfx.at(e.x, e.z).freeze(); burst(e.x, .6, e.z, ICE, 12, 1.6, .05); }
    if (res.stunned) burst(e.x, .9, e.z, SPARK, 6, 2, .03);
    if (res.reaction) react(e, res.reaction);
    foeAfflicted(e, kind); // (M4.5: what its behaviour does about it)
    if ((STATUS_KINDS as string[]).includes(kind)) touchPools(e, kind as StatusKind); // oil catches fire, water freezes or carries the shock
    else if (kind === 'hex') burst(e.x, .8, e.z, VIOLET, 4, 1.2, .03); else if (kind === 'sanct') burst(e.x, .8, e.z, GOLD, 4, 1.2, .03);
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
  damageEnemy(best, dmg * MAGIC.shock.leapShare, (best.x - e.x) / (bd || 1), (best.z - e.z) / (bd || 1), .3, 'spell', 'storm');
}

function react(e: Enemy, r: Reaction) {
  floatText(e.x, 1.7, e.z, STR.reactions[r], r === 'shatter' ? ICE : r === 'eclipse' ? 0xd8b0ff : r === 'blackfire' ? 0xb070ff : r === 'steam' ? STEAM : 0xffc060);
  if (r === 'eclipse') { // taken out of the fight under a black sun (a boss only struck, at once)
    burst(e.x, .9, e.z, VIOLET, 18, 2.6, .05); burst(e.x, .9, e.z, GOLD, 12, 2.2, .04); ringFx(e.x, .9, e.z, GOLD, .2, 1.3, CFG.spellFx.flash);
    Sfx.at(e.x, e.z).eclipse();
    if (e.isBoss) { damageEnemy(e, R.eclipse.damage, 0, 0, 0, 'spell'); return; }
    e.hidden = true; e.body.visible = false; e.sun = blackSun(); e.sun.position.set(0, e.flying ? .95 : .75, 0); e.group.add(e.sun);
    return;
  }
  if (r === 'blackfire') { burst(e.x, .7, e.z, BLACKFIRE, 18, 2.4, .05); Sfx.at(e.x, e.z).blackfire(); return; }
  if (r === 'steam') { // fire and cold go up together: a cloud round the foe (nothing inside can aim, no eye sees through it), the foe scalded
    removeIce(e); steamAt(e.x, e.z); burst(e.x, .6, e.z, STEAM, 20, 2.2, .07); ringFx(e.x, .1, e.z, STEAM, .3, R.steam.radius, CFG.spellFx.shockwave, true);
    Sfx.at(e.x, e.z).steam(); damageEnemy(e, R.steam.damage, 0, 0, 0, 'spell');
    return;
  }
  if (r === 'shatter') {
    removeIce(e);
    const S = R.shatter;
    for (let i = 0; i < S.shards; i++) {
      const a = i / S.shards * Math.PI * 2 + .3, x = e.x + Math.cos(a) * (e.r + .25), z = e.z + Math.sin(a) * (e.r + .25);
      fireSpellBolt(x, z, Math.cos(a), Math.sin(a), { damage: S.shardDamage, range: S.shardRange, scale: .8, color: ICE, speed: 9, shard: true });
    }
    burst(e.x, .6, e.z, ICE, 24, 3, .06); burst(e.x, .6, e.z, 0xffffff, 10, 2, .04);
    ringFx(e.x, .6, e.z, 0xffffff, .15, 1.1, CFG.spellFx.flash); ringFx(e.x, .05, e.z, ICE, .2, 1.5, CFG.spellFx.shockwave, true); // a flash, and frost thrown out over the floor
    Sfx.at(e.x, e.z).shatter(); G.shake = Math.max(G.shake, .2);
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
    ringFx(e.x, .05, e.z, FIRE, .3, O.radius, CFG.spellFx.shockwave, true); ringFx(e.x, .7, e.z, 0xffe080, .2, 1.2, CFG.spellFx.flash); // the shockwave, and a flash
    for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, d = O.radius * (.4 + Math.random() * .4); strikeFx({ x: e.x, y: .7, z: e.z }, { x: e.x + Math.cos(a) * d, y: .2 + Math.random() * .6, z: e.z + Math.sin(a) * d }, SPARK, CFG.spellFx.crackle, true); }
    Sfx.at(e.x, e.z).overload(); G.shake = Math.max(G.shake, .35);
  }
}

/** Eclipse's black sun: a dark orb in a crown of gold light (Hallow round Umbral), made for each foe it takes. */
function blackSun() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(sunGeo(), new THREE.MeshBasicMaterial({ color: 0x06030a })));
  const crown = glow(GOLD, 1.6, .85); g.add(crown);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 4, 24), new THREE.MeshBasicMaterial({ color: GOLD })); rim.rotation.x = -Math.PI / 4; g.add(rim);
  return g;
}
let sunGeoKept: THREE.SphereGeometry | null = null;
const sunGeo = () => sunGeoKept ??= markShared(new THREE.SphereGeometry(.27, 14, 10));
/** The eclipse is over: the foe comes back, and is struck. */
function endEclipse(e: Enemy) {
  if (e.sun) { e.group.remove(e.sun); disposeTree(e.sun); e.sun = undefined; } // (the sphere is shared; sprites' geometry is everyone's)
  e.hidden = false; e.body.visible = true;
  burst(e.x, .8, e.z, 0x2a0a4a, 16, 2.4, .05); burst(e.x, .8, e.z, GOLD, 10, 2, .04);
  damageEnemy(e, R.eclipse.damage, 0, 0, 0, 'spell');
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
    const { burnDamage, thawed, eclipsed } = tickStatus(s, dt);
    if (eclipsed) endEclipse(e);
    if (s.eclipse > 0) { if (e.sun) e.sun.rotation.y += dt * 2; continue; } // (out of the fight: nothing shows but its sun)
    if (burnDamage > 0) damageEnemy(e, burnDamage, 0, 0, 0, e.lastHit ?? 'spell', 'ember'); // the fire is whoever lit it last
    if (e.dead) continue;
    if (s.burn > 0) touchPools(e, 'burn'); // a burning foe walking into oil sets it alight
    if (s.frozen > 0) addIce(e); else if (e.ice) { removeIce(e); if (thawed) Sfx.at(e.x, e.z).thaw(); }
    const y = e.flying ? .85 : .5;
    if (s.burn > 0 && Math.random() < dt * 14) burst(e.x + (Math.random() - .5) * e.r, y + .2, e.z + (Math.random() - .5) * e.r, s.black ? (Math.random() < .5 ? BLACKFIRE : 0x2a0a4a) : Math.random() < .5 ? FIRE : 0xffc060, 1, .7, .05);
    if (s.hex > 0 && Math.random() < dt * 3 * s.hex) burst(e.x + (Math.random() - .5) * e.r * 1.6, y + .35, e.z + (Math.random() - .5) * e.r * 1.6, VIOLET, 1, .5, .03);
    if (s.sanct > 0 && Math.random() < dt * 6) burst(e.x + (Math.random() - .5) * e.r * 1.6, y + .5, e.z + (Math.random() - .5) * e.r * 1.6, GOLD, 1, .8, .03);
    if (s.root > 0 && Math.random() < dt * 5) burst(e.x + (Math.random() - .5) * e.r * 2, .08, e.z + (Math.random() - .5) * e.r * 2, 0x2a0a4a, 1, .4, .04);
    if ((s.shock > 0 || s.stun > 0) && Math.random() < dt * 8) burst(e.x + (Math.random() - .5) * e.r * 2, y + .3, e.z + (Math.random() - .5) * e.r * 2, SPARK, 2, 2.4, .025);
    if (e.type === 'dummy') dummyLabel(e, now);
  }
  updateFloats(dt);
}

const tint = new THREE.Color();
/** The glow a foe's statuses give its body (the hit flash still wins), or null: icy blue while frozen, a bluer
    tint with each chill stack, a flickering ember glow while burning, a flicker of yellow while shocked. */
export function statusTint(e: Enemy, now: number): [THREE.Color, number] | null {
  if (e.statue) return [tint.setHex(0xa88a4a), .7]; // a treasury's guardian stands gilded, a statue until its gold is taken
  if (e.type === 'tiger' && e.state === 'statue') return [tint.setHex(0x8a94a4), .45]; // (the War-Tiger, stone until it wakes)
  if (e.foe && e.state === 'rock') return [tint.setHex(0x4a4440), .8]; // (M4.5: a magma ooze frozen hard)
  const s = e.status; if (!s) return null;
  if (s.frozen > 0) return [tint.setHex(0x4a8ad8), .85];
  if (s.burn > 0 && s.black) return [tint.setHex(0x6a1ac0), .5 + Math.sin(now * 17 + e.x) * .2];
  if (s.burn > 0) return [tint.setHex(0xff5a10), .45 + Math.sin(now * 17 + e.x) * .2];
  if (s.sanct > 0) return [tint.setHex(0xc89a30), .45 + Math.sin(now * 6) * .1];
  if (s.hex > 0) return [tint.setHex(0x6a2ab0), Math.min(.6, .2 + s.hex * .08)];
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
  Sfx.at(b.x, b.z).arc(1);
}
const flashes: { s: THREE.Sprite; t: number; size: number }[] = [];
/** A bright flash on a spot, fading in a third of a second (Overload, Pyre Seal). */
export function flash(x: number, z: number, color: number, radius: number) {
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
  if (s.sanct > 0) parts.push(STR.statusNames.sanct);
  if (s.hex > 0) parts.push(`${STR.statusNames.hex} ${s.hex}`);
  if (s.root > 0) parts.push(STR.statusNames.root);
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
