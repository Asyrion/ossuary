/* Azyrion's arc (M4.6, docs/archive/M4.6-plan.md; GDD: Artifacts, Azyrion's arc): the chaos mage's pieces, which arrive as the mage
   holds more artifacts (costumeData.ts's ARC_PIECES, the stage from items/arc.ts), each in a slot nothing else holds. Built
   for the body like the other pieces and moved by costume.ts as they mark: `float` (on the model, not a bone), `spin`,
   `follow` (placed at a wrist each step, upright). */
import * as THREE from 'three';
import { glowShared, markShared, mergeStill } from '../render/materials';
import { EMBER_FIRE, makeFire } from '../render/fire';
import { glowTone, tone } from '../world/kitParts';
import { hang, offSide, wrist, type Fit, type Side } from './costumeFit';

const BRONZE = 0xa8743a, COAT = 0x1c1418;
const coatLining = markShared(new THREE.MeshStandardMaterial({ color: 0x120c10, roughness: 1, side: THREE.BackSide }));
const wind = markShared(new THREE.MeshBasicMaterial({ color: 0xf4f0ff, transparent: true, opacity: .26, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));

export const ARC_BUILD = {
  /** Stage 1: bronze-worked bracers on both forearms, dark leather banded in bronze, a red rune lit on each. */
  bracers(f: Fit) {
    return (['L', 'R'] as Side[]).map(s => {
      const W = wrist(f, s), g = new THREE.Group(), leather = tone(0x2a1a14, .1), bronze = tone(BRONZE, .15, .6);
      const sleeve = new THREE.CylinderGeometry(.058, .066, .2, 12, 1, true); sleeve.rotateX(Math.PI / 2); sleeve.translate(0, 0, -.11);
      g.add(new THREE.Mesh(sleeve, leather));
      for (const z of [-.015, -.11, -.205]) { const band = new THREE.Mesh(new THREE.TorusGeometry(.06 + -z * .04, .012, 4, 14), bronze); band.position.z = z; g.add(band); }
      const rune = new THREE.Mesh(new THREE.BoxGeometry(.018, .006, .07), glowTone(0xff4a2a)); rune.position.set(0, .066, -.11); g.add(rune);
      g.quaternion.copy(W.q); g.position.copy(W.pos);
      const outer = new THREE.Group(); outer.add(g); mergeStill(outer);
      return hang(f.hand[s].at, outer);
    });
  },
  /** Stage 2: a dark coat's high collar and shoulders, worked in bronze. */
  chaosCollar(f: Fit) {
    const g = new THREE.Group(), coat = tone(COAT, .1), bronze = tone(BRONZE, .15, .6), ch = f.chest, cc = ch.getCenter(new THREE.Vector3()), cs = ch.getSize(new THREE.Vector3());
    const top = f.head.box.min.y + (f.head.box.max.y - f.head.box.min.y) * .22, bottom = ch.max.y - cs.y * .08;
    const collar = new THREE.CylinderGeometry(1, 1, 1, 20, 1, true), p = collar.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const up = p.getY(k) > 0, a = Math.atan2(p.getZ(k), p.getX(k)), front = Math.max(0, Math.sin(a)); // (lower at the front: open at the throat)
      const rx = up ? f.head.radii.x * .78 : f.head.radii.x * .7, rz = up ? f.head.radii.z * .7 : Math.max(cs.z * .45, f.head.radii.z * .5);
      p.setXYZ(k, cc.x + rx * Math.cos(a), up ? top - front * (top - bottom) * .55 : bottom, cc.z + rz * Math.sin(a));
    }
    collar.computeVertexNormals();
    g.add(new THREE.Mesh(collar, coat), new THREE.Mesh(collar, coatLining));
    // the shoulders: a curved plate each, edged in bronze (placed by the head's size: the chest measured at rest takes in
    // the arms of a model posed with them out)
    const out = Math.min(cs.x * .42, f.head.radii.x * .85), px = f.head.radii.x * .42, pz = f.head.radii.z * .5;
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI * .45), coat);
      plate.scale.set(px, .07, pz); plate.position.set(cc.x + s * out, ch.max.y - .04, cc.z); plate.rotation.z = -s * .35; g.add(plate);
      const edge = new THREE.Group(); edge.position.copy(plate.position); edge.rotation.z = plate.rotation.z; g.add(edge); // (round the plate's lower edge)
      const rim = new THREE.Mesh(new THREE.TorusGeometry((plate.scale.x + plate.scale.z) / 2, .012, 4, 20), bronze); rim.rotation.x = Math.PI / 2; rim.position.y = .07 * Math.cos(Math.PI * .45); edge.add(rim);
    }
    mergeStill(g);
    return [hang(f.chestAt, g)];
  },
  /** Stage 3: three red rune orbs, each in a thin gold ring, circling the mage at the chest (`float`, `spin`). */
  runeOrbs(f: Fit) {
    const g = new THREE.Group(), y = f.chest.getCenter(new THREE.Vector3()).y, r = (f.all.max.y - f.all.min.y) * .38, gold = tone(0xd8a840, 0, .7), red = glowTone(0xff3a2a);
    const turn = new THREE.Group(), balls = new THREE.Group(); turn.userData.spin = 1.1; turn.add(balls); g.add(turn);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2, at = new THREE.Vector3(Math.cos(a) * r, y + (i - 1) * .08, Math.sin(a) * r);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), red); ball.position.copy(at); balls.add(ball);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.078, .006, 4, 20), gold); ring.position.copy(at); ring.rotation.set(.6 + i, i * .9, 0); balls.add(ring);
      const gl = glowShared(0xff4a2a, .3, .55); gl.position.copy(at); turn.add(gl);
    }
    mergeStill(balls); // (the three orbs and their rings: a mesh a material)
    g.userData.float = true;
    return [g];
  },
  /** Stage 4: a flame in the off hand (placed at the wrist each step, upright: `follow`) and white arcs of wind turning
      round the mage (`float`). */
  chaosFlame(f: Fit) {
    const s = offSide(), flame = new THREE.Group();
    flame.add(makeFire([{ x: 0, y: .05, z: .03, h: .16, w: .07, tongues: 2 }], EMBER_FIRE, 5, .3));
    const gl = glowShared(0xff7a2a, .45, .5); gl.position.set(0, .1, .03); flame.add(gl);
    flame.userData.follow = { side: s };
    const winds = new THREE.Group(), h = f.all.max.y - f.all.min.y;
    [[.36, .32, .4, 1.6], [.42, .55, -.3, -1.2], [.38, .8, .25, 2.1]].forEach(([r, y, tilt, spin]) => {
      const arc = new THREE.Group(); arc.position.y = h * y; arc.rotation.x = tilt; arc.userData.spin = spin;
      const m = new THREE.Mesh(new THREE.TorusGeometry(h * r, .006, 3, 32, Math.PI * .7), wind); m.rotation.x = Math.PI / 2; arc.add(m); winds.add(arc);
    });
    winds.userData.float = true;
    return [flame, winds];
  },
};
