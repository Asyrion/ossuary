/* Dressed walls (M3.6): the tall walls facing into a room stop being flat brick. Pilasters stand out from them
   at intervals, and between the pilasters niches are set into the wall, holding what the floor keeps there (a
   skull, a candle stub, a small urn, a few bones). What a floor's walls carry comes from its look
   (`wall.dress` in data/floors.json). Dressing is only seen: it never blocks, and keeps clear of doors and torches.
   Meshes share their geometries and materials (per look), so a room of them costs little. */
import * as THREE from 'three';
import type { FloorLook, NicheKind, Room } from '../types';
import { H_TALL } from './dims';
import { markShared, mergeStill } from '../render/materials';
import type { FlameSpec } from '../render/fire';
import { DEV } from '../state';
import { mulberry } from '../util';
import { candleFire } from './objectLooks';
import { nicheLook, pilasterLook } from './wallLooks';


const geo = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
/** An arch: a rectangle with a round top, `w` wide and `h` tall to the top of the round, standing on y = 0. */
function archShape(w: number, h: number) {
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
  return s;
}
const G = {
  shaft: geo(new THREE.BoxGeometry(.34, H_TALL - .2, .12)), base: geo(new THREE.BoxGeometry(.46, .14, .2)), cap: geo(new THREE.BoxGeometry(.46, .1, .2)),
  recess: geo(new THREE.ShapeGeometry(archShape(.46, .6), 8)), rim: geo(new THREE.TorusGeometry(.26, .035, 4, 12, Math.PI)),
  jamb: geo(new THREE.BoxGeometry(.07, .37, .07)), sill: geo(new THREE.BoxGeometry(.6, .05, .14)),
  skull: geo(new THREE.SphereGeometry(.085, 8, 6)), jaw: geo(new THREE.BoxGeometry(.09, .04, .07)),
  candle: geo(new THREE.CylinderGeometry(.028, .032, .13, 6)), flame: geo(new THREE.ConeGeometry(.022, .06, 5)),
  urn: geo(new THREE.LatheGeometry([[0, 0], [.05, 0], [.075, .05], [.07, .11], [.04, .14], [.045, .16], [0, .16]].map(([x, y]) => new THREE.Vector2(x, y)), 8)),
  bone: geo(new THREE.CylinderGeometry(.014, .014, .2, 5)),
  handbell: geo(new THREE.LatheGeometry([[0, .2], [.02, .2], [.02, .15], [.05, .13], [.07, .03], [.085, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 10)), eye: geo(new THREE.SphereGeometry(.026, 6, 4)),
};
const dark = markShared(new THREE.MeshBasicMaterial({ color: 0x080605 }));
const boneMat = markShared(new THREE.MeshStandardMaterial({ color: 0xcfc2a6, roughness: .8, emissive: 0x16110a }));
const waxMat = markShared(new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: .6, emissive: 0x2a2010 }));
const flameMat = markShared(new THREE.MeshBasicMaterial({ color: 0xffc36a }));
const bronzeMat = markShared(new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: .4, metalness: .5, emissive: 0x3a2810 }));
const clayMat = markShared(new THREE.MeshStandardMaterial({ color: 0x7a4a30, roughness: .85 }));
const stoneCache = new Map<string, THREE.Material>();
/** The dressing's stone: the floor's brick colour, a little lighter, so pilasters stand out from the wall. */
function stone(look: FloorLook) {
  let m = stoneCache.get(look.name);
  if (!m) {
    const [r, g, b] = look.wall.brick.map(v => Math.min(255, Math.round(v * 1.4)));
    m = markShared(new THREE.MeshStandardMaterial({ color: new THREE.Color(`rgb(${r},${g},${b})`), roughness: .9 }));
    stoneCache.set(look.name, m);
  }
  return m;
}

/** Dress a stretch of tall wall facing south into the room: its inner face at world z `face`, spanning world
    x [x0, x1]; `avoid` are world x positions to keep clear (doors, torches), each with how much room it needs. */
export function dressNorthWall(room: Room, face: number, x0: number, x1: number, avoid: { x: number; room: number }[]) {
  const dress = room.look.wall.dress; if (!dress || room.type === 'library') return; // (its shelves line the north wall)
  const R = mulberry(room.plan.seed ^ Math.round(face * 131 + x0 * 7));
  const clear = (x: number, need: number) => x - need >= x0 && x + need <= x1 && avoid.every(a => Math.abs(x - a.x) >= a.room + need);
  const spots: number[] = [];
  for (let x = Math.floor(x0) + .5; x < x1; x++) spots.push(x);
  const kit = DEV.roomKit && !!room.look.kinds, wall = kit ? new THREE.Group() : room.group; // (the room kit's: the wall's dressing merged into one)
  const add = (mesh: THREE.Object3D, x: number) => { mesh.position.x += x - room.cx; mesh.position.z += face - room.cz; wall.add(mesh); };
  const niches = Object.entries(dress.niches) as [NicheKind, number][], total = niches.reduce((s, [, w]) => s + w, 0);
  const eyes = room.theme?.watchers ? (room.eyes ??= new THREE.MeshBasicMaterial({ color: 0x000000 })) : undefined; // an ossuary's skulls watch
  const flames: FlameSpec[] | undefined = kit ? [] : undefined; // (the room kit's: every candle's flame on this wall in one fire)
  spots.forEach((x, i) => {
    if (dress.pilaster && (i + 1) % dress.pilaster === 0) { if (clear(x, .25)) add(kit ? pilasterLook(room.look) : pilaster(room.look), x); return; }
    if (!total || !clear(x, .32) || R() < .35) return;
    let pick = R() * total, kind: NicheKind = niches[0][0];
    for (const [k, w] of niches) { pick -= w; if (pick <= 0) { kind = k; break; } }
    const n = flames?.length ?? 0;
    add(kit ? nicheLook(kind, R, room.look, eyes, flames) : niche(kind, R, stone(room.look), eyes, flames), x);
    for (const f of flames?.slice(n) ?? []) { f.x += x - room.cx; f.z += face - room.cz; }
  });
  if (flames?.length) room.group.add(candleFire(flames, room.look));
  if (kit && wall.children.length) { mergeStill(wall); room.group.add(wall); }
}

/** A spell was cast in `room`: if its skulls watch (an ossuary), their eyes take the spell's colour. */
export function skullsWatch(room: Room, color: string) { room.eyes?.color.set(color); }

function pilaster(look: FloorLook) {
  const g = new THREE.Group(), m = stone(look);
  const shaft = new THREE.Mesh(G.shaft, m); shaft.position.set(0, (H_TALL - .2) / 2 + .1, .06);
  const base = new THREE.Mesh(G.base, m); base.position.set(0, .07, .1);
  const cap = new THREE.Mesh(G.cap, m); cap.position.set(0, H_TALL - .1, .1);
  g.add(shaft, base, cap); return g;
}

/** A niche: a dark arched recess framed in stone, with a sill and what the floor keeps in it. With `flames`, a candle's
    flame is put there (where it burns, from the niche's middle) for the room kit's fire, not built. */
function niche(kind: NicheKind, R: () => number, frame: THREE.Material, eyes?: THREE.Material, flames?: FlameSpec[]) {
  const g = new THREE.Group(), y0 = .42;
  const recess = new THREE.Mesh(G.recess, dark); recess.position.set(0, y0, .004);
  const rim = new THREE.Mesh(G.rim, frame); rim.position.set(0, y0 + .6 - .23, .02);
  const sill = new THREE.Mesh(G.sill, frame); sill.position.set(0, y0, .06);
  const jl = new THREE.Mesh(G.jamb, frame), jr = new THREE.Mesh(G.jamb, frame);
  jl.position.set(-.26, y0 + .19, .02); jr.position.set(.26, y0 + .19, .02);
  g.add(recess, rim, sill, jl, jr);
  const on = y0 + .025;
  if (kind === 'skull') {
    const s = new THREE.Mesh(G.skull, boneMat); s.scale.set(1, .9, 1); s.position.set((R() - .5) * .1, on + .08, .06);
    const j = new THREE.Mesh(G.jaw, boneMat); j.position.set(s.position.x, on + .02, .08);
    g.add(s, j);
    if (eyes) for (const dx of [-.036, .036]) { const e = new THREE.Mesh(G.eye, eyes); e.position.set(s.position.x + dx, on + .09, .135); g.add(e); }
  } else if (kind === 'candle') {
    for (const dx of R() < .5 ? [0] : [-.09, .07]) {
      const c = new THREE.Mesh(G.candle, waxMat); c.position.set(dx, on + .065, .06);
      g.add(c);
      if (flames) flames.push({ x: dx, y: on + .13, z: .06, h: .12, w: .06, beat: flames.length * 1.7 }); // (the room kit's fire, lit where the niche stands)
      else { const f = new THREE.Mesh(G.flame, flameMat); f.position.set(dx, on + .16, .06); g.add(f); }
    }
  } else if (kind === 'bell') { // a small hand bell of bronze
    const b = new THREE.Mesh(G.handbell, bronzeMat); b.scale.setScalar(1.5); b.position.set(0, on, .06); g.add(b);
  } else if (kind === 'urn') {
    const u = new THREE.Mesh(G.urn, clayMat); u.position.set(0, on, .06); g.add(u);
  } else if (kind === 'bones') {
    for (const [a, dx] of [[1.3, -.03], [1.9, .04], [1.6, 0]]) {
      const b = new THREE.Mesh(G.bone, boneMat); b.rotation.set(0, R() * .6, a); b.position.set(dx, on + .03, .06); g.add(b);
    }
  }
  return g;
}
