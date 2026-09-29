/* Water and oil on the floor (GDD: Rooms react to magic). A room's pools are the template's `~` and `%` tiles joined
   side by side, and on the drowned floor puddles grown over the floor of its fights. Oil catches fire from Burn, fire
   spells and blasts, and burns for a few seconds, setting walking foes on it burning and hurting the mage; then it
   is spent, leaving soot. Water is shallow: the mage and walking foes wade through it slower; Shock on anything
   standing in it runs through the whole pool, to every foe in it and the mage too; Frost freezes it over for a
   while, crossed at full speed and conducting nothing, and fire melts it again. Flyers are above it all. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy, Pool, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { floorOwnedTexture } from '../render/textures';
import { addDecal, burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { inflict } from '../magic/statusFx';
import { riseMote } from '../magic/shapes';
import type { StatusKind } from '../magic/spellData';
import { poolsOf } from './templates';
import { burnPropsAt } from './props';

const C = CFG.surface;
const FIRE = 0xff7a2a, EMBER = 0xffc060, ICE = 0xbfe6ff, SPARK = 0xf0e890, WATER = 0x5a8a9a;

/** How each state looks: colour, glow, gloss and opacity over the floor. */
const LOOK = {
  water: { color: 0x2a5a6a, emissive: 0x0a2430, roughness: .08, metalness: .45, opacity: .78 },
  frozen: { color: 0xc4e6f6, emissive: 0x2a4e6e, roughness: .2, metalness: .1, opacity: .9 },
  oil: { color: 0x1a1410, emissive: 0x160c1c, roughness: .04, metalness: .6, opacity: .94 },
  burning: { color: 0x2a1208, emissive: 0xff6a1a, roughness: .7, metalness: 0, opacity: .96 },
};
function dress(p: Pool) {
  const L = p.state === 'frozen' ? LOOK.frozen : p.state === 'burning' ? LOOK.burning : p.kind === 'water' ? LOOK.water : LOOK.oil;
  p.mat.color.setHex(L.color); p.mat.emissive.setHex(L.emissive); p.mat.roughness = L.roughness; p.mat.metalness = L.metalness; p.mat.opacity = L.opacity;
  p.mat.userData.emissive = L.emissive;
}

/* ---------- building ---------- */

/** The pools of a room, from its template's tiles: one mesh each, its outline soft and rounded. */
export function buildPools(room: Room) {
  const { minX, minZ } = room.bounds;
  room.pools = []; room.poolGrid = room.template.tiles.map(row => row.map(() => undefined));
  for (const { kind, tiles } of poolsOf(room.template)) {
    const at = tiles.map(t => ({ ...t, x: minX + t.c + .5, z: minZ + t.r + .5 }));
    const { mesh, mat } = poolMesh(room, tiles);
    const p: Pool = { kind, tiles: at, state: 'still', t: 0, charged: 0, tick: 0, mesh, mat };
    dress(p); room.group.add(mesh); room.pools.push(p);
    for (const t of tiles) room.poolGrid[t.r][t.c] = p;
  }
}

/** A new pool poured into the room while it is played (a broken oil cask's spill): its tiles become the pool's. */
export function addPool(room: Room, kind: Pool['kind'], tiles: { c: number; r: number }[]) {
  if (!tiles.length) return;
  const { minX, minZ } = room.bounds;
  room.pools ??= []; room.poolGrid ??= room.template.tiles.map(row => row.map(() => undefined));
  const { mesh, mat } = poolMesh(room, tiles);
  const p: Pool = { kind, tiles: tiles.map(t => ({ ...t, x: minX + t.c + .5, z: minZ + t.r + .5 })), state: 'still', t: 0, charged: 0, tick: 0, mesh, mat };
  dress(p); room.group.add(mesh); room.pools.push(p);
  for (const t of tiles) { room.poolGrid[t.r][t.c] = p; room.template.tiles[t.r][t.c] = kind; }
  return p;
}

/** A flat mesh over the pool's tiles, its outline drawn as blurred circles joined up (an alpha map). */
function poolMesh(room: Room, tiles: { c: number; r: number }[]) {
  const P = 32, c0 = Math.min(...tiles.map(t => t.c)), c1 = Math.max(...tiles.map(t => t.c)), r0 = Math.min(...tiles.map(t => t.r)), r1 = Math.max(...tiles.map(t => t.r));
  const w = c1 - c0 + 2, h = r1 - r0 + 2; // half a tile of margin all round
  const cv = document.createElement('canvas'); cv.width = w * P; cv.height = h * P;
  const g = cv.getContext('2d')!; g.filter = 'blur(6px)'; g.fillStyle = '#fff';
  const has = new Set(tiles.map(t => t.c + ',' + t.r)), in_ = (c: number, r: number) => has.has(c + ',' + r);
  for (const t of tiles) {
    const x = (t.c - c0 + 1) * P, y = (t.r - r0 + 1) * P;
    // a rounded square per tile, bridged to its neighbours, blurred: an organic outline with soft edges
    g.beginPath(); g.roundRect(x - P * .5, y - P * .5, P, P, P * .4); g.fill();
    if (in_(t.c + 1, t.r)) g.fillRect(x, y - P * .5, P, P);
    if (in_(t.c, t.r + 1)) g.fillRect(x - P * .5, y, P, P);
  }
  const alpha = floorOwnedTexture(new THREE.CanvasTexture(cv));
  const detail = floorOwnedTexture(detailTexture().clone()); detail.repeat.set(w / 2, h / 2); detail.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ alphaMap: alpha, map: detail, emissiveMap: detail, transparent: true, depthWrite: false });
  const geo = new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 1;
  mesh.position.set(room.bounds.minX + c0 - .5 + w / 2 - room.cx, .01, room.bounds.minZ + r0 - .5 + h / 2 - room.cz);
  return { mesh, mat };
}

/** Grey swirls and ripples that tile: the surface of water and oil, and the patches of fire on burning oil. */
let detailTex: THREE.CanvasTexture | null = null;
function detailTexture() {
  if (detailTex) return detailTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, 128, 128);
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) { // soft light and dark patches, wrapped at the edges so the texture tiles
    const x = rnd() * 128, y = rnd() * 128, rad = 6 + rnd() * 22, v = rnd() < .5 ? 255 : 40;
    for (const [ox, oy] of [[0, 0], [128, 0], [-128, 0], [0, 128], [0, -128]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(${v},${v},${v},.18)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 1.2; // ripples
  for (let i = 0; i < 14; i++) { const x = rnd() * 128, y = rnd() * 128, r = 4 + rnd() * 10; g.beginPath(); g.arc(x, y, r, rnd() * 3, rnd() * 3 + 2); g.stroke(); }
  detailTex = new THREE.CanvasTexture(c); detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping; detailTex.colorSpace = THREE.SRGBColorSpace;
  return detailTex;
}

/* ---------- where things stand ---------- */

/** The pool under (x, z) in the current room, if any (spent oil is gone). */
export function poolAt(x: number, z: number, room = G.current) {
  const p = room.poolGrid?.[Math.floor(z - room.bounds.minZ)]?.[Math.floor(x - room.bounds.minX)];
  return p && p.state !== 'spent' ? p : undefined;
}
/** How fast one can walk at (x, z): slower wading through water that isn't frozen. */
export function wadeAt(x: number, z: number) {
  const p = poolAt(x, z);
  return p?.kind === 'water' && p.state === 'still' ? C.wade : 1;
}
/** Pools with a tile within `r` of (x, z). */
function poolsNear(x: number, z: number, r: number) {
  return (G.current.pools ?? []).filter(p => p.state !== 'spent' && p.tiles.some(t => Math.abs(x - t.x) < .5 + r && Math.abs(z - t.z) < .5 + r));
}
const inPool = (p: Pool, x: number, z: number) => poolAt(x, z) === p;

/* ---------- what magic does to them ---------- */

/** Fire reaches (x, z) and `r` around it: oil there catches alight, ice melts. */
export function fireAt(x: number, z: number, r = 0) {
  burnPropsAt(x, z, r); // roots, briars, cobwebs and sacks catch; glowcap spores flash
  for (const p of poolsNear(x, z, r)) {
    if (p.kind === 'oil' && p.state === 'still') ignite(p);
    else if (p.state === 'frozen') { p.state = 'still'; dress(p); Sfx.at(x, z).thaw(); for (const t of p.tiles) burst(t.x, .15, t.z, WATER, 2, 1.2, .04); }
  }
}
/** Frost reaches (x, z) and `r` around it: water there freezes over. */
export function frostAt(x: number, z: number, r = 0) {
  for (const p of poolsNear(x, z, r)) if (p.kind === 'water' && p.state === 'still') {
    p.state = 'frozen'; p.t = C.iceTime; dress(p); Sfx.at(x, z).freeze();
    for (const t of p.tiles) burst(t.x, .2, t.z, ICE, 3, 1.4, .045);
  }
}
/** Shock reaches (x, z): if that's in water, it runs through the whole pool, to every foe standing in it and the
    mage too. `from` is spared (it has its shock already). */
export function shockAt(x: number, z: number, from?: Enemy) {
  const p = poolAt(x, z);
  if (!p || p.kind !== 'water' || p.state !== 'still' || p.charged > 0) return;
  p.charged = C.charged;
  for (const e of G.enemies) {
    if (e === from || e.dead || e.spawn > 0 || e.hidden || e.flying || !inPool(p, e.x, e.z)) continue;
    damageEnemy(e, C.shockDamage, 0, 0, 0, 'spell'); inflict(e, { shock: C.shockSpread });
  }
  if (inPool(p, player.x, player.z)) hurtPlayer(C.mageHurt, player.x, player.z + .01);
  for (const t of p.tiles) burst(t.x, .2, t.z, SPARK, 3, 2.4, .03);
  Sfx.at(x, z).sizzle();
}
/** A status landed on a foe: what it does to the pool the foe stands in (Burn lights oil, Chill freezes water,
    Shock runs through it). */
export function touchPools(e: Enemy, kind: StatusKind) {
  if (e.flying) return;
  if (kind === 'burn') burnPropsAt(e.x, e.z, .5); // a burning foe sets what burns beside it alight
  if (!G.current.pools?.length) return;
  if (kind === 'burn') fireAt(e.x, e.z);
  else if (kind === 'chill') frostAt(e.x, e.z);
  else shockAt(e.x, e.z, e);
}

function ignite(p: Pool) {
  p.state = 'burning'; p.t = C.oilBurn; p.tick = 0; dress(p);
  for (const t of p.tiles) { burst(t.x, .2, t.z, FIRE, 4, 2.2, .06); riseMote(t.x, .15, t.z, EMBER, .7); }
  Sfx.at(p.tiles[0].x, p.tiles[0].z).ignite(); G.shake = Math.max(G.shake, .12);
}

/* ---------- every step ---------- */

let splashT = 0;
const glow = new THREE.Color();
/** Burning oil burns what walks on it and then is spent; ice thaws; the shocked pool stops crackling; water
    shimmers, and the mage splashes through it. */
export function updatePools(dt: number, now: number, acting: boolean) {
  const room = G.current;
  if (!room.pools?.length) return;
  for (const p of room.pools) {
    if (p.state === 'spent') continue;
    glow.setHex(p.mat.userData.emissive as number);
    if (p.state === 'burning') p.mat.emissive.copy(glow).multiplyScalar(.75 + Math.sin(now * 17 + p.tiles[0].x) * .15 + Math.random() * .1);
    else if (p.charged > 0) p.mat.emissive.setHex(Math.random() < .5 ? 0x8a8030 : 0x2a2a10);
    else if (p.kind === 'water') p.mat.emissive.copy(glow).multiplyScalar(1 + Math.sin(now * 2 + p.tiles[0].z) * .4);
    if (!acting) continue;
    p.charged = Math.max(0, p.charged - dt);
    if (p.state === 'frozen' && (p.t -= dt) <= 0) { p.state = 'still'; dress(p); Sfx.at(p.tiles[0].x, p.tiles[0].z).thaw(); }
    if (p.state !== 'burning') continue;
    // flames lick up all over it; it sets walking foes burning, and hurts the mage standing in it
    if (Math.random() < dt * 12 * p.tiles.length) { const t = p.tiles[Math.floor(Math.random() * p.tiles.length)]; riseMote(t.x + (Math.random() - .5) * .8, .12, t.z + (Math.random() - .5) * .8, Math.random() < .6 ? FIRE : EMBER, .4 + Math.random() * .35); }
    if ((p.tick -= dt) <= 0) {
      p.tick = C.tick;
      for (const e of G.enemies) if (!e.dead && e.spawn <= 0 && !e.hidden && !e.flying && inPool(p, e.x, e.z)) inflict(e, { burn: C.groundBurn });
      if (Math.random() < .5) Sfx.at(p.tiles[0].x, p.tiles[0].z).crackle();
    }
    if (inPool(p, player.x, player.z)) hurtPlayer(C.mageHurt, player.x, player.z + .01);
    if ((p.t -= dt) <= 0) spend(room, p);
  }
  // wading
  if (acting && wadeAt(player.x, player.z) < 1 && Math.hypot(player.vx, player.vz) > 1 && (splashT -= dt) <= 0) {
    splashT = .32; Sfx.wade(); burst(player.x, .08, player.z, WATER, 3, 1.2, .035);
  }
}

/** Burnt-out oil: gone, soot in its place. */
function spend(room: Room, p: Pool) {
  p.state = 'spent'; room.group.remove(p.mesh); p.mesh.geometry.dispose(); p.mat.dispose();
  for (const t of p.tiles) { addDecal(t.x, t.z, 0x0a0806, .75); room.poolGrid![t.r][t.c] = undefined; }
}

/** Dev menu: set every pool of oil in the room alight, freeze every pool of water, or shock them. */
export function poolsDo(what: 'fire' | 'frost' | 'shock') {
  for (const p of G.current.pools ?? []) {
    const t = p.tiles[0];
    if (what === 'fire') fireAt(t.x, t.z); else if (what === 'frost') frostAt(t.x, t.z); else shockAt(t.x, t.z);
  }
}
