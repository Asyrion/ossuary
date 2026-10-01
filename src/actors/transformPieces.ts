/* The pieces of the transformations' looks (M4.6, docs/M4.6-plan.md, The transformations; which each wears is
   costumeData.ts's TRANSFORM_LOOKS): built for the body like the artifacts' pieces (costumePieces.ts), fitted to the
   measured model and hung from its bones. What moves by itself is marked for costume.ts to move each step:
   `userData.float` (a part placed on the model, not a bone: the aura, the grimoire), `spin` (turning, radians a second),
   `bob` (rising and falling), `flap` (wings), `eyes` (sprites that flare when a Storm spell is cast), and markers
   `userData.emit` that let out motes there (burning footsteps, frosted breath, sparks). */
import * as THREE from 'three';
import { glow, glowShared, markShared, mergeStill } from '../render/materials';
import { EMBER_FIRE, makeFire, makeMotes } from '../render/fire';
import { runeRing } from '../render/arcane';
import { glowTone, tone } from '../world/kitParts';
import { TRANSFORMS, isTransform } from '../items/transformData';
import { bakeOnHead, hang, offSide, sideX, wrist, type Fit, type Side } from './costumeFit';
import type { Worn } from './costumeData';

/** What a marker lets out, and how often (costume.ts's `updateCostumes`). */
export interface Emit { kind: 'steps' | 'breath' | 'sparks'; color: number; every: number }
const marker = (at: THREE.Vector3, emit: Emit) => { const m = new THREE.Object3D(); m.position.copy(at); m.userData.emit = emit; return m; };

/** A see-through glowing material in `color`, shared. */
const sheens = new Map<string, THREE.MeshBasicMaterial>();
const sheen = (color: number, opacity: number) => {
  const k = color + ':' + opacity; let m = sheens.get(k);
  if (!m) sheens.set(k, m = markShared(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  return m;
};
const veil = markShared(new THREE.MeshBasicMaterial({ color: 0x120a1c, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false }));

/** A point on the head's ellipsoid (unit sphere coordinates, the face +z) in the model's frame. */
const onHeadAt = (f: Fit, x: number, y: number, z: number) => new THREE.Vector3(f.head.centre.x + x * f.head.radii.x, f.head.centre.y + y * f.head.radii.y, f.head.centre.z + z * f.head.radii.z);
const chestOf = (f: Fit) => ({ cc: f.chest.getCenter(new THREE.Vector3()), cs: f.chest.getSize(new THREE.Vector3()) });

export const TRANSFORM_BUILD = {
  /** The Pyromancer's crown of flame: a dark iron circlet round the brow, small flames rising from it. */
  flameCrown(f: Fit) {
    const g = new THREE.Group(), at = .45, r = Math.sqrt(1 - at * at) * 1.05;
    const band = new THREE.Group(), ring = new THREE.Mesh(new THREE.TorusGeometry(r, .05, 4, 22), tone(0x3a2a22, .15, .4)); ring.rotation.x = Math.PI / 2; ring.position.y = at; band.add(ring);
    bakeOnHead(band, f); mergeStill(band); g.add(band);
    const specs = Array.from({ length: 7 }, (_, i) => { const a = i / 7 * Math.PI * 2, p = onHeadAt(f, Math.sin(a) * r, at + .05, Math.cos(a) * r); return { x: p.x, y: p.y, z: p.z, h: .13 + (i % 2) * .04, w: .05, beat: i * 1.3 }; });
    g.add(makeFire(specs, EMBER_FIRE, 6, .25));
    const gl = glowShared(0xff8a3a, f.head.radii.x * 3, .45); gl.position.copy(onHeadAt(f, 0, at + .2, 0)); g.add(gl);
    return [hang(f.headAt, g)];
  },
  /** The Pyromancer's burning footsteps: a glow at each foot, letting out embers as the mage walks. */
  emberSteps(f: Fit) {
    return (['L', 'R'] as Side[]).map(s => {
      const g = new THREE.Group(), b = f.foot[s].box, c = b.getCenter(new THREE.Vector3()); c.y = b.min.y + .02;
      const gl = glowShared(0xff7a2a, .26, .5); gl.position.copy(c); g.add(gl, marker(c, { kind: 'steps', color: 0xff8a3a, every: .16 }));
      return hang(f.foot[s].at, g);
    });
  },
  /** The Frostborn's crown of ice: shards of ice standing round the brow; and the breath frosting before the face. */
  iceCrown(f: Fit) {
    const g = new THREE.Group(), at = .42, r = Math.sqrt(1 - at * at) * 1.04, ice = glowTone(0xcfefff), deep = tone(0x8fc8e8, .1, .3);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .04, 4, 22), deep); ring.rotation.x = Math.PI / 2; ring.position.y = at; g.add(ring);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, h = i % 2 ? .32 : .5, shard = new THREE.Mesh(new THREE.ConeGeometry(.08, h, 4), i % 3 ? ice : deep);
      shard.position.set(Math.sin(a) * r, at + h / 2, Math.cos(a) * r); shard.rotation.set(Math.cos(a) * .25, 0, -Math.sin(a) * .25); g.add(shard);
    }
    bakeOnHead(g, f); mergeStill(g);
    g.add(marker(onHeadAt(f, 0, -.35, 1.15), { kind: 'breath', color: 0xdff4ff, every: 1.6 }));
    return [hang(f.headAt, g)];
  },
  /** The Frostborn's rimed shoulders: clusters of ice crystals on both. */
  rimeMantle(f: Fit) {
    const g = new THREE.Group(), { cc, cs } = chestOf(f), ice = glowTone(0xcfefff), deep = tone(0x9ad0f0, .1, .3);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
      const h = .09 + (i % 3) * .05, c = new THREE.Mesh(new THREE.ConeGeometry(.035, h, 4), i % 2 ? ice : deep);
      const a = i / 6 * Math.PI * 2;
      c.position.set(cc.x + s * (cs.x * .4 + Math.cos(a) * .05), f.chest.max.y + h * .35, cc.z + Math.sin(a) * .06);
      c.rotation.set(Math.sin(a) * .5, 0, -s * (.3 + Math.cos(a) * .3)); g.add(c);
    }
    mergeStill(g);
    return [hang(f.chestAt, g)];
  },
  /** The Stormcaller's marks: violet and teal light across the face and down from the eyes, and eyes that flare blue when a
      Storm spell is cast (`userData.eyes`). */
  stormMarks(f: Fit) {
    const g = new THREE.Group(), violet = glowTone(0xa88aff), teal = glowTone(0x6ae0e0);
    const on = (x: number, y: number) => new THREE.Vector3(x, y, Math.sqrt(Math.max(0, 1.07 - x * x - y * y))); // (just over the face)
    const streak = (pts: number[][], m: THREE.Material, r = .028) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y]) => on(x, y))), 12, r, 4, false), m));
    for (const s of [-1, 1]) {
      streak([[s * .2, -.04], [s * .38, -.14], [s * .56, -.28]], violet); // (across the cheek)
      streak([[s * .32, .02], [s * .34, -.18], [s * .3, -.38]], teal, .022); // (down from the eye)
    }
    streak([[-.3, .44], [0, .5], [.3, .44]], violet, .024); // (over the brow)
    bakeOnHead(g, f); mergeStill(g);
    for (const s of [-1, 1]) { const e = glow(0x8ad8ff, f.head.radii.x * .55, .25); e.position.copy(onHeadAt(f, s * .32, .12, 1.05)); e.userData.eyes = .25; g.add(e); }
    return [hang(f.headAt, g)];
  },
  /** The Stormcaller's spirals: black bands winding down both forearms, a faint violet light along them. */
  stormSpirals(f: Fit) {
    return (['L', 'R'] as Side[]).map(s => {
      const W = wrist(f, s), pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 40; i++) { const k = i / 40, a = k * Math.PI * 5; pts.push(new THREE.Vector3(Math.cos(a) * .055, Math.sin(a) * .055, -k * .24)); }
      const g = new THREE.Group(), coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .012, 4, false), tone(0x100c14, .05));
      g.add(coil); g.quaternion.copy(W.q); g.position.copy(W.pos);
      const outer = new THREE.Group(); outer.add(g); mergeStill(outer);
      const gl = glowShared(0x9a7aff, .3, .3); gl.position.copy(W.pos).addScaledVector(W.axis, -.12); outer.add(gl);
      return hang(f.hand[s].at, outer);
    });
  },
  /** The Lightbearer's wings: two wings of candle-light at the shoulder blades, beating slowly (`flap`). */
  lightWings(f: Fit) {
    const g = new THREE.Group(), { cc, cs } = chestOf(f), shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.bezierCurveTo(.15, .25, .45, .42, .7, .5); shape.bezierCurveTo(.6, .3, .62, .12, .55, -.05);
    shape.bezierCurveTo(.45, -.12, .42, -.25, .32, -.3); shape.bezierCurveTo(.25, -.18, .12, -.1, 0, 0);
    const geo = new THREE.ShapeGeometry(shape, 10);
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(cc.x + s * cs.x * .12, f.chest.max.y - cs.y * .25, f.chest.min.z - .04);
      const wing = new THREE.Mesh(geo, sheen(0xffe0a0, .5)); wing.scale.set(-s, 1, 1); wing.rotation.y = s * .35; pivot.add(wing);
      const core = new THREE.Mesh(geo, sheen(0xfff4d8, .45)); core.scale.set(-s * .6, .6, 1); core.position.z = -.005; core.rotation.y = s * .35; pivot.add(core);
      pivot.userData.flap = s; g.add(pivot);
    }
    const gl = glowShared(0xffd878, cs.x * 4, .35); gl.position.set(cc.x, f.chest.max.y - cs.y * .2, f.chest.min.z - .2); g.add(gl);
    return [hang(f.chestAt, g)];
  },
  /** The Shadowstep's cloak of shadow: a dark veil from the shoulders nearly to the floor, its hem fraying into motes. */
  shadowCloak(f: Fit) {
    const g = new THREE.Group(), { cc, cs } = chestOf(f), top = f.chest.max.y - cs.y * .05, bottom = .08, len = top - bottom;
    const geo = new THREE.CylinderGeometry(1, 1, 1, 18, 6, true, Math.PI * .5, Math.PI), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k) + .5, a = Math.atan2(p.getZ(k), p.getX(k)), w = .55 + (1 - y) * .5; // (wider towards the hem)
      const fray = y < .05 ? Math.sin(a * 13) * .06 : 0;
      p.setXYZ(k, cc.x + Math.cos(a) * cs.x * .62 * w, bottom + y * len + fray, cc.z - .02 + Math.sin(a) * Math.max(cs.z, .12) * .8 * w);
    }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, veil));
    const motes = makeMotes([{ x: cc.x, y: bottom, z: cc.z - cs.z * .5, h: .1, w: cs.x * 1.1 }], 0x7a4ac8, 8, .5, .6); g.add(motes);
    return [hang(f.chestAt, g)];
  },
  /** The Shadowstep's violet eyes: a glow in each. */
  shadowEyes(f: Fit) {
    const g = new THREE.Group();
    for (const s of [-1, 1]) {
      const e = glowShared(0xb070ff, f.head.radii.x * .6, .8); e.position.copy(onHeadAt(f, s * .32, .12, 1.05)); g.add(e);
      const core = glowShared(0xf0e0ff, f.head.radii.x * .2, 1); core.position.copy(e.position); g.add(core);
    }
    return [hang(f.headAt, g)];
  },
  /** The Runescribe's grimoire: a small book floating open beside the off shoulder, a rune lit on its pages (`bob`). */
  grimoire(f: Fit) {
    const { cc, cs } = chestOf(f), off = sideX(offSide()), book = new THREE.Group(), leather = tone(0x3a2a4a, .12), page = tone(0xe8dcc0, .08);
    for (const s of [-1, 1]) {
      const cover = new THREE.Mesh(new THREE.BoxGeometry(.13, .012, .17), leather); cover.position.set(s * .066, 0, 0); cover.rotation.z = -s * .25; book.add(cover);
      const leaves = new THREE.Mesh(new THREE.BoxGeometry(.12, .02, .155), page); leaves.position.set(s * .062, .014, 0); leaves.rotation.z = -s * .25; book.add(leaves);
    }
    const rune = new THREE.Mesh(new THREE.TorusGeometry(.035, .007, 4, 12), glowTone(0x6ae0c8)); rune.rotation.x = Math.PI / 2; rune.position.set(.06, .03, 0); book.add(rune);
    mergeStill(book);
    const gl = glowShared(0x6ae0c8, .45, .45); gl.position.y = .05; book.add(gl);
    book.rotation.x = -.5;
    const at = new THREE.Vector3(cc.x + off * (cs.x * .5 + .22), f.chest.max.y + .12, cc.z - .05);
    const g = new THREE.Group(); g.position.copy(at); g.add(book); g.userData.float = true; g.userData.bob = { y: at.y, amp: .04, rate: 1.7 };
    return [g];
  },
  /** The aura of transformation `w.from`, in its light, round the mage's feet and body (not a bone's: `float`). A ring on the
      floor, turning, and what rises in it: embers, frost, sparks crackling, candle-light, shadow, runes circling, motes. */
  aura(f: Fit, w: Worn) {
    const t = isTransform(w.from) ? w.from : 'pilgrim', light = TRANSFORMS[t].light, g = new THREE.Group(); g.userData.float = true;
    const r = (f.all.max.y - f.all.min.y) * .34, mid = new THREE.Vector3(0, 0, 0); // (round the feet: about the mage's own width)
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * .92, r, 40), sheen(light, .32)); ring.rotation.x = -Math.PI / 2; ring.position.y = .03;
    const turn = new THREE.Group(); turn.add(ring); turn.userData.spin = .4; g.add(turn);
    const floor = glowShared(light, r * 3.2, .22); floor.position.y = .05; g.add(floor);
    const rise = { pyromancer: [14, 1.1, 1.2], frostborn: [10, .9, .5], stormcaller: [8, 1, .9], lightbearer: [12, 1.3, .7], shadowstep: [10, .8, .6], runescribe: [6, .9, .6], pilgrim: [6, 1, .5], beastcaller: [10, 1.2, .8] }[t];
    g.add(makeMotes(Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2; return { x: Math.cos(a) * r * .8, y: .05, z: Math.sin(a) * r * .8, h: .1, w: .12 }; }), t === 'shadowstep' ? 0x7a4ac8 : light, rise[0], rise[1], rise[2]));
    if (t === 'runescribe') { const runes = new THREE.Group(); runeRing(runes, light, r * .85, [0, (f.hips.max.y + f.hips.min.y) / 2, 0], 6, [0, 0, 0], sheen(light, .55)); runes.userData.spin = -.9; g.add(runes); }
    if (t === 'stormcaller') g.add(marker(mid.set(0, f.chest.max.y, 0), { kind: 'sparks', color: light, every: .7 }));
    return [g];
  },
};
