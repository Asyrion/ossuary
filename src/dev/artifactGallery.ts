/* The Galleries tab's artifacts: every one floating ahead of the mage, turning, to look at their looks. */
import * as THREE from 'three';
import type { Room } from '../types';
import { G } from '../state';
import { disposeTree } from '../render/materials';
import { ARTIFACT_DEFS, type ArtifactDef } from '../items/artifactData';
import { makeArtifactVisual } from '../items/artifacts';
import { onDevStep } from '../devDoor';

/** Dev menu: every artifact floating ahead of world (x, z) in `room`, in rows by kind (foci, passives, cursed), to look
    at their looks (they can't be taken). Returns how many. */
export function showArtifactGallery(room: Room, x: number, z: number) {
  removeArtifactGallery(room);
  const g = new THREE.Group(),
    rows = (['focus', 'passive', 'cursed'] as const).flatMap((kind) => {
      const all = ARTIFACT_DEFS.filter((d) => d.kind === kind),
        out: ArtifactDef[][] = [];
      for (let i = 0; i < all.length; i += 12) out.push(all.slice(i, i + 12));
      return out;
    });
  rows.forEach((row, r) =>
    row.forEach((def, i) => {
      const v = makeArtifactVisual(def);
      v.position.set(x - room.cx + (i - (row.length - 1) / 2) * 0.95, 0.8, z - room.cz - 1.4 - r * 0.95);
      g.add(v);
    }),
  );
  room.group.add(g);
  room.group.userData.artifactGallery = g;
  return rows.flat().length;
}
/** Take the artifact gallery away. */
export function removeArtifactGallery(room: Room) {
  const g = room.group.userData.artifactGallery as THREE.Group | undefined;
  if (!g) return;
  room.group.remove(g);
  disposeTree(g);
  delete room.group.userData.artifactGallery;
}
/** Every step: the gallery in the room shown turns, each artifact a little behind the last. */
onDevStep(() => {
  const now = G.simClock;
  (G.current?.group.userData.artifactGallery as THREE.Group | undefined)?.children.forEach((v, i) => {
    v.rotation.y = now * 1.2 + i;
  });
});
