/* Artifacts in the world: pedestals, taking them (and swapping foci), the per-floor budget, and applying
   what the mage holds to their stats. The data and the combining rules are in artifactData.ts. */
import { attrBonus } from '../progression/attributes';
import * as THREE from 'three';
import { CFG } from '../config';
import type { ArtifactSpot, Room } from '../types';
import { DEV, G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, blob, disposeTree, glow, glowShared, mergeStill } from '../render/materials';
import { burst } from '../combat/fx';
import { HEART_PATH, banner, renderHearts, renderItems, renderMinimap, toast } from '../ui/hud';
import { ARTIFACT_DEFS, START_FOCUS, artifact, computeStats, pickArtifact, type ArtifactDef, type Pool } from './artifactData';
import { giveResources } from './pickups';
import { artifactLore } from '../ui/lore';
import { dress } from '../actors/costume';
import { modelFor } from '../assets/models';
import { altarLook, pedestalLook } from '../world/objectLooks';
import { CURSED_RED, artifactLook } from './artifactLooks';
import { updateArc } from './arc';
import { announce, giftsFor, updateTransforms } from './transforms';
import type { TransformId } from './transformData';
import { boonParam } from '../progression/boonHooks';
import { vigil } from '../vigil/save';
import { blessBonus, blessingOf, startOf } from '../vigil/giftData';

const hex = (c: string) => new THREE.Color(c).getHex();

/* ---------- stats ---------- */

/** Recompute the mage's stats from what they hold; heart containers gained come filled. */
/** Recompute the mage's stats from what is held (and dress them); returns the transformations newly formed, announced at
    once unless `announceNow` is false (an artifact taken shows its own banner and card first: `grantArtifact`). */
export function refreshStats(announceNow = true): TransformId[] {
  const before = player.maxHp, fresh = updateTransforms(); // (M4.6: three of a family transform the mage)
  player.stats = computeStats(player.focus, player.items, { ...CFG.hero, hearts: CFG.hero.hearts - player.heartsPaid }, player.cleansed, player.coins, G.run.remedy ? [G.run.remedy] : [], growth()); // (M6: and the attributes, and Votive Heart's containers)
  giftsFor(player.stats);
  player.maxHp = player.stats.maxHp;
  if (player.maxHp > before) player.hp += player.maxHp - before;
  player.hp = Math.min(player.hp, player.maxHp);
  player.mana = Math.min(player.mana, player.stats.maxMana);
  renderHearts(); renderItems(); dress();
  if (announceNow) for (const t of fresh) announce(t);
  updateArc(); // (M4.6: Azyrion grows towards the chaos mage)
  return fresh;
}

/** M6: what the mage's growth adds: the attributes, and Votive Heart's heart containers (two halves each); M7 step 8, the
    Vigil's powers (more mana, heart containers); M7 step 9, the blessing of the candle lit for this run. */
function growth() {
  const b = attrBonus(G.run.attrs), v = vigil(), p = startOf({ freed: v.freed, bonds: v.bonds, powers: v.powers, flags: v.flags }); // (M7 step 8: the powers bought at the Vigil)
  return blessBonus(blessingOf(G.run.blessing), { ...b, mana: b.mana + (p.maxMana ?? 0), heartHalves: b.heartHalves + 2 * boonParam('votiveHeart', 'hearts') + 2 * (p.hearts ?? 0) }); // (M7 step 9: a candle's blessing, this run)
}

/** Start a run holding only the starting focus. */
export function resetArtifacts() { player.focus = START_FOCUS; player.items = []; player.heartsPaid = 0; player.cleansed = []; refreshStats(); player.hp = player.maxHp; renderHearts(); }

/** Cursed artifacts the mage holds that no shrine has cleansed yet, oldest first. */
export const heldCurses = () => player.items.filter(id => artifact(id).curse && !player.cleansed.includes(id));

/** Cleanse a cursed artifact the mage holds: its price goes and its gift is halved. */
export function cleanseArtifact(id: string) {
  if (!heldCurses().includes(id)) return false;
  player.cleansed.push(id); refreshStats();
  return true;
}

/** Give the mage an artifact. Returns the focus it replaced, if any. */
export function grantArtifact(def: ArtifactDef, silent = false): ArtifactDef | null {
  let replaced: ArtifactDef | null = null;
  if (def.kind === 'focus') { replaced = artifact(player.focus); player.focus = def.id; }
  else player.items.push(def.id);
  G.run.seen.add(def.id);
  if (def.gives) giveResources(def.gives); // the Sexton's Keyring's keys, the Glyphwright's Chalk's glyphs
  const formed = refreshStats(false);
  if (def.effects?.includes('fullHeal')) { player.hp = player.maxHp; renderHearts(); }
  if (!silent) { banner(def.name, def.text); artifactLore(def); if (def.kind === 'cursed') Sfx.cursed(); else Sfx.relic(); }
  // a transformation it completes is named after the artifact's own banner and card (M4.6), one after another
  formed.forEach((t, i) => { if (silent && !i) announce(t); else after((silent ? 0 : CFG.transform.after) + i * CFG.transform.banner, () => announce(t)); });
  return replaced;
}

/* ---------- budget: 3 to 5 per floor ---------- */

/** Call when a floor is built, with the number of guaranteed sources on it (treasure, boss, later ordeal). */
export function resetBudget(guaranteed: number) { G.run.budget = { used: 0, reserved: guaranteed }; }
/** An artifact for a guaranteed source; it always gets one while any are left. */
export function offerGuaranteed(pool: Pool) {
  const b = G.run.budget; b.reserved = Math.max(0, b.reserved - 1);
  const def = pickArtifact(G.run.loot, pool, G.run.seen);
  if (def) { G.run.seen.add(def.id); b.used++; }
  return def;
}
/** An artifact for an optional source, only while the floor's budget leaves room after the guaranteed ones. */
export function offerOptional(pool: Pool) {
  const b = G.run.budget;
  if (b.used + b.reserved >= CFG.artifacts.maxPerFloor) return null;
  const def = pickArtifact(G.run.loot, pool, G.run.seen);
  if (def) { G.run.seen.add(def.id); b.used++; }
  return def;
}

/** A relic outside the floor's budget (a gilded reliquary chest): now and then luck gives more. */
export function offerBeyondBudget(pool: Pool) {
  const def = pickArtifact(G.run.loot, pool, G.run.seen);
  if (def) G.run.seen.add(def.id);
  return def;
}

/** The second artifact of a choice (the boss's pair): offered, so it won't come back this run, but it
    doesn't count against the floor's budget since only one of the two can be taken. */
export function offerSecondChoice(pool: Pool) {
  const def = pickArtifact(G.run.loot, pool, G.run.seen);
  if (def) G.run.seen.add(def.id);
  return def;
}

/* ---------- pedestals ---------- */

/** What floats over an artifact's pedestal: its made model (data/assets.json, M3.5) turning about its middle in its
    glow; the room kit's (artifactLooks.ts: the artifact built in code as what it is); or the placeholder: foci a gem on a
    rod, cursed ones a dark gem in a thorn ring. */
export function makeArtifactVisual(def: ArtifactDef) {
  const g = new THREE.Group(); const color = hex(def.color), model = modelFor('artifacts', def.id);
  if (model) {
    model.position.y -= model.userData.height / 2; // (it stands on y = 0: lowered so it turns about its middle)
    g.add(model, glow(def.kind === 'cursed' ? CURSED_RED : color, 1.1, .6));
  } else if (DEV.roomKit) {
    const look = artifactLook(def.icon, def.color), K = CFG.roomKit; mergeStill(look); look.scale.setScalar(K.artifactScale); // (a touch larger: it must read at a glance)
    const half = new THREE.Box3().setFromObject(look).getSize(new THREE.Vector3()).y / 2;
    look.position.y = Math.max(0, half - K.artifactClear); // (a tall one lifted, so it never dips into its pedestal as it bobs)
    g.add(look, glowShared(def.kind === 'cursed' ? CURSED_RED : color, 1.1, .6));
  } else if (def.kind === 'focus') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .5, 6), M.frame.normal); rod.rotation.z = .5;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.11), new THREE.MeshBasicMaterial({ color })); gem.position.set(-.12, .2, 0);
    g.add(rod, gem, glow(color, 1.1, .8));
  } else if (def.kind === 'cursed') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.21, .03, 5, 12), M.frame.boss);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.14), new THREE.MeshStandardMaterial({ color: 0x14080a, emissive: color, emissiveIntensity: .6, roughness: .3 }));
    g.add(ring, gem, glow(CURSED_RED, 1.3, .7));
  } else {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .04, 8, 20), M.frame.treasure);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshBasicMaterial({ color }));
    g.add(ring, gem, glow(color, 1.2, .85));
  }
  return g;
}

/** The altar's price, floating above it: an empty heart and "−1". */
let priceTex: THREE.CanvasTexture | null = null;
function priceTag() {
  if (!priceTex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d')!;
    g.translate(8, 8); g.scale(2, 2);
    g.fillStyle = 'rgba(20,6,4,.8)'; g.strokeStyle = '#d23a2a'; g.lineWidth = 2;
    g.fill(new Path2D(HEART_PATH)); g.stroke(new Path2D(HEART_PATH));
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = 'bold 40px "Alegreya Sans", sans-serif'; g.fillStyle = '#f0d9b4'; g.textBaseline = 'middle'; g.fillText('−1', 64, 34);
    priceTex = new THREE.CanvasTexture(c); priceTex.colorSpace = THREE.SRGBColorSpace;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: priceTex, transparent: true, depthWrite: false }));
  s.scale.set(.9, .45, 1); return s;
}

/** Put an artifact on a new pedestal at world (x, z) in a room; `altar` builds a bone altar that asks a heart container. */
export function placeArtifact(room: Room, def: ArtifactDef, x: number, z: number, opts: { altar?: boolean } = {}): ArtifactSpot {
  const pedestal = new THREE.Group(); pedestal.position.set(x - room.cx, 0, z - room.cz);
  let price: ArtifactSpot['price'];
  const kit = DEV.roomKit && !!room.look.kinds; // (the room kit's pedestal and altar: objectLooks.ts)
  if (opts.altar && kit) {
    const look = altarLook(room.look); mergeStill(look); pedestal.add(look);
    const tag = priceTag(); tag.position.y = 1.75; pedestal.add(tag);
    price = { hearts: 1, tag };
  } else if (opts.altar) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(1, .55, .6), M.rock); slab.position.y = .28;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.08, .08, .68), M.bone); top.position.y = .6;
    pedestal.add(slab, top, blob(1.6));
    for (let i = 0; i < 3; i++) { // bones heaped against the front
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .42, 6), M.bone);
      b.position.set(-.3 + i * .3, .1, .36); b.rotation.set(Math.PI / 2, 0, .4 - i * .4); pedestal.add(b);
    }
    for (const cx of [-.4, .4]) { // two red candles
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .18, 8), new THREE.MeshStandardMaterial({ color: 0x7a1410, roughness: .6 }));
      candle.position.set(cx, .73, -.18); pedestal.add(candle);
      const flame = glow(0xff7a3a, .35, .9); flame.position.set(cx, .88, -.18); pedestal.add(flame);
    }
    const tag = priceTag(); tag.position.y = 1.75; pedestal.add(tag);
    price = { hearts: 1, tag };
  } else {
    const model = modelFor('props', 'pedestal'); // a made pedestal (M3.5), the room kit's, or the stone column
    if (model) pedestal.add(model, blob(1.3));
    else if (kit) { const look = pedestalLook(room.look); mergeStill(look); pedestal.add(look); }
    else {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.3, .38, .6, 8), M.rock); col.position.y = .3;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .1, 8), M.rock); top.position.y = .64;
      pedestal.add(col, top, blob(1.3));
    }
  }
  const visual = makeArtifactVisual(def); visual.position.y = 1.05; pedestal.add(visual);
  room.group.add(pedestal);
  const collider = opts.altar ? { x, z, hx: .5, hz: .32, hp: Infinity, breakable: false } : { x, z, hx: .4, hz: .4, hp: Infinity, breakable: false };
  room.rocks.push(collider);
  const spot: ArtifactSpot = { def, room, x, z, taken: false, armed: true, pedestal, visual, collider, price };
  room.spots.push(spot);
  return spot;
}

function setVisual(spot: ArtifactSpot, def: ArtifactDef) {
  spot.pedestal.remove(spot.visual); disposeTree(spot.visual);
  spot.def = def; spot.visual = makeArtifactVisual(def); spot.visual.position.y = 1.05; spot.pedestal.add(spot.visual);
}

/** Remove a pedestal entirely (the boss's other choice). */
function vanish(spot: ArtifactSpot) {
  spot.taken = true; spot.room.group.remove(spot.pedestal); disposeTree(spot.pedestal);
  spot.room.rocks = spot.room.rocks.filter(r => r !== spot.collider);
  burst(spot.x, .8, spot.z, 0x9a8a7a, 18, 2.4, .06); Sfx.vanish();
}

function take(spot: ArtifactSpot) {
  const def = spot.def;
  if (spot.price) { // a bone altar: pay a heart container, but never the last one
    if (player.maxHp - spot.price.hearts * 2 < 2) { banner(...STR.banner.altarRefuses); Sfx.refuse(); spot.armed = false; return; }
    player.heartsPaid += spot.price.hearts; refreshStats();
    burst(player.x, .8, player.z, 0xb3261a, 18, 2.4, .07); Sfx.altar();
    spot.price.tag.visible = false; spot.price = undefined;
  }
  const replaced = grantArtifact(def);
  burst(spot.x, 1, spot.z, hex(def.color), 26, 3, .07);
  if (replaced) { // a focus: the old one is left on the pedestal
    setVisual(spot, replaced); spot.armed = false;
    toast(STR.toast.focusLeft(replaced.name), 3.5);
  } else { spot.taken = true; spot.visual.visible = false; }
  if (spot.pair && !spot.pair.taken) vanish(spot.pair);
  spot.pair = undefined;
  renderMinimap();
}

/** Take an artifact the mage walks into (called every step while playing); not while a fight holds the
    doors shut, so a forced vault's warden guards its prize. */
export function checkArtifactPickup() {
  if (G.current.locked) return;
  for (const spot of G.current.spots) {
    if (spot.taken) continue;
    const d = Math.hypot(player.x - spot.x, player.z - spot.z);
    if (!spot.armed) { if (d > player.r + 1.2) spot.armed = true; continue; }
    if (d < player.r + .62) take(spot);
  }
}

export function updateArtifacts(now: number) {
  for (const r of G.rooms) for (const s of r.spots) {
    if (s.taken) continue;
    s.visual.position.y = 1.05 + Math.sin(now * 2 + s.x) * .08; s.visual.rotation.y = now * 1.2;
  }
  (G.current?.group.userData.artifactGallery as THREE.Group | undefined)?.children.forEach((v, i) => { v.rotation.y = now * 1.2 + i; });
}

/** Dev menu: every artifact floating ahead of world (x, z) in `room`, in rows by kind (foci, passives, cursed), to look
    at their looks (they can't be taken). Returns how many. */
export function showArtifactGallery(room: Room, x: number, z: number) {
  removeArtifactGallery(room);
  const g = new THREE.Group(), rows = (['focus', 'passive', 'cursed'] as const).flatMap(kind => {
    const all = ARTIFACT_DEFS.filter(d => d.kind === kind), out: ArtifactDef[][] = [];
    for (let i = 0; i < all.length; i += 12) out.push(all.slice(i, i + 12));
    return out;
  });
  rows.forEach((row, r) => row.forEach((def, i) => {
    const v = makeArtifactVisual(def); v.position.set(x - room.cx + (i - (row.length - 1) / 2) * .95, .8, z - room.cz - 1.4 - r * .95); g.add(v);
  }));
  room.group.add(g); room.group.userData.artifactGallery = g;
  return rows.flat().length;
}
/** Take the artifact gallery away. */
export function removeArtifactGallery(room: Room) {
  const g = room.group.userData.artifactGallery as THREE.Group | undefined; if (!g) return;
  room.group.remove(g); disposeTree(g); delete room.group.userData.artifactGallery;
}

/** Every artifact defined, for the ?give= dev option. */
export function giveById(ids: string[]) {
  for (const id of ids) { try { grantArtifact(artifact(id), true); } catch (e) { console.warn(String(e)); } }
}
