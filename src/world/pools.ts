/* Water and oil on the floor (GDD: Rooms react to magic). A room's pools are the template's `~` and `%` tiles joined
   side by side, and on the drowned floor puddles grown over the floor of its fights. Oil catches fire from Burn, fire
   spells and blasts, and burns for a few seconds, setting walking foes on it burning and hurting the mage; then it
   is spent, leaving soot. Water is shallow: the mage and walking foes wade through it slower; Shock on anything
   standing in it runs through the whole pool, to every foe in it and the mage too; Frost freezes it over for a
   while, crossed at full speed and conducting nothing, and fire melts it again. Flyers are above it all.
   M4.2 (from the Eda lore): a room's water can run (the template's `current`): it carries the mage and walking foes,
   bolts and shots flying over it, and pickups lying in it, downstream; frozen, it stops. A waterfall down the wall
   upstream feeds it. M5: jelly (the jelly serpent's, `jelly` on a pool of water) is water that is green and slower to
   wade; a shock runs through it and frost freezes it as through water. */
import * as THREE from 'three';
import { groundHears } from './groundHooks';
import { chargeSteam, steamAt } from '../magic/steam';
import { CFG } from '../config';
import type { Enemy, Pool, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { floorOwnedTexture } from '../render/textures';
import { addDecal, burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { inflict, overloadAt, tileReaction } from '../magic/statusFx';
import { riseMote } from '../magic/shapes';
import type { StatusKind } from '../magic/spellData';
import { poolsOf } from './templates';
import { burnPropsAt } from './props';
import { douseStandsIn, elementAt } from './mechanisms';
import { blockers, collide } from './collision';
import { fallRuns, type Flow } from './templates';

const C = CFG.surface;
const FIRE = 0xff7a2a, EMBER = 0xffc060, ICE = 0xbfe6ff, SPARK = 0xf0e890, WATER = 0x5a8a9a, JELLY = 0x7ae070;

/** How each state looks: colour, glow, gloss and opacity over the floor. */
const LOOK = {
  water: { color: 0x2a5a6a, emissive: 0x0a2430, roughness: .38, metalness: .25, opacity: .78 }, // (rough enough that a torch's glint doesn't read as a wisp)
  frozen: { color: 0xc4e6f6, emissive: 0x2a4e6e, roughness: .2, metalness: .1, opacity: .9 },
  oil: { color: 0x3a2e20, emissive: 0x140e08, roughness: .55, metalness: .1, opacity: .92 }, // (dull brown: black read as a pit, a sharp glint as fire)
  burning: { color: 0x2a1208, emissive: 0xff6a1a, roughness: .7, metalness: 0, opacity: .96 },
  mud: { color: 0x4a3a28, emissive: 0x0c0804, roughness: .42, metalness: .12, opacity: .9 }, // (M4.9: drained by a sluice; brown and wet, never a pit's black)
  jelly: { color: 0x3a9446, emissive: 0x0e3a16, roughness: .62, metalness: 0, opacity: .84 }, // (M5: the serpent's jelly, glowing a little green; dull, so a torch's glint doesn't read as fire)
  frozenJelly: { color: 0xc4ecc8, emissive: 0x2a5a36, roughness: .55, metalness: 0, opacity: .9 }, // (dull too: no torch glints)
};
function dress(p: Pool) {
  const L = p.state === 'frozen' ? p.jelly ? LOOK.frozenJelly : LOOK.frozen : p.state === 'burning' ? LOOK.burning : p.kind === 'water' ? p.jelly ? LOOK.jelly : p.mud ? LOOK.mud : LOOK.water : LOOK.oil;
  const surface = p.state === 'frozen' ? p.mat.userData.ice as THREE.Texture : p.mat.userData.detail as THREE.Texture; // ice is cracked, not rippled
  if (surface && p.mat.map !== surface) { p.mat.map = surface; p.mat.emissiveMap = surface; }
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
    const frozen = kind === 'water' && room.theme?.twist === 'rime'; // a frozen mausoleum's water is ice until fire finds it
    const p: Pool = { kind, tiles: at, state: frozen ? 'frozen' : 'still', t: frozen ? Infinity : 0, charged: 0, tick: 0, mesh, mat };
    dress(p); room.group.add(mesh); room.pools.push(p);
    for (const t of tiles) room.poolGrid[t.r][t.c] = p;
  }
  if (room.flow) buildFalls(room, room.flow);
}

/* ---------- currents and waterfalls (M4.2) ---------- */

/** Each way water flows, as a step on the floor. */
const FLOW: Record<Flow, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

/** Where the room's water meets the wall upstream, water pours in: down the north or south wall a waterfall from a spout,
    one sheet per run of tiles (`fallRuns`); from a side wall, seen edge-on, out of a culvert at the floor. */
function buildFalls(room: Room, flow: Flow) {
  const [dx, dz] = FLOW[flow], { minX, minZ, maxX, maxZ } = room.bounds;
  room.falls = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1 }); // (the spouts' and culverts': freed with the room)
  for (const run of fallRuns(room.template)) {
    const width = run.i1 - run.i0, mid = run.i0 + width / 2;
    const tex = floorOwnedTexture(fallTexture().clone()); tex.needsUpdate = true; // (freed with the floor)
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(dx ? .6 : width, dx ? width : .5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: 0x9cc8d8, transparent: true, opacity: .45, depthWrite: false }));
    foam.renderOrder = 2;
    if (dx) { // a culvert low in the side wall, its dark mouth and the water spilling out of it
      const wx = dx > 0 ? minX : maxX, z = minZ + mid;
      const culvert = new THREE.Mesh(new THREE.BoxGeometry(.36, .42, width + .2), stone); culvert.position.set(wx + dx * .15 - room.cx, .21, z - room.cz); room.group.add(culvert);
      const mouth = new THREE.Mesh(new THREE.PlaneGeometry(width - .1, .26), new THREE.MeshBasicMaterial({ color: 0x050607 }));
      mouth.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2; mouth.position.set(wx + dx * .34 - room.cx, .17, z - room.cz); room.group.add(mouth);
      tex.repeat.set(1, width * 2);
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(.5, width).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, color: 0x5a94ae, transparent: true, opacity: .75, depthWrite: false }));
      spill.position.set(wx + dx * .55 - room.cx, .03, z - room.cz); spill.renderOrder = 2; room.group.add(spill);
      foam.position.set(wx + dx * .85 - room.cx, .025, z - room.cz); room.group.add(foam);
      room.falls.push({ mesh: spill, tex });
      continue;
    }
    const height = dz > 0 ? 1.35 : .5; // (the north wall is tall, the south low)
    tex.repeat.set(width, height * 1.5);
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x5a94ae, transparent: true, opacity: .88, depthWrite: false }); // (dark water, its streaks pale)
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.rotation.y = dz > 0 ? 0 : Math.PI; mesh.position.set(minX + mid - room.cx, height / 2, (dz > 0 ? minZ + .03 : maxZ - .03) - room.cz);
    room.group.add(mesh);
    // the spout it pours from: a dark culvert in the wall at its top
    const spout = new THREE.Mesh(new THREE.BoxGeometry(width + .24, .2, .14), stone);
    spout.position.copy(mesh.position); spout.position.y = height - .06; spout.rotation.y = mesh.rotation.y; room.group.add(spout);
    foam.position.set(mesh.position.x, .02, mesh.position.z + dz * .25); room.group.add(foam);
    room.falls.push({ mesh, tex });
  }
}

/** Pale streaks falling over blue, tiling: a waterfall's sheet (and the foam where it lands). */
let fallTex: THREE.CanvasTexture | null = null;
function fallTexture() {
  if (fallTex) return fallTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  g.fillStyle = '#3a5866'; g.fillRect(0, 0, 64, 64);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) { // streaks, wrapping top to bottom so the sheet tiles as it falls
    const x = Math.floor(rnd() * 64), y = rnd() * 64, len = 10 + rnd() * 30, v = 200 + Math.floor(rnd() * 55);
    g.fillStyle = `rgba(${v},${v},${v},${.35 + rnd() * .4})`;
    for (const oy of [-64, 0, 64]) g.fillRect(x, y + oy, 1 + Math.floor(rnd() * 2), len);
  }
  fallTex = new THREE.CanvasTexture(c); fallTex.wrapS = fallTex.wrapT = THREE.RepeatWrapping; fallTex.colorSpace = THREE.SRGBColorSpace;
  fallTex.magFilter = THREE.NearestFilter;
  return fallTex;
}

/** Water that runs here: not frozen. */
const running = (x: number, z: number) => { const p = poolAt(x, z); return p?.kind === 'water' && p.state === 'still'; };

/** The current carries what is in it or over it downstream, and its surface and its falls move with it. */
function flow(room: Room, f: Flow, dt: number) {
  const [dx, dz] = FLOW[f], F = CFG.flow;
  for (const p of room.pools ?? []) if (p.kind === 'water' && p.state === 'still' && p.mat.map) { p.mat.map.offset.x -= dx * F.carry * dt / 2; p.mat.map.offset.y += dz * F.carry * dt / 2; }
  for (const w of room.falls ?? []) w.tex.offset.y += dt * 1.2;
  if (!player.dead && !player.stats.effects.has('float') && running(player.x, player.z)) { player.x += dx * F.carry * dt; player.z += dz * F.carry * dt; collide(player, blockers(room, 'player')); }
  let walls: ReturnType<typeof blockers> | null = null; // (worked out once a step, for every walker the water carries)
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.flying || e.hidden || !running(e.x, e.z)) continue;
    e.x += dx * F.carry * dt; e.z += dz * F.carry * dt; collide(e, walls ??= blockers(room, 'walker'));
  }
  for (const b of G.bolts) if (running(b.x, b.z)) { b.x += dx * F.bolts * dt; b.z += dz * F.bolts * dt; }
  for (const s of G.shots) if (running(s.x, s.z)) { s.x += dx * F.bolts * dt; s.z += dz * F.bolts * dt; }
  for (const q of G.pickups) {
    const nx = q.x + dx * F.pickups * dt, nz = q.z + dz * F.pickups * dt;
    if (q.drop <= 0 && running(q.x, q.z) && running(nx, nz)) { q.x = nx; q.z = nz; q.g.position.set(q.x, 0, q.z); } // (to the end of the current, and no further)
  }
}

/** A new pool poured into the room while it is played (a broken oil cask's spill; M5: the jelly serpent's jelly, `jelly`):
    its tiles become the pool's. */
export function addPool(room: Room, kind: Pool['kind'], tiles: { c: number; r: number }[], o: { jelly?: boolean } = {}) {
  if (!tiles.length) return;
  const { minX, minZ } = room.bounds;
  room.pools ??= []; room.poolGrid ??= room.template.tiles.map(row => row.map(() => undefined));
  const { mesh, mat } = poolMesh(room, tiles);
  const p: Pool = { kind, tiles: tiles.map(t => ({ ...t, x: minX + t.c + .5, z: minZ + t.r + .5 })), state: 'still', t: 0, charged: 0, tick: 0, mesh, mat, jelly: o.jelly };
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
  const ice = floorOwnedTexture(iceTexture().clone()); ice.repeat.copy(detail.repeat); ice.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ alphaMap: alpha, map: detail, emissiveMap: detail, transparent: true, depthWrite: false });
  mat.userData.detail = detail; mat.userData.ice = ice;
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

const WRAP = [-128, 0, 128].flatMap(ox => [-128, 0, 128].map(oy => [ox, oy])); // draw across the edges, so a texture tiles
/** Pale cracks that tile: the surface of frozen water. */
let iceTex: THREE.CanvasTexture | null = null;
function iceTexture() {
  if (iceTex) return iceTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.fillStyle = '#8e8e8e'; g.fillRect(0, 0, 128, 128);
  let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 40; i++) { // frosted patches
    const x = rnd() * 128, y = rnd() * 128, rad = 8 + rnd() * 20;
    for (const [ox, oy] of WRAP) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 1.4; // cracks: short jagged runs, some branching
  for (let i = 0; i < 16; i++) {
    let x = rnd() * 128, y = rnd() * 128, a = rnd() * Math.PI * 2; const pts = [[x, y]];
    for (let k = 0; k < 5; k++) { a += (rnd() - .5) * 1.2; x += Math.cos(a) * (5 + rnd() * 8); y += Math.sin(a) * (5 + rnd() * 8); pts.push([x, y]); }
    for (const [ox, oy] of WRAP) { g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px + ox, py + oy) : g.moveTo(px + ox, py + oy)); g.stroke(); }
  }
  iceTex = new THREE.CanvasTexture(c); iceTex.wrapS = iceTex.wrapT = THREE.RepeatWrapping; iceTex.colorSpace = THREE.SRGBColorSpace;
  return iceTex;
}

/* ---------- where things stand ---------- */

/** The pool under (x, z) in the current room, if any (spent oil is gone). */
export function poolAt(x: number, z: number, room = G.current) {
  const p = room.poolGrid?.[Math.floor(z - room.bounds.minZ)]?.[Math.floor(x - room.bounds.minX)];
  return p && p.state !== 'spent' ? p : undefined;
}
/** How fast one can walk at (x, z): slower wading through water that isn't frozen, slower still through jelly (M5). */
export function wadeAt(x: number, z: number) {
  const p = poolAt(x, z);
  return p?.kind === 'water' && p.state === 'still' ? p.jelly ? C.jellyWade : C.wade : 1;
}
/** M5: the jelly at (x, z) that isn't frozen, if any (the jelly serpent swims in it; the mage is held in it). */
export function jellyAt(x: number, z: number, room = G.current) {
  const p = poolAt(x, z, room);
  return p?.jelly && p.state === 'still' ? p : undefined;
}
/** Pools with a tile within `r` of (x, z). */
function poolsNear(x: number, z: number, r: number) {
  return (G.current.pools ?? []).filter(p => p.state !== 'spent' && p.tiles.some(t => Math.abs(x - t.x) < .5 + r && Math.abs(z - t.z) < .5 + r));
}
const inPool = (p: Pool, x: number, z: number) => poolAt(x, z) === p;

/* ---------- what magic does to them ---------- */

/** Fire reaches (x, z) and `r` around it: oil there catches alight, ice melts. */
export function fireAt(x: number, z: number, r = 0) {
  groundHears('fire', x, z, r); // (M4.5: a spider's webs burn)
  burnPropsAt(x, z, r); // roots, briars, cobwebs and sacks catch; glowcap spores flash
  for (const p of poolsNear(x, z, r)) {
    if (p.kind === 'oil' && p.state === 'still') ignite(p);
    else if (p.state === 'frozen') { p.state = 'still'; dress(p); Sfx.at(x, z).thaw(); for (const t of p.tiles) burst(t.x, .15, t.z, WATER, 2, 1.2, .04); steamAt(x, z); } // (fire on ice: it goes up in steam)
    else if (p.kind === 'water' && p.state === 'still' && G.simClock >= (p.boilAt ?? 0)) { p.boilAt = G.simClock + C.boilEvery; steamAt(x, z, C.boilSteam); Sfx.at(x, z).steam(); } // (fire on water boils it: steam, now and then a pool)
  }
}
/** Frost reaches (x, z) and `r` around it: water there freezes over, and ice already there keeps. */
export function frostAt(x: number, z: number, r = 0) {
  groundHears('frost', x, z, r);
  elementAt('chill', x, z, r); // a rune stone takes frost
  for (const p of poolsNear(x, z, r)) if (p.kind === 'oil' && p.state === 'burning') { spend(G.current, p); steamAt(x, z); Sfx.at(x, z).steam(); } // (frost on burning oil: the fire dies in a burst of steam)
  else if (p.kind === 'water' && p.state === 'frozen') p.t = Math.max(p.t, C.iceTime);
  else if (p.kind === 'water' && p.state === 'still') {
    p.state = 'frozen'; p.t = C.iceTime; dress(p); Sfx.at(x, z).freeze();
    for (const t of p.tiles) burst(t.x, .2, t.z, ICE, 3, 1.4, .045);
  }
}
/** Shock reaches (x, z): if that's in water, it runs through the whole pool, to every foe standing in it and the
    mage too. `from` is spared (it has its shock already). */
export function shockAt(x: number, z: number, from?: Enemy, spareMage = false) {
  groundHears('shock', x, z);
  chargeSteam(x, z, 'storm'); // (M4.10: a storm in steam makes a thundercloud)
  elementAt('shock', x, z); // lodestones leap, a rune stone takes storm
  const p = poolAt(x, z);
  if (p?.kind === 'oil' && p.state === 'burning') { // (M4.8: a shock through burning oil is an Overload at the pool's middle, which blows the fire out)
    const mx = p.tiles.reduce((a, t) => a + t.x, 0) / p.tiles.length, mz = p.tiles.reduce((a, t) => a + t.z, 0) / p.tiles.length;
    spend(G.current, p); tileReaction('overload', mx, mz); overloadAt(mx, mz);
    return;
  }
  if (!p || p.kind !== 'water' || p.state !== 'still' || p.charged > 0) return;
  p.charged = C.charged;
  douseStandsIn(p); // (M4.2: candle stands standing in it go out)
  for (const e of G.enemies) {
    if (e === from || e.dead || e.spawn > 0 || e.hidden || e.flying || !inPool(p, e.x, e.z)) continue;
    damageEnemy(e, C.shockDamage, 0, 0, 0, 'spell', 'storm'); inflict(e, { shock: C.shockSpread });
  }
  if (!spareMage && inPool(p, player.x, player.z)) hurtPlayer(C.mageHurt, player.x, player.z + .01); // (M4.10's Live Wade spares the mage)
  for (const t of p.tiles) burst(t.x, .2, t.z, SPARK, 3, 2.4, .03);
  Sfx.at(x, z).sizzle();
}
/** A status landed on a foe: what it does to the pool the foe stands in (Burn lights oil, Chill freezes water,
    Shock runs through it). */
export function touchPools(e: Enemy, kind: StatusKind) {
  if (e.flying) return;
  if (kind === 'burn') burnPropsAt(e.x, e.z, .5); // a burning foe sets what burns beside it alight
  else elementAt(kind, e.x, e.z, .5);              // a chilled or shocked one charges a rune, sets a lodestone leaping
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
  if (room.flow && acting) flow(room, room.flow, dt);
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
  if (acting && !player.stats.effects.has('float') && wadeAt(player.x, player.z) < 1 && Math.hypot(player.vx, player.vz) > 1 && (splashT -= dt) <= 0) {
    splashT = .32; Sfx.wade(); burst(player.x, .08, player.z, poolAt(player.x, player.z)?.jelly ? JELLY : WATER, 3, 1.2, .035);
  }
}

/** Burnt-out oil: gone, soot in its place. */
function spend(room: Room, p: Pool) {
  p.state = 'spent'; room.group.remove(p.mesh); p.mesh.geometry.dispose(); p.mat.dispose();
  for (const t of p.tiles) { addDecal(t.x, t.z, 0x0a0806, .75); room.poolGrid![t.r][t.c] = undefined; }
}

/** An open sluice (M4.9) drains `room`'s water to mud, or lets it back. */
export function setMud(room: Room, on: boolean) {
  for (const p of room.pools ?? []) if (p.kind === 'water' && p.state !== 'spent') { p.mud = on; dress(p); }
}

/** Dev menu: set every pool of oil in the room alight, freeze every pool of water, or shock them. */
export function poolsDo(what: 'fire' | 'frost' | 'shock') {
  for (const p of G.current.pools ?? []) {
    const t = p.tiles[0];
    if (what === 'fire') fireAt(t.x, t.z); else if (what === 'frost') frostAt(t.x, t.z); else shockAt(t.x, t.z);
  }
}
