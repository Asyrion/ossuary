/* The rooms' objects in play (M3.6, docs/M3.6-plan.md): bone piles, skull heaps, grave sacks, oil casks, rubble,
   grave roots, thorn briars, cobwebs, glowcaps and pews. What each is and how it blocks is in propData.ts; this is
   how they look and what the mage's magic does to them:
   - a bolt breaks bone piles, skull heaps (two), grave sacks, oil casks and glowcaps; a glyph's blast breaks those,
     clears rubble and tears briars and cobwebs away;
   - piles leave the poorer `remains` loot, sacks spill a `bundle`; a cask spills a pool of oil; a glowcap bursts into
     a cloud of spores that flashes when fire finds it;
   - fire (anything that calls `fireAt`) burns roots, briars, cobwebs and sacks away, and it spreads between them;
   - cobwebs slow whoever walks through them; briars sting the mage and walking foes.
   The room kit's looks are in objectLooks.ts (M3.5 step 3); the placeholder shapes here stay for `DEV.roomKit` off. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { PropBox, PropState, Room, RockBox, SporeCloud, FloorLook } from '../types';
import { DEV, G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { M, blob, boxUV, disposeTree, glow, markShared, mergeStill } from '../render/materials';
import { addDecal, burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { inflict } from '../magic/statusFx';
import { riseMote } from '../magic/shapes';
import { LOOT, rollTable } from '../items/loot';
import { soulsHere } from '../items/souls';
import { spawnPickup } from '../items/pickups';
import { mulberry } from '../util';
import { PROPS, isMechanism, type MechanismKind, type PropKind } from './propData';
import { MECH_LOOKS, elementAt, strikeMechanism } from './mechanisms';
import type { StatusKind } from '../magic/spellData';
import { addPool, fireAt } from './pools';
import { scrollsBroken } from './themes';
import { OBJECT_LOOKS, burningFire } from './objectLooks';

const P = CFG.props;
const FIRE = 0xff7a2a, EMBER = 0xffc060, SPORE = 0x9fe8b0, BONE = 0xd8ccb2;

/* ---------- looks ---------- */

const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
const mat = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => markShared(new THREE.MeshStandardMaterial({ color, roughness: .85, ...o }));
const MAT = {
  burlap: mat(0x6a5a44, { roughness: 1 }), rope: mat(0x4a3a26), wood: mat(0x5a3e28, { roughness: .9 }), darkWood: mat(0x3a2818),
  root: mat(0x3a2a1c, { roughness: 1 }), thorn: mat(0x2e3a22, { roughness: 1 }), stem: mat(0xcfd8c0, { emissive: 0x1a2a20 }),
  cap: mat(0x5fd8b0, { emissive: 0x2a9a78, roughness: .5 }),
  flame: markShared(new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: .85 })), paper: mat(0xd8cbaa, { emissive: 0x1a160e }),
};
const GEO = {
  bone: shared(new THREE.CylinderGeometry(.03, .03, .36, 5)), knob: shared(new THREE.SphereGeometry(.045, 5, 4)),
  skull: shared(new THREE.SphereGeometry(.12, 8, 6)), jaw: shared(new THREE.BoxGeometry(.12, .05, .09)),
  sack: shared(new THREE.SphereGeometry(.2, 8, 6)), tie: shared(new THREE.CylinderGeometry(.04, .07, .09, 6)),
  barrel: shared(new THREE.CylinderGeometry(.27, .27, .62, 12)), hoop: shared(new THREE.TorusGeometry(.285, .018, 4, 16)), lid: shared(new THREE.CylinderGeometry(.24, .24, .02, 12)),
  chunk: shared(new THREE.DodecahedronGeometry(.17, 0)),
  thorn: shared(new THREE.ConeGeometry(.018, .07, 4)),
  stem: shared(new THREE.CylinderGeometry(.03, .04, 1, 6)), cap: shared(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
  flame: shared(new THREE.ConeGeometry(.16, .42, 6)), scroll: shared(new THREE.CylinderGeometry(.045, .045, .34, 8)),
};
let webMat: THREE.MeshBasicMaterial | null = null;
/** Cobweb: threads spun out from a corner, and rings across them. */
function webMaterial() {
  if (webMat) return webMat;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 1.2;
  const spokes = 7;
  for (let i = 0; i < spokes; i++) { const a = i / (spokes - 1) * Math.PI / 2; g.beginPath(); g.moveTo(4, 4); g.lineTo(4 + Math.cos(a) * 130, 4 + Math.sin(a) * 130); g.stroke(); }
  for (let r = 18; r < 130; r += 16) {
    g.beginPath();
    for (let i = 0; i < spokes; i++) { const a = i / (spokes - 1) * Math.PI / 2, rr = r * (.9 + (i % 2) * .12); const x = 4 + Math.cos(a) * rr, y = 4 + Math.sin(a) * rr; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  return webMat = markShared(new THREE.MeshBasicMaterial({ map, color: 0xe8e8f0, transparent: true, opacity: .6, side: THREE.DoubleSide, depthWrite: false }));
}

type Look = (R: () => number, len: number, look?: FloorLook) => THREE.Group;
const LOOKS: Record<Exclude<PropKind, MechanismKind>, Look> = {
  bones(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(GEO.bone, M.bone); b.rotation.set(0, R() * Math.PI, Math.PI / 2 + (R() - .5) * .5); // laid down, any which way
      b.position.set((R() - .5) * .5, .05 + (i % 3) * .05, (R() - .5) * .5); g.add(b);
      for (const s of [-1, 1]) { const k = new THREE.Mesh(GEO.knob, M.bone); k.position.copy(b.position).add(new THREE.Vector3(0, .18 * s, 0).applyEuler(b.rotation)); g.add(k); }
    }
    const s = skull(); s.position.set((R() - .5) * .2, .14, (R() - .5) * .2); s.rotation.y = R() * 6; g.add(s);
    g.add(blob(.95)); return g;
  },
  skulls(R) {
    const g = new THREE.Group(), spots = [[-.16, .1, -.1], [.16, .1, -.08], [0, .1, .15], [-.15, .1, .16], [.15, .1, .17], [0, .3, 0], [-.08, .3, .1], [.1, .3, .05], [0, .48, .04]];
    for (const [x, y, z] of spots) { const s = skull(); s.position.set(x + (R() - .5) * .04, y, z); s.rotation.set((R() - .5) * .5, (R() - .5) * 1.2, (R() - .5) * .3); g.add(s); }
    g.add(blob(1)); return g;
  },
  sacks(R) {
    const g = new THREE.Group();
    for (const [x, z, sc] of [[-.15, -.08, 1], [.16, -.02, .9], [0, .17, .8]]) {
      const s = new THREE.Mesh(GEO.sack, MAT.burlap); s.scale.set(sc, sc * (1.1 + R() * .2), sc); s.position.set(x, .2 * sc, z); s.rotation.y = R() * 6;
      const t = new THREE.Mesh(GEO.tie, MAT.rope); t.position.set(x, .43 * sc, z); g.add(s, t);
    }
    g.add(blob(1)); return g;
  },
  cask(R) {
    const g = new THREE.Group(), b = new THREE.Mesh(GEO.barrel, MAT.wood); b.position.y = .31; b.scale.set(1, 1, 1);
    const lid = new THREE.Mesh(GEO.lid, MAT.darkWood); lid.position.y = .625;
    g.add(b, lid);
    for (const y of [.1, .52]) { const h = new THREE.Mesh(GEO.hoop, M.iron); h.rotation.x = Math.PI / 2; h.position.y = y; g.add(h); }
    g.rotation.y = R() * 6; g.add(blob(.9)); return g;
  },
  rubble(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(GEO.chunk, M.rock); const s = .6 + R() * .7; c.scale.set(s, s * .7, s); c.position.set((R() - .5) * .7, .07 * s, (R() - .5) * .7); c.rotation.set(R() * 3, R() * 3, R() * 3); g.add(c); }
    g.add(blob(1.1)); return g;
  },
  roots(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) { // thick roots coming down out of the ceiling's dark and burrowing into the floor
      const a = R() * Math.PI * 2, r0 = .1 + R() * .25, x0 = Math.cos(a) * r0, z0 = Math.sin(a) * r0;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x0 * .3, 1.5, z0 * .3), new THREE.Vector3(x0 * 1.4, .9, z0 * 1.4), new THREE.Vector3(x0 * 1.2, .3, z0 * 1.2), new THREE.Vector3(x0 * 1.9, 0, z0 * 1.9)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .06 + R() * .04, 5, false), MAT.root));
    }
    g.add(blob(1)); return g;
  },
  briar(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const pts = [0, 1, 2, 3].map(k => new THREE.Vector3((R() - .5) * .9, .05 + R() * .3 * (k % 2 ? 1 : .4), (R() - .5) * .9));
      const curve = new THREE.CatmullRomCurve3(pts);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, .022, 4, false), MAT.thorn));
      for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(GEO.thorn, MAT.thorn); t.position.copy(curve.getPoint(R())); t.rotation.set(R() * 3, R() * 3, R() * 3); g.add(t); }
    }
    return g;
  },
  web(R) {
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), webMaterial());
    m.rotation.set(-Math.PI / 2 + .5, R() * 6, 0); m.position.y = .35; g.add(m); return g;
  },
  glowcap(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const h = .12 + R() * .22, r = .07 + R() * .08, x = (R() - .5) * .5, z = (R() - .5) * .5;
      const st = new THREE.Mesh(GEO.stem, MAT.stem); st.scale.set(1, h, 1); st.position.set(x, h / 2, z);
      const cap = new THREE.Mesh(GEO.cap, MAT.cap); cap.scale.set(r, r * .7, r); cap.position.set(x, h, z);
      g.add(st, cap);
    }
    const gl = glow(0x6fe8c0, 1.2, .55); gl.position.y = .3; g.add(gl);
    return g;
  },
  desk(R) { // a scribe's sloped desk: legs, a slanted top, an inkpot and a candle stub
    const g = new THREE.Group();
    const top = new THREE.Mesh(boxUV(.8, .05, .5), MAT.wood); top.position.y = .62; top.rotation.x = .3;
    for (const [x, z] of [[-.34, -.18], [.34, -.18], [-.34, .18], [.34, .18]]) { const l = new THREE.Mesh(boxUV(.06, .6, .06), MAT.darkWood); l.position.set(x, .3, z); g.add(l); }
    const ink = new THREE.Mesh(GEO.knob, M.iron); ink.position.set(.28, .72, -.1);
    const page = new THREE.Mesh(boxUV(.3, .01, .36), MAT.paper); page.position.set(-.05, .655, .02); page.rotation.x = .3;
    g.add(top, ink, page, blob(1)); g.rotation.y = (R() - .5) * .3; return g;
  },
  scrolls(R) { // a heap of rolled scrolls and loose sheets
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(GEO.scroll, MAT.paper); s.rotation.set(0, R() * 6, Math.PI / 2); s.position.set((R() - .5) * .4, .05 + (i % 3) * .07, (R() - .5) * .4); g.add(s); }
    const sheet = new THREE.Mesh(boxUV(.3, .01, .36), MAT.paper); sheet.position.set(.2, .01, .2); sheet.rotation.y = R() * 6; g.add(sheet, blob(.9));
    return g;
  },
  // M4.1's objects have only the room kit's look
  hoard: R => OBJECT_LOOKS.hoard(R), boat: (R, len) => OBJECT_LOOKS.boat(R, len),
  pew(_R, len) { // a bench facing north, towards where a chapel's altar would stand: seat, back on the south side, ends
    const g = new THREE.Group(), L = len - .12;
    const seat = new THREE.Mesh(boxUV(L, .07, .42), MAT.wood); seat.position.set(0, .34, -.05);
    const back = new THREE.Mesh(boxUV(L, .5, .06), MAT.wood); back.position.set(0, .56, .2);
    g.add(seat, back);
    for (const x of [-L / 2 + .04, L / 2 - .04]) { const end = new THREE.Mesh(boxUV(.07, .8, .5), MAT.darkWood); end.position.set(x, .4, 0); g.add(end); }
    const sh = blob(1); sh.scale.set(len, 1, .9); g.add(sh);
    return g;
  },
};
function skull() {
  const s = new THREE.Group(), head = new THREE.Mesh(GEO.skull, M.bone); head.scale.set(1, .92, 1.05);
  const jaw = new THREE.Mesh(GEO.jaw, M.bone); jaw.position.set(0, -.08, .04); s.add(head, jaw); return s;
}

/* ---------- building ---------- */

const worldOf = (room: Room, c: number, r: number) => ({ x: room.bounds.minX + c + .5, z: room.bounds.minZ + r + .5 });

/** The objects in a room's template: pews side by side join into one. */
export function buildProps(room: Room) {
  const t = room.template;
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) {
    const kind = t.tiles[r][c] as PropKind;
    if (!(kind in PROPS)) continue;
    const long = kind === 'pew' || kind === 'boat'; // (a run of them is one long pew, or one boat)
    if (long && t.tiles[r][c - 1] === kind) continue; // part of the one begun to its left
    let len = 1; if (long) while (t.tiles[r][c + len] === kind) len++;
    addProp(room, kind, c, r, len);
  }
}

/** Whether a room's objects are the room kit's (objectLooks.ts). */
const kitObjects = (room: Room) => DEV.roomKit && !!room.look.kinds;

/** An object on tile (c, r) (a pew `len` tiles long from there). */
export function addProp(room: Room, kind: PropKind, c: number, r: number, len = 1) {
  const def = PROPS[kind], R = mulberry(c * 97 + r * 13 + room.plan.seed);
  const a = worldOf(room, c, r), x = a.x + (len - 1) / 2, z = a.z;
  const mesh = (isMechanism(kind) ? MECH_LOOKS[kind] : kitObjects(room) ? OBJECT_LOOKS[kind] : LOOKS[kind])(R, len, room.look); mergeStill(mesh); // a few draw calls, not a dozen
  mesh.position.set(x - room.cx, 0, z - room.cz); room.group.add(mesh);
  const tiles = Array.from({ length: len }, (_, i) => ({ c: c + i, r }));
  for (const tl of tiles) room.template.tiles[tl.r][tl.c] = kind;
  const prop: PropState = { kind, hits: def.hits, burning: 0, tiles, mesh, parts: mesh.userData.parts };
  const half = kind === 'cask' ? .3 : kind === 'roots' ? .42 : kind === 'candles' ? .22 : kind === 'lodestone' || kind === 'rune' ? .32 : kind === 'bell' ? .45 : .38;
  const box: PropBox = { x, z, hx: len > 1 ? len / 2 - .06 : half, hz: kind === 'pew' ? .3 : kind === 'boat' ? .34 : half, hp: def.hits, breakable: false, mesh, tile: { c, r }, prop };
  (room.props ??= []).push(box);
  if (def.class === 'hanging') { /* over the floor: nothing blocks, only bolts reach it (mechanisms.ts) */ }
  else if (def.class === 'soft') (room.soft ??= []).push(box);
  else if (def.class === 'low' && def.hits === 0) (room.lows ??= []).push(box); // bolts fly over pews and rubble
  else room.rocks.push(box);                                                     // tall ones, and piles a bolt breaks
  return box;
}

/** Take an object away: its look, its box, and its tiles back to floor. */
export function removeProp(room: Room, box: PropBox) {
  room.group.remove(box.prop.mesh); disposeTree(box.prop.mesh);
  room.props = room.props?.filter(b => b !== box); room.lows = room.lows?.filter(b => b !== box); room.soft = room.soft?.filter(b => b !== box);
  room.rocks = room.rocks.filter(b => b !== box);
  for (const t of box.prop.tiles) if (room.template.tiles[t.r][t.c] === box.prop.kind) room.template.tiles[t.r][t.c] = 'floor';
}

/* ---------- what bolts and blasts do ---------- */

/** A bolt (or, with `blast`, a glyph's blast) struck an object. Returns whether it broke. */
export function strikeProp(room: Room, rock: RockBox, blast: boolean, status?: Partial<Record<StatusKind, number>>) {
  const box = rock as PropBox, p = box.prop; if (!p || !room.props?.includes(box)) return false;
  if (status?.burn && PROPS[p.kind].burns && p.burning <= 0) ignite(room, box); // a burning bolt sets it alight
  if (isMechanism(p.kind)) { strikeMechanism(room, box, blast, status); return false; } // bells ring, runes charge...
  const def = PROPS[p.kind];
  if (blast ? !def.blast : !def.hits) { burst(box.x, .4, box.z, 0x8a8078, 3, 1.2, .04); return false; }
  if (!blast && --p.hits > 0) { // a skull heap loses its top skull first
    burst(box.x, .5, box.z, BONE, 6, 1.8, .045); Sfx.at(box.x, box.z).bones();
    p.mesh.scale.multiplyScalar(.85); return false;
  }
  breakProp(room, box);
  return true;
}

function breakProp(room: Room, box: PropBox) {
  const { kind } = box.prop, { x, z } = box, def = PROPS[kind];
  removeProp(room, box);
  const sfx = Sfx.at(x, z);
  switch (kind) {
    case 'bones': case 'skulls': burst(x, .3, z, BONE, 12, 2.2, .05); burst(x, .15, z, 0x8a8278, 8, .8, .06); sfx.bones(); break;
    case 'sacks': burst(x, .3, z, 0x9a8460, 10, 1.8, .05); sfx.sack(); break;
    case 'cask': burst(x, .4, z, 0x5a3e28, 12, 2.4, .06); burst(x, .1, z, 0x1a1410, 8, 1.2, .07); sfx.cask(); spillOil(room, box.prop.tiles[0]); break;
    case 'rubble': burst(x, .25, z, 0x6b625a, 14, 2.2, .08); burst(x, .15, z, 0x8a8278, 10, 1, .08); sfx.rubble(); break;
    case 'glowcap': burst(x, .3, z, SPORE, 14, 1.4, .06); sfx.spores(); addSpores(room, x, z); break;
    case 'scrolls': burst(x, .3, z, 0xd8cbaa, 12, 1.8, .05); sfx.sack(); scrollsBroken(room, x, z); break;
    case 'briar': case 'web': burst(x, .25, z, kind === 'web' ? 0xe8e8f0 : 0x2e3a22, 8, 1.4, .04); sfx.tear(); break;
    case 'hoard': burst(x, .3, z, 0xffd27a, 16, 2.4, .05); burst(x, .15, z, 0xc8a04a, 10, 1.2, .05); sfx.coin(true); break;
    default: burst(x, .3, z, 0x8a8078, 8, 1.6, .05);
  }
  if (def.loot) for (const item of rollTable(G.run.drops, def.loot, LOOT, soulsHere())) spawnPickup(item, x, z, { rise: true });
}

/** A broken cask's oil: its own tile and a few of the free floor tiles beside it, spreading outwards. */
function spillOil(room: Room, at: { c: number; r: number }) {
  const t = room.template.tiles, tiles = [at], seen = new Set([at.c + ',' + at.r]);
  for (let i = 0; i < tiles.length && tiles.length <= P.caskSpill; i++) {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = tiles[i].c + dc, r = tiles[i].r + dr, k = c + ',' + r;
      if (seen.has(k) || tiles.length > P.caskSpill || t[r]?.[c] !== 'floor' || room.poolGrid?.[r]?.[c]) continue;
      seen.add(k); tiles.push({ c, r });
    }
  }
  addPool(room, 'oil', tiles);
}

/** A glyph's blast at (x, z), reach `R`: rubble is cleared, briars and cobwebs torn away and candle stands knocked
    over (piles, casks and glowcaps among the rocks break through `strikeProp`). */
export function blastProps(room: Room, x: number, z: number, R: number) {
  for (const box of [...room.lows ?? [], ...room.soft ?? []]) {
    if (!PROPS[box.prop.kind].blast) continue;
    if (!(Math.abs(box.x - x) < box.hx + R && Math.abs(box.z - z) < box.hz + R && Math.hypot(box.x - x, box.z - z) < R + .6)) continue;
    if (isMechanism(box.prop.kind)) strikeMechanism(room, box, true); else breakProp(room, box); // a candle stand is knocked over
  }
}

/* ---------- fire ---------- */

/** Fire reaches (x, z) and `r` around it: what burns there catches, and glowcap spores flash. */
export function burnPropsAt(x: number, z: number, r = 0) {
  const room = G.current;
  elementAt('burn', x, z, r); // braziers and candles catch, runes take fire, ice round a frozen foe melts
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (!PROPS[p.kind].burns || p.burning > 0) continue;
    if (Math.abs(box.x - x) < box.hx + r + .1 && Math.abs(box.z - z) < box.hz + r + .1) ignite(room, box);
  }
  for (const s of room.spores ?? []) if (Math.hypot(s.x - x, s.z - z) < P.spores.reach + r) flash(room, s);
}

function ignite(room: Room, box: PropBox) {
  const p = box.prop; p.burning = P.burn[p.kind] ?? 1;
  const f = new THREE.Group(), gl = glow(FIRE, 1.4, .8); gl.position.y = .35;
  if (kitObjects(room)) { f.add(burningFire(p.kind, p.tiles.length), gl); f.userData.fire = true; } // (the kit's fire moves by itself)
  else { const cone = new THREE.Mesh(GEO.flame, MAT.flame); cone.position.y = .25; f.add(cone, gl); }
  f.position.set(box.x - room.cx, 0, box.z - room.cz); room.group.add(f); p.flame = f;
  burst(box.x, .3, box.z, FIRE, 6, 2, .06); Sfx.at(box.x, box.z).catchFire();
}

/* ---------- glowcap spores ---------- */

/** A cloud of spores at (x, z): a broken glowcap's, or a Sporeling's puff (M4: `color` its violet, `sting` the seconds it
    dims the mage's sight who stands in it, with half a heart, once). Fire makes either flash. */
export function addSpores(room: Room, x: number, z: number, o: { color?: number; sting?: number } = {}) {
  const g = new THREE.Group(); g.position.set(x - room.cx, 0, z - room.cz);
  for (let i = 0; i < 5; i++) { const s = glow(o.color ?? SPORE, .9 + Math.random() * .6, .35); s.position.set((Math.random() - .5) * 1.4, .3 + Math.random() * .5, (Math.random() - .5) * 1.4); g.add(s); }
  room.group.add(g); (room.spores ??= []).push({ x, z, t: P.spores.time, g, sting: o.sting });
}
function dropSpores(room: Room, s: SporeCloud) { room.group.remove(s.g); disposeTree(s.g); room.spores = room.spores?.filter(o => o !== s); }

/** Fire found a cloud of spores: it flashes, burning every foe in reach, and the mage too if they stand in it. */
function flash(room: Room, s: SporeCloud) {
  dropSpores(room, s);
  const S = P.spores;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden) continue;
    const dx = e.x - s.x, dz = e.z - s.z, d = Math.hypot(dx, dz);
    if (d > S.reach + e.r) continue;
    damageEnemy(e, S.damage, d > .01 ? dx / d : 0, d > .01 ? dz / d : 0, .6, 'spell', 'ember'); inflict(e, { burn: S.burn });
  }
  if (Math.hypot(player.x - s.x, player.z - s.z) < S.reach) hurtPlayer(S.mageHurt, s.x, s.z);
  burst(s.x, .5, s.z, FIRE, 18, 3.2, .07); burst(s.x, .5, s.z, SPORE, 10, 2.4, .05);
  for (let i = 0; i < 5; i++) riseMote(s.x + (Math.random() - .5) * 1.2, .3, s.z + (Math.random() - .5) * 1.2, EMBER, .5);
  Sfx.at(s.x, s.z).sporeFlash(); G.shake = Math.max(G.shake, .15);
  fireAt(s.x, s.z, S.reach * .6); // and it lights what burns round it
}

/* ---------- every step ---------- */

/** How fast one can walk at (x, z): slower through cobwebs. */
export function snagAt(x: number, z: number, room = G.current) {
  const kind = room.template.tiles[Math.floor(z - room.bounds.minZ)]?.[Math.floor(x - room.bounds.minX)];
  return kind === 'web' ? P.webSlow : 1;
}
const standsIn = (box: PropBox, x: number, z: number) => Math.abs(x - box.x) < box.hx + .05 && Math.abs(z - box.z) < box.hz + .05;

let stingT = 0, spreadT = 0;
export function updateProps(dt: number) {
  const room = G.current;
  // briars sting the mage and walking foes that push through them
  if ((stingT -= dt) <= 0) {
    stingT = .5;
    for (const box of room.soft ?? []) {
      if (box.prop.kind !== 'briar' || box.prop.burning > 0) continue;
      if (standsIn(box, player.x, player.z)) { hurtPlayer(P.briarHurt, box.x, box.z); Sfx.at(box.x, box.z).tear(); }
      for (const e of G.enemies) if (!e.dead && e.spawn <= 0 && !e.hidden && !e.flying && standsIn(box, e.x, e.z)) damageEnemy(e, P.briarDamage * .5, 0, 0, 0, 'spell');
    }
  }
  // burning: embers, what stands in it catches, the fire spreads, and at the end it's gone, soot in its place
  const spread = (spreadT -= dt) <= 0; if (spread) spreadT = P.spread;
  for (const box of (room.props ?? []).filter(b => b.prop.burning > 0)) {
    const p = box.prop;
    if (Math.random() < dt * 8) riseMote(box.x + (Math.random() - .5) * .6, .3, box.z + (Math.random() - .5) * .6, EMBER, .45);
    if (p.flame && !p.flame.userData.fire) p.flame.scale.setScalar(.8 + Math.sin(performance.now() * .02 + box.x) * .15);
    if (spread) {
      for (const e of G.enemies) if (!e.dead && e.spawn <= 0 && !e.hidden && !e.flying && standsIn(box, e.x, e.z)) inflict(e, { burn: 1 });
      if (standsIn(box, player.x, player.z)) hurtPlayer(1, box.x, box.z);
      fireAt(box.x, box.z, .6);
      if (Math.random() < .5) Sfx.at(box.x, box.z).crackle();
    }
    if ((p.burning -= dt) <= 0) {
      if (p.flame) { room.group.remove(p.flame); disposeTree(p.flame); }
      for (const t of p.tiles) { const w = worldOf(room, t.c, t.r); addDecal(w.x, w.z, 0x0a0806, .8); }
      burst(box.x, .3, box.z, 0x2a2420, 8, 1.2, .06);
      removeProp(room, box);
    }
  }
  // spores drift and settle
  for (const s of room.spores ?? []) {
    s.t -= dt; s.g.rotation.y += dt * .4; s.g.position.y = Math.sin(s.t * 2) * .05;
    if (s.sting && !s.stung && Math.hypot(player.x - s.x, player.z - s.z) < P.spores.reach * .8) { // a Sporeling's spores sting, and dim the sight
      if (hurtPlayer(1, s.x, s.z)) { s.stung = true; player.dim = Math.max(player.dim, s.sting); } // (while the mage shrugs off blows, the cloud waits)
    }
    for (const c of s.g.children) ((c as THREE.Mesh).material as THREE.Material).opacity = .35 * Math.min(1, s.t);
    if (s.t <= 0) dropSpores(room, s);
  }
}

/** Dev menu: put an object down on the free tile nearest (x, z) in the current room. */
export function placeProp(kind: PropKind, x: number, z: number) {
  const room = G.current, c = Math.floor(x - room.bounds.minX), r = Math.floor(z - room.bounds.minZ);
  if (room.template.tiles[r]?.[c] !== 'floor') return null;
  return addProp(room, kind, c, r);
}
