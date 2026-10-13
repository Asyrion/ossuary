/* Secret rooms (GDD: Secret room): a forgotten mage's cell behind cracked walls. Each hidden doorway is a
   stretch of wall with a hairline crack, dust drifting from it now and then. The cantrip divines it: a bolt
   striking a cracked wall rings hollow, with a chime and a puff of dust, and the crack keeps a faint glow. A
   glyph's blast breaks it open, on both sides at once. The room isn't on the minimap until then; inside,
   in pale blue light, lies an artifact from the secret pool (outside the floor's budget) or a hoard with
   coffers and a reliquary chest. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Door, FloorLook, Room, SecretWall, Side } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { boxUV, disposeTree, markShared, wallMaterials } from '../render/materials';
import { crackTexelTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { renderMinimap, toast } from '../ui/hud';
import { offerBeyondBudget, placeArtifact } from '../items/artifacts';
import { spawnPickup } from '../items/pickups';
import { LOOT, rollTable, type Drop } from '../items/loot';
import { soulsHere } from '../items/souls';
import { runeHere } from '../magic/runes';
import { SIDE_DIR } from './shapes';
import { DH, H_LOW, H_TALL, WT } from './dims';
import { WARD_COLOR, freeSpotNear } from './rooms';

const C = CFG.secret;
const isNS = (s: Side) => s === 'n' || s === 's';

/** A secret room's look: the floor's, lit in pale blue. */
export const secretLook = (look: FloorLook): FloorLook => ({
  ...look,
  torch: { ...look.torch, flame: C.flame, light: C.light, intensity: look.torch.intensity * C.torchMul },
});

/** Fill the cell when the floor is built: an artifact on a pedestal, or a hoard with coffers and chests. */
export function fillSecret(room: Room) {
  const def = room.plan.artifact ? offerBeyondBudget('secret') : null;
  if (def) {
    placeArtifact(room, def, room.cx, room.cz);
    return;
  }
  const S = LOOT.secretRoom,
    spot = (x: number, z: number) => freeSpotNear(room, room.cx + x, room.cz + z);
  for (let i = 0; i < S.chests; i++) {
    const p = spot(0, -0.6 + i);
    spawnPickup('chest', p.x, p.z);
  }
  for (let i = 0; i < S.coffers; i++) {
    const p = spot(i % 2 ? 2.4 : -2.4, 0.4);
    spawnPickup('coffer', p.x, p.z);
  }
  const hoard = rollTable(G.run.drops, 'secretHoard', LOOT, soulsHere());
  const laid: Drop[] = runeHere('secret') ? [...hoard, 'rune'] : hoard; // (M6 step 8: half the cells keep a rune, on the runes' own stream, in the hoard's ring)
  laid.forEach((item, i) => {
    const a = 0.3 + (i / laid.length) * Math.PI * 2,
      p = spot(Math.cos(a) * 1.6, Math.sin(a) * 1.2 + 0.3);
    spawnPickup(item, p.x, p.z);
  });
}

/* ---------- cracked walls ---------- */

const crackMats = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
/** The crack's dark lines, one material per picture (the crack in texels, one for each size). */
const crackMat = (map: THREE.Texture) =>
  crackMats.get(map) ??
  crackMats
    .set(
      map,
      markShared(
        new THREE.MeshBasicMaterial({ map, color: 0x120e0b, transparent: true, depthWrite: false, opacity: 0.85 }),
      ),
    )
    .get(map)!;
const planeGeo = (() => {
  const g = new THREE.PlaneGeometry(1, 1);
  g.userData.shared = true;
  return g;
})();

/** A hidden doorway on `side` of `room` whose middle (on the inside edge) is at (x, z): the wall carries on
    across it, with a crack on its inner face and its top (the side the camera sees of low and side walls). */
export function buildCrackedWall(room: Room, side: Side, nb: Room, x: number, z: number): Door {
  const [dx, dz] = SIDE_DIR[side],
    ns = isNS(side),
    h = side === 's' ? H_LOW : H_TALL;
  const wx = x + (dx * WT) / 2,
    wz = z + (dz * WT) / 2; // the doorway's centre on the wall's centre line
  const plug = new THREE.Group();
  plug.position.set(wx - room.cx, 0, wz - room.cz);
  const wall = new THREE.Mesh(
    ns ? boxUV(DH * 2, h, WT) : boxUV(WT, h, DH * 2),
    wallMaterials(room.look.wall, room.look.kinds.wall),
  );
  wall.position.y = h / 2; // (in the bricks of the walls round it)
  const [TX, TY] = CFG.roomKit.texel; // (the crack in whole texels, as the bricks)
  const glowMat = (map: THREE.Texture) =>
    new THREE.MeshBasicMaterial({
      map,
      color: WARD_COLOR,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
  const glows: THREE.MeshBasicMaterial[] = [];
  const decal = (w: number, hh: number, place: (m: THREE.Mesh) => void) => {
    const map = crackTexelTexture(Math.round(w * TX), Math.round(hh * TY)),
      glow = glowMat(map);
    for (const mat of [crackMat(map), glow]) {
      const m = new THREE.Mesh(planeGeo, mat);
      m.scale.set(w, hh, 1);
      place(m);
      plug.add(m);
    }
    glows.push(glow);
  };
  // on the inner face, facing into the room
  decal(DH * 2 * 0.9, h * 0.9, (m) => {
    m.position.set(-dx * (WT / 2 + 0.012), h / 2, -dz * (WT / 2 + 0.012));
    m.rotation.y = Math.atan2(-dx, -dz);
  });
  // on the top, running along the wall
  decal(DH * 2 * 0.9, WT * 0.8, (m) => {
    m.position.y = h + 0.006;
    m.rotation.x = -Math.PI / 2;
    if (!ns) m.rotation.z = Math.PI / 2;
  });
  plug.add(wall);
  room.group.add(plug);
  const secret: SecretWall = {
    room,
    open: false,
    divined: false,
    plug,
    glow: glows,
    dust: Math.random() * C.dustEvery[1],
  };
  return {
    side,
    nb,
    x,
    z,
    bars: new THREE.Group(),
    barH: h,
    open: false,
    style: 'secret',
    secret,
    box: { x: wx, z: wz, hx: ns ? DH : WT / 2, hz: ns ? WT / 2 : DH },
  };
}

/** Where the crack is, in the world: the middle of the wall's inner face. */
const crackAt = (d: Door) => {
  const [dx, dz] = SIDE_DIR[d.side];
  return { x: d.x - dx * 0.05, z: d.z - dz * 0.05, y: d.side === 's' ? H_LOW * 0.8 : 1 };
};

/** A bolt struck a cracked wall: it rings hollow, and the crack keeps a faint glow on both sides. */
export function hollowRing(d: Door, x: number, z: number) {
  const s = d.secret;
  if (!s || s.open) return;
  burst(x, 0.6, z, 0x9a9080, 8, 1.2, 0.05);
  burst(x, 0.6, z, WARD_COLOR, 4, 1, 0.03);
  Sfx.hollow();
  if (!s.divined) toast(STR.toast.hollow, 3);
  for (const w of [s, d.link?.secret]) if (w) w.divined = true;
}

/** A glyph's blast reached a cracked wall: the doorway opens on both sides, and the secret room is found. */
export function openSecret(d: Door) {
  const s = d.secret;
  if (!s || s.open) return;
  for (const door of [d, d.link]) {
    const w = door?.secret;
    if (!door || !w) continue;
    w.open = true;
    door.open = true;
    w.room.group.remove(w.plug);
    disposeTree(w.plug);
    const c = crackAt(door);
    burst(c.x, 0.6, c.z, 0x6b625a, 18, 2.4, 0.09);
    burst(c.x, 0.4, c.z, 0x9a9080, 12, 1.2, 0.07);
  }
  Sfx.crumble();
  G.shake = Math.max(G.shake, 0.25);
  const cell = [d.secret!.room, d.link?.secret?.room].find((r) => r?.type === 'secret');
  if (cell && !cell.found) {
    cell.found = true;
    cell.known = true;
    Sfx.secretFound();
    toast(STR.toast.secretFound, 3);
  }
  renderMinimap();
}

/** Open every hidden doorway of the floor's secret room (dev menu). */
export function openSecretRoom(room: Room) {
  for (const d of room.doors) openSecret(d);
}
/** Divine every cracked wall on the floor (dev menu). */
export function revealCracks() {
  for (const r of G.rooms) for (const d of r.doors) if (d.secret) d.secret.divined = true;
}

/** The Grave Lantern: the room's cracked walls glow at once, and ring hollow from anywhere in the room. */
function lanternReveal(room: Room) {
  let found = false;
  for (const d of room.doors) {
    const s = d.secret;
    if (!s || s.open || s.divined) continue;
    for (const w of [s, d.link?.secret]) if (w) w.divined = true;
    const c = crackAt(d);
    burst(c.x, c.y, c.z, WARD_COLOR, 8, 1.2, 0.04);
    burst(c.x, c.y, c.z, 0x9a9080, 6, 0.8, 0.05);
    found = true;
  }
  if (found) {
    Sfx.hollow();
    toast(STR.toast.lanternFinds, 3);
  }
}

/** Dust drifts from the current room's cracked walls now and then; divined cracks glow, breathing slowly. */
export function updateSecretWalls(dt: number, now: number) {
  if (player.stats.effects.has('graveLantern') && G.state === 'play' && !G.trans) lanternReveal(G.current);
  for (const d of G.current.doors) {
    const s = d.secret;
    if (!s || s.open) continue;
    s.dust -= dt;
    if (s.dust <= 0) {
      s.dust = C.dustEvery[0] + Math.random() * (C.dustEvery[1] - C.dustEvery[0]);
      const c = crackAt(d);
      burst(c.x + (Math.random() - 0.5) * 0.8, c.y, c.z, 0x8a8278, 3, 0.35, 0.035);
    }
    const target = s.divined ? 0.45 + Math.sin(now * 2.2) * 0.15 : 0;
    for (const m of s.glow) m.opacity += (target - m.opacity) * Math.min(1, dt * 4);
  }
}
