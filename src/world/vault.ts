/* The locked vault (GDD: Locked vault): a dead end behind a door sealed by a ward. A bone key unbinds the
   ward; glyph blasts can force it (CFG.vault.blastsToForce), but forcing it wakes the vault's warden, a
   champion that rises inside to guard the prize. Inside is an artifact while the floor's budget allows,
   otherwise a hoard of obols and glyphs around a reliquary chest.
   M4.2 (the drinking ward, from the Eda lore): the ward also drinks the spells cast near it, filling with their light;
   full, it bursts, and a Wardling of the school it drank most is the vault's warden instead. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Room, VaultSeal } from '../types';
import type { SpellDef } from '../magic/spellData';
import { SCHOOL_LIGHT } from '../render/arcane';
import { strikeFx } from '../magic/spellFx';
import { WARDLING, drink, fullness, mostDrunk, newDrink } from '../magic/drinking';
import type { FoeType } from '../actors/foeData';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, disposeTree, glow } from '../render/materials';
import { padlockLook } from './specialLooks';
import { glyphTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { renderMinimap, toast } from '../ui/hud';
import { offerGuaranteed, placeArtifact } from '../items/artifacts';
import { giveResources, spawnPickup } from '../items/pickups';
import { LOOT, rollTable } from '../items/loot';
import { soulsHere } from '../items/souls';
import { FLOORS } from './generate';
import { SIDE_DIR } from './shapes';
import { WARD_COLOR as WARD, freeSpotNear } from './rooms';

/** Fill a vault when the floor is built: the prize on a pedestal, or a hoard around a reliquary chest. */
export function fillVault(room: Room) {
  const def = room.plan.artifact ? offerGuaranteed('vault') : null;
  if (def) {
    placeArtifact(room, def, room.cx, room.cz);
    return;
  }
  spawnPickup('chest', room.cx, room.cz);
  const hoard = rollTable(G.run.drops, 'vaultHoard', LOOT, soulsHere());
  hoard.forEach((item, i) => {
    const a = 0.5 + (i / hoard.length) * Math.PI * 2,
      p = freeSpotNear(room, room.cx + Math.cos(a) * 1.7, room.cz + Math.sin(a) * 1.3);
    spawnPickup(item, p.x, p.z);
  });
}

/** The ward on the outer side of a vault's door: a turning rune hanging in the doorway, facing the camera
    whichever wall the door is in (above the low south wall), and an iron padlock. */
function sealMark(room: Room, door: VaultSeal['outer']) {
  const [dx, dz] = SIDE_DIR[door.side],
    south = door.side === 's',
    g = new THREE.Group();
  g.position.set(door.x - dx * (dx ? 0.35 : 0.05) - room.cx, south ? 0.8 : 0.62, door.z - dz * 0.05 - room.cz); // (clear of an east or west door's posts)
  const rune = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glyphTexture(),
      color: WARD,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  rune.scale.setScalar(south ? 0.8 : 1.05);
  const lock = DEV.roomKit ? padlockLook(WARD) : new THREE.Group();
  lock.position.set(0, -0.2, 0.08); // (the room kit's: specialLooks.ts)
  if (!DEV.roomKit) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.17, 0.07), M.iron);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 5, 12, Math.PI), M.iron);
    shackle.position.y = 0.085;
    lock.add(body, shackle);
  }
  // the light it has drunk, filling a disc behind the rune (its own material: it takes the colour of what it drank most)
  const cup = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 24),
    new THREE.MeshBasicMaterial({ color: WARD, transparent: true, opacity: 0, depthWrite: false }),
  ); // (not added light: over the rune and its glow it would wash white)
  cup.position.z = -0.03;
  cup.scale.setScalar(0.3);
  g.add(rune, lock, glow(WARD, 1.3, 0.5), cup);
  room.group.add(g);
  return { g, cup };
}

/** Seal every vault on the floor (after the doors are linked): both sides of its doorway stay shut. */
export function sealVaults(rooms: Room[]) {
  for (const vault of rooms) {
    if (vault.type !== 'vault') continue;
    const inner = vault.doors[0],
      outer = inner?.link;
    if (!outer) continue;
    const { g: mark, cup } = sealMark(inner.nb, outer);
    const seal: VaultSeal = {
      sealed: true,
      blasts: 0,
      vault,
      inner,
      outer,
      outerRoom: inner.nb,
      mark,
      cup,
      armed: true,
      drink: newDrink(CFG.ward.need),
    };
    for (const d of [inner, outer]) {
      d.seal = seal;
      d.open = false;
      d.bars.position.y = 0;
    }
  }
}

/** Open the doorway; a forced or burst ward leaves a warden (`guard`), who rises when the mage comes in. */
function unseal(s: VaultSeal, guard?: FoeType) {
  s.sealed = false;
  s.outerRoom.group.remove(s.mark);
  disposeTree(s.mark);
  burst(s.outer.x, 0.6, s.outer.z, WARD, 22, 2.6, 0.05);
  s.outer.open = !s.outerRoom.locked;
  s.inner.open = true;
  Sfx.door(true);
  if (guard) {
    const v = s.vault;
    v.warden = true;
    v.cleared = false;
    v.waves = [[{ kind: guard, role: 'H', x: v.cx, z: v.cz + CFG.vault.wardenAt }]];
  }
  renderMinimap();
}

/** Walking up to a sealed vault door: a bone key unbinds it; without one it says what would. */
export function checkVaultDoors() {
  for (const d of G.current.doors) {
    const s = d.seal;
    if (!s?.sealed) continue;
    const dist = Math.hypot(player.x - d.x, player.z - d.z);
    if (dist > player.r + 1.2) {
      s.armed = true;
      continue;
    }
    if (dist > player.r + 0.45 || !s.armed) continue;
    s.armed = false;
    if (player.stats.effects.has('freeVault') && G.run.freeVault !== G.run.floor) {
      // the Sexton's Keyring, once a floor
      G.run.freeVault = G.run.floor;
      burst(d.x, 0.9, d.z, 0xd8ccb0, 16, 2, 0.05);
      Sfx.unlock();
      toast(STR.toast.keyringTurns, 3);
      unseal(s);
    } else if (player.keys > 0) {
      giveResources({ keys: -1 });
      Sfx.unlock();
      toast(STR.toast.vaultUnbound, 2.5);
      unseal(s);
    } else {
      Sfx.locked();
      toast(STR.toast.vaultSealed, 4.5);
      s.mark.scale.setScalar(1.25);
    }
  }
}

/** A glyph's blast reached a sealed vault door: the ward cracks, and breaks on the last blast. */
export function blastSeal(s: VaultSeal) {
  if (!s.sealed) return;
  s.blasts++;
  if (s.blasts < CFG.vault.blastsToForce) {
    Sfx.wardCrack();
    toast(STR.toast.wardCracks, 4);
    burst(s.outer.x, 0.6, s.outer.z, WARD, 10, 2, 0.04);
    const rune = s.mark.children[0] as THREE.Sprite;
    rune.material.opacity = 0.45;
    rune.material.color.setHex(0xc0a0ff); // cracked: dimmer, and tinged
    return;
  }
  Sfx.wardBreak();
  toast(STR.toast.vaultForced, 4);
  unseal(s, FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].vaultWarden);
}

/* ---------- the drinking ward (M4.2) ---------- */

/** The sealed vault ward near enough to the mage to drink the spell they cast, if any. */
export function wardNear() {
  for (const d of G.current.doors) {
    const s = d.seal;
    if (s?.sealed && d === s.outer && Math.hypot(player.x - d.x, player.z - d.z) < CFG.ward.reach) return s;
  }
  return null;
}

/** The ward drinks a spell cast near it: its light runs into the ward, and the ward fills with the colour of what it
    drank most. Full, it bursts: the vault opens, and a Wardling of that school guards it. */
export function drinkSpell(s: VaultSeal, def: SpellDef) {
  const at = { x: s.outer.x, y: 0.8, z: s.outer.z },
    color = parseInt(def.color.slice(1), 16);
  strikeFx({ x: player.x, y: 0.9, z: player.z }, at, color, 0.3, true);
  burst(at.x, at.y, at.z, color, 10, 1.6, 0.04);
  const full = drink(s.drink, def.school, def.mana),
    top = mostDrunk(s.drink),
    m = s.cup.material as THREE.MeshBasicMaterial;
  m.color.setHex(SCHOOL_LIGHT[top]).multiplyScalar(0.8);
  m.opacity = 0.2 + 0.45 * fullness(s.drink);
  s.cup.scale.setScalar(0.3 + 0.7 * fullness(s.drink));
  s.mark.scale.setScalar(1.2);
  Sfx.at(at.x, at.z).wardDrink();
  if (!full) {
    if (s.drink.total === def.mana) toast(STR.toast.wardDrinks, 4);
    return;
  } // (the first spell it drinks: what it is doing)
  Sfx.at(at.x, at.z).wardBurst();
  toast(STR.toast.wardBursts(STR.schools[top]), 4);
  burst(at.x, at.y, at.z, SCHOOL_LIGHT[top], 30, 3, 0.06);
  G.shake = Math.max(G.shake, 0.2);
  s.vault.drunk = top;
  unseal(s, WARDLING[top]);
}

/** The ward marks settle after a flare and turn slowly. */
export function updateVaultSeals(dt: number, now: number) {
  for (const d of G.current.doors) {
    const s = d.seal;
    if (!s?.sealed || d !== s.outer) continue;
    s.mark.scale.setScalar(1 + (s.mark.scale.x - 1) * Math.exp(-6 * dt));
    (s.mark.children[0] as THREE.Sprite).material.rotation = now * 0.5;
    if (s.drink.total > 0) s.cup.rotation.z = now * 0.3;
  }
}
