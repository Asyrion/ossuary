/* The townspeople's figures (M7 step 7; docs/M7-plan.md, decision 11): the ten freed shades standing at the Vigil, built in
   code in one shade's material (pale and glowing in each one's own light from data/shades.json, as the chained shades
   are), so each is plainly the shade met in chains, standing now. Each has its own silhouette from what it was
   in life (the storm caller's crook, the wizard's leafy staff, the forager's bow and basket, the scribe's book, the sexton's
   spade, the chorister's raised hands, the bell-ringer's bell, the novice's candle, the embalmer's apron and jars, the
   pilgrim's hat and bundle). What moves is kept apart: its head (it turns to the mage), its arms (a gesture as it speaks)
   and the glint over it while it has something unheard to say. */
import * as THREE from 'three';
import { blob, glow, mergeStill } from '../render/materials';
import { MAT, mesh } from '../world/kitParts';

/** A townsperson's shade: its own light in its robes (fuller than a chained shade's pale, and solid, so the silhouette and
    its folds read, outlined and banded by the pixel look), its props a darker tone of the same. */
const shadeMat = (light: string, depth: number) =>
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(light).lerp(new THREE.Color(0xd8dce8), 0.35).multiplyScalar(depth),
    emissive: new THREE.Color(light).multiplyScalar(depth),
    emissiveIntensity: 0.38,
    roughness: 0.9,
  });
const lathe = (pts: number[][], n = 10) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => new THREE.Vector2(x, y)),
    n,
  );
const cyl = (r0: number, r1: number, h: number, n = 7) => new THREE.CylinderGeometry(r0, r1, h, n);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const ball = (r: number) => new THREE.SphereGeometry(r, 8, 6);

export interface TownLook {
  group: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  glint: THREE.Sprite;
  mat: THREE.MeshStandardMaterial;
  id: string;
}

/** An arm hung from the shoulder at (x, y): a sleeve reaching down, turned by its group (a gesture rotates it). */
function arm(parent: THREE.Group, mat: THREE.Material, x: number, y: number, len = 0.44) {
  const a = new THREE.Group();
  a.position.set(x, y, 0.02);
  parent.add(a);
  mesh(a, cyl(0.05, 0.07, len), mat, 0, -len / 2, 0);
  mesh(a, ball(0.05), mat, 0, -len, 0); // (the hand)
  return a;
}

/** A townsperson's figure, by its id (data/shades.json), in its light. */
export function townLook(id: string, light: string): TownLook {
  const g = new THREE.Group(),
    body = new THREE.Group(),
    mat = shadeMat(light, 1),
    dim = shadeMat(light, 0.62);
  g.add(body);
  const col = new THREE.Color(light).getHex();
  let h = 1.0,
    wide = 1,
    stoop = 0;
  if (id === 'sexton') wide = 1.25;
  else if (id === 'chorister') wide = 0.85;
  else if (id === 'novice') {
    h = 0.8;
    wide = 0.9;
  } else if (id === 'scribe') stoop = 0.22;
  mesh(
    body,
    lathe([
      [0.3 * wide, 0],
      [0.28 * wide, h * 0.3],
      [0.21 * wide, h * 0.7],
      [0.15 * wide, h * 0.92],
      [0.06, h],
    ]),
    mat,
  );
  mesh(body, box(0.46 * wide, 0.12, 0.2), mat, 0, h * 0.9, 0); // (the shoulders)
  body.rotation.x = stoop;
  const head = new THREE.Group();
  head.position.set(0, h + 0.1, stoop * 0.3);
  g.add(head);
  mesh(head, ball(0.14).scale(1, 1.1, 1.05), mat);
  mesh(head, box(0.15, 0.12, 0.03), MAT.socket, 0, -0.01, 0.13);
  const hooded = !['wizard', 'pilgrim', 'stormcaller'].includes(id);
  if (hooded) mesh(head, new THREE.ConeGeometry(0.12, 0.24, 8).rotateX(-0.45), mat, 0, 0.12, -0.07);
  const armL = arm(g, mat, -0.24 * wide, h * 0.88),
    armR = arm(g, mat, 0.24 * wide, h * 0.88);
  armL.rotation.z = -0.12;
  armR.rotation.z = 0.12;
  // what each carries and wears
  switch (id) {
    case 'stormcaller': {
      // a wide-brimmed hood and a tall staff with a crackling crook
      mesh(head, cyl(0.32, 0.34, 0.03, 12), mat, 0, 0.08, 0);
      mesh(head, new THREE.ConeGeometry(0.15, 0.3, 8), mat, 0, 0.22, -0.02);
      armR.rotation.x = -0.3;
      mesh(armR, cyl(0.025, 0.03, 1.6, 5), dim, 0, 0.2, 0.06);
      mesh(armR, new THREE.TorusGeometry(0.1, 0.02, 4, 10, Math.PI * 1.4), dim, -0.08, 1.0, 0.06);
      const spark = glow(0xf0e070, 0.6, 0.9);
      spark.position.set(-0.1, 1.0, 0.06);
      armR.add(spark);
      break;
    }
    case 'wizard': {
      // a long beard, bare-headed, a staff grown with leaves
      mesh(head, new THREE.ConeGeometry(0.1, 0.36, 7).rotateX(Math.PI), mat, 0, -0.24, 0.08);
      mesh(head, ball(0.15).scale(1.05, 0.7, 1.05), dim, 0, 0.07, -0.02); // (its hair)
      armR.rotation.x = -0.25;
      mesh(armR, cyl(0.03, 0.035, 1.5, 5), dim, 0, 0.2, 0.06);
      for (let k = 0; k < 5; k++)
        mesh(
          armR,
          ball(0.06).scale(1.4, 0.6, 1),
          mat,
          Math.cos(k * 1.3) * 0.08,
          0.85 + k * 0.05,
          0.06 + Math.sin(k * 1.3) * 0.08,
        );
      break;
    }
    case 'forager': {
      // a short hooded cloak, a bow on the back, a basket at the hip
      mesh(
        body,
        lathe([
          [0.34, h * 0.45],
          [0.3, h * 0.7],
          [0.2, h * 0.92],
        ]),
        dim,
      );
      mesh(
        body,
        new THREE.TorusGeometry(0.42, 0.02, 4, 12, Math.PI).rotateZ(Math.PI / 2 + 0.2),
        dim,
        -0.05,
        h * 0.55,
        -0.22,
      );
      mesh(g, cyl(0.12, 0.09, 0.16, 8), dim, 0.3, h * 0.35, 0.1);
      break;
    }
    case 'scribe': {
      // stooped over an open book, a quill in hand
      armL.rotation.x = armR.rotation.x = -1.0;
      armL.rotation.z = 0.25;
      armR.rotation.z = -0.25;
      mesh(armL, box(0.2, 0.025, 0.26).rotateZ(0.25), MAT.wax, 0.1, -0.42, 0.08);
      mesh(armR, box(0.2, 0.025, 0.26).rotateZ(-0.25), MAT.wax, -0.1, -0.42, 0.08);
      mesh(armR, new THREE.ConeGeometry(0.012, 0.2, 4), dim, 0.02, -0.36, 0.14);
      break;
    }
    case 'sexton': {
      // broad, a spade over the shoulder, a lantern in the other hand
      armR.rotation.x = -2.4;
      mesh(armR, cyl(0.025, 0.025, 1.1, 5), dim, 0, -0.3, 0);
      mesh(armR, box(0.18, 0.22, 0.03), MAT.iron, 0, -0.9, 0);
      mesh(armL, box(0.1, 0.14, 0.1), MAT.iron, 0, -0.52, 0);
      const lamp = glow(0xffc870, 0.55, 0.9);
      lamp.position.set(0, -0.52, 0);
      armL.add(lamp);
      break;
    }
    case 'chorister': {
      // slim, hands raised, singing
      armL.rotation.set(-0.2, 0, -2.4);
      armR.rotation.set(-0.2, 0, 2.4);
      mesh(head, ball(0.035), MAT.socket, 0, -0.06, 0.14);
      break;
    }
    case 'bellringer': {
      // a hand bell held up, a coil of rope at the belt
      armR.rotation.x = -1.2;
      mesh(armR, new THREE.ConeGeometry(0.13, 0.2, 10), MAT.bronze, 0, -0.56, 0);
      mesh(armR, cyl(0.015, 0.015, 0.12, 4), MAT.bronze, 0, -0.42, 0);
      mesh(armR, ball(0.04), MAT.bronze, 0, -0.68, 0);
      mesh(body, new THREE.TorusGeometry(0.13, 0.035, 4, 10).rotateX(Math.PI / 2), dim, 0.14, h * 0.42, 0.2);
      break;
    }
    case 'novice': {
      // small, a candle held before it
      armL.rotation.x = armR.rotation.x = -0.9;
      armL.rotation.z = 0.35;
      armR.rotation.z = -0.35;
      mesh(armR, cyl(0.03, 0.03, 0.14), MAT.wax, -0.1, -0.42, 0.1);
      const flame = glow(0xffd070, 0.45, 0.9);
      flame.position.set(-0.1, -0.32, 0.1);
      armR.add(flame);
      break;
    }
    case 'embalmer': {
      // a long apron, jars at the belt
      mesh(body, box(0.36, h * 0.72, 0.03), dim, 0, h * 0.38, 0.25);
      for (const x of [-0.18, 0, 0.18]) mesh(body, cyl(0.04, 0.045, 0.1, 6), MAT.wax, x, h * 0.48, 0.27);
      break;
    }
    case 'pilgrim': {
      // a wide hat, a walking staff, a bundle on the back
      mesh(head, cyl(0.34, 0.34, 0.03, 12), mat, 0, 0.1, 0);
      mesh(head, cyl(0.12, 0.15, 0.14, 10), mat, 0, 0.18, 0);
      armL.rotation.x = -0.2;
      mesh(armL, cyl(0.025, 0.03, 1.4, 5), dim, 0, 0.1, 0.05);
      mesh(body, ball(0.2).scale(1, 0.85, 0.8), dim, 0, h * 0.78, -0.24);
      break;
    }
  }
  const glint = glow(col, 0.5, 0.9);
  glint.position.y = h + 0.55;
  glint.visible = false;
  g.add(glint);
  const aura = glow(col, 1.25, 0.22);
  aura.position.y = h * 0.75;
  g.add(aura);
  g.add(blob(0.9));
  g.userData.parts = { head, armL, armR, glint };
  mergeStill(g);
  return { group: g, head, armL, armR, glint, mat, id };
}

/** Each step: it sways a little, its head turns to the mage (`toMage`, an angle in its own frame, or null), it gestures as
    it speaks, and its glint pulses while it has something unheard. */
export function moveTown(t: TownLook, time: number, toMage: number | null, talking: boolean, glint: boolean) {
  const k = t.id.length;
  t.group.rotation.z = Math.sin(time * 0.9 + k) * 0.025;
  const want = toMage === null ? 0 : Math.max(-1.1, Math.min(1.1, toMage));
  t.head.rotation.y += (want - t.head.rotation.y) * 0.08;
  const rest = (t.armR.userData.rest ??= { x: t.armR.rotation.x, z: t.armR.rotation.z }) as { x: number; z: number };
  t.armR.rotation.x = rest.x + (talking ? Math.sin(time * 5) * 0.25 - 0.3 : 0);
  t.glint.visible = glint;
  if (glint) {
    const s = 0.4 + Math.sin(time * 3 + k) * 0.1;
    t.glint.scale.set(s, s, 1);
  }
}
