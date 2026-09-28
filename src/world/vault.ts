/* The locked vault (GDD: Locked vault): a dead end behind a door sealed by a ward. A bone key unbinds the
   ward; glyph blasts can force it (CFG.vault.blastsToForce), but forcing it wakes the vault's warden, a
   champion that rises inside to guard the prize. Inside is an artifact while the floor's budget allows,
   otherwise a hoard of obols and glyphs around a reliquary chest. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Room, VaultSeal } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, disposeTree, glow } from '../render/materials';
import { glyphTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { renderMinimap, toast } from '../ui/hud';
import { offerGuaranteed, placeArtifact } from '../items/artifacts';
import { giveResources, spawnPickup } from '../items/pickups';
import { rollTable } from '../items/loot';
import { FLOORS } from './generate';
import { SIDE_DIR } from './shapes';
import { WARD_COLOR as WARD, freeSpotNear } from './rooms';

/** Fill a vault when the floor is built: the prize on a pedestal, or a hoard around a reliquary chest. */
export function fillVault(room: Room) {
  const def = room.plan.artifact ? offerGuaranteed('vault') : null;
  if (def) { placeArtifact(room, def, room.cx, room.cz); return; }
  spawnPickup('chest', room.cx, room.cz);
  const hoard = rollTable(G.run.drops, 'vaultHoard');
  hoard.forEach((item, i) => {
    const a = .5 + i / hoard.length * Math.PI * 2, p = freeSpotNear(room, room.cx + Math.cos(a) * 1.7, room.cz + Math.sin(a) * 1.3);
    spawnPickup(item, p.x, p.z);
  });
}

/** The ward on the outer side of a vault's door: a turning rune hanging in the doorway, facing the camera
    whichever wall the door is in (above the low south wall), and an iron padlock. */
function sealMark(room: Room, door: VaultSeal['outer']) {
  const [dx, dz] = SIDE_DIR[door.side], south = door.side === 's', g = new THREE.Group();
  g.position.set(door.x - dx * .05 - room.cx, south ? .8 : .62, door.z - dz * .05 - room.cz);
  const rune = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture(), color: WARD, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  rune.scale.setScalar(south ? .8 : 1.05);
  const lock = new THREE.Group(); lock.position.set(0, -.2, .08);
  const body = new THREE.Mesh(new THREE.BoxGeometry(.2, .17, .07), M.iron);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(.065, .018, 5, 12, Math.PI), M.iron); shackle.position.y = .085;
  lock.add(body, shackle);
  g.add(rune, lock, glow(WARD, 1.3, .5));
  room.group.add(g);
  return g;
}

/** Seal every vault on the floor (after the doors are linked): both sides of its doorway stay shut. */
export function sealVaults(rooms: Room[]) {
  for (const vault of rooms) {
    if (vault.type !== 'vault') continue;
    const inner = vault.doors[0], outer = inner?.link;
    if (!outer) continue;
    const seal: VaultSeal = { sealed: true, blasts: 0, vault, inner, outer, outerRoom: inner.nb, mark: sealMark(inner.nb, outer), armed: true };
    for (const d of [inner, outer]) { d.seal = seal; d.open = false; d.bars.position.y = 0; }
  }
}

/** Open the doorway; a forced ward wakes the warden, who rises when the mage comes in. */
function unseal(s: VaultSeal, forced: boolean) {
  s.sealed = false;
  s.outerRoom.group.remove(s.mark); disposeTree(s.mark);
  burst(s.outer.x, .6, s.outer.z, WARD, 22, 2.6, .05);
  s.outer.open = !s.outerRoom.locked; s.inner.open = true; Sfx.door(true);
  if (forced) {
    const v = s.vault, kind = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].vaultWarden;
    v.warden = true; v.cleared = false;
    v.waves = [[{ kind, x: v.cx, z: v.cz + CFG.vault.wardenAt }]];
  }
  renderMinimap();
}

/** Walking up to a sealed vault door: a bone key unbinds it; without one it says what would. */
export function checkVaultDoors() {
  for (const d of G.current.doors) {
    const s = d.seal;
    if (!s?.sealed) continue;
    const dist = Math.hypot(player.x - d.x, player.z - d.z);
    if (dist > player.r + 1.2) { s.armed = true; continue; }
    if (dist > player.r + .45 || !s.armed) continue;
    s.armed = false;
    if (player.keys > 0) { giveResources({ keys: -1 }); Sfx.unlock(); toast(STR.toast.vaultUnbound, 2.5); unseal(s, false); }
    else { Sfx.locked(); toast(STR.toast.vaultSealed, 4.5); s.mark.scale.setScalar(1.25); }
  }
}

/** A glyph's blast reached a sealed vault door: the ward cracks, and breaks on the last blast. */
export function blastSeal(s: VaultSeal) {
  if (!s.sealed) return;
  s.blasts++;
  if (s.blasts < CFG.vault.blastsToForce) {
    Sfx.wardCrack(); toast(STR.toast.wardCracks, 4);
    burst(s.outer.x, .6, s.outer.z, WARD, 10, 2, .04);
    const rune = s.mark.children[0] as THREE.Sprite;
    rune.material.opacity = .45; rune.material.color.setHex(0xc0a0ff); // cracked: dimmer, and tinged
    return;
  }
  Sfx.wardBreak(); toast(STR.toast.vaultForced, 4);
  unseal(s, true);
}

/** The ward marks settle after a flare and turn slowly. */
export function updateVaultSeals(dt: number, now: number) {
  for (const d of G.current.doors) {
    const s = d.seal;
    if (!s?.sealed || d !== s.outer) continue;
    s.mark.scale.setScalar(1 + (s.mark.scale.x - 1) * Math.exp(-6 * dt));
    (s.mark.children[0] as THREE.Sprite).material.rotation = now * .5;
  }
}
