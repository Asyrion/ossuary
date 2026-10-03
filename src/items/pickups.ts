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
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { TILT, scene } from '../render/renderer';
import { M, blob, disposeTree, glow, glowShared, markShared } from '../render/materials';
import { glyphStoneTexture, glyphTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { banner, renderHearts, renderPurse, toast } from '../ui/hud';
import { heroDrink } from '../actors/hero';
import { WARD_COLOR as WARD, freeSpotNear } from '../world/rooms';
import { LOOT, RESOURCES, SOUL_COLOR, afterBurning, dropValue, isSoul, rollTable, type Drop, type Item, type Resource } from './loot';
import { gainSoul, soulsHere } from './souls';
import { goldTaken } from '../world/themes';
import { offerBeyondBudget, placeArtifact, refreshStats } from './artifacts';
import { itemLore, type LoreItem } from '../ui/lore';
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

function heartShape(half: boolean) {
  const s = new THREE.Shape();
  if (half) { s.moveTo(0, .18); s.bezierCurveTo(-.12, .34, -.34, .28, -.34, .1); s.bezierCurveTo(-.34, -.05, -.05, -.22, 0, -.3); s.lineTo(0, .18); }
  else {
    s.moveTo(0, -.3); s.bezierCurveTo(.05, -.22, .34, -.05, .34, .1); s.bezierCurveTo(.34, .28, .12, .34, 0, .18);
    s.bezierCurveTo(-.12, .34, -.34, .28, -.34, .1); s.bezierCurveTo(-.34, -.05, -.05, -.22, 0, -.3);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 });
  if (!half) g.center(); else g.translate(0, 0, -.05);
  g.userData.shared = true;
  return g;
}

/* Shared geometry and materials, made on first use. */
let parts: ReturnType<typeof makeParts> | null = null;
function makeParts() {
  const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
  const obol = shared(new THREE.CylinderGeometry(.19, .19, .04, 20)); obol.rotateX(Math.PI / 2);
  const chestLid = shared(new THREE.CylinderGeometry(.23, .23, .74, 12, 1, false, 0, Math.PI)); chestLid.rotateZ(Math.PI / 2);
  return {
    heart: { full: heartShape(false), half: heartShape(true) },
    heartMat: markShared(new THREE.MeshStandardMaterial({ color: 0xc02a1e, emissive: 0x4a0804, roughness: .35 })),
    obol, obolMat: markShared(new THREE.MeshStandardMaterial({ color: 0xc89a44, metalness: .6, roughness: .35, emissive: 0x4a3008 })),
    sack: shared(new THREE.SphereGeometry(.18, 10, 8)), sackMat: markShared(new THREE.MeshStandardMaterial({ color: 0x6a4a2c, roughness: .85, emissive: 0x120a04 })),
    tie: shared(new THREE.CylinderGeometry(.05, .08, .1, 8)),
    bow: shared(new THREE.TorusGeometry(.075, .026, 6, 14)), shaft: shared(new THREE.BoxGeometry(.3, .045, .045)), bit: shared(new THREE.BoxGeometry(.045, .09, .045)),
    stone: shared(new THREE.PlaneGeometry(.52, .52)),
    vial: shared(new THREE.CylinderGeometry(.075, .09, .2, 10)), vialNeck: shared(new THREE.CylinderGeometry(.035, .045, .08, 8)), cork: shared(new THREE.CylinderGeometry(.04, .035, .05, 8)),
    vialMat: markShared(new THREE.MeshStandardMaterial({ color: 0x9ec8ff, transparent: true, opacity: .55, roughness: .15, metalness: .1, emissive: 0x16305a })),
    liquid: markShared(new THREE.MeshBasicMaterial({ color: 0x5aa0ff })),
    stoneMat: markShared(new THREE.MeshBasicMaterial({ map: glyphStoneTexture(), transparent: true, depthWrite: false })),
    // an offering coffer and a reliquary chest
    wood: markShared(new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: .85 })),
    darkWood: markShared(new THREE.MeshStandardMaterial({ color: 0x3e2818, roughness: .8 })),
    cofferBox: shared(new THREE.BoxGeometry(.5, .28, .36)), cofferLid: shared(new THREE.BoxGeometry(.53, .08, .39)), cofferBand: shared(new THREE.BoxGeometry(.05, .3, .38)),
    chestBox: shared(new THREE.BoxGeometry(.72, .36, .46)), chestLid, chestBand: shared(new THREE.BoxGeometry(.06, .38, .48)),
    seal: shared(new THREE.PlaneGeometry(.42, .42)),
    sealMat: markShared(new THREE.MeshBasicMaterial({ map: glyphTexture(), color: WARD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
    // a gilded reliquary: gold bands and a golden ward
    gilt: markShared(new THREE.MeshStandardMaterial({ color: 0xc8a040, roughness: .35, metalness: .75, emissive: 0x3a2808 })),
    goldSealMat: markShared(new THREE.MeshBasicMaterial({ map: glyphTexture(), color: GOLD, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })),
  };
}

/** How an item looks, on the floor or floating over a merchant's ward circle (the room kit's: pickupLooks.ts). A potion
    is its bottle as this run deals it (`id` names the potion), a reagent its own (M5, alchemyLooks.ts), a rune its chip of
    stone (M6 step 8, runeLooks.ts). */
export function itemVisual(kind: Item, id?: string): THREE.Object3D {
  if (kind === 'potion') return bottleLook(G.run.bottles[(id ?? 'healing') as PotionId]);
  if (kind === 'reagent') return reagentLook((id ?? 'graveMoss') as ReagentId);
  if (kind === 'rune') return runePickupLook((id ?? 'quicken') as RuneId);
  if (DEV.roomKit || isSoul(kind) || kind === 'shard') return itemLook(kind); // (M4.1's items have only the kit's look)
  const P = parts ??= makeParts();
  if (kind === 'heart' || kind === 'halfHeart') {
    const m = new THREE.Mesh(kind === 'heart' ? P.heart.full : P.heart.half, P.heartMat); m.rotation.x = -TILT; return m;
  }
  const g = new THREE.Group();
  if (kind === 'coin') g.add(new THREE.Mesh(P.obol, P.obolMat), glowShared(0xffd27a, .8, .6));
  else if (kind === 'purse') {
    const sack = new THREE.Mesh(P.sack, P.sackMat); sack.scale.set(1, .85, 1);
    const tie = new THREE.Mesh(P.tie, P.sackMat); tie.position.y = .17;
    const coin = new THREE.Mesh(P.obol, P.obolMat); coin.position.set(.02, -.02, .17); coin.scale.setScalar(.7);
    g.add(sack, tie, coin, glowShared(0xffd27a, .7, .45));
  } else if (kind === 'mana') { // a mana vial: pale blue grave-light in a stoppered bottle
    const glass = new THREE.Mesh(P.vial, P.vialMat), neck = new THREE.Mesh(P.vialNeck, P.vialMat); neck.position.y = .14;
    const liquid = new THREE.Mesh(P.vial, P.liquid); liquid.scale.set(.8, .7, .8); liquid.position.y = -.025;
    const cork = new THREE.Mesh(P.cork, P.sackMat); cork.position.y = .2;
    g.add(liquid, glass, neck, cork, glowShared(0x6fa8ff, .8, .6));
  } else if (kind === 'key') { // a bone key: bow, shaft and bit
    const bow = new THREE.Mesh(P.bow, M.bone); bow.position.x = -.19;
    const shaft = new THREE.Mesh(P.shaft, M.bone);
    const bit1 = new THREE.Mesh(P.bit, M.bone); bit1.position.set(.12, -.06, 0);
    const bit2 = new THREE.Mesh(P.bit, M.bone); bit2.position.set(.05, -.05, 0); bit2.scale.y = .7;
    g.add(bow, shaft, bit1, bit2, glowShared(0xf0e6cc, .6, .35));
  } else { // a glyph stone, facing the camera
    const stone = new THREE.Mesh(P.stone, P.stoneMat); stone.rotation.x = -TILT;
    g.add(stone, glowShared(0xff9a3a, .75, .55));
  }
  return g;
}

/** A coffer or a chest, with its lid on a hinge at the back, and the chest's ward seal on its front (gold on
    a gilded one). */
function containerVisual(kind: 'coffer' | 'chest', gilded = false): { g: THREE.Object3D; lid: THREE.Object3D; ward?: THREE.Object3D } {
  if (DEV.roomKit) return containerLook(kind, gilded);
  const P = parts ??= makeParts(), g = new THREE.Group(), lid = new THREE.Group();
  if (kind === 'coffer') {
    const box = new THREE.Mesh(P.cofferBox, P.wood); box.position.y = .14;
    for (const x of [-.16, .16]) { const b = new THREE.Mesh(P.cofferBand, M.iron); b.position.set(x, .15, 0); g.add(b); }
    const top = new THREE.Mesh(P.cofferLid, P.wood); top.position.set(0, .04, .18);
    lid.position.set(0, .28, -.18); lid.add(top); g.add(box, lid, blob(.8));
    return { g, lid };
  }
  const box = new THREE.Mesh(P.chestBox, P.darkWood); box.position.y = .18;
  for (const x of [-.24, .24]) { const b = new THREE.Mesh(P.chestBand, gilded ? P.gilt : M.bone); b.position.set(x, .19, 0); g.add(b); }
  const top = new THREE.Mesh(P.chestLid, P.darkWood); top.position.set(0, 0, .23);
  lid.position.set(0, .36, -.23); lid.add(top);
  const ward = new THREE.Group(); ward.position.set(0, .24, .25); ward.rotation.x = -.3;
  const seal = new THREE.Mesh(P.seal, gilded ? P.goldSealMat : P.sealMat), gl = glow(gilded ? GOLD : WARD, gilded ? 1.3 : 1, .55);
  ward.add(seal, gl); g.add(box, lid, ward, blob(1));
  return { g, lid, ward };
}

/** Drop something on the floor at (x, z): it falls in from above, or rises out of a broken urn (`rise`).
    A coffer or a chest is filled when it appears; a chest is gilded by chance unless `gilded` says. A mana vial
    becomes an obol while the mage knows no spell (nothing would spend its mana), as does a lodestone shard, unless `asIs`
    (the dev menu). M5: a potion is dealt from the run's alchemy stream unless `potion` names it; a reagent is one at random
    unless `reagent` does. */
export function spawnPickup(kind: Drop, x: number, z: number, opts: { rise?: boolean; gilded?: boolean; asIs?: boolean; potion?: PotionId; reagent?: ReagentId; rune?: RuneId } = {}) {
  if ((kind === 'mana' || kind === 'shard') && !opts.asIs && !player.spells.some(Boolean)) kind = 'coin';
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  if (isContainer(kind)) {
    const gilded = kind === 'chest' && (opts.gilded ?? G.run.drops.chance(LOOT.gildedChest));
    const v = containerVisual(kind, gilded); g.add(v.g);
    G.pickups.push({ kind, x, z, r: .4, g, m: v.g, t: 0, drop: .5, contents: gilded ? [] : rollTable(G.run.drops, kind, LOOT, soulsHere()), lid: v.lid, ward: v.ward, armed: true, gilded });
    return;
  }
  const potion = kind === 'potion' ? opts.potion ?? pickPotion(G.run.alchemy) : undefined;
  const reagent = kind === 'reagent' ? opts.reagent ?? COMMON_REAGENTS[G.run.alchemy.int(0, COMMON_REAGENTS.length - 1)] : undefined;
  const rune = kind === 'rune' ? opts.rune ?? dealRune() : undefined; // (M6 step 8: dealt from the run's runes stream, leaning to the hand)
  const m = itemVisual(kind, potion ?? reagent ?? rune); m.position.y = .35; g.add(m, blob(.55));
  const p: Pickup = { kind, x, z, r: .3, g, m, t: Math.random() * 6, drop: .5, potion, reagent, rune };
  if (opts.rise) { p.rise = glow(0xd8e6ff, .8, .8); p.rise.position.y = .2; g.add(p.rise); p.drop = .6; }
  G.pickups.push(p);
}
/** The obols and purses lying in the room dressed again in the face the obols wear now (the dev menu's switch). */
export function restyleObols() {
  for (const p of G.pickups) {
    if (p.kind !== 'coin' && p.kind !== 'purse') continue;
    const m = itemVisual(p.kind); m.position.copy(p.m.position); m.rotation.copy(p.m.rotation);
    p.g.remove(p.m); disposeTree(p.m); p.g.add(m); p.m = m; // (its geometry and materials shared with the kept look: nothing freed)
  }
}
/** A heart; value is in halves (1 = half heart, 2 = full). */
export const spawnHeart = (x: number, z: number, value: number) => spawnPickup(value >= 2 ? 'heart' : 'halfHeart', x, z);

/** Open a coffer or a chest and spill what's inside in front of it. A blast (`burnt`) breaks a chest's ward
    and burns half of its contents. */
export function openContainer(p: Pickup, burnt = false) {
  if (p.opened || !p.contents) return;
  if (p.gilded && burnt) { burst(p.x, .35, p.z, GOLD, 8, 1.6, .04); Sfx.at(p.x, p.z).wardTink(); return; } // the golden ward holds
  p.opened = true;
  itemLore(p.gilded ? 'gilded' : p.kind as LoreItem);
  if (p.ward) { p.ward.parent?.remove(p.ward); disposeTree(p.ward); p.ward = undefined; burst(p.x, .3, p.z, p.gilded ? GOLD : WARD, 12, 2, .04); }
  if (p.gilded && runeHere('gilded')) { const spot = freeSpotNear(G.current, p.x + 1.1, p.z + .6); spawnPickup('rune', spot.x, spot.z); } // (M6 step 8: a rune rolls out beside what it holds)
  if (p.gilded) { // a relic rises out of it, beyond what the floor's budget allows
    const def = offerBeyondBudget('vault');
    if (def) {
      const spot = freeSpotNear(G.current, p.x, p.z + 1.3);
      placeArtifact(G.current, def, spot.x, spot.z);
      burst(spot.x, .8, spot.z, GOLD, 24, 2.6, .06); Sfx.unbind(); Sfx.rise(); banner(...STR.banner.gildedRelic);
      return;
    }
    p.contents = rollTable(G.run.drops, 'chest', LOOT, soulsHere()); // every artifact has been offered: an ordinary hoard, then
  }
  let items = p.contents;
  if (burnt && p.kind === 'chest') {
    const kept = afterBurning(items);
    burst(p.x, .5, p.z, 0x3a3430, 8 * (items.length - kept.length), 1.6, .07); // what burned, as ash
    items = kept; Sfx.wardBreak();
  } else if (p.kind === 'chest') Sfx.at(p.x, p.z).unbind(); else Sfx.at(p.x, p.z).coffer();
  burst(p.x, .3, p.z, 0x8a8278, 8, 1, .06);
  items.forEach((item, i) => { // tossed out in a fan towards the camera
    const a = Math.PI / 2 + (i - (items.length - 1) / 2) * .75;
    const spot = freeSpotNear(G.current, p.x + Math.cos(a) * .9, p.z + Math.sin(a) * .9);
    spawnPickup(item, spot.x, spot.z);
  });
  p.contents = [];
}

/** Add (or take, with negative amounts) obols, keys or glyphs, within 0 and the cap. */
export function giveResources(v: Partial<Record<Resource, number>>) {
  const tens = Math.floor(player.coins / 10);
  for (const k of RESOURCES) if (v[k]) player[k] = Math.max(0, Math.min(LOOT.cap, player[k] + v[k]!));
  renderPurse();
  if (player.stats.obolDamage && Math.floor(player.coins / 10) !== tens) refreshStats(); // the Miser's Purse weighs the hoard
}
/** A new run's obols, keys and glyphs. */
export function resetResources() { for (const k of RESOURCES) player[k] = LOOT.start[k]; renderPurse(); }

const SOUND: Record<Item, () => void> = {
  halfHeart: () => Sfx.pickup(), heart: () => Sfx.pickup(), coin: () => Sfx.coin(), purse: () => Sfx.coin(true), key: () => Sfx.key(), glyph: () => Sfx.glyphPickup(), mana: () => Sfx.manaVial(),
  paleSoul: () => Sfx.soulTake(), blackSoul: () => Sfx.soulTake(), hallowedSoul: () => Sfx.soulTake(), shard: () => Sfx.shard(),
  potion: () => Sfx.bottle(), reagent: () => Sfx.reagent(), rune: () => {}, // (a rune's chime is addRune's: runes.ts)
};
const SPARK: Record<Item, number> = {
  halfHeart: 0xe0473a, heart: 0xe0473a, coin: 0xffd27a, purse: 0xffd27a, key: 0xf0e6cc, glyph: 0xff9a3a, mana: 0x6fa8ff,
  paleSoul: SOUL_COLOR.pale, blackSoul: SOUL_COLOR.black, hallowedSoul: SOUL_COLOR.hallowed, shard: 0x7aa8ff,
  potion: 0xd8e8f0, reagent: 0x9ac070, rune: 0xc8b8a0,
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
  if (v.shard) return player.mana >= player.stats.maxMana && player.spellCd.every(c => c <= 0) ? 'idle' : null;
  const res = RESOURCES.find(k => v[k])!;
  return player[res] >= LOOT.cap ? 'full' : null;
}
/** Hand an item over (after `cantUse`): hearts heal, a vial or a shard gives mana (a shard ends every cooldown too), a mote
    is kept, resources are added. */
export function useItem(kind: Item) {
  const v = dropValue(kind);
  if (v.hearts) { player.hp = Math.min(player.maxHp, player.hp + v.hearts); renderHearts(); heroDrink(); }
  else if (v.mana) { gainMana(v.mana); heroDrink(); }
  else if (v.soul) gainSoul(v.soul);
  else if (v.shard) { player.spellCd.fill(0); gainMana(v.shard); burst(player.x, 1, player.z, 0x7aa8ff, 10, 1.8, .05); }
  else giveResources(v);
}

/** Take an item if the mage can use it: hearts below full health, mana below full, resources below the cap, soul motes
    below the most kept, a shard while a spell cools down or mana is short. */
function take(p: Pickup, kind: Item) {
  if (cantUse(kind)) return false;
  if (kind === 'potion' || kind === 'reagent') { // (M5: into the belt or the pouch, with its own card the first time)
    if (p.potion) addPotion(p.potion as PotionId); else if (p.reagent) addReagent(p.reagent as ReagentId);
    SOUND[kind](); burst(p.x, .4, p.z, SPARK[kind], 8, 2, .05); return true;
  }
  if (kind === 'rune') { // (M6 step 8: into the pouch, its chime and its card the first time)
    const id = (p.rune ?? 'quicken') as RuneId; addRune(id); burst(p.x, .4, p.z, new THREE.Color(runeDef(id).color).getHex(), 10, 2, .05); return true;
  }
  useItem(kind);
  const coins = dropValue(kind).coins; if (coins) { G.stats.obols += coins; goldTaken(G.current); } // for the end screen; a treasury's guardians wake
  SOUND[kind](); burst(p.x, .4, p.z, SPARK[kind], 8, 2, .05);
  itemLore(kind); // what it is, the first time in a run
  return true;
}

/** A heart at full health, a mana vial at full mana, a soul mote with all the motes kept, a shard with nothing to give, a
    potion with the belt full: say so, once a run for each. */
const HINTS = { whole: () => STR.toast.fullHealth, brimming: () => STR.toast.fullMana, souls: () => STR.toast.fullSouls, idle: () => STR.toast.shardIdle, belt: () => STR.alchemy.full };
function hintFull(kind: Item) {
  const why = cantUse(kind);
  if (!why || why === 'full' || G.run.hinted.has(why)) return;
  G.run.hinted.add(why); toast(HINTS[why](), 2.5); Sfx.full();
}

/** The mage at distance `d` from a closed container: a coffer opens; a chest asks for a bone key, and says
    so once each time the mage walks up to it without one. */
function touchContainer(p: Pickup, d: number) {
  if (d > player.r + .5) { p.armed = true; return; }
  if (p.kind === 'coffer') { openContainer(p); return; }
  if (!p.armed) return;
  p.armed = false;
  if (player.keys > 0) { giveResources({ keys: -1 }); openContainer(p); return; }
  Sfx.locked(); p.ward?.scale.setScalar(1.35); toast(p.gilded ? STR.toast.gildedSealed : STR.toast.chestSealed, 4);
}

export function updatePickups(dt: number) {
  const ps = G.pickups;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.t += dt;
    if (p.drop > 0) p.drop -= dt;
    let d = Math.hypot(player.x - p.x, player.z - p.z);
    if (isContainer(p.kind)) { // containers sit still; a lid swings open, a ward seal turns and settles after a flare
      p.m.position.y = Math.max(0, p.drop) * 1.2;
      if (p.lid) p.lid.rotation.x += ((p.opened ? -1.15 : 0) - p.lid.rotation.x) * (1 - Math.exp(-10 * dt));
      if (p.ward) { p.ward.children[0].rotation.z += dt * .6; p.ward.scale.setScalar(1 + (p.ward.scale.x - 1) * Math.exp(-6 * dt)); }
      if (!p.opened && p.drop <= 0) touchContainer(p, d);
      continue;
    }
    const kind = p.kind, heart = kind === 'heart' || kind === 'halfHeart';
    if (p.rise) { // out of a broken urn: the item rises, and the pale soul above it fades as it goes
      const k = 1 - Math.max(0, p.drop) / .6;
      p.m.position.y = .35 * k; p.rise.position.y = .2 + k * 1.1; p.rise.material.opacity = .8 * (1 - k);
      if (p.drop <= 0) { p.g.remove(p.rise); p.rise.material.dispose(); p.rise = undefined; }
    } else p.m.position.y = .35 + Math.sin(p.t * 3) * .06 + Math.max(0, p.drop) * 1.2;
    // (flat things sway, M6's rune too: turned whole, they would go edge-on)
    p.m.rotation.y = heart || kind === 'glyph' || kind === 'key' || kind === 'rune' || isSoul(kind) ? Math.sin(p.t * 1.6) * .5 : kind === 'coin' ? Math.sin(p.t * 2.2) * CFG.pickups.coinSway : p.t * 2.4;
    // obols are drawn to the living: from close by they drift to the mage
    if ((kind === 'coin' || kind === 'purse') && p.drop <= 0 && d < CFG.pickups.obolDrift && d > .01 && player.coins < LOOT.cap) {
      const step = Math.min(d, (1.5 + (CFG.pickups.obolDrift - d) * 3) * dt);
      p.x += (player.x - p.x) / d * step; p.z += (player.z - p.z) / d * step; p.g.position.set(p.x, 0, p.z);
      d -= step;
    }
    if (d < player.r + p.r && p.drop <= 0) {
      if (take(p, kind)) { scene.remove(p.g); disposeTree(p.g); ps.splice(i, 1); }
      else { // can't use it now: say why, the first time in a run, and nudge it away
        hintFull(kind);
        const nx = (p.x - player.x) / (d || 1), nz = (p.z - player.z) / (d || 1);
        p.x += nx * .05; p.z += nz * .05; p.g.position.set(p.x, 0, p.z);
      }
    }
  }
}

/** The way down that opens when the boss dies, at world (x, z): in `room`'s group when given (drawn only with it: M6 step
    10's waystone room), else in the scene. */
export function makeTrapdoor(x: number, z: number, room?: Room) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.7, .06, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffb35a }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .05;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(.66, 32), new THREE.MeshBasicMaterial({ color: 0x0a0604 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = .02;
  const gl = glow(0xff8a30, 2.6, .55); gl.position.y = .4;
  g.add(disc, ring, gl);
  if (room) { g.position.set(x - room.cx, 0, z - room.cz); room.group.add(g); } else { g.position.set(x, 0, z); scene.add(g); }
  G.trapdoor = { g, x, z, ring, t: 0 };
}

export function updateTrapdoor(dt: number) {
  const p = G.trapdoor; if (!p) return;
  p.t += dt; p.ring.scale.setScalar(1 + Math.sin(p.t * 3) * .04);
}
