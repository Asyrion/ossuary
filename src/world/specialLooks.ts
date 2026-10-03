/* The special rooms' pieces in the room kit's style (M3.5 step 3; docs/M3.5-plan.md): the merchant's bound shade, the
   library's lecterns and bookcases, the shrine's offering stones and the padlock on a vault's warded door. Built in code
   as the other objects are (objectLooks.ts): painted pieces merged into one mesh (`mergeStill`), with a touch of magic
   where it fits: the shade's hem fraying into ghost-light and the chains of ward light that bind it to its circle, its
   lantern's pale fire; a curse's rune smouldering on an offering stone; the ward's rune on the padlock. What each does is
   unchanged (merchant.ts, pages.ts, shrine.ts, vault.ts); `DEV.roomKit` off keeps the old looks. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, glowShared, mergeStill } from '../render/materials';
import { mulberry } from '../util';
import { firePalette, makeFire } from '../render/fire';
import { curve, glowTone, mesh, rough, runeStrokes, shade, shared, stoneOf, taperTube, tone } from './kitParts';
import { C, box, candleFire, put, skull } from './objectLooks';
import { waxFor } from './fireLooks';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
/** A shape turned round the upright from its outline, given from the bottom up. */
const lathe = (pts: number[][], seg = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => V(x, y)), seg);
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const tube = (g: THREE.Object3D, pts: number[][], r0: number, r1: number, mat: THREE.Material, segs = 8) => mesh(g, taperTube(curve(pts), segs, r0, r1, 5), mat);
const metal = (c: number) => tone(c, .05, .45);

const IRON = 0x5e5a62, GILT = 0xc49a4a, GHOST = 0x6fe0c8, GHOST_DIM = 0x3a8a7c, ROBE = 0x444a62, ROBE_DARK = 0x262836, VOID = 0x040306;
const GEO = { rune: shared(runeStrokes(.1)), link: shared(new THREE.TorusGeometry(.035, .009, 3, 8)), smallRune: shared(runeStrokes(.07)) };

/* ---------- the merchant's shade ---------- */

/** The bound shade: a hooded robe with no one in it but two pale eyes, its hem fraying into ghost-light, a lantern of
    pale fire held out and an obol in its other hand; on the floor, a circle of ward runes whose chains of light hold it.
    `body` (which bobs and turns to watch the mage) and `eyes` (sprites that flicker) in `userData`, as merchant.ts
    wants them. */
export function shadeLook(ward: number) {
  const g = new THREE.Group(), body = new THREE.Group(), robe = tone(ROBE, .14), dark = tone(ROBE_DARK, .1), ghost = glowTone(GHOST), dim = glowTone(GHOST_DIM);
  // the robe, its mantle and its hood, the void inside the hood
  mesh(body, lathe([[.42, .3], [.41, .4], [.36, .6], [.3, .84], [.27, 1.02], [.25, 1.16], [.15, 1.24], [0, 1.25]], 12), robe);
  mesh(body, lathe([[.36, .86], [.34, .96], [.29, 1.08], [.24, 1.18], [.17, 1.24], [0, 1.26]], 12), dark);
  mesh(body, lathe([[.2, 1.18], [.25, 1.28], [.27, 1.42], [.24, 1.55], [.15, 1.63], [.05, 1.67], [0, 1.67]], 10), robe);
  put(mesh(body, new THREE.SphereGeometry(.16, 8, 6), tone(VOID), 0, 1.4, .23), 0, 0, 0, [1, 1.12, .55]);
  put(mesh(body, new THREE.TorusGeometry(.17, .04, 4, 12), dark, 0, 1.41, .27), -.25, 0, 0, [1, 1.15, 1]);
  // the hem: tatters hanging below it (it has no feet: it floats), each fading into light at its tip
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + .2, r = .39 + (i % 3) * .02, x = Math.sin(a) * r, z = Math.cos(a) * r, len = .08 + (i * 37 % 5) * .025;
    put(mesh(body, cyl(.07, .03, len, 4), robe, x, .3 - len / 2, z), 0, a, 0);
    put(mesh(body, new THREE.ConeGeometry(.03, .08, 4), i % 2 ? ghost : dim, x, .26 - len, z), Math.PI, 0, 0);
  }
  // the sleeves: the right held out with the lantern, the left raised, an obol in its pale fingers
  tube(body, [[.24, 1.08, 0], [.36, .92, .08], [.44, .8, .2]], .085, .065, robe);
  tube(body, [[-.24, 1.08, 0], [-.38, 1, .08], [-.42, 1.14, .22]], .085, .065, robe);
  for (const [x, y, z] of [[.46, .77, .24], [-.43, 1.18, .27]]) mesh(body, new THREE.SphereGeometry(.05, 6, 4), ghost, x, y, z);
  put(mesh(body, cyl(.05, .05, .012, 10), metal(GILT), -.42, 1.25, .28), Math.PI / 2 - .3, 0, 0);
  // the lantern: a ring and a chain down from the hand, a cage of iron round pale fire
  const lamp = new THREE.Group(); lamp.position.set(.48, .5, .26); body.add(lamp);
  mesh(lamp, cyl(.006, .006, .18, 4), metal(IRON), 0, .17, 0);
  mesh(lamp, new THREE.ConeGeometry(.1, .07, 6), metal(IRON), 0, .08, 0); mesh(lamp, cyl(.09, .08, .025, 6), metal(IRON), 0, -.11, 0);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(lamp, cyl(.008, .008, .16, 3), metal(IRON), Math.cos(a) * .075, -.03, Math.sin(a) * .075); }
  const fire = makeFire([{ x: 0, y: -.1, z: 0, h: .13, w: .07 }], firePalette(0xe0fff4, GHOST), 0);
  const light = glowShared(0xa8f0e0, .9, .8); light.position.y = -.04; fire.add(light); lamp.add(fire);
  // the eyes and the shade's pale aura
  for (const x of [-.07, .07]) put(mesh(body, new THREE.SphereGeometry(.024, 5, 4), glowTone(0xe8fffa), x, 1.42, .31), 0, 0, 0, [1.2, .8, .6]); // (bright cores, crisp at any size)
  const eyes = [-.07, .07].map(x => { const e = glow(0xb8fff0, .22, 1); e.position.set(x, 1.42, .34); body.add(e); return e; });
  const aura = glowShared(GHOST, 2.8, .38); aura.position.y = .9; body.add(aura);
  body.userData.parts = { fire }; mergeStill(body);
  // the circle it is bound to, and the chains of ward light that hold it there
  const bind = glowTone(ward);
  put(mesh(g, new THREE.TorusGeometry(.56, .02, 3, 32), bind, 0, .03, 0), Math.PI / 2);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; put(mesh(g, GEO.smallRune, bind, Math.cos(a) * .64, .03, Math.sin(a) * .64), -Math.PI / 2, 0, -a - Math.PI / 2); }
  for (let c = 0; c < 3; c++) {
    const a = c / 3 * Math.PI * 2 + Math.PI / 6, from = new THREE.Vector3(Math.cos(a) * .56, .03, Math.sin(a) * .56), to = new THREE.Vector3(Math.cos(a) * .37, .5, Math.sin(a) * .37);
    for (let k = 0; k < 7; k++) { const p = from.clone().lerp(to, (k + .5) / 7); put(mesh(g, GEO.link, bind, p.x, p.y, p.z), 0, a + (k % 2) * Math.PI / 2, .9); }
  }
  g.add(body, blob(1.2)); g.userData.parts = { body }; mergeStill(g);
  g.scale.setScalar(1.15);
  g.userData = { body, eyes };
  return g;
}

/* ---------- the library ---------- */

const OAK = 0x6a4a2e, OAK_DARK = 0x4a3220, PAPER = 0xe0d0aa;

/** A lectern of carved dark wood: a stepped foot, a turned post, a slanted board with a lip, an open book on it (the
    page floating over it was torn from it), and a candle in the floor's wax burning on its corner. */
export function lecternLook(look: FloorLook) {
  const g = new THREE.Group(), wood = tone(OAK, .12), dark = tone(OAK_DARK, .1);
  box(g, .5, .05, .4, dark, 0, .025, 0); box(g, .36, .05, .28, wood, 0, .075, 0);
  mesh(g, lathe([[.09, .1], [.08, .16], [.05, .22], [.055, .4], [.045, .56], [.05, .72], [.075, .8], [.09, .84]], 8), wood);
  const top = new THREE.Group(); top.position.y = .9; top.rotation.x = .45; g.add(top); // (tipped towards the camera)
  box(top, .58, .04, .44, wood, 0, 0, 0); box(top, .58, .05, .03, dark, 0, .04, .21);
  for (const s of [-1, 1]) { // the open book: its pages bowed up from the spine
    box(top, .24, .02, .32, tone(0x4a1c18, .05), s * .12, .03, 0);
    put(mesh(top, cyl(.04, .04, .22, 6), tone(PAPER, .05), s * .1, .045, 0), Math.PI / 2, 0, 0, [2.6, 1.4, .5]);
  }
  const wax = waxFor(look.torch.wax ?? '#f0e2c6');
  mesh(top, cyl(.03, .033, .13, 7), wax, .23, .085, -.14); mesh(top, new THREE.SphereGeometry(.016, 5, 4), wax, .255, .06, -.12).scale.y = 1.6;
  const fire = candleFire([{ x: .23, y: .15, z: -.14, h: .12, w: .05 }], look);
  const light = glowShared(0xffb050, .55, .8); light.position.set(.23, .2, -.14); fire.add(light); top.add(fire);
  g.add(blob(.9)); g.userData.parts = { fire }; mergeStill(g);
  return g;
}

/** A bookcase 1.5 wide against the north wall: sides, a cornice and a plinth, three shelves of books of every height and
    colour (a gilt band on each spine, a gap where one was taken, one leaning, a few lying in a stack), and now and then a
    skull on top. `seed` picks the books. Built facing +z, its back on z = -.17. */
export function bookcaseLook(seed: number) {
  const R = mulberry(seed);
  const g = new THREE.Group(), wood = tone(OAK, .1), dark = tone(OAK_DARK, .08), gilt = tone(GILT, 0, .4);
  box(g, 1.4, 1.2, .02, tone(0x1a120c), 0, .62, -.16);
  for (const x of [-.72, .72]) box(g, .06, 1.25, .34, wood, x, .625, 0);
  box(g, 1.56, .08, .38, dark, 0, 1.29, .01); box(g, 1.5, .08, .34, dark, 0, .04, 0);
  const rows = [.08, .48, .88];
  for (const y of rows.slice(1)) box(g, 1.38, .035, .32, wood, 0, y - .018, 0);
  rows.forEach(y0 => {
    let x = -.68, stack = R() < .5 ? Math.floor(R() * 10) : -1, leaned = false;
    for (let n = 0; x < .64; n++) {
      const w = .04 + R() * .05, h = .2 + R() * .12, d = .2 + R() * .06, col = shade(BOOKS[Math.floor(R() * BOOKS.length)], 1.35);
      if (n === stack && x < .45) { // a few lying flat, one on another
        for (let k = 0; k < 3; k++) box(g, .2 - k * .02, .045, .22, tone(shade(BOOKS[(n + k) % BOOKS.length], 1.35), .05), x + .1, y0 + .023 + k * .046, .02);
        x += .23; continue;
      }
      if (R() < .07) { x += w + .02; continue; } // (a gap where one was taken)
      if (!leaned && R() < .08 && x < .55) { box(g, w, h, d, tone(col, .05), x + h * .25, y0 + h * .45, .02).rotation.z = -.45; leaned = true; x += h * .5 + w; continue; }
      box(g, w, h, d, tone(col, .05), x + w / 2, y0 + h / 2, .02);
      box(g, w + .004, .018, .01, gilt, x + w / 2, y0 + h * .78, .02 + d / 2);
      x += w + .004;
    }
  });
  if (R() < .3) skull(g, .5 - R(), 1.33 + .09, .02, R() - .5, 0, .8, C.boneOld);
  return g;
}
const BOOKS = [0x5a2a22, 0x3a3a2a, 0x2a3440, 0x4a3a24, 0x5e4a2e, 0x2e2a36, 0x3e2418, 0x6a5a3a];

/* ---------- the shrine ---------- */

/** An offering stone: a rough standing stone in the floor's stone, mossy at its foot on the drowned floor, a flat slab
    on top, and on its face the curse it holds smouldering as a rune (`curse`, its colour). */
export function offeringStoneLook(look: FloorLook, turn: number, curse: number) {
  const g = new THREE.Group(), st = stoneOf(look, 1.4);
  const stone = new THREE.Group(); stone.rotation.y = turn; g.add(stone);
  mesh(stone, rough(cyl(.2, .3, .72, 6).translate(0, .36, 0), .03, 5), tone(st, .12));
  mesh(stone, rough(cyl(.29, .27, .08, 6), .015, 8), tone(shade(st, 1.12), .08), 0, .76, 0);
  if (look.wall.stains === 'moss') for (let i = 0; i < 4; i++) { const a = i * 1.7 + turn; put(mesh(g, new THREE.SphereGeometry(.09, 6, 3), tone(C.moss, .1), Math.cos(a) * .29, .03, Math.sin(a) * .29), 0, 0, 0, [1.3, .45, 1]); }
  put(mesh(g, GEO.rune, glowTone(curse), 0, .42, .26), -.12, 0, 0, 1.6);
  const gl = glowShared(curse, .45, .25); gl.position.set(0, .42, .32); g.add(gl);
  g.add(blob(1.1)); mergeStill(g);
  return g;
}

/** M6 step 11: the bargain stone's runes: dark while it waits, red with the price once cast into, gold once kept. */
export const BARGAIN_RUNES = { idle: 0x6e3628, price: 0xd23a2a, kept: 0xffbe3a };
/** The bargain stone at the circle's head: a tall stele in the floor's stone on a slab, a heart carved into its face and
    runes down it, on one material of their own (`runes`, the colour its state gives). */
export function bargainStoneLook(look: FloorLook) {
  const g = new THREE.Group(), st = stoneOf(look, 1.3), stone = tone(st, .12), runes = new THREE.MeshBasicMaterial({ color: BARGAIN_RUNES.idle });
  mesh(g, rough(new THREE.BoxGeometry(.84, .12, .5).translate(0, .06, 0), .02, 3), tone(shade(st, .9), .1));
  mesh(g, rough(new THREE.CylinderGeometry(.2, .27, 1.3, 4, 3).rotateY(Math.PI / 4).scale(1.2, 1, .55).translate(0, .77, 0), .025, 7), stone);
  mesh(g, rough(new THREE.ConeGeometry(.24, .26, 4).rotateY(Math.PI / 4).scale(1.2, 1, .55).translate(0, 1.55, 0), .02, 9), stone);
  const h = new THREE.Shape(); h.moveTo(0, -.09); h.bezierCurveTo(-.13, .01, -.09, .12, 0, .05); h.bezierCurveTo(.09, .12, .13, .01, 0, -.09);
  mesh(g, new THREE.ExtrudeGeometry(h, { depth: .02, bevelEnabled: false, curveSegments: 6 }), runes, 0, 1.12, .16);
  for (const y of [.86, .6, .36]) put(mesh(g, GEO.smallRune, runes, 0, y, .17), 0, 0, 0, 1.3);
  g.add(blob(1.2));
  return { group: g, runes };
}

/* ---------- the vault ---------- */

/** The padlock hanging on a vault's warded door: a black iron body with its shackle, a keyhole, and the ward's rune
    glowing on it (`ward`, its colour). As in vault.ts: centred on its body, `.2` wide. */
export function padlockLook(ward: number) {
  const g = new THREE.Group(), iron = tone(0x2c2a30, .05, .25);
  const s = new THREE.Shape(); s.moveTo(-.1, .08); s.lineTo(.1, .08); s.lineTo(.1, -.02); s.quadraticCurveTo(.1, -.09, 0, -.1); s.quadraticCurveTo(-.1, -.09, -.1, -.02); s.lineTo(-.1, .08);
  mesh(g, new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1, curveSegments: 5 }).translate(0, 0, -.025), iron);
  mesh(g, new THREE.TorusGeometry(.065, .02, 5, 12, Math.PI), tone(0x3a3840, .05, .3), 0, .085, 0);
  box(g, .025, .045, .012, tone(VOID), 0, -.035, .04);
  put(mesh(g, GEO.smallRune, glowTone(ward), 0, .02, .042), 0, 0, 0, 1.3);
  mergeStill(g);
  return g;
}

/* ---------- M4.2: the Wandering Merchant of Belerial (from the Eda lore) ---------- */

const FUR = 0x7a6a58, FUR_DARK = 0x54483c, SNOUT = 0xb04a3a, BANDAGE = 0xd8ccb0, CANVAS = 0x9a8a68, CANVAS_DARK = 0x6e5e44;
const INDIGO = 0x3e4a78, INDIGO_DARK = 0x283054, BEARD = 0xe8e4dc, SKIN = 0xc89a78, TURBAN = 0xe0d6c0, SAFFRON = 0xd09a3a, CROW = 0x16141a;

/** The Wandering Merchant: an old trader with a white beard, a turban and a staff, riding a huge shaggy pack beast (a red
    snout, bandaged legs, packs and a rolled blanket on its back) with a crow perched on its head. It faces east (+x) and
    the merchant turns to the camera. `legs` (swing as it walks), `beast` (breathes), `head` (the merchant's, turns to
    the mage) and `crow` (hops, turns its head) in `userData`. */
export function wandererLook() {
  const g = new THREE.Group(), beast = new THREE.Group(), R = mulberry(41);
  const fur = tone(FUR, .16), furDark = tone(FUR_DARK, .14), snout = tone(SNOUT, .1), bandage = tone(BANDAGE, .1), canvas = tone(CANVAS, .14), canvasDark = tone(CANVAS_DARK, .12);
  g.add(beast);
  // the body: a great shaggy barrel, its fringe of fur hanging to the knees
  put(mesh(beast, rough(new THREE.SphereGeometry(.62, 12, 9), .07, 5), fur, 0, 1.05, 0), 0, 0, 0, [1.25, .92, .86]);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, x = Math.cos(a) * .72, z = Math.sin(a) * .5; put(mesh(beast, new THREE.ConeGeometry(.1, .42, 4), i % 3 ? furDark : fur, x, .62 + R() * .06, z), Math.PI, R() * 3, (R() - .5) * .3); } // (the fringe)
  for (let i = 0; i < 18; i++) { const a = R() * Math.PI * 2, y = .2 + R() * .6; put(mesh(beast, new THREE.SphereGeometry(.13, 5, 4), R() < .5 ? furDark : fur, Math.cos(a) * .66 * Math.sqrt(1 - y * y), 1.05 + y * .5, Math.sin(a) * .46 * Math.sqrt(1 - y * y)), R(), R(), R(), [1, .6, 1]); } // (tufts all over its back)
  // the head, low and forward, a red snout, small eyes and curled horns
  const bh = new THREE.Group(); bh.position.set(.86, .92, 0); beast.add(bh);
  put(mesh(bh, rough(new THREE.SphereGeometry(.3, 10, 8), .04, 9), fur), 0, 0, 0, [1.1, .95, .95]);
  put(mesh(bh, new THREE.SphereGeometry(.15, 8, 6), snout, .27, -.08, 0), 0, 0, 0, [1.1, .8, 1.1]);
  for (const s of [-1, 1]) {
    mesh(bh, new THREE.SphereGeometry(.035, 6, 4), tone(0x120e0c), .2, .08, s * .17);
    tube(bh, [[0, .18, s * .2], [-.05, .32, s * .32], [.08, .38, s * .38], [.14, .28, s * .36]], .045, .015, tone(0xd8c8a8, .08), 8);
  }
  // legs, stubby, bandaged at the shin
  const legs: THREE.Object3D[] = [];
  for (const [x, z] of [[.5, .3], [.5, -.3], [-.5, .3], [-.5, -.3]] as [number, number][]) {
    const leg = new THREE.Group(); leg.position.set(x, .62, z); beast.add(leg);
    mesh(leg, cyl(.11, .1, .62, 7), furDark, 0, -.31, 0); mesh(leg, cyl(.12, .12, .16, 7), bandage, 0, -.36, 0); mesh(leg, cyl(.12, .13, .07, 7), tone(0x2a221c), 0, -.6, 0);
    legs.push(leg);
  }
  // the packs: a bag on each flank, a rolled blanket across the back, a pot swinging
  for (const s of [-1, 1]) {
    mesh(beast, lathe([[0, 0], [.2, .02], [.24, .14], [.22, .3], [.14, .38], [.06, .4]], 8), s > 0 ? canvas : canvasDark, -.1, .72, s * .52).rotation.x = s * .2;
    mesh(beast, cyl(.015, .015, .5, 4), tone(C.rope, .06), -.1, 1.05, s * .4).rotation.x = s * .9;
  }
  put(mesh(beast, cyl(.14, .14, .7, 10), tone(0x8a3a2a, .12), -.42, 1.5, 0), 0, 0, Math.PI / 2); // (the rolled blanket, lying along its back behind the rider)
  for (const x of [-.62, -.22]) put(mesh(beast, cyl(.145, .145, .06, 10), tone(0xd0b070, .1), x, 1.5, 0), 0, 0, Math.PI / 2);
  mesh(beast, lathe([[0, 0], [.1, .02], [.12, .1], [.08, .16]], 8), metal(0x6a5a48), -.72, .9, .32);
  // the merchant, cross-legged on the beast's back, facing the camera
  const rider = new THREE.Group(); rider.position.set(.12, 1.38, 0); beast.add(rider);
  const robe = tone(INDIGO, .14), robeDark = tone(INDIGO_DARK, .12);
  mesh(rider, lathe([[.3, 0], [.3, .08], [.24, .3], [.2, .5], [.13, .62], [0, .64]], 10), robe);
  put(mesh(rider, cyl(.14, .16, .5, 8), robeDark, 0, .06, .1), 0, 0, Math.PI / 2, [1, 1, .8]); // (the folded legs)
  const head = new THREE.Group(); head.position.y = .76; rider.add(head);
  mesh(head, new THREE.SphereGeometry(.13, 10, 8), tone(SKIN, .06));
  put(mesh(head, new THREE.ConeGeometry(.12, .34, 8), tone(BEARD, .06), 0, -.2, .07), Math.PI, 0, 0); // the long white beard
  put(mesh(head, new THREE.TorusGeometry(.13, .06, 6, 12), tone(TURBAN, .08), 0, .09, 0), Math.PI / 2, 0, 0);
  put(mesh(head, new THREE.SphereGeometry(.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), tone(TURBAN, .08), 0, .1, 0), 0, 0, 0, [1, 1.1, 1]);
  mesh(head, new THREE.SphereGeometry(.03, 6, 4), tone(SAFFRON), 0, .15, .13);
  for (const s of [-1, 1]) mesh(head, new THREE.SphereGeometry(.016, 5, 4), tone(0x120e0c), s * .045, .01, .12);
  // the staff, upright in one hand, crooked at its top, a bell hanging from the crook
  mesh(rider, cyl(.022, .025, 1.5, 6), tone(0x5a4028, .1), .28, .5, .12);
  tube(rider, [[.28, 1.24, .12], [.3, 1.36, .12], [.2, 1.42, .12], [.14, 1.34, .12]], .025, .02, tone(0x5a4028, .1), 8);
  mesh(rider, lathe([[0, 0], [.05, .01], [.045, .06], [0, .08]], 8), metal(0xc49a4a), .14, 1.22, .12);
  mesh(rider, new THREE.SphereGeometry(.06, 6, 5), robe, .26, .44, .15); // (the hand on it)
  // the crow on the beast's head
  const crow = new THREE.Group(); crow.position.set(.9, 1.24, 0); crow.scale.setScalar(1.5); beast.add(crow);
  put(mesh(crow, new THREE.SphereGeometry(.08, 8, 6), tone(CROW, .08)), 0, 0, 0, [1.3, 1, .9]);
  mesh(crow, new THREE.ConeGeometry(.05, .14, 4), tone(CROW, .08), -.12, .01, 0).rotation.z = Math.PI / 2;
  const crowHead = new THREE.Group(); crowHead.position.set(.07, .08, 0); crow.add(crowHead);
  mesh(crowHead, new THREE.SphereGeometry(.05, 8, 6), tone(CROW, .08)); mesh(crowHead, new THREE.ConeGeometry(.018, .07, 4), tone(0x4a4640), .06, 0, 0).rotation.z = -Math.PI / 2;
  mesh(crowHead, new THREE.SphereGeometry(.012, 4, 3), glowTone(0xffd070), .025, .015, .035);
  g.add(blob(1.8));
  // merged group by group, what moves kept apart: each leg, the merchant's head, the crow and its head, the beast
  for (const leg of legs) mergeStill(leg);
  mergeStill(head); mergeStill(crowHead);
  crow.userData.parts = { crowHead }; mergeStill(crow);
  beast.userData.parts = { head, crow, ...Object.fromEntries(legs.map((l, i) => ['leg' + i, l])) }; mergeStill(beast);
  g.userData = { beast, legs, head, crow: crowHead };
  return g;
}

/** What the crow sells, floating in its ward circle: the floor's map (a parchment unrolled, a plan of rooms drawn on it),
    or where its secret room lies (a black feather over a cracked stone, a pale glow in the crack). */
export function crowWareLook(kind: 'map' | 'secret') {
  const g = new THREE.Group();
  if (kind === 'map') {
    put(mesh(g, new THREE.BoxGeometry(.42, .015, .32), tone(0xd8c8a0, .12)), -.5, 0, .1);
    for (const x of [-.21, .21]) put(mesh(g, cyl(.035, .035, .34, 8), tone(0xc8b890, .1), x, .01, 0), Math.PI / 2, 0, 0);
    for (const [x, z, w, d] of [[-.1, -.06, .1, .07], [.04, -.06, .09, .07], [.04, .05, .09, .06], [.14, .05, .06, .06]]) put(mesh(g, new THREE.BoxGeometry(w, .02, d), tone(0x5a4630), x, .012, z), -.5, 0, .1);
  } else {
    put(mesh(g, rough(new THREE.DodecahedronGeometry(.16, 0), .03, 4), tone(0x6a645c, .12)), 0, .4, 0, [1, .8, 1]);
    put(mesh(g, new THREE.BoxGeometry(.02, .2, .02), glowTone(0x8aa8ff), 0, .02, .13), 0, 0, .4);
    put(mesh(g, new THREE.ConeGeometry(.05, .36, 4), tone(CROW, .08), .05, .16, 0), 0, 0, -.9, [1, 1, .25]);
  }
  mergeStill(g);
  return g;
}
