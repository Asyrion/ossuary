import * as THREE from 'three';
import relicData from '../../data/relics.json';
import type { RelicDef, RelicSpot } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { M, glow } from '../render/materials';
import { burst } from '../combat/fx';
import { banner, renderItems, renderMinimap } from '../ui/hud';

export const RELICS = new Map<string, RelicDef>((relicData as RelicDef[]).map(r => [r.id, r]));

export function relicDef(id: string) {
  const def = RELICS.get(id);
  if (!def) throw new Error(`Unknown relic "${id}"`);
  return def;
}

/** Floating relic placeholder (ring + gem + glow) for a pedestal. */
export function makeRelicVisual(def: RelicDef) {
  const relic = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .04, 8, 20), M.frame.treasure);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.13), new THREE.MeshBasicMaterial({ color: def.color }));
  relic.add(ring, gem, glow(0xff9030, 1.2, .9));
  return relic;
}

export function takeRelic(relic: RelicSpot) {
  relic.taken = true; relic.group.visible = false;
  const fx = relic.def.effects;
  if (fx.damageAdd) player.damage += fx.damageAdd;
  if (fx.boltScale) player.boltScale = fx.boltScale;
  if (fx.boltColor) player.boltColor = new THREE.Color(fx.boltColor).getHex();
  player.items.push(relic.def.id);
  renderItems(); renderMinimap(); Sfx.relic();
  burst(relic.x, 1, relic.z, new THREE.Color(relic.def.color).getHex(), 26, 3, .07);
  banner(relic.def.name, relic.def.pickup);
}

export function updateRelics(now: number) {
  for (const r of G.rooms) {
    if (r.relic && !r.relic.taken) { r.relic.group.position.y = 1.05 + Math.sin(now * 2) * .08; r.relic.group.rotation.y = now * 1.2; }
  }
}
