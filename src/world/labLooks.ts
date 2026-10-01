/* Dr. Jelly's laboratory in the room kit's style (M5 step 6, docs/M5-plan.md; GDD: Potions and alchemy): the glass globes
   of glowing jelly on their iron stands, the alchemy table with its alembic, burner and racks, Dr. Jelly (an alchemist in a
   stained coat and goggles, a jelly in a jar for a familiar) and the great arched window on the north wall, behind which the
   jelly serpent coils in its vat. Built in code as the other pieces are (objectLooks.ts, specialLooks.ts): painted pieces
   merged into a few meshes (`mergeStill`), green glowing jelly as the room's light (no lights are added: a light more
   would make every material compile again). What they do is world/laboratory.ts. */
import * as THREE from 'three';
import { blob, glow, glowShared, markShared, mergeStill } from '../render/materials';
import { firePalette, makeFire } from '../render/fire';
import { curve, glowTone, mesh, shade, taperTube, tone } from './kitParts';
import { box, put } from './objectLooks';

const V = (x: number, y: number) => new THREE.Vector2(x, y);
const lathe = (pts: number[][], seg = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => V(x, y)), seg);
const cyl = (r0: number, r1: number, h: number, seg = 8) => new THREE.CylinderGeometry(r0, r1, h, seg);
const tube = (g: THREE.Object3D, pts: number[][], r0: number, r1: number, mat: THREE.Material, segs = 8) => mesh(g, taperTube(curve(pts), segs, r0, r1, 5), mat);
const metal = (c: number) => tone(c, .05, .5);

/** The laboratory's colours: its jelly, the glass, iron, copper and the old oak of the table. */
export const JELLY = 0x7ae070, JELLY_DEEP = 0x2e8a4a, JELLY_PALE = 0xc8ffb0, VAT_DEEP = 0x123a1c, VAT_EMPTY = 0x0e2a16; // (the vat's jelly darker than the serpent in it, so it shows)
const GLASS = 0x9ebed8, IRON = 0x3a383c, COPPER = 0xa8683a, OAK = 0x5a3e26, OAK_DARK = 0x3e2a1a, COAT = 0x6e6656, STAIN = 0x4e7a2e, SKIN = 0xd8b496;

/** A glass globe of glowing jelly on a three-legged iron stand, bubbles hanging in it. */
export function globeLook(R: () => number) {
  const g = new THREE.Group(), iron = metal(IRON);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + R(); tube(g, [[Math.cos(a) * .2, 0, Math.sin(a) * .2], [Math.cos(a) * .12, .25, Math.sin(a) * .12], [Math.cos(a) * .1, .42, Math.sin(a) * .1]], .02, .015, iron, 5); }
  put(mesh(g, new THREE.TorusGeometry(.12, .018, 4, 12), iron, 0, .42, 0), Math.PI / 2);
  mesh(g, new THREE.SphereGeometry(.24, 12, 9), glowTone(JELLY), 0, .62, 0);
  put(mesh(g, new THREE.SphereGeometry(.15, 8, 6), glowTone(JELLY_DEEP), .04, .58, .12), 0, 0, 0, [1, .7, .4]); // (a darker swirl inside)
  for (let i = 0; i < 4; i++) mesh(g, new THREE.SphereGeometry(.025 + R() * .02, 5, 4), glowTone(JELLY_PALE), (R() - .5) * .25, .52 + R() * .2, .17 + R() * .05);
  mesh(g, cyl(.05, .06, .08, 7), tone(GLASS, .04, .35), 0, .88, 0); mesh(g, cyl(.06, .055, .03, 7), metal(COPPER), 0, .93, 0);
  const gl = glowShared(JELLY, 1.4, .5); gl.position.y = .62; g.add(gl);
  g.add(blob(.6)); return g;
}

/** The alchemy table: a long oak table on turned legs; on it an alembic over a burner of green fire, a rack of vials, a
    mortar and pestle and loose papers. `fire` (the burner's flame, moved each step) in `userData.parts`. */
export function tableLook() {
  const g = new THREE.Group(), oak = tone(OAK, .14), dark = tone(OAK_DARK, .1), iron = metal(IRON), copper = metal(COPPER);
  box(g, 1.5, .07, .74, oak, 0, .66, 0); box(g, 1.42, .05, .66, dark, 0, .6, 0);
  for (const [x, z] of [[-.66, -.3], [.66, -.3], [-.66, .3], [.66, .3]]) mesh(g, lathe([[.05, 0], [.06, .05], [.04, .15], [.05, .3], [.035, .45], [.045, .6], [0, .6]], 7), dark, x, 0, z);
  box(g, 1.3, .04, .04, dark, 0, .15, -.3); box(g, 1.3, .04, .04, dark, 0, .15, .3);
  // the alembic: a round copper pot over the burner, its long neck curving down into a glass flask of green
  const ax = -.25, top = .7;
  box(g, .22, .06, .22, iron, ax, top + .03, 0);
  mesh(g, lathe([[0, 0], [.13, .01], [.16, .08], [.14, .17], [.07, .22], [.05, .28], [0, .29]], 10), copper, ax, top + .12, 0);
  tube(g, [[ax, top + .4, 0], [ax + .1, top + .5, 0], [ax + .3, top + .42, 0], [ax + .44, top + .25, 0]], .025, .015, copper, 8);
  mesh(g, lathe([[0, 0], [.08, .01], [.1, .07], [.07, .13], [.03, .16], [.025, .22], [0, .22]], 10), glowTone(JELLY), ax + .46, top, 0);
  const fire = makeFire([{ x: ax, y: top + .06, z: 0, h: .1, w: .07 }], firePalette(JELLY_PALE, JELLY), 0);
  // a rack of vials, each its own colour
  box(g, .34, .05, .1, dark, .38, top + .03, -.2);
  [0xe0475a, 0x4a8cff, 0xff7a2a, 0xb49aff, 0x40c8a0].forEach((c, i) => { mesh(g, cyl(.022, .022, .13, 6), glowTone(c), .25 + i * .065, top + .1, -.2); mesh(g, cyl(.016, .016, .02, 5), tone(0x8a6a44, .1), .25 + i * .065, top + .175, -.2); });
  // a mortar and pestle, and papers
  mesh(g, lathe([[0, 0], [.07, 0], [.09, .04], [.08, .08], [.06, .08], [.05, .03], [0, .03]], 9), tone(0x8a8478, .12), .45, top, .18);
  put(mesh(g, cyl(.015, .02, .16, 5), tone(0x8a8478, .1), .47, top + .1, .18), 0, 0, .5);
  for (const [x, z, a] of [[.05, .2, .3], [.15, .14, -.4]]) put(box(g, .2, .005, .26, tone(0xe0d0aa, .06), x, top + .005, z), 0, a, 0, [.2, .005, .26]);
  const gl = glowShared(JELLY, 1, .3); gl.position.set(ax + .2, top + .45, 0); g.add(gl);
  g.add(blob(1.6)); g.userData.parts = { fire }; mergeStill(g);
  return g;
}

/** Dr. Jelly: a stooped alchemist in a long coat stained green, goggles pushed down over the eyes and glowing faintly, a
    shock of white hair, a jar under one arm with a small jelly in it (two dark eyes) for a familiar. `body` (which bobs and
    turns to the mage) and `jar` (whose jelly wobbles) in `userData`. */
export function drJellyLook() {
  const g = new THREE.Group(), body = new THREE.Group(), coat = tone(COAT, .12), stain = tone(STAIN, .1), skin = tone(SKIN, .08), dark = tone(0x2a2422, .08);
  mesh(body, lathe([[.3, 0], [.31, .1], [.27, .5], [.24, .8], [.22, 1.0], [.14, 1.08], [0, 1.1]], 12), coat);
  for (const [y, x, s] of [[.25, .14, .1], [.5, -.12, .08], [.75, .08, .07], [.15, -.2, .06]]) put(mesh(body, new THREE.SphereGeometry(s, 6, 4), stain, x, y, Math.sqrt(Math.max(0, .29 * .29 - x * x)) - .02), 0, 0, 0, [1, 1, .3]);
  for (const x of [-.1, .1]) mesh(body, cyl(.05, .06, .08, 6), dark, x, .03, .06); // (boots under the hem)
  // the head: a round face, goggles over the eyes, white hair standing up
  mesh(body, new THREE.SphereGeometry(.17, 10, 8), skin, 0, 1.24, 0);
  put(mesh(body, new THREE.TorusGeometry(.17, .025, 4, 14), dark, 0, 1.27, 0), Math.PI / 2, 0, 0, [1, 1, 1]);
  for (const x of [-.07, .07]) { put(mesh(body, cyl(.055, .055, .05, 10), metal(COPPER), x, 1.27, .15), Math.PI / 2); put(mesh(body, cyl(.042, .042, .02, 10), glowTone(JELLY_PALE), x, 1.27, .18), Math.PI / 2); }
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; put(mesh(body, new THREE.ConeGeometry(.05, .14, 4), tone(0xeeeae0, .08), Math.cos(a) * .12, 1.38, Math.sin(a) * .12 - .03), Math.sin(a) * .5, 0, -Math.cos(a) * .5); }
  mesh(body, new THREE.SphereGeometry(.03, 5, 4), skin, 0, 1.2, .17); // (a nose)
  // the arms: one raised as if explaining, one round the jar
  tube(body, [[.2, .95, 0], [.32, .8, .1], [.36, .95, .22]], .065, .05, coat); mesh(body, new THREE.SphereGeometry(.045, 6, 4), skin, .37, .99, .24);
  tube(body, [[-.2, .95, 0], [-.3, .72, .1], [-.18, .62, .22]], .065, .05, coat);
  const jar = new THREE.Group(); jar.position.set(-.16, .56, .25); body.add(jar);
  mesh(jar, cyl(.1, .1, .2, 10), tone(GLASS, .04, .35), 0, .1, 0); mesh(jar, cyl(.105, .105, .03, 10), metal(COPPER), 0, .21, 0);
  const jelly = new THREE.Group(); jelly.position.y = .07; jar.add(jelly);
  put(mesh(jelly, new THREE.SphereGeometry(.08, 8, 6), glowTone(JELLY)), 0, 0, 0, [1, .75, 1]);
  for (const x of [-.025, .025]) mesh(jelly, new THREE.SphereGeometry(.012, 4, 3), dark, x, .02, .07);
  const gl = glowShared(JELLY, .45, .4); gl.position.y = .1; jar.add(gl);
  body.userData.parts = { jelly }; mergeStill(body);
  g.add(body, blob(.9)); g.userData = { body, jelly };
  return g;
}

/** The glass of the vat window, and the cracks a bolt leaves in it: shared by every laboratory. */
let glassMat: THREE.MeshBasicMaterial | null = null, crackMat: THREE.MeshBasicMaterial | null = null;
const glassOf = () => glassMat ??= markShared(new THREE.MeshBasicMaterial({ color: JELLY_PALE, transparent: true, opacity: .1, depthWrite: false }));
const crackOf = () => crackMat ??= markShared(new THREE.MeshBasicMaterial({ color: 0xf0fff0 }));

/** The arched window on the north wall: a deep stone frame and leaded panes, the vat's dark green jelly behind, the jelly
    serpent coiled in it behind the glass (a chain of glowing rings that turns slowly). Built facing +z, its foot on the
    floor, `w` wide. In `userData`: `serpent` and `head` (moved each step), `glass` and the three stages of `cracks` (shown
    as bolts strike it), `back` (the jelly, darkened when the vat is empty) and `glow`. `broken`: the glass gone and the
    vat empty (the serpent is out). */
export function vatWindowLook(stone: number, w = 2, broken = false) {
  const g = new THREE.Group(), st = tone(stone, .12), dark = tone(shade(stone, .7), .1), lead = metal(0x2a2a2a), h = .98, r = w / 2, spring = h - r * .4; // (the arch springs here; its crown just under the wall's top)
  const D = .26, F = .1; // (the frame's depth, and the middle of it, out from the wall)
  // the frame: jambs and an arch of voussoirs standing out from the wall, so the serpent sits inside it; the sill
  for (const s of [-1, 1]) box(g, .16, spring - .1, D, st, s * (r + .02), (spring - .1) / 2 + .1, F);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * i / 8, x = Math.cos(a) * (r + .04), y = spring + Math.sin(a) * (r * .4 + .02); put(box(g, .3, .14, D + .01, i % 2 ? dark : st, x, y, F), 0, 0, a - Math.PI / 2, [.3, .14, D + .01]); } // (voussoirs wide enough to meet: one arch)
  box(g, w + .3, .1, D + .08, st, 0, .08, F + .02);
  const pane = new THREE.Shape(); pane.moveTo(-r, .15); pane.lineTo(r, .15); pane.lineTo(r, spring); pane.absellipse(0, spring, r, r * .4, 0, Math.PI, false, 0); pane.lineTo(-r, .15);
  mergeStill(g);
  // the vat behind: dark jelly, darker still when it stands empty (its own mesh, to darken when the serpent breaks out)
  const back = mesh(g, new THREE.ShapeGeometry(pane, 12), glowTone(broken ? VAT_EMPTY : VAT_DEEP), 0, 0, -.02);
  // the serpent: rings of jelly coiled in the vat, its head raised, two pale eyes (gone when it is out)
  const serpent = new THREE.Group(); serpent.position.set(0, .16, .08); serpent.visible = !broken; g.add(serpent);
  const ring = new THREE.TorusGeometry(.085, .055, 5, 10);
  for (let i = 0; i < 12; i++) { const a = i * .6, rr = .42 - i * .02; const m = mesh(serpent, ring, glowTone(i % 2 ? JELLY : 0x5ac860), Math.cos(a) * rr, .06 + i * .035, Math.sin(a) * rr * .12); m.rotation.y = a; }
  mergeStill(serpent);
  const head = new THREE.Group(); head.position.set(.05, .52, .02); head.userData.y = .52; serpent.add(head); // (apart from the coil, so it can lift and sway)
  put(mesh(head, new THREE.SphereGeometry(.12, 8, 6), glowTone(JELLY_PALE)), 0, 0, 0, [1.3, .8, .7]);
  for (const x of [-.06, .06]) mesh(head, new THREE.SphereGeometry(.03, 5, 4), glowTone(0x0e2a16), x, .03, .08);
  mergeStill(head);
  // the glass in front of it, the lead between the panes, and the cracks bolts leave
  const front = new THREE.Group(); g.add(front);
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(pane, 12), glassOf()); glass.position.z = .2; glass.visible = !broken; front.add(glass);
  const bars = new THREE.Group(); bars.visible = !broken; front.add(bars);
  for (let i = 1; i < 4; i++) { const x = -r + i * w / 4, top = spring + Math.sqrt(Math.max(0, 1 - (x / r) ** 2)) * r * .4 - .02; box(bars, .025, top - .15, .03, lead, x, (top - .15) / 2 + .15, .21); }
  for (let i = 1; i < 3; i++) box(bars, w, .025, .03, lead, 0, .15 + i * .26, .21);
  mergeStill(bars);
  // once broken: the lead twisted away, shards of glass left in the frame
  const shards = new THREE.Group(); shards.visible = broken; front.add(shards);
  for (let i = 0; i < 8; i++) { const x = -r + .08 + (i % 4) * .1 + (i > 3 ? w - .46 : 0), y = .2 + ((i * 37) % 5) * .07; put(mesh(shards, new THREE.ConeGeometry(.05, .24, 3), tone(0xb8d8c0, .05, .3), x, y, .21), 0, 0, (i % 2 ? .35 : -.35) + Math.PI); }
  for (const [x, y, a] of [[-r, .45, .5], [r, .4, -.6], [-r + .1, .8, -.3]]) put(box(shards, .4, .025, .03, lead, x + (x < 0 ? .2 : -.2), y, .21), 0, 0, a, [.4, .025, .03]);
  mergeStill(shards);
  // three stages of cracks, spreading from where the bolts strike (low in the middle of the glass)
  const cracks = [0, 1, 2].map(k => {
    const c = new THREE.Group(); c.visible = false; front.add(c);
    const n = 3 + k * 2, cx = (k - 1) * .25, cy = .42 + k * .05;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * .7, len = .18 + ((i * 53 + k * 17) % 7) * .04;
      put(box(c, len, .016, .01, crackOf(), cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2, .215), 0, 0, a, [len, .016, .01]);
    }
    mergeStill(c); return c;
  });
  const gl = glow(JELLY, w * 1.1, broken ? .15 : .3); gl.position.set(0, h * .55, .25); g.add(gl);
  g.userData = { serpent, head, glow: gl, glass, cracks, back, bars, shards };
  return g;
}
