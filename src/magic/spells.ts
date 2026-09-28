/* Spells in play (GDD: Magic system): two slots on Q and E (LB and RB), paid with mana and held back by a
   cooldown, aimed like the cantrip (the cast direction, or where the mage last walked). Mana comes back over
   time, faster out of a fight, and from every foe the cantrip puts to rest: the dead give back what the spell
   spent. Each spell's `shape` (data/spells.json) is a function here. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy, Vec2 } from '../types';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { glowShared, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { heroCast } from '../actors/hero';
import { flashMana, renderSpells, spellIcon, toast } from '../ui/hud';
import { showLore } from '../ui/lore';
import { manaRegen, spell, type Shape, type SpellDef } from './spellData';

const hex = (c: string) => parseInt(c.slice(1), 16);

/* ---------- mana ---------- */

/** Give (or, negative, take) mana, within 0 and the most the mage can hold. */
export function gainMana(n: number) { player.mana = Math.max(0, Math.min(player.stats.maxMana, player.mana + n)); }

/* ---------- slots ---------- */

/** Learn a spell into a slot (the first empty one unless `slot` says); returns the spell it replaced. */
export function learnSpell(id: string, slot?: number, silent = false): string | null {
  const def = spell(id);
  const at = slot ?? Math.max(0, player.spells.indexOf(null));
  const replaced = player.spells[at];
  player.spells[at] = id; player.spellCd[at] = 0;
  renderSpells();
  if (!silent) {
    Sfx.learn();
    showLore({ name: def.name, kind: STR.spellKind(STR.schools[def.school]), effect: STR.spellEffect(def.text, def.mana, def.cooldown), lore: def.lore, icon: spellIcon(def.id) });
  }
  return replaced;
}
/** Forget every spell (a new run, or the dev menu). */
export function forgetSpells() { player.spells = [null, null]; player.spellCd = [0, 0]; renderSpells(); }

/** Where a spell cast now goes: the held cast direction, or where the mage last aimed or walked. */
export function aimDir(cast: Vec2 | null): Vec2 { return cast ?? player.aim; }

/** Cast the spell in `slot`, or refuse: no spell there, still cooling down, too little mana, nothing to strike. */
export function castSpell(slot: number, cast: Vec2 | null) {
  const id = player.spells[slot];
  if (!id) { toast(STR.toast.noSpell, 2.5); Sfx.spellFail(); return false; }
  const def = spell(id);
  if (player.spellCd[slot] > 0) { Sfx.spellFail(); flashMana(slot, 'cooldown'); return false; }
  if (player.mana < def.mana && !DEV.mana) { Sfx.spellFail(); flashMana(slot, 'mana'); return false; }
  if (!CAST[def.shape](def, aimDir(cast))) { Sfx.spellFail(); flashMana(slot, 'target'); return false; }
  if (!DEV.mana) gainMana(-def.mana);
  player.spellCd[slot] = def.cooldown;
  heroCast();
  return true;
}

/** Mana comes back (faster out of a fight), cooldowns run down, and effects fade. Runs every step; `acting` is
    false while paused or in a pan. */
export function updateMagic(dt: number, acting: boolean) {
  if (acting) {
    const fighting = G.current.locked;
    gainMana(manaRegen(dt, fighting, CFG.mana));
    if (DEV.mana) player.mana = player.stats.maxMana;
    for (let i = 0; i < player.spellCd.length; i++) player.spellCd[i] = Math.max(0, player.spellCd[i] - dt);
  }
  updateBolts(dt);
}

/* ---------- targets ---------- */

const alive = (e: Enemy) => !e.dead && e.spawn <= 0 && !e.hidden;
/** The foe a spell cast from (x, z) along `dir` should strike: near, and rather in front than behind. */
function pickTarget(x: number, z: number, dir: Vec2, range: number, skip: Set<Enemy> = new Set()) {
  let best: Enemy | null = null, bs = Infinity;
  for (const e of G.enemies) {
    if (!alive(e) || skip.has(e)) continue;
    const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
    if (d > range) continue;
    const facing = d > .01 ? (dx * dir.x + dz * dir.z) / d : 1;
    const score = d * (1.4 - .4 * facing);
    if (score < bs) { bs = score; best = e; }
  }
  return best;
}

/* ---------- the shapes ---------- */

type Cast = (def: SpellDef, dir: Vec2) => boolean;
const notYet: Cast = () => false;

/** Chain (Arc): strike the foe nearest in front, then leap to the nearest foe not yet struck, a few times,
    each strike a little weaker. */
const chain: Cast = (def, dir) => {
  const P = def.params, first = pickTarget(player.x, player.z, dir, P.range);
  if (!first) return false;
  const hit = new Set<Enemy>([first]), path: Enemy[] = [first];
  for (let i = 0; i < P.jumps; i++) {
    const last = path[path.length - 1], next = pickTarget(last.x, last.z, dir, P.jumpRange, hit);
    if (!next) break;
    hit.add(next); path.push(next);
  }
  const color = hex(def.color);
  let from = { x: player.x + dir.x * .3, y: 1.05, z: player.z + dir.z * .3 };
  path.forEach((e, i) => {
    const to = { x: e.x, y: e.flying ? .85 : .55, z: e.z };
    lightning(from, to, color);
    const dx = e.x - from.x, dz = e.z - from.z, d = Math.hypot(dx, dz) || 1;
    damageEnemy(e, def.damage * Math.pow(P.falloff, i), dx / d, dz / d, .4, 'spell');
    burst(to.x, to.y, to.z, color, 8, 2.2, .04);
    from = to;
  });
  Sfx.arc(path.length);
  return true;
};

const CAST: Record<Shape, Cast> = { chain, beam: notYet, placed: notYet, shotgun: notYet, wall: notYet, self: notYet };

/* ---------- lightning ---------- */

/** A bolt of lightning between two points: three jagged strands, braided and re-jagged every frame so it
    flickers, with a glow along it in the spell's colour, gone in a fifth of a second. */
const bolts: { g: THREE.Group; lines: THREE.Line[]; glows: THREE.Sprite[]; a: THREE.Vector3; b: THREE.Vector3; t: number }[] = [];
const BOLT_LIFE = .22, BOLT_SEGS = 8, STRANDS = 3;
let strandMat: THREE.LineBasicMaterial | null = null;
function lightning(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, color: number) {
  strandMat ??= markShared(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const g = new THREE.Group(), lines: THREE.Line[] = [], glows: THREE.Sprite[] = [];
  for (let s = 0; s < STRANDS; s++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((BOLT_SEGS + 1) * 3), 3));
    const line = new THREE.Line(geo, strandMat); g.add(line); lines.push(line);
  }
  for (let i = 0; i <= BOLT_SEGS; i++) { const s = glowShared(color, .7, .7); g.add(s); glows.push(s); } // the glow along it
  scene.add(g);
  const bolt = { g, lines, glows, a: new THREE.Vector3(a.x, a.y, a.z), b: new THREE.Vector3(b.x, b.y, b.z), t: 0 };
  jag(bolt); bolts.push(bolt);
}
function jag(bolt: (typeof bolts)[number]) {
  const len = bolt.a.distanceTo(bolt.b);
  bolt.lines.forEach((line, s) => {
    const pos = line.geometry.getAttribute('position') as THREE.BufferAttribute, amp = len * (s ? .12 : .07);
    for (let i = 0; i <= BOLT_SEGS; i++) {
      const k = i / BOLT_SEGS, j = i && i < BOLT_SEGS ? amp : 0;
      const x = bolt.a.x + (bolt.b.x - bolt.a.x) * k + (Math.random() - .5) * j, y = bolt.a.y + (bolt.b.y - bolt.a.y) * k + (Math.random() - .5) * j, z = bolt.a.z + (bolt.b.z - bolt.a.z) * k + (Math.random() - .5) * j;
      pos.setXYZ(i, x, y, z);
      if (!s) bolt.glows[i].position.set(x, y, z);
    }
    pos.needsUpdate = true;
  });
}
const dropBolt = (b: (typeof bolts)[number]) => { scene.remove(b.g); for (const l of b.lines) l.geometry.dispose(); };
function updateBolts(dt: number) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; b.t += dt;
    if (b.t >= BOLT_LIFE) { dropBolt(b); bolts.splice(i, 1); continue; }
    jag(b); b.g.visible = Math.random() > .15; // a flicker
  }
}
/** A new floor or run: no lightning left hanging. */
export function clearSpellFx() { for (const b of bolts) dropBolt(b); bolts.length = 0; }
