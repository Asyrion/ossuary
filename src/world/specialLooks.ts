/* The special rooms' pieces in the room kit's style (M3.5 step 3; docs/M3.5-plan.md): the merchant's bound shade, the
   library's lecterns and bookcases, the shrine's offering stones and the padlock on a vault's warded door. Built in code
   as the other objects are (objectLooks.ts): painted pieces merged into one mesh (`mergeStill`), with a touch of magic
   where it fits: the shade's hem fraying into ghost-light and the chains of ward light that bind it to its circle, its
   lantern's pale fire; a curse's rune smouldering on an offering stone; the ward's rune on the padlock. What each does is
   unchanged (merchant.ts, pages.ts, shrine.ts, vault.ts); `DEV.roomKit` off keeps the old looks. */
import * as THREE from 'three';
import type { FloorLook } from '../types';
import { blob, glow, glowShared, mergeStill } from '../render/materials';
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

const IRON = 0x5e5a62, GILT = 0xc49a4a, GHOST = 0x6fe0c8, GHOST_DIM = 0x3a8a7c, ROBE = 0x3a3e50, ROBE_DARK = 0x262836, VOID = 0x040306;
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
  const light = glow(0xa8f0e0, .9, .8); light.position.y = -.04; fire.add(light); lamp.add(fire);
  // the eyes and the shade's pale aura
  const eyes = [-.07, .07].map(x => { const e = glow(0xb8fff0, .17, 1); e.position.set(x, 1.42, .34); body.add(e); return e; });
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
    skull or a candle stub among them. `seed` picks the books. Built facing +z, its back on z = -.17. */
export function bookcaseLook(seed: number) {
  let s = seed * 7919 + 17; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
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
  const gl = glow(curse, .7, .35); gl.position.set(0, .42, .32); g.add(gl);
  g.add(blob(1.1)); mergeStill(g);
  return g;
}

/* ---------- the vault ---------- */

/** The padlock hanging on a vault's warded door: a black iron body with its shackle, a keyhole, and the ward's rune
    glowing on it (`ward`, its colour). As in vault.ts: centred on its body, `.2` wide. */
export function padlockLook(ward: number) {
  const g = new THREE.Group(), iron = metal(0x3e3a42);
  const s = new THREE.Shape(); s.moveTo(-.1, .08); s.lineTo(.1, .08); s.lineTo(.1, -.02); s.quadraticCurveTo(.1, -.09, 0, -.1); s.quadraticCurveTo(-.1, -.09, -.1, -.02); s.lineTo(-.1, .08);
  mesh(g, new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelThickness: .01, bevelSize: .01, bevelSegments: 1, curveSegments: 5 }).translate(0, 0, -.025), iron);
  mesh(g, new THREE.TorusGeometry(.065, .02, 5, 12, Math.PI), metal(IRON), 0, .085, 0);
  box(g, .025, .045, .012, tone(VOID), 0, -.035, .04);
  put(mesh(g, GEO.smallRune, glowTone(ward), 0, .025, .042), 0, 0, 0, .9);
  mergeStill(g);
  return g;
}
