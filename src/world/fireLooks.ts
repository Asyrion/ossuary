/* The room kit's fire objects (docs/archive/M3.5-plan.md): the wall torch in each floor's style, the
   brazier and the candle stand, built in code in the style of the spell effects (docs/effects.md), with their fire from
   render/fire.ts. What they do is in rooms.ts and mechanisms.ts. Each returns its parts: what lights up (hidden while
   cold) and its glow. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, markShared, paint } from '../render/materials';
import { MAT, joinAll, mesh, runeStrokes, shared } from './kitParts';
import { EMBER_FIRE, firePalette, makeFire, type FirePalette, type FlameSpec } from '../render/fire';
import type { BrazierKind, TorchKind } from './kitData';

export const RUNE_COLD = 0x2a1d16,
  RUNE_LIT = 0xffa040;
const CANDLE_FIRE = firePalette(0xffd070, 0xff8428);
/** Black volcanic glass (the Seal's), painted. */
const OBSIDIAN = paint(0x241e2e);

const GEO = {
  plate: shared(new THREE.BoxGeometry(0.17, 0.3, 0.03)),
  plateTop: shared(new THREE.ConeGeometry(0.12, 0.1, 4).rotateY(Math.PI / 4).scale(1, 1, 0.25)),
  rivet: shared(new THREE.SphereGeometry(0.024, 6, 4)),
  arm: shared(new THREE.BoxGeometry(0.045, 0.045, 0.2)),
  ring: shared(new THREE.TorusGeometry(0.05, 0.016, 4, 10).rotateX(Math.PI / 2)),
  haft: shared(new THREE.CylinderGeometry(0.03, 0.022, 0.42, 6)),
  head: shared(new THREE.CylinderGeometry(0.052, 0.038, 0.12, 7)),
  band: shared(new THREE.TorusGeometry(0.05, 0.013, 4, 10).rotateX(Math.PI / 2)),
  rune: shared(runeStrokes(0.11)),
  // the lantern: an arm, a cap, a cage of six bars round a pane of glass, a base
  lArm: shared(new THREE.BoxGeometry(0.04, 0.04, 0.32)),
  lCap: shared(new THREE.ConeGeometry(0.13, 0.12, 6)),
  lBar: shared(new THREE.BoxGeometry(0.018, 0.24, 0.018)),
  lBase: shared(new THREE.CylinderGeometry(0.11, 0.08, 0.045, 6)),
  lGlass: shared(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 6, 1, true)),
  lHook: shared(new THREE.TorusGeometry(0.03, 0.01, 4, 8)),
  // a bowl of iron, turned: rim at the top
  bowl: shared(
    new THREE.LatheGeometry(
      [
        [0.08, 0],
        [0.23, 0.03],
        [0.3, 0.09],
        [0.325, 0.17],
        [0.335, 0.28],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  ),
  coals: shared(new THREE.CylinderGeometry(0.31, 0.31, 0.04, 12)),
  lump: shared(new THREE.DodecahedronGeometry(0.075, 0)),
  ember: shared(new THREE.SphereGeometry(0.04, 5, 3)),
  rim: shared(new THREE.TorusGeometry(0.35, 0.028, 4, 18).rotateX(Math.PI / 2)),
  collar: shared(new THREE.TorusGeometry(0.2, 0.02, 4, 12).rotateX(Math.PI / 2)),
  leg: shared(new THREE.CylinderGeometry(0.026, 0.032, 1, 5)),
  claw: shared(new THREE.SphereGeometry(0.05, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
  plaque: shared(new THREE.BoxGeometry(0.17, 0.14, 0.02)),
  // the candle stand
  foot: shared(new THREE.CylinderGeometry(0.16, 0.22, 0.05, 6)),
  pole: shared(new THREE.CylinderGeometry(0.026, 0.034, 0.72, 6)),
  knop: shared(new THREE.SphereGeometry(0.045, 7, 5)),
  dish: shared(new THREE.CylinderGeometry(0.24, 0.17, 0.045, 12)),
  dishRim: shared(new THREE.TorusGeometry(0.24, 0.014, 4, 16).rotateX(Math.PI / 2)),
  candle: shared(new THREE.CylinderGeometry(0.038, 0.042, 1, 7)),
  drip: shared(new THREE.SphereGeometry(0.022, 5, 4)),
  pool: shared(new THREE.SphereGeometry(0.09, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.25, 1)),
  // the other wall lights: a skull, a candelabra's bar and cups, a witchlight's orb and cage, a beast's mask, a hanging basket
  skull: shared(new THREE.SphereGeometry(0.085, 9, 7).scale(1, 0.92, 1.05)),
  jaw: shared(new THREE.BoxGeometry(0.1, 0.04, 0.08)),
  socket: shared(new THREE.SphereGeometry(0.024, 6, 4)),
  shelf: shared(new THREE.BoxGeometry(0.18, 0.03, 0.14)),
  bar: shared(new THREE.BoxGeometry(0.4, 0.035, 0.04)),
  cup: shared(new THREE.CylinderGeometry(0.045, 0.03, 0.04, 8)),
  orb: shared(new THREE.SphereGeometry(0.095, 10, 8)),
  hoop: shared(new THREE.TorusGeometry(0.105, 0.012, 4, 14)),
  finial: shared(new THREE.ConeGeometry(0.04, 0.09, 6)),
  mask: shared(new THREE.SphereGeometry(0.17, 8, 6).scale(1, 1.05, 0.45)),
  horn: shared(new THREE.ConeGeometry(0.04, 0.2, 5)),
  brow: shared(new THREE.BoxGeometry(0.26, 0.045, 0.07)),
  slit: shared(new THREE.BoxGeometry(0.055, 0.022, 0.02)),
  chain: shared(new THREE.CylinderGeometry(0.01, 0.01, 1, 4)),
  basketRing: shared(new THREE.TorusGeometry(1, 0.06, 4, 12).rotateX(Math.PI / 2)),
  basketBar: shared(new THREE.BoxGeometry(0.018, 1, 0.018)),
  // the other braziers: a font's pedestal and basin, a post, a fluted column and its capital, a plinth, a cauldron
  pedestal: shared(new THREE.CylinderGeometry(0.15, 0.19, 0.5, 8)),
  base: shared(new THREE.BoxGeometry(0.46, 0.1, 0.46)),
  basin: shared(
    new THREE.LatheGeometry(
      [
        [0.12, 0],
        [0.28, 0.04],
        [0.37, 0.13],
        [0.38, 0.2],
        [0.33, 0.2],
        [0.3, 0.12],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      10,
    ),
  ),
  post: shared(new THREE.CylinderGeometry(0.035, 0.045, 1, 6)),
  column: shared(new THREE.CylinderGeometry(0.13, 0.15, 0.52, 10)),
  capital: shared(new THREE.CylinderGeometry(0.21, 0.15, 0.08, 10)),
  plinth: shared(new THREE.BoxGeometry(0.66, 0.34, 0.66)),
  plinthTop: shared(new THREE.BoxGeometry(0.72, 0.06, 0.72)),
  wideBowl: shared(
    new THREE.LatheGeometry(
      [
        [0.1, 0],
        [0.3, 0.03],
        [0.4, 0.1],
        [0.42, 0.16],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  ),
  pot: shared(
    new THREE.LatheGeometry(
      [
        [0.1, 0],
        [0.25, 0.06],
        [0.33, 0.2],
        [0.33, 0.32],
        [0.28, 0.42],
        [0.27, 0.45],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  ),
  stub: shared(new THREE.CylinderGeometry(0.04, 0.03, 0.16, 5)),
  handle: shared(new THREE.TorusGeometry(0.06, 0.015, 4, 10)),
  // the Reliquary's: a sconce's back plate and drip pan, a candle crown's ring; a chalice's cup; a censer's orb
  disc: shared(new THREE.CircleGeometry(0.13, 14)),
  pan: shared(new THREE.CylinderGeometry(0.1, 0.06, 0.03, 10)),
  chalice: shared(
    new THREE.LatheGeometry(
      [
        [0.05, 0],
        [0.2, 0.04],
        [0.3, 0.12],
        [0.34, 0.24],
        [0.35, 0.3],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  ),
  censer: shared(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, Math.PI * 0.28, Math.PI * 0.72)),
  hole: shared(new THREE.SphereGeometry(0.032, 5, 4)),
  // the Shore's: a boatman's crooked pole; flat stones for a cairn; a stone boat's hull; a funeral urn
  staff: shared(new THREE.CylinderGeometry(0.028, 0.036, 1, 6)),
  flat: shared(new THREE.CylinderGeometry(0.13, 0.15, 0.07, 7)),
  hull: shared(new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.7, 0.75, 1)),
  prow: shared(new THREE.ConeGeometry(0.07, 0.3, 5)),
  urn: shared(
    new THREE.LatheGeometry(
      [
        [0.1, 0],
        [0.16, 0.05],
        [0.29, 0.22],
        [0.3, 0.38],
        [0.2, 0.56],
        [0.15, 0.62],
        [0.22, 0.7],
        [0.24, 0.72],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
  ),
};

/** The wall torch's fire colours in a floor's look (the crypt's amber, the drowned's pale lanterns, the burning's red). */
export const torchPalette = (t: FloorLook['torch']) =>
  firePalette(new THREE.Color(t.flame).getHex(), new THREE.Color(t.light).getHex());

/** A light on a wall, built facing south (+Z, into the room) from the wall's face, of the room's kind (kitData.ts): each
    floor offers two or three. Upright and close to the wall: seen from above at 45°, whatever leans out towards the
    camera drops down the screen, so the fire always stands above its holder. `lit` is what shows while it burns (the
    fire, a lantern's glass, eyes that glow); the glow is apart, for the flicker. */
export function torchLook(t: FloorLook['torch'], kind: TorchKind) {
  const holder = new THREE.Group(),
    lit = new THREE.Group(),
    pal = torchPalette(t);
  lit.userData.fire = true; // (its fire moves by itself: no flicker from outside)
  const gl = TORCHES[kind](holder, lit, pal, t);
  holder.add(lit, gl);
  return { holder, lit, glow: gl };
}
type TorchBuild = (holder: THREE.Group, lit: THREE.Group, pal: FirePalette, t: FloorLook['torch']) => THREE.Sprite;
const at = (s: THREE.Sprite, x: number, y: number, z: number) => {
  s.position.set(x, y, z);
  return s;
};
const TORCHES: Record<TorchKind, TorchBuild> = {
  bracket(holder, lit, pal) {
    // an iron plate and bracket holding a pitch torch upright
    mesh(holder, GEO.plate, MAT.iron, 0, 0.86, 0.015);
    mesh(holder, GEO.plateTop, MAT.iron, 0, 1.06, 0.015);
    mesh(holder, GEO.rivet, MAT.bronze, 0, 0.97, 0.035);
    mesh(holder, GEO.rivet, MAT.bronze, 0, 0.74, 0.035);
    mesh(holder, GEO.arm, MAT.iron, 0, 0.8, 0.06).scale.z = 0.6;
    mesh(holder, GEO.ring, MAT.iron, 0, 0.82, 0.11);
    mesh(holder, GEO.ring, MAT.iron, 0, 1.0, 0.11).scale.setScalar(0.85);
    mesh(holder, GEO.haft, MAT.wood, 0, 0.95, 0.11);
    mesh(holder, GEO.head, MAT.pitch, 0, 1.2, 0.115);
    mesh(holder, GEO.band, MAT.iron, 0, 1.15, 0.115);
    lit.add(makeFire([{ x: 0, y: 1.23, z: 0.12, h: 0.4, w: 0.13, tongues: 2 }], pal, 4, 0.45));
    return at(glow(pal.body, 1.1, 0.7), 0, 1.32, 0.14);
  },
  skull(holder, lit, pal) {
    // a skull on an iron shelf, the fire burning in its open crown and its eyes lit from within
    mesh(holder, GEO.plate, MAT.iron, 0, 0.9, 0.015).scale.set(1.1, 0.8, 1);
    mesh(holder, GEO.arm, MAT.iron, 0, 0.86, 0.06).scale.z = 0.6;
    mesh(holder, GEO.shelf, MAT.iron, 0, 0.93, 0.09).scale.set(1.2, 1, 1.1);
    mesh(holder, GEO.skull, MAT.skull, 0, 1.06, 0.09).scale.setScalar(1.25);
    mesh(holder, GEO.jaw, MAT.skull, 0, 0.97, 0.14).scale.set(1.2, 1, 1.1);
    for (const s of [-1, 1]) {
      mesh(holder, GEO.socket, MAT.socket, s * 0.042, 1.06, 0.185).scale.setScalar(1.3);
      mesh(lit, GEO.socket, eyeFor(pal.body), s * 0.042, 1.06, 0.195).scale.setScalar(0.75);
    }
    mesh(holder, GEO.socket, MAT.socket, 0, 1.015, 0.2).scale.set(0.6, 0.8, 0.6); // (the nose)
    lit.add(makeFire([{ x: 0, y: 1.15, z: 0.09, h: 0.28, w: 0.12, tongues: 1 }], pal, 3, 0.4));
    return at(glow(pal.body, 1.0, 0.6), 0, 1.24, 0.12);
  },
  candelabra(holder, lit, pal, t) {
    // an iron bar on the wall with three candles in cups, in the floor's wax
    mesh(holder, GEO.plate, MAT.iron, 0, 0.86, 0.015).scale.set(0.5, 1, 1);
    mesh(holder, GEO.arm, MAT.iron, 0, 0.9, 0.06).scale.z = 0.6;
    mesh(holder, GEO.bar, MAT.iron, 0, 0.92, 0.1);
    const specs: FlameSpec[] = [];
    for (const [x, h] of [
      [-0.16, 0.13],
      [0, 0.17],
      [0.16, 0.12],
    ]) {
      mesh(holder, GEO.cup, MAT.bronze, x, 0.955, 0.1);
      mesh(holder, GEO.candle, t.wax ? waxFor(t.wax) : MAT.wax, x, 0.975 + h / 2, 0.1).scale.set(0.8, h, 0.8); // (the drowned's tallow: its pale flames stand out)
      specs.push({ x, y: 0.975 + h, z: 0.1, h: 0.17, w: 0.08 });
    }
    lit.add(makeFire(specs, pal, 3, 0.3));
    return at(glow(pal.body, 1.2, 0.75), 0, 1.2, 0.12);
  },
  cluster(holder, lit, pal, t) {
    // the Vigil's: a stone corbel on the wall crowded with candles of every height, their
    // wax run down over its edge in long drips
    const wax = t.wax ? waxFor(t.wax) : MAT.wax;
    mesh(holder, GEO.plinthTop, MAT.stone, 0, 0.82, 0.1).scale.set(0.62, 1.2, 0.38);
    mesh(holder, GEO.plinth, MAT.stone, 0, 0.66, 0.06).scale.set(0.4, 0.62, 0.2);
    const specs: FlameSpec[] = [];
    for (const [x, z, h] of [
      [-0.17, 0.1, 0.12],
      [-0.08, 0.16, 0.26],
      [0.02, 0.08, 0.34],
      [0.11, 0.17, 0.18],
      [0.19, 0.09, 0.09],
    ]) {
      mesh(holder, GEO.candle, wax, x, 0.86 + h / 2, z).scale.set(0.9, h, 0.9);
      mesh(holder, GEO.drip, wax, x + 0.03, 0.86 + h * 0.7, z + 0.035);
      specs.push({ x, y: 0.86 + h, z, h: 0.15, w: 0.07 });
    }
    mesh(holder, GEO.pool, wax, 0, 0.85, 0.12).scale.set(2.2, 1, 1.2);
    for (const [x, len] of [
      [-0.12, 0.14],
      [0.05, 0.22],
      [0.16, 0.1],
    ])
      mesh(holder, GEO.drip, wax, x, 0.82 - len / 2, 0.225).scale.set(0.7, len * 22, 0.7); // (runs of wax down its face)
    lit.add(makeFire(specs, pal, 4, 0.32));
    return at(glow(pal.body, 1.3, 0.8), 0, 1.15, 0.14);
  },
  lantern(holder, lit, pal) {
    // a cage lantern on an arm; its glass glows with the flame
    mesh(holder, GEO.lArm, MAT.iron, 0, 1.4, 0.16);
    mesh(holder, GEO.lHook, MAT.iron, 0, 1.36, 0.31);
    mesh(holder, GEO.lCap, MAT.iron, 0, 1.28, 0.31);
    mesh(holder, GEO.lBase, MAT.iron, 0, 0.98, 0.31);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      mesh(holder, GEO.lBar, MAT.iron, Math.cos(a) * 0.095, 1.1, 0.31 + Math.sin(a) * 0.095);
    }
    mesh(lit, GEO.lGlass, glassFor(pal.body), 0, 1.1, 0.31).renderOrder = 2;
    lit.add(makeFire([{ x: 0, y: 1.0, z: 0.31, h: 0.17, w: 0.085 }], pal));
    return at(glow(pal.body, 1.1, 0.8), 0, 1.1, 0.33);
  },
  witchlight(holder, lit, pal) {
    // a glass orb in a cage of three hoops, a pale flame drifting inside it
    mesh(holder, GEO.plate, MAT.iron, 0, 0.92, 0.015).scale.set(0.7, 0.8, 1);
    mesh(holder, GEO.arm, MAT.iron, 0, 0.98, 0.07).scale.z = 0.8;
    mesh(holder, GEO.cup, MAT.bronze, 0, 1.0, 0.14).scale.set(1.3, 1, 1.3);
    for (let i = 0; i < 3; i++) mesh(holder, GEO.hoop, MAT.bronze, 0, 1.115, 0.14).rotation.y = (i * Math.PI) / 3;
    mesh(holder, GEO.finial, MAT.bronze, 0, 1.25, 0.14);
    mesh(lit, GEO.orb, glassFor(pal.body, 0.35), 0, 1.115, 0.14).renderOrder = 2;
    lit.add(makeFire([{ x: 0, y: 1.05, z: 0.14, h: 0.15, w: 0.09 }], pal, 2, 0.12));
    return at(glow(pal.body, 1.2, 0.8), 0, 1.12, 0.16);
  },
  brazier(holder, lit, pal) {
    // a small brazier on a wall bracket
    mesh(holder, GEO.plate, MAT.iron, 0, 0.66, 0.015).scale.set(0.8, 1.2, 1);
    const strut = mesh(holder, GEO.arm, MAT.iron, 0, 0.72, 0.12);
    strut.rotation.x = -0.5;
    strut.scale.z = 1.2;
    mesh(holder, GEO.bowl, MAT.iron, 0, 0.8, 0.26).scale.setScalar(0.62);
    mesh(holder, GEO.rim, MAT.bronze, 0, 0.94, 0.26).scale.setScalar(0.62);
    mesh(holder, GEO.coals, MAT.coals, 0, 0.93, 0.26).scale.setScalar(0.6);
    lit.add(makeFire([{ x: 0, y: 0.95, z: 0.26, h: 0.5, w: 0.26, tongues: 3 }], pal, 5, 0.6));
    return at(glow(pal.body, 1.5, 0.8), 0, 1.15, 0.28);
  },
  mask(holder, lit, pal) {
    // a horned beast's mask of iron, eyes burning, a bowl of fire on its brow
    mesh(holder, GEO.mask, MAT.blackIron, 0, 0.95, 0.04);
    mesh(holder, GEO.brow, MAT.iron, 0, 1.0, 0.1);
    for (const s of [-1, 1]) {
      const h = mesh(holder, GEO.horn, MAT.bone, s * 0.2, 1.06, 0.06);
      h.rotation.z = -s * 1.05;
      h.scale.set(1.1, 1.2, 1.1); // (swept out, clear of the fire)
      mesh(lit, GEO.slit, eyeFor(pal.body), s * 0.06, 0.965, 0.115).rotation.z = s * 0.25;
    }
    mesh(holder, GEO.bowl, MAT.iron, 0, 1.06, 0.09).scale.set(0.45, 0.35, 0.45);
    mesh(holder, GEO.rim, MAT.bronze, 0, 1.16, 0.09).scale.setScalar(0.45);
    lit.add(makeFire([{ x: 0, y: 1.14, z: 0.09, h: 0.3, w: 0.16, tongues: 2 }], pal, 4, 0.45));
    return at(glow(pal.body, 1.2, 0.75), 0, 1.25, 0.12);
  },
  sconce(holder, lit, pal, t) {
    // the Reliquary's: a gilded sconce, a disc of gold behind a tall candle to throw its light back
    mesh(holder, GEO.plate, MAT.gilt, 0, 0.9, 0.015).scale.set(0.9, 1.2, 1);
    mesh(holder, GEO.plateTop, MAT.gilt, 0, 1.15, 0.015).scale.set(0.9, 1, 1);
    mesh(holder, GEO.disc, MAT.gilt, 0, 1.28, 0.03);
    mesh(holder, GEO.rivet, MAT.gilt, 0, 0.8, 0.035);
    mesh(holder, GEO.arm, MAT.gilt, 0, 0.86, 0.07).scale.z = 0.7;
    mesh(holder, GEO.pan, MAT.gilt, 0, 0.9, 0.13);
    mesh(holder, GEO.candle, t.wax ? waxFor(t.wax) : MAT.wax, 0, 1.08, 0.13).scale.set(0.9, 0.34, 0.9);
    lit.add(makeFire([{ x: 0, y: 1.25, z: 0.13, h: 0.2, w: 0.09 }], pal, 3, 0.3));
    return at(glow(pal.body, 0.85, 0.55), 0, 1.32, 0.15); // (small: the gilt plate behind must still show)
  },
  crown(holder, lit, pal, t) {
    // the Reliquary's: a small crown of candles, a gilt ring hung from a bracket, five candles on its rim
    mesh(holder, GEO.plate, MAT.gilt, 0, 1.2, 0.015).scale.set(0.6, 0.7, 1);
    mesh(holder, GEO.arm, MAT.gilt, 0, 1.3, 0.1).scale.z = 0.9;
    for (const s of [-1, 1]) {
      const c = mesh(holder, GEO.chain, MAT.gilt, s * 0.07, 1.14, 0.2);
      c.scale.y = 0.2;
      c.rotation.z = s * 0.35;
    }
    mesh(holder, GEO.basketRing, MAT.gilt, 0, 1.04, 0.2).scale.set(0.15, 1.3, 0.15);
    const specs: FlameSpec[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2,
        x = Math.cos(a) * 0.15,
        z = 0.2 + Math.sin(a) * 0.15,
        h = 0.09 + (i % 2) * 0.04;
      mesh(holder, GEO.candle, t.wax ? waxFor(t.wax) : MAT.wax, x, 1.05 + h / 2, z).scale.set(0.7, h, 0.7);
      specs.push({ x, y: 1.05 + h, z, h: 0.13, w: 0.065 });
    }
    lit.add(makeFire(specs, pal, 3, 0.3));
    return at(glow(pal.body, 1.3, 0.8), 0, 1.2, 0.22);
  },
  pole(holder, lit, pal) {
    // the Shore's: a boatman's lamp hung from a crooked pole bracketed to the wall, burning pale
    mesh(holder, GEO.staff, MAT.wood, 0, 0.95, 0.06).scale.y = 0.9;
    mesh(holder, GEO.ring, MAT.iron, 0, 0.7, 0.06).scale.setScalar(0.8);
    mesh(holder, GEO.ring, MAT.iron, 0, 1.2, 0.06).scale.setScalar(0.8);
    const crook = mesh(holder, GEO.staff, MAT.wood, 0, 1.42, 0.16);
    crook.scale.y = 0.3;
    crook.rotation.x = 1.1;
    mesh(holder, GEO.lHook, MAT.iron, 0, 1.44, 0.3);
    mesh(holder, GEO.lCap, MAT.iron, 0, 1.32, 0.3).scale.setScalar(0.8);
    mesh(holder, GEO.lBase, MAT.iron, 0, 1.08, 0.3).scale.setScalar(0.8);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      mesh(holder, GEO.lBar, MAT.iron, Math.cos(a) * 0.075, 1.19, 0.3 + Math.sin(a) * 0.075).scale.y = 0.8;
    }
    mesh(lit, GEO.lGlass, glassFor(pal.body), 0, 1.19, 0.3).scale.set(0.8, 0.82, 0.8);
    lit.add(makeFire([{ x: 0, y: 1.1, z: 0.3, h: 0.14, w: 0.07 }], pal, 2, 0.2));
    return at(glow(pal.body, 1.1, 0.8), 0, 1.19, 0.32);
  },
  cairn(holder, lit, pal) {
    // the Shore's: flat river stones stacked on a ledge, a pale flame burning in the hollow of the topmost
    mesh(holder, GEO.shelf, MAT.darkStone, 0, 0.8, 0.09).scale.set(1.4, 1.2, 1.3);
    [
      [0.84, 1.05, 0],
      [0.91, 0.9, 0.2],
      [0.98, 0.75, -0.3],
    ].forEach(([y, s, r]) => {
      const m = mesh(holder, GEO.flat, MAT.darkStone, 0, y, 0.1);
      m.scale.set(s, 1, s * 0.9);
      m.rotation.y = r;
    });
    mesh(holder, GEO.flat, MAT.stone, 0, 1.04, 0.1).scale.set(0.6, 0.8, 0.55);
    lit.add(makeFire([{ x: 0, y: 1.06, z: 0.1, h: 0.24, w: 0.1, tongues: 2 }], pal, 3, 0.25));
    return at(glow(pal.body, 0.8, 0.55), 0, 1.18, 0.12); // (small: the stones under it must still show)
  },
  shard(holder, lit, pal) {
    // the Seal's: a shard of black volcanic glass set upright in an iron collar on the wall, a Warden's
    // rune lit on its face, the seal's pale fire burning at its broken tip
    mesh(holder, GEO.plate, MAT.blackIron, 0, 0.78, 0.015).scale.set(0.8, 0.7, 1);
    mesh(holder, GEO.arm, MAT.blackIron, 0, 0.78, 0.06).scale.z = 0.6;
    mesh(holder, GEO.collar, MAT.iron, 0, 0.8, 0.1).scale.setScalar(0.4);
    const shard = mesh(holder, GEO.prow, OBSIDIAN, 0, 1.0, 0.1);
    shard.scale.set(1.25, 1.45, 0.9);
    shard.rotation.z = 0.08;
    mesh(lit, GEO.rune, eyeFor(pal.body), 0.005, 0.97, 0.158).scale.setScalar(0.7);
    lit.add(makeFire([{ x: 0.01, y: 1.2, z: 0.1, h: 0.26, w: 0.1, tongues: 2 }], pal, 3, 0.3));
    return at(glow(pal.body, 0.7, 0.42), 0, 1.24, 0.12); // (small: the shard and the glyphs round it must still show)
  },
  basket(holder, lit, pal) {
    // an iron fire basket hanging on a short chain from a bracket
    mesh(holder, GEO.plate, MAT.iron, 0, 1.18, 0.015).scale.set(0.7, 0.9, 1);
    mesh(holder, GEO.arm, MAT.iron, 0, 1.28, 0.1).scale.z = 0.9;
    mesh(holder, GEO.chain, MAT.iron, 0, 1.2, 0.18).scale.y = 0.15;
    cage(holder, 0, 0.92, 0.18, 0.13, 0.06, 0.17);
    mesh(holder, GEO.lump, MAT.coals, 0, 1.06, 0.18).scale.setScalar(1.1);
    lit.add(makeFire([{ x: 0, y: 1.06, z: 0.18, h: 0.34, w: 0.2, tongues: 2 }], pal, 4, 0.45));
    return at(glow(pal.body, 1.3, 0.8), 0, 1.18, 0.2);
  },
};
/** An iron fire basket: a ring at the top of `rTop`, bars curving in to a ring of `rBot` at the bottom, `h` tall. */
function cage(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  rTop: number,
  rBot: number,
  h: number,
  bars = 7,
) {
  mesh(parent, GEO.basketRing, MAT.iron, x, y + h, z).scale.set(rTop, 1, rTop);
  mesh(parent, GEO.basketRing, MAT.iron, x, y, z).scale.set(rBot, 1, rBot);
  for (let i = 0; i < bars; i++) {
    const a = (i / bars) * Math.PI * 2,
      b = mesh(
        parent,
        GEO.basketBar,
        MAT.iron,
        x + (Math.cos(a) * (rTop + rBot)) / 2,
        y + h / 2,
        z + (Math.sin(a) * (rTop + rBot)) / 2,
      );
    b.scale.y = Math.hypot(h, rTop - rBot);
    b.rotation.set(0, -a, 0, 'YXZ');
    b.rotateZ(-Math.atan2(rTop - rBot, h));
  }
}
const eyeCache = new Map<number, THREE.Material>();
/** Eyes lit from within, in the fire's colour (shared per colour). */
const eyeFor = (c: number) =>
  eyeCache.get(c) ??
  (eyeCache.set(
    c,
    markShared(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.3) })),
  ),
  eyeCache.get(c)!);
const glassCache = new Map<number, THREE.Material>(),
  waxCache = new Map<string, THREE.Material>();
/** Wax of a floor's colour (painted: merged into the stand's body). */
export const waxFor = (hex: string) =>
  waxCache.get(hex) ?? (waxCache.set(hex, paint(new THREE.Color(hex).getHex())), waxCache.get(hex)!);
const glassFor = (c: number, opacity = 0.2) => {
  const k = c * 10 + opacity * 100;
  return (
    glassCache.get(k) ??
    (glassCache.set(
      k,
      markShared(
        new THREE.MeshBasicMaterial({
          color: c,
          transparent: true,
          opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    ),
    glassCache.get(k)!)
  );
};

/** A standing brazier of the room's kind (kitData.ts): each floor offers two or three. Every one carries runes (their own
    material) that kindle with it; `flame` and `glow` show once lit. */
export function brazierLook(kind: BrazierKind) {
  const g = new THREE.Group(),
    runeAt: THREE.Matrix4[] = [];
  const { fire, glowY } = BRAZIERS[kind](g, runeAt);
  const runes = new THREE.Mesh(
    joinAll(runeAt.map((m) => GEO.rune.clone().applyMatrix4(m))),
    new THREE.MeshBasicMaterial({ color: RUNE_COLD }),
  ); // (its own material: lit, it glows)
  const flame = makeFire(fire, EMBER_FIRE, 8, 0.9),
    gl = glow(EMBER_FIRE.body, 1.5, 0.55);
  gl.position.y = glowY;
  flame.visible = gl.visible = false;
  g.add(runes, flame, gl, blob(0.9));
  return { group: g, parts: { flame, glow: gl, runes } };
}
/** Where a rune sits: on a face at (x, y, z), turned to face out at angle `a` round the object, tilted back by `tilt`. */
const runePlace = (x: number, y: number, z: number, a: number, tilt = 0, size = 1) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, Math.PI / 2 - a, 0, 'YXZ')),
    new THREE.Vector3(size, size, 1),
  );
/** Three runes round an object of radius `r` at height `y`, the middle one turned to the camera. */
const threeRunes = (out: THREE.Matrix4[], r: number, y: number, tilt = 0, size = 1) => {
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i - 1) * 0.9;
    out.push(runePlace(Math.cos(a) * r, y, Math.sin(a) * r, a, tilt, size));
  }
};
/** Coals heaped at height `y` within radius `r`, a few still glowing. */
function coals(g: THREE.Group, y: number, r: number) {
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4,
      d = i ? (0.3 + (i % 3) * 0.22) * r : 0,
      c = mesh(
        g,
        GEO.lump,
        i === 2 || i === 7 ? MAT.ember : MAT.coals,
        Math.cos(a) * d,
        y + (i ? 0 : 0.04),
        Math.sin(a) * d,
      );
    c.rotation.set(i, i * 2, 0);
    c.scale.setScalar(c.material === MAT.ember ? 0.6 : 0.8 + (i % 4) * 0.15);
  }
}
type BrazierBuild = (g: THREE.Group, runes: THREE.Matrix4[]) => { fire: FlameSpec[]; glowY: number };
const bigFire = (y: number, h = 0.85, w = 0.3): FlameSpec[] => [
  { x: 0, y, z: 0, h, w, tongues: 4 },
  { x: 0.15, y, z: 0.05, h: h * 0.56, w: w * 0.57, beat: 4.1 },
  { x: -0.13, y, z: -0.06, h: h * 0.65, w: w * 0.57, beat: 5.3 },
];
const BRAZIERS: Record<BrazierKind, BrazierBuild> = {
  tripod(g, runes) {
    // an iron bowl of coals on three splayed legs with claw feet and a collar, plaques with runes on the bowl
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
        foot = new THREE.Vector3(Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3),
        top = new THREE.Vector3(Math.cos(a) * 0.16, 0.6, Math.sin(a) * 0.16);
      const d = top.clone().sub(foot),
        leg = mesh(g, GEO.leg, MAT.iron);
      leg.scale.y = d.length();
      leg.position.copy(foot).addScaledVector(d, 0.5);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      mesh(g, GEO.claw, MAT.bronze, foot.x, 0, foot.z);
    }
    mesh(g, GEO.collar, MAT.iron, 0, 0.3, 0).scale.setScalar(1.05);
    mesh(g, GEO.bowl, MAT.iron, 0, 0.54, 0);
    mesh(g, GEO.rim, MAT.bronze, 0, 0.82, 0);
    mesh(g, GEO.coals, MAT.coals, 0, 0.78, 0);
    coals(g, 0.82, 0.3);
    for (let i = 0; i < 3; i++) {
      // plaques on the bowl, one turned to the camera, each with a rune
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
        x = Math.cos(a) * 0.335,
        z = Math.sin(a) * 0.335;
      const p = mesh(g, GEO.plaque, MAT.bronze, x, 0.7, z);
      p.rotation.set(-0.1, Math.PI / 2 - a, 0, 'YXZ');
      runes.push(runePlace(Math.cos(a) * 0.351, 0.7, Math.sin(a) * 0.351, a, -0.1, 1.05));
    }
    return { fire: bigFire(0.84), glowY: 1.1 };
  },
  font(g, runes) {
    // a stone basin on an eight-sided pedestal carved with runes, on a square foot
    mesh(g, GEO.base, MAT.darkStone, 0, 0.05, 0);
    mesh(g, GEO.pedestal, MAT.stone, 0, 0.35, 0);
    mesh(g, GEO.basin, MAT.stone, 0, 0.6, 0);
    mesh(g, GEO.coals, MAT.coals, 0, 0.76, 0).scale.setScalar(0.95);
    coals(g, 0.79, 0.28);
    threeRunes(runes, 0.185, 0.36, 0.08, 1.1);
    return { fire: bigFire(0.8), glowY: 1.08 };
  },
  basket(g, runes) {
    // an iron fire basket on a post over a three-footed stand, a bronze collar of runes on the post
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
        l = mesh(g, GEO.leg, MAT.iron, Math.cos(a) * 0.12, 0.07, Math.sin(a) * 0.12);
      l.scale.y = 0.3;
      l.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
    }
    mesh(g, GEO.post, MAT.iron, 0, 0.38, 0).scale.y = 0.7;
    mesh(g, GEO.pedestal, MAT.bronze, 0, 0.44, 0).scale.set(0.5, 0.36, 0.5);
    threeRunes(runes, 0.092, 0.44, 0, 0.8);
    cage(g, 0, 0.68, 0, 0.3, 0.1, 0.24, 9);
    coals(g, 0.86, 0.2);
    return { fire: bigFire(0.88, 0.8, 0.28), glowY: 1.12 };
  },
  column(g, runes) {
    // a bronze bowl gone green, on a fluted column with a capital, a band of runes round the bowl
    mesh(g, GEO.base, MAT.darkStone, 0, 0.05, 0).scale.set(0.8, 1, 0.8);
    mesh(g, GEO.column, MAT.stone, 0, 0.36, 0);
    mesh(g, GEO.capital, MAT.stone, 0, 0.65, 0);
    mesh(g, GEO.bowl, MAT.verdigris, 0, 0.6, 0).scale.set(0.95, 0.8, 0.95);
    mesh(g, GEO.rim, MAT.verdigris, 0, 0.83, 0).scale.setScalar(0.95);
    mesh(g, GEO.coals, MAT.coals, 0, 0.8, 0).scale.setScalar(0.9);
    coals(g, 0.83, 0.28);
    threeRunes(runes, 0.31, 0.72, -0.15, 0.9);
    return { fire: bigFire(0.84), glowY: 1.1 };
  },
  plinth(g, runes) {
    // a wide stone plinth under a shallow bowl of iron, a great fire; runes cut in the plinth's faces
    mesh(g, GEO.plinth, MAT.darkStone, 0, 0.17, 0);
    mesh(g, GEO.plinthTop, MAT.stone, 0, 0.37, 0);
    mesh(g, GEO.wideBowl, MAT.iron, 0, 0.4, 0);
    mesh(g, GEO.rim, MAT.bronze, 0, 0.56, 0).scale.setScalar(1.2);
    mesh(g, GEO.coals, MAT.coals, 0, 0.53, 0).scale.setScalar(1.3);
    coals(g, 0.56, 0.36);
    runes.push(
      runePlace(0, 0.19, 0.332, Math.PI / 2, 0, 1.3),
      runePlace(0.332, 0.19, 0, 0, 0, 1.3),
      runePlace(-0.332, 0.19, 0, Math.PI, 0, 1.3),
    );
    return { fire: bigFire(0.58, 1.05, 0.4), glowY: 1.0 };
  },
  chalice(g, runes) {
    // the Reliquary's: a great gilt chalice on a knopped stem and a stone foot, runes round its cup
    mesh(g, GEO.base, MAT.stone, 0, 0.05, 0).scale.set(0.8, 1, 0.8);
    mesh(g, GEO.pedestal, MAT.gilt, 0, 0.16, 0).scale.set(0.9, 0.25, 0.9);
    mesh(g, GEO.post, MAT.gilt, 0, 0.38, 0).scale.set(1.6, 0.4, 1.6);
    mesh(g, GEO.knop, MAT.gilt, 0, 0.38, 0).scale.setScalar(1.7);
    mesh(g, GEO.chalice, MAT.gilt, 0, 0.55, 0);
    mesh(g, GEO.rim, MAT.gilt, 0, 0.85, 0);
    mesh(g, GEO.coals, MAT.coals, 0, 0.8, 0);
    coals(g, 0.83, 0.28);
    threeRunes(runes, 0.32, 0.72, -0.2, 0.95);
    return { fire: bigFire(0.85), glowY: 1.12 };
  },
  censer(g, runes) {
    // the Reliquary's: a standing censer, a bronze orb pierced with holes on three thin gilt legs, open at the top
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2,
        foot = new THREE.Vector3(Math.cos(a) * 0.26, 0.03, Math.sin(a) * 0.26),
        top = new THREE.Vector3(Math.cos(a) * 0.18, 0.5, Math.sin(a) * 0.18);
      const d = top.clone().sub(foot),
        leg = mesh(g, GEO.leg, MAT.gilt);
      leg.scale.set(0.8, d.length(), 0.8);
      leg.position.copy(foot).addScaledVector(d, 0.5);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      mesh(g, GEO.claw, MAT.gilt, foot.x, 0, foot.z).scale.setScalar(0.8);
    }
    mesh(g, GEO.censer, MAT.darkBronze, 0, 0.66, 0);
    mesh(g, GEO.rim, MAT.gilt, 0, 0.87, 0).scale.setScalar(0.6);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2,
        y = i % 2 ? 0.6 : 0.72,
        r = i % 2 ? 0.265 : 0.245;
      mesh(g, GEO.hole, MAT.socket, Math.cos(a) * r, y, Math.sin(a) * r);
    } // (pierced)
    mesh(g, GEO.coals, MAT.coals, 0, 0.84, 0).scale.setScalar(0.55);
    coals(g, 0.86, 0.16);
    threeRunes(runes, 0.27, 0.52, 0.35, 0.8);
    return { fire: bigFire(0.86, 0.7, 0.22), glowY: 1.1 };
  },
  boat(g, runes) {
    // the Shore's: a small stone boat on a block, its hull full of coals, prow and stern curling up, runes on its side
    mesh(g, GEO.base, MAT.darkStone, 0, 0.12, 0).scale.set(1.3, 2.4, 0.8);
    mesh(g, GEO.hull, MAT.stone, 0, 0.54, 0);
    for (const s of [-1, 1]) {
      const p = mesh(g, GEO.prow, MAT.stone, s * 0.48, 0.62, 0);
      p.rotation.z = -s * 0.7;
    }
    mesh(g, GEO.coals, MAT.coals, 0, 0.5, 0).scale.set(1.5, 1, 0.8);
    coals(g, 0.53, 0.24);
    runes.push(
      runePlace(-0.2, 0.38, 0.24, Math.PI / 2, 0.2, 0.8),
      runePlace(0.2, 0.38, 0.24, Math.PI / 2, 0.2, 0.8),
      runePlace(0, 0.36, 0.27, Math.PI / 2, 0.2, 0.9),
    );
    return {
      fire: [
        { x: -0.18, y: 0.54, z: 0, h: 0.6, w: 0.22, tongues: 3 },
        { x: 0.16, y: 0.54, z: 0, h: 0.52, w: 0.2, beat: 4.4 },
        { x: 0, y: 0.54, z: 0.04, h: 0.78, w: 0.24, tongues: 3 },
      ],
      glowY: 0.95,
    };
  },
  urn(g, runes) {
    // the Shore's: a great funeral urn of dark clay, a band of bronze at its shoulder, fire in its mouth
    mesh(g, GEO.urn, MAT.darkStone, 0, 0, 0).scale.set(1, 1.05, 1);
    mesh(g, GEO.rim, MAT.bronze, 0, 0.6, 0).scale.set(0.58, 1, 0.58);
    mesh(g, GEO.coals, MAT.coals, 0, 0.73, 0).scale.setScalar(0.6);
    coals(g, 0.75, 0.15);
    threeRunes(runes, 0.3, 0.32, 0, 1);
    return { fire: bigFire(0.76, 0.72, 0.24), glowY: 1.08 };
  },
  stepped(g, runes) {
    // the Seal's: a bowl of black volcanic glass on three stepped tiers of dark stone, a Warden's rune on the
    // front of each tier
    mesh(g, GEO.plinth, MAT.darkStone, 0, 0.06, 0).scale.set(1.05, 0.35, 1.05);
    mesh(g, GEO.plinth, MAT.stone, 0, 0.18, 0).scale.set(0.8, 0.35, 0.8); // (pale enough to read on the Seal's dark floor)
    mesh(g, GEO.plinth, MAT.stone, 0, 0.3, 0).scale.set(0.55, 0.35, 0.55);
    mesh(g, GEO.wideBowl, OBSIDIAN, 0, 0.36, 0).scale.setScalar(0.85);
    mesh(g, GEO.rim, MAT.bronze, 0, 0.5, 0).scale.setScalar(1.02);
    mesh(g, GEO.coals, MAT.coals, 0, 0.48, 0).scale.setScalar(1.1);
    coals(g, 0.5, 0.3);
    runes.push(
      runePlace(0, 0.06, 0.35, Math.PI / 2, 0, 1),
      runePlace(0, 0.18, 0.27, Math.PI / 2, 0, 1),
      runePlace(0, 0.3, 0.19, Math.PI / 2, 0, 0.9),
    );
    return { fire: bigFire(0.52, 0.95, 0.34), glowY: 0.95 };
  },
  cauldron(g, runes) {
    // a black iron cauldron on three stubby legs, handles at its sides, runes round its belly
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      mesh(g, GEO.stub, MAT.blackIron, Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2);
    }
    mesh(g, GEO.pot, MAT.blackIron, 0, 0.14, 0);
    mesh(g, GEO.rim, MAT.iron, 0, 0.59, 0).scale.setScalar(0.8);
    for (const s of [-1, 1]) mesh(g, GEO.handle, MAT.iron, s * 0.34, 0.5, 0).rotation.y = Math.PI / 2;
    mesh(g, GEO.coals, MAT.coals, 0, 0.55, 0).scale.setScalar(0.85);
    coals(g, 0.58, 0.24);
    threeRunes(runes, 0.335, 0.38, 0, 1.05);
    return { fire: bigFire(0.6, 0.8, 0.3), glowY: 0.9 };
  },
};

/** The candle stand: a pole on a clawed foot with two bronze knops, a dish with a bronze rim, and three to five candles
    of different heights with wax running down them, in the floor's wax and burning in its flame (`t`, the look's lights;
    the crypt's warm, the drowned's pale on tallow, the burning's on dark red wax). `flames` (every candle's flame and the
    glow) shows once lit. */
export function candleStandLook(R: () => number, t?: FloorLook['torch']) {
  const pal = t?.candle
      ? firePalette(new THREE.Color(t.candle[0]).getHex(), new THREE.Color(t.candle[1]).getHex())
      : t
        ? torchPalette(t)
        : CANDLE_FIRE,
    wax = t?.wax ? waxFor(t.wax) : MAT.wax;
  const g = new THREE.Group(),
    flames = new THREE.Group();
  mesh(g, GEO.foot, MAT.iron, 0, 0.025, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    mesh(g, GEO.claw, MAT.iron, Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2).scale.setScalar(0.8);
  }
  mesh(g, GEO.pole, MAT.iron, 0, 0.41, 0);
  mesh(g, GEO.knop, MAT.bronze, 0, 0.3, 0);
  mesh(g, GEO.knop, MAT.bronze, 0, 0.62, 0).scale.setScalar(0.8);
  mesh(g, GEO.dish, MAT.iron, 0, 0.78, 0);
  mesh(g, GEO.dishRim, MAT.bronze, 0, 0.8, 0);
  mesh(g, GEO.pool, wax, 0, 0.8, 0);
  const n = 3 + Math.floor(R() * 3),
    specs: FlameSpec[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R(),
      r = i === 0 && n > 3 ? 0 : 0.12 + R() * 0.04,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = 0.1 + R() * 0.18;
    const c = mesh(g, GEO.candle, wax, x, 0.8 + h / 2, z);
    c.scale.y = h;
    for (let k = 0; k < 1 + (R() < 0.5 ? 1 : 0); k++) {
      const b = R() * Math.PI * 2;
      mesh(g, GEO.drip, wax, x + Math.cos(b) * 0.036, 0.8 + h * (0.5 + R() * 0.45), z + Math.sin(b) * 0.036).scale.y =
        1.6;
    }
    specs.push({ x, y: 0.8 + h, z, h: 0.19, w: 0.085 });
  }
  flames.add(makeFire(specs, pal, 5, 0.35)); // (big and warm for candles: a lit stand must read at a glance, to open reliquaries)
  const gl = glow(pal.body, 1.5, 0.9);
  gl.position.y = 1.1;
  flames.add(gl);
  flames.visible = false;
  g.add(flames, blob(0.6));
  return { group: g, parts: { flames } };
}
