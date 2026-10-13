/* Pickups on the floor: hearts, obols (single, or a purse), bone keys and glyph stones, and the containers
   rooms leave behind. Hearts can't be taken at full health; resources can't go past the cap. Obols drift to
   the living mage from close by. What a broken urn held rises out of it like a soul.

   Containers (GDD: Containers): a coffer opens when walked into. A reliquary chest is sealed by a ward: a
   bone key unbinds it cleanly; a glyph's blast breaks it too, but burns half of what's inside. Now and then
   a chest is gilded: its golden ward holds against blasts, and a bone key finds a relic inside, an artifact
   outside the floor's budget. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Pickup, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { blob, disposeTree, glow } from '../render/materials';
import { burst } from '../combat/fx';
import { banner, renderHearts, renderPurse, toast, itemLore } from '../notify';
import { heroDrink } from '../actors/hero';
import { WARD_COLOR as WARD, freeSpotNear } from '../world/rooms';
import {
  LOOT,
  RESOURCES,
  SOUL_COLOR,
  afterBurning,
  dropValue,
  isSoul,
  rollTable,
  type Drop,
  type Item,
  type Resource,
} from './loot';
import { gainSoul, soulsHere } from './souls';
import { goldTaken } from '../world/themes';
import { offerBeyondBudget, placeArtifact, refreshStats } from './artifacts';
import type { LoreItem } from '../types';
import { gainMana } from '../magic/spells';
import { containerLook, itemLook } from './pickupLooks';
import { bottleLook, reagentLook } from './alchemyLooks';
import { COMMON_REAGENTS, pickPotion, type PotionId, type ReagentId } from './alchemyData';
import { addPotion, addReagent, beltSlots } from './potions';
import { runePickupLook } from './runeLooks';
import { addRune, dealRune, runeHere } from '../magic/runes';
import { rune as runeDef, type RuneId } from '../magic/runeData';

const GOLD = 0xffd27a;
export const isContainer = (kind: Drop): kind is 'coffer' | 'chest' => kind === 'coffer' || kind === 'chest';

/** How an item looks, on the floor or floating over a merchant's ward circle (the room kit's: pickupLooks.ts). A potion
    is its bottle as this run deals it (`id` names the potion), a reagent its own (M5, alchemyLooks.ts), a rune its chip of
    stone (M6 step 8, runeLooks.ts). */
export function itemVisual(kind: Item, id?: string): THREE.Object3D {
  if (kind === 'potion') return bottleLook(G.run.bottles[(id ?? 'healing') as PotionId]);
  if (kind === 'reagent') return reagentLook((id ?? 'graveMoss') as ReagentId);
  if (kind === 'rune') return runePickupLook((id ?? 'quicken') as RuneId);
  return itemLook(kind);
}

/** Drop something on the floor at (x, z): it falls in from above, or rises out of a broken urn (`rise`).
    A coffer or a chest is filled when it appears; a chest is gilded by chance unless `gilded` says. A mana vial
    becomes an obol while the mage knows no spell (nothing would spend its mana), as does a lodestone shard, unless `asIs`
    (the dev menu). M5: a potion is dealt from the run's alchemy stream unless `potion` names it; a reagent is one at random
    unless `reagent` does. */
export function spawnPickup(
  kind: Drop,
  x: number,
  z: number,
  opts: {
    rise?: boolean;
    gilded?: boolean;
    asIs?: boolean;
    potion?: PotionId;
    reagent?: ReagentId;
    rune?: RuneId;
  } = {},
) {
  if ((kind === 'mana' || kind === 'shard') && !opts.asIs && !player.spells.some(Boolean)) kind = 'coin';
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  scene.add(g);
  if (isContainer(kind)) {
    const gilded = kind === 'chest' && (opts.gilded ?? G.run.drops.chance(LOOT.gildedChest));
    const v = containerLook(kind, gilded); // (a coffer or a chest, its lid on a hinge at the back, a chest's ward seal on its front)
    g.add(v.g);
    G.room.pickups.push({
      kind,
      x,
      z,
      r: 0.4,
      g,
      m: v.g,
      t: 0,
      drop: 0.5,
      contents: gilded ? [] : rollTable(G.run.drops, kind, LOOT, soulsHere()),
      lid: v.lid,
      ward: v.ward,
      armed: true,
      gilded,
    });
    return;
  }
  const potion = kind === 'potion' ? (opts.potion ?? pickPotion(G.run.alchemy)) : undefined;
  const reagent =
    kind === 'reagent'
      ? (opts.reagent ?? COMMON_REAGENTS[G.run.alchemy.int(0, COMMON_REAGENTS.length - 1)])
      : undefined;
  const rune = kind === 'rune' ? (opts.rune ?? dealRune()) : undefined; // (M6 step 8: dealt from the run's runes stream, leaning to the hand)
  const m = itemVisual(kind, potion ?? reagent ?? rune);
  m.position.y = 0.35;
  g.add(m, blob(0.55));
  const p: Pickup = { kind, x, z, r: 0.3, g, m, t: Math.random() * 6, drop: 0.5, potion, reagent, rune };
  if (opts.rise) {
    p.rise = glow(0xd8e6ff, 0.8, 0.8);
    p.rise.position.y = 0.2;
    g.add(p.rise);
    p.drop = 0.6;
  }
  G.room.pickups.push(p);
}
/** The obols and purses lying in the room dressed again in the face the obols wear now (the dev menu's switch). */
export function restyleObols() {
  for (const p of G.room.pickups) {
    if (p.kind !== 'coin' && p.kind !== 'purse') continue;
    const m = itemVisual(p.kind);
    m.position.copy(p.m.position);
    m.rotation.copy(p.m.rotation);
    p.g.remove(p.m);
    disposeTree(p.m);
    p.g.add(m);
    p.m = m; // (its geometry and materials shared with the kept look: nothing freed)
  }
}
/** A heart; value is in halves (1 = half heart, 2 = full). */
export const spawnHeart = (x: number, z: number, value: number) =>
  spawnPickup(value >= 2 ? 'heart' : 'halfHeart', x, z);

/** Open a coffer or a chest and spill what's inside in front of it. A blast (`burnt`) breaks a chest's ward
    and burns half of its contents. */
export function openContainer(p: Pickup, burnt = false) {
  if (p.opened || !p.contents) return;
  if (p.gilded && burnt) {
    burst(p.x, 0.35, p.z, GOLD, 8, 1.6, 0.04);
    Sfx.at(p.x, p.z).wardTink();
    return;
  } // the golden ward holds
  p.opened = true;
  itemLore(p.gilded ? 'gilded' : (p.kind as LoreItem));
  if (p.ward) {
    p.ward.parent?.remove(p.ward);
    disposeTree(p.ward);
    p.ward = undefined;
    burst(p.x, 0.3, p.z, p.gilded ? GOLD : WARD, 12, 2, 0.04);
  }
  if (p.gilded && runeHere('gilded')) {
    const spot = freeSpotNear(G.room.current, p.x + 1.1, p.z + 0.6);
    spawnPickup('rune', spot.x, spot.z);
  } // (M6 step 8: a rune rolls out beside what it holds)
  if (p.gilded) {
    // a relic rises out of it, beyond what the floor's budget allows
    const def = offerBeyondBudget('vault');
    if (def) {
      const spot = freeSpotNear(G.room.current, p.x, p.z + 1.3);
      placeArtifact(G.room.current, def, spot.x, spot.z);
      burst(spot.x, 0.8, spot.z, GOLD, 24, 2.6, 0.06);
      Sfx.unbind();
      Sfx.rise();
      banner(...STR.banner.gildedRelic);
      return;
    }
    p.contents = rollTable(G.run.drops, 'chest', LOOT, soulsHere()); // every artifact has been offered: an ordinary hoard, then
  }
  let items = p.contents;
  if (burnt && p.kind === 'chest') {
    const kept = afterBurning(items);
    burst(p.x, 0.5, p.z, 0x3a3430, 8 * (items.length - kept.length), 1.6, 0.07); // what burned, as ash
    items = kept;
    Sfx.wardBreak();
  } else if (p.kind === 'chest') Sfx.at(p.x, p.z).unbind();
  else Sfx.at(p.x, p.z).coffer();
  burst(p.x, 0.3, p.z, 0x8a8278, 8, 1, 0.06);
  items.forEach((item, i) => {
    // tossed out in a fan towards the camera
    const a = Math.PI / 2 + (i - (items.length - 1) / 2) * 0.75;
    const spot = freeSpotNear(G.room.current, p.x + Math.cos(a) * 0.9, p.z + Math.sin(a) * 0.9);
    spawnPickup(item, spot.x, spot.z);
  });
  p.contents = [];
}

/** Add (or take, with negative amounts) obols, keys or glyphs, within 0 and the cap. */
export function giveResources(v: Partial<Record<Resource, number>>) {
  const tens = Math.floor(player.coins / 10);
  for (const k of RESOURCES) if (v[k]) player[k] = Math.max(0, Math.min(LOOT.cap, player[k] + v[k]));
  renderPurse();
  if (player.stats.obolDamage && Math.floor(player.coins / 10) !== tens) refreshStats(); // the Miser's Purse weighs the hoard
}
/** A new run's obols, keys and glyphs. */
export function resetResources() {
  for (const k of RESOURCES) player[k] = LOOT.start[k];
  renderPurse();
}

const SOUND: Record<Item, () => void> = {
  halfHeart: () => Sfx.pickup(),
  heart: () => Sfx.pickup(),
  coin: () => Sfx.coin(),
  purse: () => Sfx.coin(true),
  key: () => Sfx.key(),
  glyph: () => Sfx.glyphPickup(),
  mana: () => Sfx.manaVial(),
  paleSoul: () => Sfx.soulTake(),
  blackSoul: () => Sfx.soulTake(),
  hallowedSoul: () => Sfx.soulTake(),
  shard: () => Sfx.shard(),
  potion: () => Sfx.bottle(),
  reagent: () => Sfx.reagent(),
  rune: () => {}, // (a rune's chime is addRune's: runes.ts)
};
const SPARK: Record<Item, number> = {
  halfHeart: 0xe0473a,
  heart: 0xe0473a,
  coin: 0xffd27a,
  purse: 0xffd27a,
  key: 0xf0e6cc,
  glyph: 0xff9a3a,
  mana: 0x6fa8ff,
  paleSoul: SOUL_COLOR.pale,
  blackSoul: SOUL_COLOR.black,
  hallowedSoul: SOUL_COLOR.hallowed,
  shard: 0x7aa8ff,
  potion: 0xd8e8f0,
  reagent: 0x9ac070,
  rune: 0xc8b8a0,
};

/** Why the mage can't use an item now (the merchant says it too), or null when they can: whole, brimming with mana,
    at the cap, holding all the soul motes they can keep, with nothing a shard could give, or (M5) a full belt. */
export function cantUse(kind: Item): 'whole' | 'brimming' | 'full' | 'souls' | 'idle' | 'belt' | null {
  const v = dropValue(kind);
  if (v.potion) return player.belt.length >= beltSlots() ? 'belt' : null;
  if (v.reagent || v.rune) return null; // (the pouches hold any number)
  if (v.hearts) return player.hp >= player.maxHp ? 'whole' : null;
  if (v.mana) return player.mana >= player.stats.maxMana ? 'brimming' : null;
  if (v.soul) return player.souls.length >= CFG.souls.max ? 'souls' : null;
  if (v.shard) return player.mana >= player.stats.maxMana && player.spellCd.every((c) => c <= 0) ? 'idle' : null;
  const res = RESOURCES.find((k) => v[k])!;
  return player[res] >= LOOT.cap ? 'full' : null;
}
/** Hand an item over (after `cantUse`): hearts heal, a vial or a shard gives mana (a shard ends every cooldown too), a mote
    is kept, resources are added. */
export function useItem(kind: Item) {
  const v = dropValue(kind);
  if (v.hearts) {
    player.hp = Math.min(player.maxHp, player.hp + v.hearts);
    renderHearts();
    heroDrink();
  } else if (v.mana) {
    gainMana(v.mana);
    heroDrink();
  } else if (v.soul) gainSoul(v.soul);
  else if (v.shard) {
    player.spellCd.fill(0);
    gainMana(v.shard);
    burst(player.x, 1, player.z, 0x7aa8ff, 10, 1.8, 0.05);
  } else giveResources(v);
}

/** Take an item if the mage can use it: hearts below full health, mana below full, resources below the cap, soul motes
    below the most kept, a shard while a spell cools down or mana is short. */
function take(p: Pickup, kind: Item) {
  if (cantUse(kind)) return false;
  if (kind === 'potion' || kind === 'reagent') {
    // (M5: into the belt or the pouch, with its own card the first time)
    if (p.potion) addPotion(p.potion as PotionId);
    else if (p.reagent) addReagent(p.reagent as ReagentId);
    SOUND[kind]();
    burst(p.x, 0.4, p.z, SPARK[kind], 8, 2, 0.05);
    return true;
  }
  if (kind === 'rune') {
    // (M6 step 8: into the pouch, its chime and its card the first time)
    const id = (p.rune ?? 'quicken') as RuneId;
    addRune(id);
    burst(p.x, 0.4, p.z, new THREE.Color(runeDef(id).color).getHex(), 10, 2, 0.05);
    return true;
  }
  useItem(kind);
  const coins = dropValue(kind).coins;
  if (coins) {
    G.stats.obols += coins;
    goldTaken(G.room.current);
  } // for the end screen; a treasury's guardians wake
  SOUND[kind]();
  burst(p.x, 0.4, p.z, SPARK[kind], 8, 2, 0.05);
  itemLore(kind); // what it is, the first time in a run
  return true;
}

/** A heart at full health, a mana vial at full mana, a soul mote with all the motes kept, a shard with nothing to give, a
    potion with the belt full: say so, once a run for each. */
const HINTS = {
  whole: () => STR.toast.fullHealth,
  brimming: () => STR.toast.fullMana,
  souls: () => STR.toast.fullSouls,
  idle: () => STR.toast.shardIdle,
  belt: () => STR.alchemy.full,
};
function hintFull(kind: Item) {
  const why = cantUse(kind);
  if (!why || why === 'full' || G.run.hinted.has(why)) return;
  G.run.hinted.add(why);
  toast(HINTS[why](), 2.5);
  Sfx.full();
}

/** The mage at distance `d` from a closed container: a coffer opens; a chest asks for a bone key, and says
    so once each time the mage walks up to it without one. */
function touchContainer(p: Pickup, d: number) {
  if (d > player.r + 0.5) {
    p.armed = true;
    return;
  }
  if (p.kind === 'coffer') {
    openContainer(p);
    return;
  }
  if (!p.armed) return;
  p.armed = false;
  if (player.keys > 0) {
    giveResources({ keys: -1 });
    openContainer(p);
    return;
  }
  Sfx.locked();
  p.ward?.scale.setScalar(1.35);
  toast(p.gilded ? STR.toast.gildedSealed : STR.toast.chestSealed, 4);
}

export function updatePickups(dt: number) {
  const ps = G.room.pickups;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.t += dt;
    if (p.drop > 0) p.drop -= dt;
    let d = Math.hypot(player.x - p.x, player.z - p.z);
    if (isContainer(p.kind)) {
      // containers sit still; a lid swings open, a ward seal turns and settles after a flare
      p.m.position.y = Math.max(0, p.drop) * 1.2;
      if (p.lid) p.lid.rotation.x += ((p.opened ? -1.15 : 0) - p.lid.rotation.x) * (1 - Math.exp(-10 * dt));
      if (p.ward) {
        p.ward.children[0].rotation.z += dt * 0.6;
        p.ward.scale.setScalar(1 + (p.ward.scale.x - 1) * Math.exp(-6 * dt));
      }
      if (!p.opened && p.drop <= 0) touchContainer(p, d);
      continue;
    }
    const kind = p.kind,
      heart = kind === 'heart' || kind === 'halfHeart';
    if (p.rise) {
      // out of a broken urn: the item rises, and the pale soul above it fades as it goes
      const k = 1 - Math.max(0, p.drop) / 0.6;
      p.m.position.y = 0.35 * k;
      p.rise.position.y = 0.2 + k * 1.1;
      p.rise.material.opacity = 0.8 * (1 - k);
      if (p.drop <= 0) {
        p.g.remove(p.rise);
        p.rise.material.dispose();
        p.rise = undefined;
      }
    } else p.m.position.y = 0.35 + Math.sin(p.t * 3) * 0.06 + Math.max(0, p.drop) * 1.2;
    // (flat things sway, M6's rune too: turned whole, they would go edge-on)
    p.m.rotation.y =
      heart || kind === 'glyph' || kind === 'key' || kind === 'rune' || isSoul(kind)
        ? Math.sin(p.t * 1.6) * 0.5
        : kind === 'coin'
          ? Math.sin(p.t * 2.2) * CFG.pickups.coinSway
          : p.t * 2.4;
    // obols are drawn to the living: from close by they drift to the mage
    if (
      (kind === 'coin' || kind === 'purse') &&
      p.drop <= 0 &&
      d < CFG.pickups.obolDrift &&
      d > 0.01 &&
      player.coins < LOOT.cap
    ) {
      const step = Math.min(d, (1.5 + (CFG.pickups.obolDrift - d) * 3) * dt);
      p.x += ((player.x - p.x) / d) * step;
      p.z += ((player.z - p.z) / d) * step;
      p.g.position.set(p.x, 0, p.z);
      d -= step;
    }
    if (d < player.r + p.r && p.drop <= 0) {
      if (take(p, kind)) {
        scene.remove(p.g);
        disposeTree(p.g);
        ps.splice(i, 1);
      } else {
        // can't use it now: say why, the first time in a run, and nudge it away
        hintFull(kind);
        const nx = (p.x - player.x) / (d || 1),
          nz = (p.z - player.z) / (d || 1);
        p.x += nx * 0.05;
        p.z += nz * 0.05;
        p.g.position.set(p.x, 0, p.z);
      }
    }
  }
}

/** The way down that opens when the boss dies, at world (x, z): in `room`'s group when given (drawn only with it: M6 step
    10's waystone room), else in the scene. */
export function makeTrapdoor(x: number, z: number, room?: Room) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.7, 0.06, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffb35a }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.66, 32), new THREE.MeshBasicMaterial({ color: 0x0a0604 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.02;
  const gl = glow(0xff8a30, 2.6, 0.55);
  gl.position.y = 0.4;
  g.add(disc, ring, gl);
  if (room) {
    g.position.set(x - room.cx, 0, z - room.cz);
    room.group.add(g);
  } else {
    g.position.set(x, 0, z);
    scene.add(g);
  }
  G.floor.trapdoor = { g, x, z, ring, t: 0 };
}

export function updateTrapdoor(dt: number) {
  const p = G.floor.trapdoor;
  if (!p) return;
  p.t += dt;
  p.ring.scale.setScalar(1 + Math.sin(p.t * 3) * 0.04);
}
