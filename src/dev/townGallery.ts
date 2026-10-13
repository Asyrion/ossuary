/* The Galleries tab's townspeople: the ten freed shades in rows ahead of the mage, gesturing in turn. */
import type * as THREE from 'three';
import { scene } from '../render/renderer';
import { disposeTree } from '../render/materials';
import { shade, SHADE_IDS } from '../vigil/shadeData';
import { moveTown, townLook, type TownLook } from '../vigil/townLooks';
import { onDevStep } from '../devDoor';

const gallery: THREE.Group[] = [];
let gt = 0;
/** The Galleries tab: the ten figures (or those in `only`) in rows ahead of world (x, z), gesturing in turn (for the owner's
    review). */
export function townGallery(x: number, z: number, only?: string[]) {
  takeTownGallery();
  const list = SHADE_IDS.filter((id) => !only || only.includes(id)),
    cols = Math.min(5, list.length);
  list.forEach((id, i) => {
    const look = townLook(id, shade(id).light),
      g = look.group;
    g.position.set(x + ((i % 5) - (cols - 1) / 2) * 1.5, 0, z - 2.2 - Math.floor(i / 5) * 1.9);
    scene.add(g);
    gallery.push(g);
    g.userData.town = look;
  });
  return list.length;
}
/** Each step: the gallery's figures gesture in turn. */
onDevStep((dt) => {
  if (!gallery.length) return;
  gt += dt;
  gallery.forEach((g, i) =>
    moveTown(g.userData.town as TownLook, gt, null, Math.floor(gt / 2) % gallery.length === i, true),
  );
});
export function takeTownGallery() {
  for (const g of gallery) {
    scene.remove(g);
    disposeTree(g);
  }
  gallery.length = 0;
}
