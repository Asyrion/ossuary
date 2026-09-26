/* Artifacts in the world: pedestals, taking them (and swapping foci), the per-floor budget, and applying
   what the mage holds to their stats. The data and the combining rules are in artifactData.ts. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { ArtifactSpot, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, blob, glow } from '../render/materials';
import { burst } from '../combat/fx';
import { banner, renderHearts, renderItems, renderMinimap, toast } from '../ui/hud';
import { START_FOCUS, artifact, computeStats, pickArtifact, type ArtifactDef, type Pool } from './artifactData';

const hex = (c: string) => new THREE.Color(c).getHex();

/* ---------- stats ---------- */

/** Recompute the mage's stats from what they hold; heart containers gained come filled. */
export function refreshStats() {
  const before = player.maxHp;
  player.stats = computeStats(player.focus, player.items, CFG.hero);
  player.maxHp = player.stats.maxHp;
  if (player.maxHp > before) player.hp += player.maxHp - before;
  player.hp = Math.min(player.hp, player.maxHp);
  renderHearts(); renderItems();
}

/** Start a run holding only the starting focus. */
export function resetArtifacts() { player.focus = START_FOCUS; player.items = []; refreshStats(); player.hp = player.maxHp; renderHearts(); }

/** Give the mage an artifact. Returns the focus it replaced, if any. */
export function grantArtifact(def: ArtifactDef, silent = false): ArtifactDef | null {
  let replaced: ArtifactDef | null = null;
  if (def.kind === 'focus') { replaced = artifact(player.focus); player.focus = def.id; }
  else player.items.push(def.id);
  G.run.seen.add(def.id);
  refreshStats();
  if (def.effects?.includes('fullHeal')) { player.hp = player.maxHp; renderHearts(); }
  if (!silent) { banner(def.name, def.text); Sfx.relic(); }
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

/** The second artifact of a choice (the boss's pair): offered, so it won't come back this run, but it
    doesn't count against the floor's budget since only one of the two can be taken. */
export function offerSecondChoice(pool: Pool) {
  const def = pickArtifact(G.run.loot, pool, G.run.seen);
  if (def) G.run.seen.add(def.id);
  return def;
}

/* ---------- pedestals ---------- */

/** The floating placeholder for an artifact: foci are a gem on a rod, cursed ones a dark gem in a thorn ring. */
export function makeArtifactVisual(def: ArtifactDef) {
  const g = new THREE.Group(); const color = hex(def.color);
  if (def.kind === 'focus') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .5, 6), M.frame.normal); rod.rotation.z = .5;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.11), new THREE.MeshBasicMaterial({ color })); gem.position.set(-.12, .2, 0);
    g.add(rod, gem, glow(color, 1.1, .8));
  } else if (def.kind === 'cursed') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.21, .03, 5, 12), M.frame.boss);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.14), new THREE.MeshStandardMaterial({ color: 0x14080a, emissive: color, emissiveIntensity: .6, roughness: .3 }));
    g.add(ring, gem, glow(0xb0201a, 1.3, .7));
  } else {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .04, 8, 20), M.frame.treasure);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshBasicMaterial({ color }));
    g.add(ring, gem, glow(color, 1.2, .85));
  }
  return g;
}

/** Put an artifact on a new pedestal at world (x, z) in a room. */
export function placeArtifact(room: Room, def: ArtifactDef, x: number, z: number): ArtifactSpot {
  const pedestal = new THREE.Group(); pedestal.position.set(x - room.cx, 0, z - room.cz);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(.3, .38, .6, 8), M.rock); col.position.y = .3;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .1, 8), M.rock); top.position.y = .64;
  pedestal.add(col, top, blob(1.3));
  const visual = makeArtifactVisual(def); visual.position.y = 1.05; pedestal.add(visual);
  room.group.add(pedestal);
  const collider = { x, z, hx: .4, hz: .4, hp: Infinity, breakable: false };
  room.rocks.push(collider);
  const spot: ArtifactSpot = { def, room, x, z, taken: false, armed: true, pedestal, visual, collider };
  room.spots.push(spot);
  return spot;
}

function setVisual(spot: ArtifactSpot, def: ArtifactDef) {
  spot.pedestal.remove(spot.visual);
  spot.def = def; spot.visual = makeArtifactVisual(def); spot.visual.position.y = 1.05; spot.pedestal.add(spot.visual);
}

/** Remove a pedestal entirely (the boss's other choice). */
function vanish(spot: ArtifactSpot) {
  spot.taken = true; spot.room.group.remove(spot.pedestal);
  spot.room.rocks = spot.room.rocks.filter(r => r !== spot.collider);
  burst(spot.x, .8, spot.z, 0x9a8a7a, 18, 2.4, .06); Sfx.splash();
}

function take(spot: ArtifactSpot) {
  const def = spot.def;
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

/** Take an artifact the mage walks into (called every step while playing). */
export function checkArtifactPickup() {
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
}

/** Every artifact defined, for the ?give= dev option. */
export function giveById(ids: string[]) {
  for (const id of ids) { try { grantArtifact(artifact(id), true); } catch (e) { console.warn(String(e)); } }
}
