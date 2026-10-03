/* M6 RPG growth: insight and levels in the game (docs/M6-plan.md, step 1; the rules are levelData.ts). A foe put to rest
   pays its purse, a room its first clear, a boss its floor's sum, a potion's kind its first use in a run, the Grave
   Draught its sip. Each comes as a short streak of light (the foe's school's; insight's gold for the rest) running into
   the mage's casting hand: a streak, not a round mote, so it can't be taken for a soul mote. A level reached rises over
   the mage in a stepped glow and waits in `G.run.pending` for its choice (the level-up screen, step 4). The HUD's strip
   under the mana bar fills toward the next level, the badge beside the spell slots shows the level. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import type { Enemy, Room } from '../types';
import type { PotionId } from '../items/alchemyData';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { camera, scene } from '../render/renderer';
import { glowTex } from '../render/textures';
import { markShared } from '../render/materials';
import { SCHOOL_LIGHT } from '../render/arcane';
import { handAt } from '../actors/costume';
import { castSide } from '../actors/costumeFit';
import { burst } from '../combat/fx';
import { ringFx } from '../magic/spellFx';
import { floatText } from '../magic/statusFx';
import { line } from '../ui/hud';
import { $ } from '../util';
import { updateArc } from '../items/arc';
import { dress } from '../actors/costume';
import { LEVEL_CAP, bossInsight, clearInsight, insightAt, levelFor, levelProgress, potionInsight } from './levelData';

const L = CFG.levels, TOLD = 'ossuary.insightTold';

/* ---------- paying ---------- */

/** Gain `n` insight, its streak running from (x, z) to the casting hand in `color`. A level reached rises over the mage and
    waits for its choice; the first insight ever says what it is, the cap says it once a run. */
export function gainInsight(n: number, x = player.x, z = player.z, color: number = L.gold) {
  if (!(n > 0)) return;
  const was = G.run.level;
  G.run.insight += n; G.run.level = levelFor(G.run.insight);
  launch(x, z, color);
  if (!told()) { tell(); line(STR.levels.first, L.lineFirst); }
  if (G.run.level > was) leveled(was, G.run.level);
  renderInsight();
}

/** A foe put to rest pays its purse (killEnemy): not a boss (its floor's sum, `payBoss`), nor what a foe made (a nest's
    wasps, a golem's stones), a boss's helpers or the Wardlings a boss's ward breaks into. */
export function payPurse(e: Enemy) {
  if (e.isBoss || e.owner || e.servant || e.unpaid || !e.purse) return;
  gainInsight(e.purse, e.x, e.z, e.foe ? SCHOOL_LIGHT[e.foe.school] : L.gold);
}
/** A room's first clear (onRoomCleared): a fight or an ordeal, once. A boss room pays only its boss. */
export function payClear(room: Room) {
  if (room.paid || (room.type !== 'normal' && room.type !== 'ordeal')) return;
  room.paid = true; gainInsight(clearInsight(G.run.floor, room.type === 'ordeal'), room.cx, room.cz);
}
/** The floor's boss falls (onBossDead): its floor's sum, from where it fell. */
export function payBoss(at?: { x: number; z: number }) { gainInsight(bossInsight(G.run.floor), at?.x ?? G.current.cx, at?.z ?? G.current.cz); }
/** The jelly serpent out of its vat falls: its health ÷ `serpentDiv`. */
export function paySerpent(e: Enemy) { gainInsight(e.maxHp / L.serpentDiv, e.x, e.z, SCHOOL_LIGHT.verdant); }
/** A potion's kind used for the first time this run (drunk, thrown or named by Dr. Jelly). Known on sight pays nothing. */
export function potionUsed(id: PotionId) {
  if (G.run.potionsUsed.includes(id)) return;
  G.run.potionsUsed.push(id); gainInsight(potionInsight(G.run.floor));
}

/* ---------- a level ---------- */

/** From level `from` to `to`: each level's choice waits; the level reached rises over the mage once, however many it spans. */
function leveled(from: number, to: number) {
  G.run.pending += to - from;
  floatText(player.x, 2.1, player.z, STR.levels.up(to), L.gold);
  ringFx(player.x, .06, player.z, L.gold, .3, 1.6, .7, true); ringFx(player.x, .06, player.z, 0xfff4d0, .2, 1, .5, true);
  burst(player.x, .8, player.z, L.gold, 22, 2.2, .05); burst(player.x, 1.6, player.z, 0xfff4d0, 10, 1.2, .04);
  Sfx.levelUp();
  if (to >= LEVEL_CAP) line(STR.levels.cap, L.lineCap);
  const stage = G.run.arc; updateArc(); if (G.run.arc !== stage) dress(); // (M6 step 12: levels count toward Asyrion's arc)
}

/** The dev menu: set the level (its insight the level's start); levels gone up wait for their choice as any do. */
export function setLevel(level: number) {
  const lv = Math.max(1, Math.min(LEVEL_CAP, Math.round(level))), was = G.run.level;
  G.run.insight = insightAt(lv); G.run.level = lv;
  if (lv > was) leveled(was, lv); else G.run.pending = Math.min(G.run.pending, lv - 1);
  renderInsight();
}
/** Insight to reach the next level (0 at the cap). */
export const toNextLevel = () => { const p = levelProgress(G.run.insight); return p.span ? p.span - p.into : 0; };
/** What the dev hooks and the dev menu read. */
export const insightNow = () => ({ insight: G.run.insight, level: G.run.level, pending: G.run.pending, next: toNextLevel(), cap: LEVEL_CAP, potionsUsed: [...G.run.potionsUsed], streaks: flying.length });

/** The first insight ever is said once (kept in this browser, as the dev menu's tab is). */
function told() { try { return localStorage.getItem(TOLD) === '1'; } catch { return toldHere; } }
let toldHere = false;
function tell() { toldHere = true; try { localStorage.setItem(TOLD, '1'); } catch { /* said again next time */ } }

/* ---------- the HUD ---------- */

let strip: HTMLElement | null = null, badge: HTMLElement | null = null, shown = '';
/** The strip under the mana bar fills toward the next level (full at the cap); the badge beside the spell slots says the level. */
export function renderInsight() {
  strip ??= $('insight'); badge ??= $('level');
  if (!strip || !badge) return;
  const p = levelProgress(G.run.insight), k = p.span ? p.into / p.span : 1, key = p.level + ':' + k.toFixed(3) + ':' + G.run.pending;
  if (key === shown) return; shown = key;
  (strip.firstElementChild as HTMLElement).style.transform = `scaleX(${k})`;
  strip.classList.toggle('cap', !p.span); badge.classList.toggle('waits', G.run.pending > 0); // (a level's choice waiting: the badge glows)
  strip.setAttribute('aria-valuenow', String(Math.round(G.run.insight))); strip.setAttribute('aria-label', STR.levels.meter(p.level, Math.round(toNextLevel())));
  badge.innerHTML = `<small>${STR.levels.short}</small><b>${p.level}</b>`; badge.title = STR.levels.meter(p.level, Math.round(toNextLevel()));
}

/* ---------- the streaks ---------- */

/** A streak in flight: from (x, y, z), `t` seconds into its `L.streak.time`, in `color`. */
interface Streak { x: number; y: number; z: number; t: number; color: THREE.Color }
const flying: Streak[] = [];
let mesh: THREE.InstancedMesh | null = null, chimeAt = -1;
const WHITE = new THREE.Color(0xffffff), hand = new THREE.Vector3(), at = new THREE.Vector3(), scl = new THREE.Vector3(), mat4 = new THREE.Matrix4(), dim = new THREE.Color();

function launch(x: number, z: number, color: number, y = .7, delay = 0) {
  if (flying.length >= L.streak.max) flying.shift();
  flying.push({ x, y, z, t: -delay, color: new THREE.Color(color) });
}
/** M6 step 9: a streak of `color` from (x, y, z) to the casting hand after `delay` seconds, paying nothing (a waystone's
    rest sends mana this way). */
export const streakTo = (x: number, y: number, z: number, color: number, delay = 0) => launch(x, z, color, y, delay);
/** One instanced mesh for every streak and its trail (one draw call), facing the camera, in the stepped glow. */
function streakMesh() {
  if (mesh) return mesh;
  const S = L.streak, geo = markShared(new THREE.PlaneGeometry(1, 1));
  const mat = markShared(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  mesh = new THREE.InstancedMesh(geo, mat, S.max * (S.trail + 1)); mesh.frustumCulled = false; mesh.renderOrder = 9; mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  return mesh;
}
/** Where a streak is at `k` (0 to 1) of its way: rising in an arc from where it began to the casting hand. */
function along(s: Streak, k: number, out: THREE.Vector3) {
  const e = k * k * (3 - 2 * k);
  out.set(s.x + (hand.x - s.x) * e, s.y + (hand.y - s.y) * e + Math.sin(Math.PI * k) * L.streak.rise, s.z + (hand.z - s.z) * e);
  return out;
}

/** Each step: the streaks fly to the hand and go out there, a soft chime as they arrive. */
export function updateInsight(dt: number) {
  if (!flying.length && !mesh?.count) return;
  const S = L.streak, m = streakMesh();
  if (!handAt(castSide(), hand)) hand.set(player.x, 1, player.z);
  let n = 0;
  for (let i = flying.length - 1; i >= 0; i--) {
    const s = flying[i]; s.t += dt;
    const k = s.t / S.time;
    if (k < 0) continue; // (not off yet)
    if (k >= 1) {
      flying.splice(i, 1); burst(hand.x, hand.y, hand.z, s.color.getHex(), 3, .8, .03);
      if (G.simClock - chimeAt > L.chimeGap) { chimeAt = G.simClock; Sfx.insight(); }
      continue;
    }
    for (let j = 0; j <= S.trail && n < m.instanceMatrix.count; j++) { // the head, white-hot, then its trail, smaller and fainter
      const kj = k - j * S.gap; if (kj <= 0) break;
      const fall = 1 - j / (S.trail + 1), size = S.size * fall;
      mat4.compose(along(s, kj, at), camera.quaternion, scl.set(size, size, size));
      m.setMatrixAt(n, mat4); m.setColorAt(n, j ? dim.copy(s.color).multiplyScalar(fall) : dim.copy(s.color).lerp(WHITE, .45)); n++;
    }
  }
  m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

/** A new run: no streaks in flight, the HUD shown afresh. */
export function resetInsight() { flying.length = 0; if (mesh) mesh.count = 0; shown = ''; renderInsight(); }
