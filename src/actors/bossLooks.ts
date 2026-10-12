/* The bosses built in code. The Hollow Warden's fight (bosses.ts: it walks, winds up and bursts a ring of shots, fires
   aimed volleys, calls the floor's walkers below half health) wears the Owlbear (`wardenLook`; the owner's choice of
   three, 2026-10-03), which gives it the parts that fight moves: `eye` (swells as it winds up), `ring` (turns, faster
   while winding), `halo` (brightens), and its school's light (Hallow) for its shots. Since M4.12 (docs/archive/M4.12-plan.md) it,
   the Hallowed Hart, the Deep Angler, the War-Tiger, the Pillar Dragon's head and the jelly serpent's head are creatures of
   fantasy, built in fantasyBosses.ts. Here are
   the rest: the dragon's body, the Twin Guardians, the Drowned Abbess and the Pyre Knight, and the galleries' lists. Each
   stands on y = 0 facing +Z. Names and notes are placeholders in STR.bossLooks and STR.bosses. */
import * as THREE from 'three';
import { glow } from '../render/materials';
import { lay, neck, spiral, type P3 } from './dragonPath';
import { SCHOOL_LIGHT, box, limb, lit, motes, part, rune, runeRing, sphere, std, type School, type V3 } from '../render/arcane';
import { gloss, joint, jointed, slitEyes, spike, thin, tube } from './beastParts';
import { curve } from '../world/kitParts';
import { EMBER_FIRE, makeFire, makeMotes, type FlameSpec } from '../render/fire';
import { serpentLook } from './serpentLooks';
import { anglerFierce, dragonHeadFierce, hartFierce, owlbear, tigerFierce } from './fantasyBosses';
import { KAELITH_GALLERY } from './kaelithLooks';

/** A built boss look: its group, how it idles, its shadow, the parts the fight moves (the Warden's three, and any a
    boss's own fight moves besides) and its school. */
export interface BossBuilt { group: THREE.Group; idle: (t: number) => void; shadow: number; parts: { eye: THREE.Object3D; ring: THREE.Object3D; halo: THREE.Sprite } & Record<string, THREE.Object3D>; school: School }

/** The ring of runes behind its head that the fight turns (in its own plane, facing the camera, tipped back a little; in
    its school's colour, not added light, which the halo behind it would wash to white). */
function haloRing(g: THREE.Object3D, color: number, radius: number, y: number, z = -.35) {
  const ring = new THREE.Group(); ring.position.set(0, y, z); ring.rotation.x = -.35; g.add(ring);
  runeRing(ring, color, radius, [0, 0, 0], 8, [Math.PI / 2, 0, 0], lit(color, .9));
  return ring;
}

/* The Pillar Dragon (M4.2, from the Eda lore; Ember and Frost): a long dragon with antlers, a spiked mane and a beard,
   orange down its left flank and blue-grey down its right. Its head is one look (fantasyBosses.ts, M4.12: it leans out from the
   pillar and breathes); its body a chain of segments drawn as instances, laid along its path each step (pillarDragon.ts). */
const DRAGON = { fire: 0xe07a2c, frost: 0x6c8098, cream: 0xf0e2c2, horn: 0xdcc088 };

/** The Pillar Dragon's body: `n` segments drawn as instances (a few draw calls for the whole length), orange on the left
    and blue-grey on the right, cream beneath, a spike on each, four short legs and a tuft at the tail. `pose` lays them
    along the points given (head end first), each turned along the body. */
export interface DragonBody { group: THREE.Group; n: number; spacing: number; mats: THREE.MeshStandardMaterial[]; pose: (at: readonly (readonly [number, number, number])[]) => void }
export function dragonBody(n = 22, spacing = .2): DragonBody {
  const g = new THREE.Group(), o = new THREE.Color(DRAGON.fire), b = new THREE.Color(DRAGON.frost), c = new THREE.Color(DRAGON.cream), white = new THREE.Color(0xffffff);
  const painted = (geo: THREE.BufferGeometry, colour: (x: number, y: number) => THREE.Color) => {
    const p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) colour(p.getX(k), p.getY(k)).toArray(col, k * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
  };
  // (painted in their vertices: the merge that makes a look cheap leaves instances alone, and so does it these)
  const skin = std(0xffffff, { vertexColors: true, roughness: .6 }), bone = std(0xffffff, { vertexColors: true });
  const segGeo = painted(new THREE.SphereGeometry(1, 12, 8), (x, y) => y < -.6 ? c : x > 0 ? o : b);
  const spikeGeo = painted(new THREE.ConeGeometry(.5, 1, 4).translate(0, .5, 0), () => c);
  const legGeo = painted(new THREE.CylinderGeometry(.05, .07, .4, 5).translate(0, .2, 0), () => white);
  const segs = new THREE.InstancedMesh(segGeo, skin, n), spikes = new THREE.InstancedMesh(spikeGeo, bone, n + 3), legs = new THREE.InstancedMesh(legGeo, skin, 4);
  for (let i = 0; i < 4; i++) legs.setColorAt(i, i % 2 ? b : o);
  for (const m of [segs, spikes, legs]) { m.frustumCulled = false; g.add(m); } // (the instances go wherever the body does)
  const LEGS = [Math.round(n * .22), Math.round(n * .55)];
  const radius = (i: number) => { const t = i / (n - 1); return t < .3 ? .17 + .08 * t / .3 : .25 - .17 * Math.pow((t - .3) / .7, 1.2); };
  const m = new THREE.Matrix4(), local = new THREE.Matrix4(), rot = new THREE.Matrix4(), turn = new THREE.Matrix4(), x = new THREE.Vector3(), y = new THREE.Vector3(), f = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), q = new THREE.Vector3();
  const basis = (at: readonly (readonly [number, number, number])[], i: number, r: number) => {
    const a = at[Math.max(0, i - 1)], z = at[Math.min(at.length - 1, i + 1)];
    f.set(a[0] - z[0], a[1] - z[1], a[2] - z[2]); if (f.lengthSq() < 1e-8) f.set(0, 0, 1); f.normalize();
    x.crossVectors(up, f); if (x.lengthSq() < 1e-6) x.set(1, 0, 0); x.normalize(); y.crossVectors(f, x);
    p.set(at[i][0], at[i][1], at[i][2]);
    return m.makeBasis(x, y, f).scale(q.set(r, r * .9, r * 1.3)).setPosition(p);
  };
  return { group: g, n, spacing, mats: [skin, bone], pose: at => {
    for (let i = 0; i < n; i++) {
      const r = radius(i); basis(at, i, r); segs.setMatrixAt(i, m);
      spikes.setMatrixAt(i, local.copy(m).multiply(rot.makeTranslation(0, .8, 0)).multiply(turn.makeRotationX(-.7)).multiply(rot.makeScale(.42, .55, .42)));
      const k = LEGS.indexOf(i);
      if (k >= 0) for (const s of [1, -1]) legs.setMatrixAt(k * 2 + (s > 0 ? 0 : 1), local.copy(m).multiply(rot.makeTranslation(s * .8, -.35, .1)).multiply(turn.makeRotationZ(-s * 2.3)).multiply(rot.makeScale(1 / r * .2, 1 / (r * .9) * .2, 1 / (r * 1.3) * .2)));
    }
    basis(at, n - 1, radius(n - 1)); // (a tuft at the tail, pointing back)
    for (let k = 0; k < 3; k++) spikes.setMatrixAt(n + k, local.copy(m).multiply(turn.makeRotationX(-Math.PI / 2 - .4 + k * .4)).multiply(rot.makeScale(1.3, 3, 1.3)));
    segs.instanceMatrix.needsUpdate = spikes.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = true;
  } };
}

/** The Pillar Dragon for the gallery: coiled round a stone column, leaning out (the same path its fight lays it on). */
export function dragonLook(): BossBuilt {
  const L = dragonHead(), g = new THREE.Group(), B = dragonBody(), stone = std(0x8a8478);
  part(g, new THREE.CylinderGeometry(.27, .3, 1.55, 10), stone, [0, .78, 0]); part(g, box(.72, .18, .72), stone, [0, 1.62, 0]); part(g, box(.86, .2, .86), stone, [0, .1, 0]);
  const coil = spiral(0, 0, 1.75, Math.PI * .75, { radius: .62, turns: 1.25, drop: 1.2 }), end = coil[coil.length - 1], h: P3 = [.35, 1.6, 1.15];
  B.pose(lay([...neck(h, end, .35), ...coil.slice().reverse()], B.n, B.spacing, .3));
  g.add(B.group); L.group.position.set(...h); L.group.rotation.y = .3; g.add(L.group);
  return { ...L, group: g, shadow: 2 };
}

/** One of the Twin Guardians (M4.2, from the Eda lore; Hallow): a colossal bearded guardian of sandstone crouched as
    the ones in the gate's towers, a helm on its head, lion paws for hands and feet, a round stone shield on its left
    arm; its eyes the Wardens' gold. The two differ a little (`second`: greyer stone, a forked beard, a crest on its
    helm). Its fight (bosses.ts) turns its head after the mage, raises its shield arm as it shields its twin, and rears
    its right paw to strike. */
export function twinLook(second = false): BossBuilt {
  const H = SCHOOL_LIGHT.hallow, g = new THREE.Group(), stone = std(second ? 0xa8a296 : 0xc2ae8a, { roughness: .95 }), dark = std(second ? 0x7a756c : 0x8e7c60, { roughness: .95 }), gold = std(0xc89a48, { roughness: .45, metalness: .5 });
  const body = new THREE.Group(); g.add(body);
  // crouched: great haunches, a broad chest leaning forward, the forepaws planted
  part(body, sphere(.62, 14, 10), stone, [0, .85, -.15], { scale: [1.1, .95, 1] });
  part(body, sphere(.55, 14, 10), stone, [0, 1.35, .15], { scale: [1.15, 1, .85] });
  part(body, box(.9, .1, .5), gold, [0, 1.05, .32]); // (a belt of gilt)
  for (const s of [-1, 1]) { // haunches and hind paws
    part(body, sphere(.36, 10, 8), dark, [.5 * s, .45, -.2], { scale: [.8, 1, 1.2] });
    part(body, sphere(.22, 9, 7), stone, [.55 * s, .12, .2], { scale: [1.1, .6, 1.4] });
    for (let i = -1; i <= 1; i++) part(body, sphere(.06, 6, 5), dark, [.55 * s + i * .08, .08, .45]);
  }
  // the head: a helm, heavy brows, a great square beard; eyes of the Wardens' gold
  const head = new THREE.Group(); head.position.set(0, 1.95, .3); body.add(head);
  part(head, sphere(.3, 12, 10), stone, [0, 0, 0], { scale: [1, 1.05, .95] });
  part(head, new THREE.SphereGeometry(.33, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), gold, [0, .05, -.02]); // (the helm)
  part(head, box(.5, .06, .12), gold, [0, .06, .22]); // (its brim)
  if (second) part(head, box(.06, .22, .5), gold, [0, .38, -.02]); // (a crest)
  part(head, box(.42, .07, .1), dark, [0, -.02, .26]); // (brows)
  const beard = new THREE.Group(); beard.position.set(0, -.2, .18); head.add(beard);
  if (second) for (const s of [-1, 1]) part(beard, new THREE.ConeGeometry(.13, .55, 5), dark, [.1 * s, -.2, 0], { rot: [Math.PI, 0, s * .15] });
  else { part(beard, box(.34, .5, .16), dark, [0, -.2, 0]); for (let i = 0; i < 4; i++) part(beard, box(.34, .03, .17), stone, [0, -.05 - i * .11, 0]); }
  const eye = new THREE.Group(); eye.position.set(0, .06, .27); head.add(eye);
  for (const s of [-1, 1]) part(eye, sphere(.05, 7, 5), lit(H), [.1 * s, 0, 0]);
  const eyeGlow = glow(H, .7, .6); eye.add(eyeGlow);
  // the arms: a lion paw each, the left bearing a round stone shield with a gilt boss
  const arm = (s: 1 | -1) => {
    const a = new THREE.Group(); a.position.set(.62 * s, 1.55, .15); body.add(a);
    limb(a, [0, 0, 0], [.08 * s, -.5, .22], .16, stone, .13); limb(a, [.08 * s, -.5, .22], [.05 * s, -1.05, .45], .13, stone, .12);
    part(a, sphere(.2, 10, 8), stone, [.05 * s, -1.2, .52], { scale: [1.15, .7, 1.3] });
    for (let i = -1; i <= 1; i++) part(a, new THREE.ConeGeometry(.035, .1, 4), dark, [.05 * s + i * .08, -1.28, .74], { rot: [Math.PI / 2, 0, 0] });
    return a;
  };
  const armL = arm(1), armR = arm(-1);
  const shield = new THREE.Group(); shield.position.set(.2, -.7, .5); armL.add(shield);
  part(shield, new THREE.CylinderGeometry(.5, .5, .1, 16), dark, [0, 0, 0], { rot: [Math.PI / 2, 0, 0] });
  part(shield, new THREE.TorusGeometry(.5, .04, 4, 20), gold, [0, 0, .05]);
  part(shield, sphere(.12, 8, 6), gold, [0, 0, .08], { scale: [1, 1, .5] });
  rune(shield, H, [0, .28, .06], .14, [0, 0, 0], lit(H, .9));
  const ring = haloRing(g, H, .85, 2.75, -.4);
  const halo = glow(H, 3.2, .3); halo.position.set(0, 1.9, -.3); g.add(halo);
  const dust = motes(g, H, 5, 1.1, 1.4, .025);
  return { group: g, shadow: 2.6, school: 'hallow', parts: { eye, ring, halo, body, head, armL, armR, shield, eyeGlow }, idle: t => {
    const b = Math.sin(t * 1.1); body.scale.set(1 + b * .01, 1 + b * .012, 1); dust(t, .4);
  } };
}

/** The Twin Guardians for the gallery: the two side by side. */
export function twinPairLook(): BossBuilt {
  const a = twinLook(), b = twinLook(true), g = new THREE.Group();
  a.group.position.x = -1.2; b.group.position.x = 1.2; g.add(a.group, b.group);
  return { ...a, group: g, shadow: 4, idle: t => { a.idle(t); b.idle(t + 1.7); } };
}

/** The Drowned Abbess (floor 2 or 3's boss, Frost; remade in code 2026-10-01, the owner's ask): a great pale cave olm,
    soft and pale, rearing out of the water under the floor, its long tail curled behind it. Feathery gills glowing
    with cold light hang round its head like a wimple and a veil, and its little forelegs are folded before its chest as
    if at prayer, which is why the sextons called it the Abbess; it smiles a wide mouth of fine teeth. Its fight (bosses.ts)
    opens its jaw and spreads its gills as it wails, flares its eyes, and sinks it into the floor. */
export function abbessLook(): BossBuilt {
  const F = SCHOOL_LIGHT.frost, g = new THREE.Group(), skin = gloss(0xe2d6d6, .5, .08), pale = std(0xf6eeea), finM = thin(0xe6c4c8), spotM = lit(0xbfe9ff);
  const mouthM = lit(0x2c1624), tooth = std(0xf4f0e8, { roughness: .35 }), stalkM = lit(0x3f9ad0), frondM = lit(F), tipM = lit(0xe2f6ff);
  const body = new THREE.Group(); g.add(body);
  // the tail, curled on the floor behind it, a soft fin along its top and freckles of cold light
  const tail = joint(body, [0, .3, -.2]), tailPts: V3[] = [[0, 0, 0], [0, -.04, -.6], [-.42, -.12, -1.05], [-.28, -.18, -1.5], [.2, -.2, -1.74]], tc = curve(tailPts);
  tube(tail, tailPts, .42, .05, skin, 18, 8);
  for (let i = 1; i < 10; i++) {
    const k = i / 11, p = tc.getPoint(k), d = tc.getTangent(k), r = .42 - .37 * k;
    part(tail, sphere(.2, 6, 5), finM, [p.x, p.y + r * .85, p.z], { rot: [0, Math.atan2(d.x, d.z), 0], scale: [.12, 1 - k * .6, 1.2] });
    if (i % 2) part(tail, sphere(.035, 5, 4), spotM, [p.x + r * .5, p.y + r * .55, p.z]);
  }
  // the body, rearing up from the floor to the head; a pale belly
  tube(body, [[0, .25, -.25], [0, .7, -.02], [0, 1.15, .2], [0, 1.44, .38]], .5, .32, skin, 12, 10);
  part(body, sphere(.42, 12, 10), pale, [0, .8, .2], { scale: [.9, 1.25, .6] });
  for (const s of [-1, 1]) {
    // the forelegs folded before the chest, the hands meeting as if at prayer; the hind legs splayed on the floor
    jointed(body, [[.3 * s, 1.18, .3], [.42 * s, .9, .5], [.08 * s, 1.02, .66]], .08, .05, skin);
    for (let f = 0; f < 3; f++) limb(body, [.08 * s, 1.02, .66], [.03 * s, 1.1 + f * .04, .7 + f * .015], .02, pale, .012);
    jointed(body, [[.38 * s, .35, -.12], [.72 * s, .24, .06], [.86 * s, .04, .26]], .12, .07, skin);
    part(body, sphere(.12, 8, 6), pale, [.9 * s, .03, .34], { scale: [1.2, .3, 1.1] });
  }
  for (let i = 0; i < 5; i++) part(body, sphere(.04, 5, 4), spotM, [(i % 2 ? .16 : -.16), .55 + i * .2, -.2 + i * .1]);
  // the head: broad and flat, held up so its face shows, a wide smile of fine teeth, eyes of cold light
  const head = joint(body, [0, 1.62, .5], [-.35, 0, 0]);
  part(head, sphere(.44, 14, 10), skin, [0, 0, 0], { scale: [1.3, .62, 1.1] });
  part(head, new THREE.TorusGeometry(.44, .075, 4, 18, Math.PI), mouthM, [0, -.08, 0], { rot: [Math.PI / 2, 0, 0], scale: [1.25, 1.06, 1] });
  for (let i = 1; i < 12; i++) { const a = i / 12 * Math.PI; part(head, new THREE.ConeGeometry(.035, i % 2 ? .15 : .1, 4), tooth, [Math.cos(a) * .58, -.1, Math.sin(a) * .5], { rot: [Math.PI, 0, 0] }); }
  const jaw = joint(head, [0, -.08, -.1]);
  part(jaw, sphere(.32, 12, 8), pale, [0, -.04, .24], { scale: [1.5, .45, 1.15] });
  for (let i = 1; i < 9; i++) { const a = i / 9 * Math.PI; part(jaw, new THREE.ConeGeometry(.02, .06, 4), tooth, [Math.cos(a) * .44, .03, .1 + Math.sin(a) * .36]); }
  const eye = joint(head, [0, .1, .36]);
  slitEyes(eye, .32, 0, .02, .16, F, .5, .4); // (narrow, cold, slanted down to the middle)
  const eyeGlow = glow(F, 1.1, .45); eyeGlow.position.set(0, 0, .08); eye.add(eyeGlow);
  for (let i = 0; i < 4; i++) part(head, sphere(.03, 5, 4), spotM, [(i - 1.5) * .14, .26, -.1 - (i % 2) * .08]);
  // the gills: three plumes a side, sweeping up over the head, out, and down to the shoulders like a veil; each a stalk
  // feathered along its length, its tips bright
  const gills = [-1, 1].map(s => {
    const gj = joint(head, [.5 * s, .04, -.12]);
    for (const [up, out] of [[.55, .32], [.12, .55], [-.42, .45]] as [number, number][]) {
      const pts: V3[] = [[0, 0, 0], [out * .45 * s, up * .5 + .04, -.1], [out * .85 * s, up * .85, -.28], [out * s, up - .1 * Math.sign(up), -.46]], c = curve(pts);
      tube(gj, pts, .09, .04, stalkM, 8, 6);
      for (let k = 1; k <= 6; k++) {
        const p = c.getPoint(k / 7), len = .24 - k * .018;
        for (const v of [-1, 1]) spike(gj, [p.x, p.y, p.z], [p.x + .05 * s, p.y + v * len, p.z - .07], .045, k > 4 ? tipM : frondM);
      }
    }
    return gj;
  });
  const ring = haloRing(g, F, .85, 1.95, .05);
  const halo = glow(F, 3.4, .35); halo.position.set(0, 1.6, 0); g.add(halo);
  const drips = motes(g, F, 8, 1.3, 1.2, .03);
  return { group: g, shadow: 2.4, school: 'frost', parts: { eye, ring, halo, body, head, jaw, gillL: gills[0], gillR: gills[1], eyeGlow }, idle: t => {
    body.rotation.z = Math.sin(t * .9) * .04; head.rotation.z = Math.sin(t * .7 + 1) * .06; head.rotation.x = -.35 + Math.sin(t * 1.1) * .04;
    gills.forEach((gj, i) => { gj.rotation.y = Math.sin(t * 1.6 + i * Math.PI) * .12; gj.rotation.x = Math.sin(t * 2.1 + i) * .06; });
    tail.rotation.y = Math.sin(t * 1.2) * .1; drips(t, .4);
  } };
}

/** The Pyre Knight (floor 2 or 3's boss, Ember; remade in code 2026-10-01, the owner's ask): a suit of blackened plate as
    tall as a door with no one inside it, only fire: it glows at every joint and through a crack in its breastplate, and
    pours up out of its helm as out of a brazier ringed with iron spikes. A greatsword whose fuller runs molten burns in
    both its gauntlets, and its cloak smoulders along the hem. Its fight (bosses.ts) strides its legs as it stalks, levels
    its blade as it aims and charges, raises it overhead and swings it down as it sprays embers, and widens the slit of
    its visor. */
export function pyreKnightLook(): BossBuilt {
  const E = SCHOOL_LIGHT.ember, g = new THREE.Group(), plate = gloss(0x3c3430, .4, .6), dark = std(0x1c1716, { metalness: .5, roughness: .55 }), trim = gloss(0x9a8472, .32, .7);
  const seam = lit(0xff8a34), molten = lit(0xffc36a), steel = gloss(0x9a8c80, .3, .8), cloth = thin(0x3a1612, { roughness: .9 });
  const body = new THREE.Group(); g.add(body);
  // the legs, each a pivot at the hip: cuisse, a knee cop with the fire showing behind it, greave, a sabaton
  const legs = [-1, 1].map(s => {
    const l = joint(body, [.26 * s, 1.0, 0]);
    limb(l, [0, 0, 0], [0, -.45, .05], .17, plate, .14);
    part(l, sphere(.14, 8, 6), trim, [0, -.47, .08]); part(l, sphere(.1, 6, 5), seam, [0, -.47, -.04]);
    limb(l, [0, -.5, .05], [0, -.88, 0], .14, plate, .12);
    part(l, box(.22, .12, .38), dark, [0, -.94, .08]);
    return l;
  });
  // a skirt of plates over the hips, a ring of fire at the waist
  for (let i = -3; i <= 3; i++) { const a = i * .42; part(body, box(.2, .34, .05), i % 2 ? trim : plate, [Math.sin(a) * .38, .98, Math.cos(a) * .38 - .02], { rot: [-.2, a, 0] }); }
  part(body, new THREE.TorusGeometry(.36, .05, 5, 18), seam, [0, 1.14, 0], { rot: [Math.PI / 2, 0, 0] });
  // the breastplate: a ridge down the middle, a crack the fire shows through
  part(body, sphere(.5, 14, 10), plate, [0, 1.55, 0], { scale: [1.05, 1.1, .75] });
  part(body, box(.05, .62, .05), trim, [0, 1.56, .36], { rot: [.1, 0, 0] });
  for (const [x, y, rz] of [[.12, 1.72, .5], [.16, 1.56, -.4], [.1, 1.42, .3], [.2, 1.36, -.6]] as V3[]) part(body, box(.035, .17, .03), molten, [x, y, .36 - (1.72 - y) * .05], { rot: [0, .35, rz] });
  part(body, new THREE.CylinderGeometry(.25, .3, .18, 10), dark, [0, 2.06, 0]);
  // the pauldrons: three shells each, layered, a spike on the top
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    part(body, new THREE.SphereGeometry(.32 - i * .05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), i ? plate : trim, [.56 * s, 1.92 - i * .13, 0], { rot: [0, 0, -s * (.35 + i * .12)], scale: [1, .7, 1.1] });
    if (!i) spike(body, [.62 * s, 2.1, 0], [.74 * s, 2.42, -.05], .06, trim);
  }
  // the helm: a great helm open at the crown like a brazier, iron spikes round its rim, fire pouring up out of it; the
  // slit of its visor burning
  const helm = joint(body, [0, 2.3, 0]);
  part(helm, new THREE.CylinderGeometry(.28, .25, .48, 10), plate, [0, 0, 0]);
  part(helm, new THREE.TorusGeometry(.28, .035, 4, 16), trim, [0, .24, 0], { rot: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; spike(helm, [Math.sin(a) * .28, .24, Math.cos(a) * .28], [Math.sin(a) * .36, .46, Math.cos(a) * .36], .04, dark); }
  part(helm, box(.06, .3, .04), trim, [0, -.06, .27]);
  const eye = joint(helm, [0, .04, .27]);
  part(eye, box(.34, .05, .03), molten, [0, 0, 0]);
  const pyre = makeFire([{ x: 0, y: .2, z: 0, h: .75, w: .42, tongues: 3 }], EMBER_FIRE, 10, .9); helm.add(pyre);
  // the arms hold the greatsword before it, point forward and down (the fight raises and swings them, the sword with them)
  const arms = joint(body, [0, 1.86, 0]);
  for (const s of [-1, 1]) {
    limb(arms, [.56 * s, -.02, 0], [.46 * s, -.45, .25], .13, plate, .12);
    part(arms, sphere(.09, 6, 5), seam, [.46 * s, -.45, .25]);
    limb(arms, [.46 * s, -.45, .25], [.12 * s, -.62, .56], .12, plate, .11);
    part(arms, sphere(.12, 8, 6), dark, [.09 * s, -.64, .6], { scale: [1, .9, 1.2] });
  }
  const sword = joint(arms, [0, -.64, .6], [2, 0, 0]);
  part(sword, box(.16, 1.45, .045), steel, [0, .8, 0]);
  part(sword, box(.045, 1.22, .055), molten, [0, .76, 0]);
  part(sword, new THREE.ConeGeometry(.08, .22, 4), steel, [0, 1.63, 0], { rot: [0, Math.PI / 4, 0], scale: [1, 1, .3] });
  part(sword, box(.52, .07, .1), dark, [0, .06, 0]);
  for (const s of [-1, 1]) part(sword, sphere(.05, 6, 5), trim, [.27 * s, .09, 0]);
  part(sword, new THREE.CylinderGeometry(.035, .035, .34, 6), dark, [0, -.13, 0]);
  part(sword, sphere(.06, 6, 5), trim, [0, -.32, 0]);
  const blaze = makeFire([.45, .8, 1.15, 1.45].map((y, i) => ({ x: 0, y: -.42 * y, z: .91 * y, h: .34 - i * .03, w: .15 })), EMBER_FIRE, 6, .6);
  blaze.rotation.x = -2; sword.add(blaze); // (in the sword's frame turned back upright, so the flames still rise)
  // the cloak, down its back from the shoulders, its tattered hem smouldering
  const cloak = joint(body, [0, 1.95, -.05]);
  part(cloak, new THREE.CylinderGeometry(.5, .78, 1.75, 12, 1, true, Math.PI - 1.15, 2.3), cloth, [0, -.88, 0]);
  const hem: FlameSpec[] = [];
  for (let i = 0; i < 11; i++) {
    const a = Math.PI - 1.1 + i / 10 * 2.2, x = Math.sin(a) * .78, z = Math.cos(a) * .78;
    part(cloak, new THREE.ConeGeometry(.08, .2 + (i % 3) * .06, 4), i % 2 ? seam : cloth, [x, -1.78, z], { rot: [Math.PI, 0, 0] });
    if (i % 3 === 1) hem.push({ x, y: -1.8, z, h: .15, w: .3 });
  }
  cloak.add(makeMotes(hem, E, 14, 1.2));
  const ring = haloRing(g, E, .8, 2.45, -.5);
  const halo = glow(E, 3.3, .35); halo.position.set(0, 1.8, -.2); g.add(halo);
  return { group: g, shadow: 2.3, school: 'ember', parts: { eye, ring, halo, body, helm, arms, sword, legL: legs[0], legR: legs[1] }, idle: t => {
    body.position.y = Math.sin(t * 1.6) * .015; cloak.rotation.x = .04 + Math.sin(t * 1.3) * .04; helm.rotation.y = Math.sin(t * .6) * .08;
  } };
}

/** The bosses of floors 4 and 5 (M4.1), the War-Tiger and the Pillar Dragon's head (M4.2): since M4.12 creatures of
    fantasy, built in fantasyBosses.ts. */
export const hartLook = hartFierce, anglerLook = anglerFierce, tigerLook = tigerFierce, dragonHead = dragonHeadFierce;

/** The Hollow Warden's look: the Owlbear (M4.12, the owner's choice, 2026-10-03). */
export const wardenLook = owlbear;
/** Every boss built in code, for the Galleries tab: the Hollow Warden, the bosses of floors 2 and 3, of floors 4
    and 5, then the bosses from the Eda lore (M4.2). */
export const ALL_BOSS_LOOKS: readonly { id: string; build: () => BossBuilt }[] = [{ id: 'warden', build: wardenLook }, { id: 'abbess', build: abbessLook }, { id: 'pyre', build: pyreKnightLook }, { id: 'hart', build: hartLook }, { id: 'angler', build: anglerLook }, { id: 'tiger', build: tigerLook }, { id: 'dragon', build: dragonLook }, { id: 'twins', build: twinPairLook }, { id: 'serpent', build: serpentLook }, ...KAELITH_GALLERY];
