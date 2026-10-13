/* The costume pieces built for the body (M4.6, docs/archive/M4.6-plan.md): each fitted to the measured model (costumeFit.ts) and
   hung from the bones it covers, so it follows every clip. The pieces an artifact's own model makes (a lantern at the hip)
   are in costume.ts. */
import * as THREE from 'three';
import { glowShared, markShared, mergeStill } from '../render/materials';
import { glowTone, tone } from '../world/kitParts';
import { bakeOnHead, hang, offSide, onHead, sideX, wrist, type Fit, type Side } from './costumeFit';
import type { CostumeId, Worn } from './costumeData';
import { TRANSFORM_BUILD } from './transformPieces';
import { ARC_BUILD } from './arcPieces';

const wool = markShared(new THREE.MeshStandardMaterial({ color: 0x4e1a25, roughness: 1, emissive: 0x140508 }));
const lining = markShared(new THREE.MeshStandardMaterial({ color: 0x2a1014, roughness: 1, side: THREE.BackSide }));
const trim = markShared(new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8, emissive: 0x140e06 }));

const shell = (geo: THREE.BufferGeometry) => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, wool), new THREE.Mesh(geo, lining));
  return g;
};

export const BUILD: Record<CostumeId, (f: Fit, w: Worn) => THREE.Object3D[]> = {
  ...TRANSFORM_BUILD,
  ...ARC_BUILD, // (M4.6: the transformations' looks, transformPieces.ts; Azyrion's arc, arcPieces.ts)
  /** A pilgrim's hood: a cowl round the head, open at the face, with a long tail down the back (a liripipe),
      and a short dagged mantle over the shoulders. */
  hood(f) {
    const open = 0.8 * Math.PI,
      edge = 0.4 * Math.PI,
      low = 0.8 * Math.PI; // face opening; where the cap ends; the cowl's hem
    // the cowl: a cap and a skirt round the head, drawn up into a soft peak at the back and falling in folds
    const peak = new THREE.Vector3(0, 0.75, -0.66).normalize(),
      n = new THREE.Vector3();
    const drape = (geo: THREE.BufferGeometry) => {
      const pos = geo.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        n.fromBufferAttribute(pos, k).normalize();
        const theta = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1));
        const fold = theta > edge ? 0.045 * Math.sin(Math.atan2(n.z, n.x) * 9) * Math.min(1, (theta - edge) / 0.3) : 0;
        n.multiplyScalar(1 + 0.45 * Math.max(0, n.dot(peak)) ** 6 + fold);
        pos.setXYZ(k, n.x, n.y, n.z);
      }
      return geo;
    };
    const cowl = new THREE.Group();
    cowl.add(shell(onHead(drape(new THREE.SphereGeometry(1, 32, 10, 0, Math.PI * 2, 0, edge)), f)));
    cowl.add(
      shell(
        onHead(
          drape(new THREE.SphereGeometry(1, 32, 8, Math.PI / 2 + open / 2, Math.PI * 2 - open, edge, low - edge)),
          f,
        ),
      ),
    );
    // a rolled edge round the face opening: up one side, across the brow, down the other
    const onSphere = (phi: number, theta: number) =>
      new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
    const a0 = Math.PI / 2 - open / 2,
      a1 = Math.PI / 2 + open / 2,
      rimPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 4; i++) rimPts.push(onSphere(a0, low - ((low - edge) * i) / 4));
    for (let i = 1; i < 8; i++) rimPts.push(onSphere(a0 + ((a1 - a0) * i) / 8, edge));
    for (let i = 0; i <= 4; i++) rimPts.push(onSphere(a1, edge + ((low - edge) * i) / 4));
    cowl.add(
      new THREE.Mesh(onHead(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts), 40, 0.06, 5, false), f), trim),
    );
    // the tail (a liripipe), hanging down the back and tapering
    const path = new THREE.CatmullRomCurve3(
      [
        [0, 0.55, -0.8],
        [0, 0.1, -1.06],
        [0, -0.4, -1.12],
        [0, -0.95, -1.02],
      ].map((q) => new THREE.Vector3(...q)),
    );
    const tail = new THREE.TubeGeometry(path, 12, 0.22, 8, false);
    const tp = tail.attributes.position,
      c = new THREE.Vector3(),
      q = new THREE.Vector3();
    for (let i = 0; i <= 12; i++) {
      path.getPointAt(i / 12, c);
      for (let j = 0; j <= 8; j++) {
        const k = i * 9 + j;
        q.fromBufferAttribute(tp, k)
          .sub(c)
          .multiplyScalar(1 - (0.85 * i) / 12)
          .add(c);
        tp.setXYZ(k, q.x, q.y, q.z);
      }
    }
    cowl.add(shell(onHead(tail, f)));
    // the mantle: a cone round the neck, flaring over the shoulders, with a dagged hem
    const { box } = f.head,
      ch = f.chest,
      cc = ch.getCenter(new THREE.Vector3()),
      cs = ch.getSize(new THREE.Vector3());
    const top = box.min.y + (box.max.y - box.min.y) * 0.12,
      bottom = Math.min(top - 0.12, cc.y - cs.y * 0.15);
    const mantle = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true),
      mp = mantle.attributes.position;
    for (let k = 0; k < mp.count; k++) {
      const up = mp.getY(k) > 0,
        a = Math.atan2(mp.getZ(k), mp.getX(k)),
        tooth = (k % 2) * 0.05;
      const rx = up ? f.head.radii.x * 0.55 : Math.max(cs.x * 0.5, f.head.radii.x * 0.8) * 1.08,
        rz = up ? f.head.radii.z * 0.5 : Math.max(cs.z * 0.5, f.head.radii.z * 0.6) * 1.25;
      mp.setXYZ(k, cc.x + rx * Math.cos(a), up ? top : bottom - tooth, cc.z + rz * Math.sin(a));
    }
    mantle.computeVertexNormals();
    return [hang(f.headAt, cowl), hang(f.chestAt, shell(mantle))];
  },

  /** The Crown of Thorns: a twisted ring of thorns round the brow; cursed, it bleeds; cleansed, its thorns flower. */
  thorns(f, w) {
    const g = new THREE.Group(),
      vine = tone(0x3a2418, 0.2),
      at = 0.36; // (where on the head: the brow, a little above the eyes)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1 - at * at) * 1.04, 0.06, 5, 22), vine);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = at;
    const twist = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1 - at * at) * 1.06, 0.035, 4, 22), vine);
    twist.rotation.set(Math.PI / 2, 0.12, 0);
    twist.position.y = at + 0.03;
    g.add(ring, twist);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2,
        r = Math.sqrt(1 - at * at) * 1.07,
        out = new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a)).normalize();
      const bloom = w.cleansed && i % 3 === 0;
      const m = new THREE.Mesh(
        bloom ? new THREE.SphereGeometry(0.07, 6, 4) : new THREE.ConeGeometry(0.035, 0.2, 4),
        bloom ? tone(0xf4ece0) : vine,
      );
      m.position.set(Math.cos(a) * r, at + 0.05, Math.sin(a) * r).addScaledVector(out, 0.06);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
      g.add(m);
      if (w.cursed && i % 4 === 1) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), glowTone(0x9a1010));
        d.position.set(Math.cos(a) * r * 0.98, at - 0.12, Math.sin(a) * r * 0.98);
        g.add(d);
      }
    }
    bakeOnHead(g, f);
    mergeStill(g);
    return [hang(f.headAt, g)];
  },
  /** The Gilded Halo: a ring of gold light floating over the head. */
  halo(f) {
    const g = new THREE.Group(),
      { box, radii, centre } = f.head;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radii.x * 0.56, 0.028, 5, 28), glowTone(0xffd878));
    ring.rotation.x = Math.PI / 2 - 0.25;
    ring.position.set(centre.x, box.max.y + 0.1, centre.z - 0.04);
    g.add(ring);
    mergeStill(g);
    const gl = glowShared(0xffd878, radii.x * 2.4, 0.45);
    gl.position.copy(ring.position);
    g.add(gl);
    return [hang(f.headAt, g)];
  },
  /** The Beastcaller's circlet: a small pair of antlers rising from the temples (the Hart's Antler wore it until
      2026-10-02). */
  antlers(f) {
    const g = new THREE.Group(),
      bone = tone(0xe8dcc0, 0.12),
      at = 0.42;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(Math.sqrt(1 - at * at) * 1.03, 0.035, 4, 20),
      tone(0x8a6a3a, 0.1, 0.3),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = at;
    g.add(ring);
    const tine = (pts: number[][], r: number) => {
      const m = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 8, r, 5, false),
        bone,
      );
      g.add(m);
    };
    for (const s of [-1, 1]) {
      const x = s * 0.7;
      tine(
        [
          [x, 0.55, -0.05],
          [x * 1.25, 0.95, -0.1],
          [x * 1.45, 1.35, -0.2],
          [x * 1.4, 1.7, -0.3],
        ],
        0.07,
      );
      tine(
        [
          [x * 1.27, 1.0, -0.1],
          [x * 1.0, 1.25, 0.15],
          [x * 0.9, 1.45, 0.2],
        ],
        0.045,
      );
      tine(
        [
          [x * 1.43, 1.33, -0.2],
          [x * 1.85, 1.5, -0.15],
          [x * 2.0, 1.7, -0.2],
        ],
        0.04,
      );
    }
    bakeOnHead(g, f);
    mergeStill(g);
    return [hang(f.headAt, g)];
  },
  /** The Mask of the Drowned: a pale sea-glass mask over the face; cursed, it weeps (`drip`); cleansed, it is pushed up
      onto the brow, dry. */
  drownedMask(f, w) {
    const g = new THREE.Group(),
      glaze = tone(0x9ab8b0, 0.08, 0.15),
      dark = tone(0x14201e);
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(1.07, 16, 10, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.3, Math.PI * 0.42),
      glaze,
    ); // (the front of the face: +z)
    g.add(shell); // (a band of the sphere from 0.2 to 0.8 of a half turn round: the front, +z)
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), dark);
      eye.scale.set(1.3, 0.7, 0.3);
      eye.position.set(s * 0.32, 0.12, 1.0);
      g.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.08), dark);
    mouth.position.set(0, -0.38, 0.95);
    g.add(mouth);
    if (w.cleansed) g.rotation.x = -0.75; // (pushed up)
    bakeOnHead(g, f);
    mergeStill(g);
    g.userData.drip = 0x7ac0d0; // (cursed: it weeps sea water, not blood)
    return [hang(f.headAt, g)];
  },
  /** The Bone Lens: a bone-rimmed lens over the off side's eye, on a fine chain to the ear. */
  lens(f) {
    const g = new THREE.Group(),
      s = sideX(offSide());
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 5, 14), tone(0xe8e0c8, 0.1));
    rim.position.set(s * 0.33, 0.12, 1.04);
    g.add(rim);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), glowTone(0xcfe8f0));
    glass.position.set(s * 0.33, 0.12, 1.05);
    g.add(glass);
    for (let i = 1; i < 6; i++) {
      const k = i / 6,
        l = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), tone(0xc49a4a, 0, 0.5));
      l.position.set(s * (0.48 + k * 0.5), 0.1 - Math.sin(k * Math.PI) * 0.25, 1.0 - k * 0.9);
      g.add(l);
    }
    bakeOnHead(g, f);
    mergeStill(g);
    return [hang(f.headAt, g)];
  },
  /** The Last Rite: a funeral stole round the neck and down the front, black while cursed, white once cleansed. */
  stole(f, w) {
    const g = new THREE.Group(),
      cloth = tone(w.cursed ? 0x1a1418 : 0xeee6d8, 0.06),
      mark = tone(w.cursed ? 0x8a1a1a : 0xc49a4a, 0, 0.4);
    const ch = f.chest,
      cc = ch.getCenter(new THREE.Vector3()),
      cs = ch.getSize(new THREE.Vector3()),
      hips = f.hips;
    const neck = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(cs.x * 0.32, 0.12), 0.04, 4, 16, Math.PI * 1.2),
      cloth,
    );
    neck.rotation.set(Math.PI / 2, 0, Math.PI * 0.9);
    neck.position.set(cc.x, ch.max.y + 0.02, cc.z - 0.02);
    g.add(neck);
    const len = ch.max.y - hips.min.y;
    for (const s of [-1, 1]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.09, len, 0.025), cloth);
      band.position.set(cc.x + s * cs.x * 0.2, ch.max.y - len / 2, ch.max.z + 0.03);
      band.rotation.x = -0.06;
      g.add(band);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.015, 0.03), mark);
      cross.position.set(band.position.x, hips.min.y + 0.1, ch.max.z + 0.05);
      g.add(cross);
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.03), mark);
      up.position.copy(cross.position);
      g.add(up);
    }
    mergeStill(g);
    return [hang(f.chestAt, g)];
  },
  /** The Chain of the Penitent: iron cuffs on both wrists; cursed, their chains hang to the floor and drag; cleansed, each
      cuff keeps one broken link. */
  manacles(f, w) {
    const out: THREE.Object3D[] = [],
      iron = tone(0x4a464c, 0.1, 0.5);
    for (const s of ['L', 'R'] as Side[]) {
      const g = new THREE.Group(),
        { pos, q } = wrist(f, s);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.028, 5, 12), iron);
      cuff.position.copy(pos);
      cuff.quaternion.copy(q);
      g.add(cuff);
      mergeStill(g);
      out.push(hang(f.hand[s].at, g));
      // the chain hangs straight down from the cuff whatever the arm does (it follows the wrist: `follow`), to the floor
      // and trailing behind it while cursed; one broken link once cleansed
      const chain = new THREE.Group(),
        drop = pos.y,
        links = w.cursed ? Math.ceil(drop / 0.07) + 4 : 1;
      for (let i = 1; i <= links; i++) {
        const l = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 4, 8), iron),
          down = Math.min(i * 0.07, drop - 0.02),
          trail = Math.max(0, i * 0.07 - drop);
        l.position.set(0, -down, -trail);
        l.rotation.set(trail ? Math.PI / 2 : 0, i % 2 ? Math.PI / 2 : 0, 0);
        chain.add(l);
      }
      mergeStill(chain);
      chain.userData.follow = { side: s, drop }; // (stretched each step to reach the floor from where the wrist is)
      out.push(chain);
    }
    return out;
  },
  /** The Frostbitten Ring: a ring on the off hand, rime creeping over its back in ice crystals. */
  frostRing(f) {
    const s = offSide(),
      g = new THREE.Group(),
      { pos, q, axis } = wrist(f, s),
      ice = glowTone(0xbfe6ff);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 4, 10), tone(0xb8bcc4, 0, 0.6));
    ring.position.copy(pos).addScaledVector(axis, 0.1);
    ring.quaternion.copy(q);
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.025 + (i % 3) * 0.008), ice);
      c.position
        .copy(pos)
        .addScaledVector(axis, 0.02 + i * 0.02)
        .add(new THREE.Vector3(Math.sin(i * 2.4) * 0.04, 0.05, Math.cos(i * 2.4) * 0.04));
      c.scale.y = 1.8;
      g.add(c);
    }
    mergeStill(g);
    const gl = glowShared(0x8fd8ff, 0.3, 0.45);
    gl.position.copy(pos);
    g.add(gl);
    return [hang(f.hand[s].at, g)];
  },
  /** The Warding Band: a blue bracer on the off wrist, a rune of light round it. */
  band(f) {
    const s = offSide(),
      g = new THREE.Group(),
      { pos, q, axis } = wrist(f, s);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.13, 10, 1, true), tone(0x3a5a8a, 0.08, 0.3));
    cuff.position.copy(pos).addScaledVector(axis, -0.09);
    cuff.quaternion.copy(q).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)));
    g.add(cuff);
    const rune = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.012, 4, 14), glowTone(0x8ab8ff));
    rune.position.copy(cuff.position);
    rune.quaternion.copy(q);
    g.add(rune);
    mergeStill(g);
    return [hang(f.hand[s].at, g)];
  },
  /** The Rosary of Haste: prayer beads wound round the off wrist, a small cross hanging from them. */
  beads(f) {
    const s = offSide(),
      g = new THREE.Group(),
      { pos, axis } = wrist(f, s),
      bead = tone(0xd8d0c0, 0.08);
    const u = new THREE.Vector3(0, 1, 0).cross(axis).normalize(),
      v = axis.clone().cross(u).normalize();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 4;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), bead);
      m.position
        .copy(pos)
        .addScaledVector(axis, -0.04 - i * 0.006)
        .addScaledVector(u, Math.cos(a) * 0.08)
        .addScaledVector(v, Math.sin(a) * 0.08);
      g.add(m);
    }
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), tone(0x8a6a3a, 0, 0.4));
    cross.position.copy(pos).add(new THREE.Vector3(0, -0.1, 0));
    g.add(cross);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.02), tone(0x8a6a3a, 0, 0.4));
    bar.position.copy(cross.position).add(new THREE.Vector3(0, 0.02, 0));
    g.add(bar);
    mergeStill(g);
    return [hang(f.hand[s].at, g)];
  },
  /** Pilgrim's Boots: strapped travelling boots over the feet, a folded cuff at the top. */
  boots(f) {
    const out: THREE.Object3D[] = [];
    for (const s of ['L', 'R'] as Side[]) {
      const g = new THREE.Group(),
        leather = tone(0x6a4a30, 0.12),
        strap = tone(0x3a2618, 0.08),
        b = f.foot[s].box,
        c = b.getCenter(new THREE.Vector3()),
        sz = b.getSize(new THREE.Vector3());
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), leather);
      shoe.scale.set(sz.x * 1.25, Math.max(sz.y, 0.08) * 2.2, sz.z * 1.15);
      shoe.position.set(c.x, b.min.y, c.z);
      g.add(shoe);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(sz.x * 0.62, sz.x * 0.58, 0.16, 10, 1, true), leather);
      shaft.position.set(c.x, b.max.y + 0.05, c.z - sz.z * 0.15);
      g.add(shaft);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(sz.x * 0.64, 0.02, 4, 12), strap);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(c.x, b.max.y + 0.13, c.z - sz.z * 0.15);
      g.add(cuff);
      const band = new THREE.Mesh(new THREE.TorusGeometry(sz.x * 0.6, 0.015, 4, 12), strap);
      band.rotation.x = Math.PI / 2;
      band.position.set(c.x, b.max.y, c.z - sz.z * 0.1);
      g.add(band);
      mergeStill(g);
      out.push(hang(f.foot[s].at, g));
    }
    return out;
  },
};
