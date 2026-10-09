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
const shadeMat = (light: string, depth: number) => new THREE.MeshStandardMaterial({
  color: new THREE.Color(light).lerp(new THREE.Color(0xd8dce8), .35).multiplyScalar(depth), emissive: new THREE.Color(light).multiplyScalar(depth),
  emissiveIntensity: .38, roughness: .9,
});
const lathe = (pts: number[][], n = 10) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), n);
const cyl = (r0: number, r1: number, h: number, n = 7) => new THREE.CylinderGeometry(r0, r1, h, n);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const ball = (r: number) => new THREE.SphereGeometry(r, 8, 6);

export interface TownLook { group: THREE.Group; head: THREE.Group; armL: THREE.Group; armR: THREE.Group; glint: THREE.Sprite; mat: THREE.MeshStandardMaterial; id: string }

/** An arm hung from the shoulder at (x, y): a sleeve reaching down, turned by its group (a gesture rotates it). */
function arm(parent: THREE.Group, mat: THREE.Material, x: number, y: number, len = .44) {
  const a = new THREE.Group(); a.position.set(x, y, .02); parent.add(a);
  mesh(a, cyl(.05, .07, len), mat, 0, -len / 2, 0);
  mesh(a, ball(.05), mat, 0, -len, 0); // (the hand)
  return a;
}

/** A townsperson's figure, by its id (data/shades.json), in its light. */
export function townLook(id: string, light: string): TownLook {
  const g = new THREE.Group(), body = new THREE.Group(), mat = shadeMat(light, 1), dim = shadeMat(light, .62);
  g.add(body);
  const col = new THREE.Color(light).getHex();
  let h = 1.0, wide = 1, stoop = 0;
  if (id === 'sexton') wide = 1.25; else if (id === 'chorister') wide = .85; else if (id === 'novice') { h = .8; wide = .9; } else if (id === 'scribe') stoop = .22;
  mesh(body, lathe([[.3 * wide, 0], [.28 * wide, h * .3], [.21 * wide, h * .7], [.15 * wide, h * .92], [.06, h]]), mat);
  mesh(body, box(.46 * wide, .12, .2), mat, 0, h * .9, 0); // (the shoulders)
  body.rotation.x = stoop;
  const head = new THREE.Group(); head.position.set(0, h + .1, stoop * .3); g.add(head);
  mesh(head, ball(.14).scale(1, 1.1, 1.05), mat);
  mesh(head, box(.15, .12, .03), MAT.socket, 0, -.01, .13);
  const hooded = !['wizard', 'pilgrim', 'stormcaller'].includes(id);
  if (hooded) mesh(head, new THREE.ConeGeometry(.12, .24, 8).rotateX(-.45), mat, 0, .12, -.07);
  const armL = arm(g, mat, -.24 * wide, h * .88), armR = arm(g, mat, .24 * wide, h * .88);
  armL.rotation.z = -.12; armR.rotation.z = .12;
  // what each carries and wears
  switch (id) {
    case 'stormcaller': { // a wide-brimmed hood and a tall staff with a crackling crook
      mesh(head, cyl(.32, .34, .03, 12), mat, 0, .08, 0); mesh(head, new THREE.ConeGeometry(.15, .3, 8), mat, 0, .22, -.02);
      armR.rotation.x = -.3; mesh(armR, cyl(.025, .03, 1.6, 5), dim, 0, .2, .06); mesh(armR, new THREE.TorusGeometry(.1, .02, 4, 10, Math.PI * 1.4), dim, -.08, 1.0, .06);
      const spark = glow(0xf0e070, .6, .9); spark.position.set(-.1, 1.0, .06); armR.add(spark); break;
    }
    case 'wizard': { // a long beard, bare-headed, a staff grown with leaves
      mesh(head, new THREE.ConeGeometry(.1, .36, 7).rotateX(Math.PI), mat, 0, -.24, .08);
      mesh(head, ball(.15).scale(1.05, .7, 1.05), dim, 0, .07, -.02); // (its hair)
      armR.rotation.x = -.25; mesh(armR, cyl(.03, .035, 1.5, 5), dim, 0, .2, .06);
      for (let k = 0; k < 5; k++) mesh(armR, ball(.06).scale(1.4, .6, 1), mat, Math.cos(k * 1.3) * .08, .85 + k * .05, .06 + Math.sin(k * 1.3) * .08); break;
    }
    case 'forager': { // a short hooded cloak, a bow on the back, a basket at the hip
      mesh(body, lathe([[.34, h * .45], [.3, h * .7], [.2, h * .92]]), dim);
      mesh(body, new THREE.TorusGeometry(.42, .02, 4, 12, Math.PI).rotateZ(Math.PI / 2 + .2), dim, -.05, h * .55, -.22);
      mesh(g, cyl(.12, .09, .16, 8), dim, .3, h * .35, .1); break;
    }
    case 'scribe': { // stooped over an open book, a quill in hand
      armL.rotation.x = armR.rotation.x = -1.0; armL.rotation.z = .25; armR.rotation.z = -.25;
      mesh(armL, box(.2, .025, .26).rotateZ(.25), MAT.wax, .1, -.42, .08); mesh(armR, box(.2, .025, .26).rotateZ(-.25), MAT.wax, -.1, -.42, .08);
      mesh(armR, new THREE.ConeGeometry(.012, .2, 4), dim, .02, -.36, .14); break;
    }
    case 'sexton': { // broad, a spade over the shoulder, a lantern in the other hand
      armR.rotation.x = -2.4; mesh(armR, cyl(.025, .025, 1.1, 5), dim, 0, -.3, 0); mesh(armR, box(.18, .22, .03), MAT.iron, 0, -.9, 0);
      mesh(armL, box(.1, .14, .1), MAT.iron, 0, -.52, 0); const lamp = glow(0xffc870, .55, .9); lamp.position.set(0, -.52, 0); armL.add(lamp); break;
    }
    case 'chorister': { // slim, hands raised, singing
      armL.rotation.set(-.2, 0, -2.4); armR.rotation.set(-.2, 0, 2.4);
      mesh(head, ball(.035), MAT.socket, 0, -.06, .14); break;
    }
    case 'bellringer': { // a hand bell held up, a coil of rope at the belt
      armR.rotation.x = -1.2; mesh(armR, new THREE.ConeGeometry(.13, .2, 10), MAT.bronze, 0, -.56, 0); mesh(armR, cyl(.015, .015, .12, 4), MAT.bronze, 0, -.42, 0); mesh(armR, ball(.04), MAT.bronze, 0, -.68, 0);
      mesh(body, new THREE.TorusGeometry(.13, .035, 4, 10).rotateX(Math.PI / 2), dim, .14, h * .42, .2); break;
    }
    case 'novice': { // small, a candle held before it
      armL.rotation.x = armR.rotation.x = -.9; armL.rotation.z = .35; armR.rotation.z = -.35;
      mesh(armR, cyl(.03, .03, .14), MAT.wax, -.1, -.42, .1); const flame = glow(0xffd070, .45, .9); flame.position.set(-.1, -.32, .1); armR.add(flame); break;
    }
    case 'embalmer': { // a long apron, jars at the belt
      mesh(body, box(.36, h * .72, .03), dim, 0, h * .38, .25);
      for (const x of [-.18, 0, .18]) mesh(body, cyl(.04, .045, .1, 6), MAT.wax, x, h * .48, .27); break;
    }
    case 'pilgrim': { // a wide hat, a walking staff, a bundle on the back
      mesh(head, cyl(.34, .34, .03, 12), mat, 0, .1, 0); mesh(head, cyl(.12, .15, .14, 10), mat, 0, .18, 0);
      armL.rotation.x = -.2; mesh(armL, cyl(.025, .03, 1.4, 5), dim, 0, .1, .05);
      mesh(body, ball(.2).scale(1, .85, .8), dim, 0, h * .78, -.24); break;
    }
  }
  const glint = glow(col, .5, .9); glint.position.y = h + .55; glint.visible = false; g.add(glint);
  const aura = glow(col, 1.25, .22); aura.position.y = h * .75; g.add(aura);
  g.add(blob(.9));
  g.userData.parts = { head, armL, armR, glint }; mergeStill(g);
  return { group: g, head, armL, armR, glint, mat, id };
}

/** Each step: it sways a little, its head turns to the mage (`toMage`, an angle in its own frame, or null), it gestures as
    it speaks, and its glint pulses while it has something unheard. */
export function moveTown(t: TownLook, time: number, toMage: number | null, talking: boolean, glint: boolean) {
  const k = t.id.length;
  t.group.rotation.z = Math.sin(time * .9 + k) * .025;
  const want = toMage === null ? 0 : Math.max(-1.1, Math.min(1.1, toMage));
  t.head.rotation.y += (want - t.head.rotation.y) * .08;
  const rest = t.armR.userData.rest ??= { x: t.armR.rotation.x, z: t.armR.rotation.z };
  t.armR.rotation.x = rest.x + (talking ? Math.sin(time * 5) * .25 - .3 : 0);
  t.glint.visible = glint; if (glint) { const s = .4 + Math.sin(time * 3 + k) * .1; t.glint.scale.set(s, s, 1); }
}
