/* The shapes spells take (GDD: Spells). Each spell's `shape` in data/spells.json is a cast function here, and
   whatever a cast leaves behind runs its course in `updateShapes`: a beam of fire fading, a seal waiting to
   erupt and the ground burning after it, a wall of ice, the storm wrapped around the mage, lightning. The
   numbers a shape reads are the spell's `params`; damage and statuses go through `damageEnemy` and `inflict`
   like everything else, and projectile spells through the bolt pipeline. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Box, Enemy, Room, Vec2 } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { glow, glowShared, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { fireSpellBolt, strikeSolid } from '../combat/projectiles';
import { detonateGlyph } from '../combat/glyphs';
import { blockers, boxAt, pointInBoxes } from '../world/collision';
import { canAct } from './status';
import type { Shape, SpellDef } from './spellData';
import { flash, inflict } from './statusFx';

const hex = (c: string) => parseInt(c.slice(1), 16);
const FIRE = 0xff7a2a, EMBER = 0xffc060, ICE = 0xbfe6ff;

/** Cast a spell along `dir`; false when there is nothing for it to do (no foe in reach, no room for a wall). */
export type Cast = (def: SpellDef, dir: Vec2) => boolean;

/* ---------- targets ---------- */

const alive = (e: Enemy) => !e.dead && e.spawn <= 0 && !e.hidden;
const foeY = (e: Enemy) => e.flying ? .85 : .55;
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
/** From (x, z) towards a foe: the direction (any, when on top of it) and the distance. */
function away(e: Enemy, x: number, z: number) {
  const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
  return d > .01 ? { x: dx / d, z: dz / d, d } : { x: 1, z: 0, d };
}
/** Fire sets off the blast glyphs `touches` says it reached; `spareFeet` leaves the one the mage stands on, as
    bolts do. */
function igniteGlyphs(touches: (x: number, z: number) => boolean, spareFeet: boolean) {
  for (const gl of [...G.glyphs]) {
    if (gl.spent || (spareFeet && Math.hypot(gl.x - player.x, gl.z - player.z) < CFG.glyph.boltArm)) continue;
    if (touches(gl.x, gl.z)) detonateGlyph(gl);
  }
}

/* ---------- chain: Arc ---------- */

/** Strike the foe nearest in front, then leap to the nearest foe not yet struck, a few times, each strike a
    little weaker. */
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
    const to = { x: e.x, y: foeY(e), z: e.z };
    lightning(from, to, color);
    const dx = e.x - from.x, dz = e.z - from.z, d = Math.hypot(dx, dz) || 1;
    damageEnemy(e, def.damage * Math.pow(P.falloff, i), dx / d, dz / d, .4, 'spell');
    inflict(e, def.status);
    burst(to.x, to.y, to.z, color, 8, 2.2, .04);
    from = to;
  });
  Sfx.arc(path.length);
  return true;
};

/* ---------- beam: Cinder Lance ---------- */

/** A beam from just ahead of the mage until a wall, closed door or rock stops it: every foe in its line is struck
    and set burning, whatever it ends on is struck like a bolt (an urn breaks), and glyphs it crosses go off. */
const beam: Cast = (def, dir) => {
  const P = def.params, room = G.current, solids = blockers(room, 'bolt'), color = hex(def.color);
  const sx = player.x + dir.x * .3, sz = player.z + dir.z * .3;
  let len = 0, stop: Box | undefined;
  while (len < P.range && !(stop = boxAt(sx + dir.x * len, sz + dir.z * len, solids))) len += .1;
  len = Math.min(len, P.range);
  if (stop) strikeSolid(room, stop, sx + dir.x * len, .6, sz + dir.z * len);
  // how far along the beam, and how far to one side of it, a point is
  const along = (x: number, z: number) => (x - sx) * dir.x + (z - sz) * dir.z;
  const side = (x: number, z: number) => Math.abs((x - sx) * dir.z - (z - sz) * dir.x);
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    const t = along(e.x, e.z);
    if (t < -e.r || t > len + e.r || side(e.x, e.z) > e.r + P.width) continue;
    damageEnemy(e, def.damage, dir.x, dir.z, .5, 'spell');
    inflict(e, def.status);
    burst(e.x, foeY(e), e.z, color, 8, 2.4, .05);
  }
  igniteGlyphs((x, z) => { const t = along(x, z); return t > 0 && t < len && side(x, z) < CFG.glyph.boltReach; }, true);
  beamFx(sx, sz, dir, len, color);
  for (let t = .4; t < len; t += .6) burst(sx + dir.x * t, .6, sz + dir.z * t, t % 1.2 < .6 ? FIRE : EMBER, 2, 1.4, .045);
  Sfx.lance();
  return true;
};

/** The beam's look: two crossed ribbons (one flat, one upright, so it reads in any direction) in the spell's
    colour around a white-hot core, and glows along it, all narrowing to nothing in a third of a second. */
const beams: { g: THREE.Group; ribbons: THREE.Mesh[]; glows: THREE.Sprite[]; t: number }[] = [];
const BEAM_LIFE = .35;
let ribbonGeo: THREE.PlaneGeometry | null = null, stripe: THREE.CanvasTexture | null = null;
const ribbonMats = new Map<number, THREE.MeshBasicMaterial>();
function ribbonMat(color: number) {
  let m = ribbonMats.get(color);
  if (!m) {
    stripe ??= stripeTexture();
    m = markShared(new THREE.MeshBasicMaterial({ map: stripe, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ribbonMats.set(color, m);
  }
  return m;
}
/** A soft stripe: bright in the middle, fading to nothing at both edges (a beam seen across). */
function stripeTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(.5, 'rgba(255,255,255,1)');
  gr.addColorStop(.7, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function beamFx(sx: number, sz: number, dir: Vec2, len: number, color: number) {
  ribbonGeo ??= markShared(new THREE.PlaneGeometry(1, 1));
  const g = new THREE.Group(), ribbons: THREE.Mesh[] = [], glows: THREE.Sprite[] = [];
  g.position.set(sx + dir.x * len / 2, .6, sz + dir.z * len / 2); g.rotation.y = Math.atan2(-dir.z, dir.x);
  for (const [c, w] of [[color, .7], [0xfff2d8, .22]] as const) for (const flat of [true, false]) {
    const m = new THREE.Mesh(ribbonGeo, ribbonMat(c)); m.scale.set(len, w, 1); m.userData.w = w;
    if (flat) m.rotation.x = -Math.PI / 2;
    g.add(m); ribbons.push(m);
  }
  for (let t = .2; t < len; t += .7) { const s = glowShared(color, 1, .7); s.position.x = t - len / 2; g.add(s); glows.push(s); }
  scene.add(g); beams.push({ g, ribbons, glows, t: 0 });
}
function updateBeams(dt: number) {
  for (let i = beams.length - 1; i >= 0; i--) {
    const b = beams[i]; b.t += dt;
    if (b.t >= BEAM_LIFE) { scene.remove(b.g); beams.splice(i, 1); continue; }
    const w = Math.pow(1 - b.t / BEAM_LIFE, .6) * (.85 + Math.random() * .3);
    for (const r of b.ribbons) r.scale.y = r.userData.w * w;
    for (const s of b.glows) s.scale.setScalar(w);
  }
}

/* ---------- placed: Pyre Seal ---------- */

/** A seal chalked in fire at the mage's feet: it brightens and turns for a heartbeat, then erupts (a ring of
    flame that strikes, sets burning and throws back every foe in it, and sets off glyphs), and the ground in
    it burns for a while after, setting foes that walk on it burning again. */
const seals: { def: SpellDef; x: number; z: number; t: number; mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; erupted: boolean; tick: number }[] = [];
let flatGeo: THREE.PlaneGeometry | null = null, sealTex: THREE.CanvasTexture | null = null;
const placed: Cast = def => {
  const P = def.params, color = hex(def.color);
  flatGeo ??= markShared(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const mat = new THREE.MeshBasicMaterial({ map: sealTex ??= sealTexture(), color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.Mesh(flatGeo, mat); mesh.scale.set(P.radius * 2, 1, P.radius * 2); mesh.position.set(player.x, .03, player.z); mesh.renderOrder = 2;
  scene.add(mesh);
  seals.push({ def, x: player.x, z: player.z, t: 0, mesh, mat, erupted: false, tick: 0 });
  burst(player.x, .1, player.z, color, 10, 1.6, .04); Sfx.sealPlace();
  return true;
};
/** The seal: two rings with ticks between them, a seven-pointed star and a flame at its heart, in white (the
    material gives it the spell's colour). */
function sealTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!;
  g.translate(128, 128); g.strokeStyle = g.fillStyle = '#fff'; g.lineCap = 'round';
  g.lineWidth = 7; g.beginPath(); g.arc(0, 0, 118, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, r = i % 3 ? 110 : 116;
    g.beginPath(); g.moveTo(Math.cos(a) * 103, Math.sin(a) * 103); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
  }
  g.lineWidth = 4; g.beginPath();
  for (let i = 0; i <= 7; i++) { const a = (i * 3 % 7) / 7 * Math.PI * 2 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * 96, Math.sin(a) * 96); }
  g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(22, 2, 0, 26); g.quadraticCurveTo(-22, 2, 0, -30); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function updateSeals(dt: number) {
  for (let i = seals.length - 1; i >= 0; i--) {
    const s = seals[i], P = s.def.params; s.t += dt;
    if (!s.erupted) { // brighter and faster as it's about to erupt
      const k = Math.min(1, s.t / P.delay);
      s.mat.opacity = .25 + .6 * k + Math.sin(s.t * 30) * .1 * k;
      s.mesh.rotation.y += dt * (1 + 3 * k);
      if (Math.random() < dt * 20) { const a = Math.random() * Math.PI * 2; flame(s.x + Math.cos(a) * P.radius * .92, s.z + Math.sin(a) * P.radius * .92, FIRE, .35); }
      if (s.t >= P.delay) erupt(s);
      continue;
    }
    const left = P.delay + P.ground - s.t;
    if (left <= 0) { scene.remove(s.mesh); s.mat.dispose(); seals.splice(i, 1); continue; }
    s.mat.opacity = Math.min(1, left) * (.4 + Math.sin(s.t * 13) * .08 + Math.random() * .06);
    // flames lick up from the burning ground, and it sets burning what walks on it (not what flies above)
    if (Math.random() < dt * 40 * Math.min(1, left)) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * P.radius; flame(s.x + Math.cos(a) * r, s.z + Math.sin(a) * r, Math.random() < .6 ? FIRE : EMBER, .4 + Math.random() * .35); }
    s.tick -= dt;
    if (s.tick <= 0) {
      s.tick = .25;
      for (const e of G.enemies) if (alive(e) && !e.flying && Math.hypot(e.x - s.x, e.z - s.z) < P.radius + e.r * .5) inflict(e, { burn: P.groundBurn });
      if (Math.random() < .4) Sfx.crackle();
    }
  }
}
function erupt(s: (typeof seals)[number]) {
  const def = s.def, P = def.params;
  s.erupted = true; s.mat.color.setHex(FIRE);
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    const u = away(e, s.x, s.z);
    if (u.d > P.radius + e.r) continue;
    damageEnemy(e, def.damage, u.x, u.z, 0, 'spell');
    inflict(e, def.status);
    if (!e.isBoss) { e.kx += u.x * P.knockback; e.kz += u.z * P.knockback; }
  }
  igniteGlyphs((x, z) => Math.hypot(x - s.x, z - s.z) < P.radius, false);
  for (let i = 0; i < 20; i++) { // a ring of flame, and a burst in the middle
    const a = i / 20 * Math.PI * 2, x = s.x + Math.cos(a) * P.radius, z = s.z + Math.sin(a) * P.radius;
    flame(x, z, i % 2 ? FIRE : EMBER, .7); if (i % 2) burst(x, .2, z, FIRE, 2, 2.2, .06);
  }
  burst(s.x, .3, s.z, FIRE, 14, 3.2, .08);
  flash(s.x, s.z, 0xff8a3a, P.radius);
  Sfx.sealErupt(); G.shake = Math.max(G.shake, .25);
}

/** Tongues of flame, and motes: glows rising and shrinking away (shared materials, so nothing to free). */
const flames: { s: THREE.Sprite; t: number; size: number }[] = [];
const FLAME_LIFE = .55;
function flame(x: number, z: number, color: number, size: number, y = .12) {
  const s = glowShared(color, size, .85); s.position.set(x, y, z); scene.add(s); flames.push({ s, t: 0, size });
}
/** A mote of light rising from (x, y, z) and fading (a grimoire page's whisper). */
export const riseMote = (x: number, y: number, z: number, color: number, size = .18) => flame(x, z, color, size, y);
function updateFlames(dt: number) {
  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i]; f.t += dt;
    if (f.t >= FLAME_LIFE) { scene.remove(f.s); flames.splice(i, 1); continue; }
    f.s.position.y += dt * 1.1; f.s.scale.setScalar(f.size * (1 - f.t / FLAME_LIFE));
  }
}

/* ---------- shotgun: Rime Shards ---------- */

/** A fan of ice shards from the mage, each a spell bolt that chills what it strikes. */
const shotgun: Cast = (def, dir) => {
  const P = def.params, color = hex(def.color), base = Math.atan2(dir.z, dir.x);
  for (let i = 0; i < P.count; i++) {
    const a = base + (i - (P.count - 1) / 2) * P.fan, dx = Math.cos(a), dz = Math.sin(a);
    fireSpellBolt(player.x + dx * .3, player.z + dz * .3, dx, dz, { damage: def.damage, range: P.range, speed: P.speed, color, status: def.status, shard: true });
  }
  burst(player.x + dir.x * .4, .7, player.z + dir.z * .4, color, 8, 2, .04);
  Sfx.shards();
  return true;
};

/* ---------- wall: Glacial Wall ---------- */

/** A wall of ice crystals across the cast direction, a little ahead of the mage (nearer when something is in the
    way), stopping at walls and rocks. It stops the mage, foes and their shots, not the mage's bolts; when its
    time is up it shatters, striking and chilling every foe near it. */
const walls: { def: SpellDef; room: Room; boxes: Box[]; g: THREE.Group; crystals: THREE.Mesh[]; t: number }[] = [];
let crystal: { geo: THREE.ConeGeometry; mat: THREE.MeshStandardMaterial } | null = null;
const ICE_HALF = .27;
const wall: Cast = (def, dir) => {
  const P = def.params, room = G.current, solids = blockers(room, 'bolt');
  const px = -dir.z, pz = dir.x; // across the cast direction
  let ahead = P.ahead;
  while (ahead > .9 && pointInBoxes(player.x + dir.x * ahead, player.z + dir.z * ahead, ICE_HALF, solids)) ahead -= .1;
  const cx = player.x + dir.x * ahead, cz = player.z + dir.z * ahead;
  if (pointInBoxes(cx, cz, ICE_HALF, solids)) return false;
  // from the middle outwards on both sides, until a wall or rock is in the way
  const n = Math.max(1, Math.round(P.width / (ICE_HALF * 1.6))), step = P.width / n, spots = [{ x: cx, z: cz }];
  for (const s of [-1, 1]) for (let k = 1; k <= n / 2; k++) {
    const x = cx + px * s * k * step, z = cz + pz * s * k * step;
    if (pointInBoxes(x, z, ICE_HALF * .5, solids)) break;
    spots.push({ x, z });
  }
  crystal ??= {
    geo: markShared(new THREE.ConeGeometry(.3, 1, 5).translate(0, .5, 0)),
    mat: markShared(new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: .82, roughness: .15, metalness: .1, emissive: 0x2a5a8a, flatShading: true })),
  };
  const g = new THREE.Group(), crystals: THREE.Mesh[] = [], boxes: Box[] = [];
  for (const p of spots) {
    for (let j = 0; j < 2; j++) { // a tall crystal, and a shorter one leaning off it
      const m = new THREE.Mesh(crystal.geo, crystal.mat), h = j ? .5 + Math.random() * .3 : .95 + Math.random() * .45;
      m.position.set(p.x + (j ? (Math.random() - .5) * .3 : 0), 0, p.z + (j ? (Math.random() - .5) * .3 : 0));
      m.rotation.set((Math.random() - .5) * .25 + (j ? .35 : 0), Math.random() * Math.PI * 2, (Math.random() - .5) * .25);
      m.userData.h = h; m.scale.set(1, .02, 1); g.add(m); crystals.push(m);
    }
    boxes.push({ x: p.x, z: p.z, hx: ICE_HALF, hz: ICE_HALF });
    burst(p.x, .3, p.z, ICE, 3, 1.8, .045);
  }
  scene.add(g);
  room.barriers = [...(room.barriers ?? []), ...boxes];
  walls.push({ def, room, boxes, g, crystals, t: 0 });
  Sfx.wallRise();
  return true;
};
function updateWalls(dt: number) {
  for (let i = walls.length - 1; i >= 0; i--) {
    const w = walls[i]; w.t += dt;
    const left = w.def.params.life - w.t;
    const rise = 1 - Math.pow(1 - Math.min(1, w.t / .18), 3);
    for (const m of w.crystals) m.scale.y = m.userData.h * rise;
    const shiver = left < .6 ? (Math.random() - .5) * .05 : 0; w.g.position.set(shiver, 0, -shiver); // it cracks before it goes
    if (left <= 0) { dropWall(w); walls.splice(i, 1); }
  }
}
function dropWall(w: (typeof walls)[number], quiet = false) {
  scene.remove(w.g);
  w.room.barriers = (w.room.barriers ?? []).filter(b => !w.boxes.includes(b));
  if (quiet) return;
  const def = w.def, P = def.params;
  for (const e of G.enemies) {
    if (!alive(e)) continue;
    let near = w.boxes[0], nd = Infinity;
    for (const b of w.boxes) { const d = Math.hypot(e.x - b.x, e.z - b.z); if (d < nd) { nd = d; near = b; } }
    if (nd > P.burst + e.r) continue;
    const u = away(e, near.x, near.z);
    damageEnemy(e, def.damage, u.x, u.z, .6, 'spell');
    inflict(e, def.status);
  }
  for (const b of w.boxes) { burst(b.x, .5, b.z, ICE, 6, 2.6, .06); burst(b.x, .8, b.z, 0xffffff, 2, 2, .04); }
  Sfx.wallShatter(); G.shake = Math.max(G.shake, .12);
}

/* ---------- self: Static Mantle ---------- */

/** The storm wrapped around the mage for a while: sparks circling, small arcs crackling over the body, and any
    foe that touches it struck, shocked and thrown back (each foe at most every so often). */
let mantle: { def: SpellDef; t: number; g: THREE.Group; aura: THREE.Sprite; sparks: THREE.Sprite[]; zapped: Map<Enemy, number>; arcT: number } | null = null;
const self: Cast = def => {
  endMantle(true);
  const color = hex(def.color), g = new THREE.Group(), aura = glow(color, 1.7, .25), sparks: THREE.Sprite[] = [];
  aura.position.y = .7; g.add(aura);
  for (let i = 0; i < 5; i++) { const s = glowShared(color, .28, .95); g.add(s); sparks.push(s); }
  g.position.set(player.x, 0, player.z); scene.add(g);
  mantle = { def, t: 0, g, aura, sparks, zapped: new Map(), arcT: 0 };
  burst(player.x, .7, player.z, color, 14, 2.4, .04); Sfx.mantle();
  return true;
};
/** While the Static Mantle is up, a foe touching the mage doesn't hurt it: the storm throws it back first. A boss
    is too heavy to throw, so it still hurts, unless the shock stunned it. */
export const mantleShields = (e: Enemy) => !!mantle && (!e.isBoss || !canAct(e.status));
/** Seconds of the Static Mantle left (0 when it's down). */
export const mantleLeft = () => mantle ? mantle.def.params.life - mantle.t : 0;
function updateMantle(dt: number, now: number) {
  const m = mantle; if (!m) return;
  const P = m.def.params, color = hex(m.def.color); m.t += dt;
  if (m.t >= P.life) { endMantle(false); return; }
  const fade = Math.min(1, (P.life - m.t) / .5);
  m.g.position.set(player.x, 0, player.z);
  m.aura.material.opacity = (.2 + Math.sin(m.t * 11) * .06 + Math.random() * .05) * fade;
  m.sparks.forEach((s, i) => {
    const a = m.t * (3 + i * .7) + i * 1.3;
    s.position.set(Math.cos(a) * .55, .35 + ((i * .37 + m.t * .8) % 1) * .9, Math.sin(a) * .55); s.visible = Math.random() > .1;
  });
  m.arcT -= dt;
  if (m.arcT <= 0) { // a small arc crackles over the mage
    m.arcT = .15 + Math.random() * .15;
    const a = Math.random() * Math.PI * 2, b = a + 1 + Math.random() * 2;
    lightning({ x: player.x + Math.cos(a) * .45, y: .3 + Math.random() * .9, z: player.z + Math.sin(a) * .45 }, { x: player.x + Math.cos(b) * .45, y: .3 + Math.random() * .9, z: player.z + Math.sin(b) * .45 }, color, .25);
  }
  for (const e of G.enemies) {
    if (!alive(e) || (m.zapped.get(e) ?? 0) > now) continue;
    const u = away(e, player.x, player.z);
    if (u.d > player.r + e.r + P.reach) continue;
    m.zapped.set(e, now + P.every);
    lightning({ x: player.x, y: .8, z: player.z }, { x: e.x, y: foeY(e), z: e.z }, color, .45);
    damageEnemy(e, m.def.damage, u.x, u.z, 0, 'spell');
    inflict(e, m.def.status);
    if (!e.isBoss) { e.kx += u.x * P.knockback; e.kz += u.z * P.knockback; }
    burst(e.x, foeY(e), e.z, color, 8, 2.4, .035); Sfx.mantleZap();
  }
}
function endMantle(quiet: boolean) {
  if (!mantle) return;
  scene.remove(mantle.g); mantle.aura.material.dispose();
  if (!quiet) { burst(player.x, .7, player.z, hex(mantle.def.color), 8, 1.6, .03); Sfx.mantleEnd(); }
  mantle = null;
}

/* ---------- lightning ---------- */

/** A bolt of lightning between two points: three jagged strands, braided and re-jagged every frame so it
    flickers, with a glow along it in the spell's colour, gone in a fifth of a second. */
const bolts: { g: THREE.Group; lines: THREE.Line[]; glows: THREE.Sprite[]; a: THREE.Vector3; b: THREE.Vector3; t: number }[] = [];
const BOLT_LIFE = .22, BOLT_SEGS = 8, STRANDS = 3;
let strandMat: THREE.LineBasicMaterial | null = null;
function lightning(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, color: number, glowSize = .7) {
  strandMat ??= markShared(new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending }));
  const g = new THREE.Group(), lines: THREE.Line[] = [], glows: THREE.Sprite[] = [];
  for (let s = 0; s < STRANDS; s++) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((BOLT_SEGS + 1) * 3), 3));
    const line = new THREE.Line(geo, strandMat); g.add(line); lines.push(line);
  }
  for (let i = 0; i <= BOLT_SEGS; i++) { const s = glowShared(color, glowSize, .7); g.add(s); glows.push(s); } // the glow along it
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
function updateLightning(dt: number) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i]; b.t += dt;
    if (b.t >= BOLT_LIFE) { dropBolt(b); bolts.splice(i, 1); continue; }
    jag(b); b.g.visible = Math.random() > .15; // a flicker
  }
}

/* ---------- every step ---------- */

export const CAST: Record<Shape, Cast> = { beam, placed, shotgun, wall, chain, self };

/** Effects fade every step; seals, walls and the mantle only run while the game does (`acting`). */
export function updateShapes(dt: number, acting: boolean) {
  updateLightning(dt); updateBeams(dt); updateFlames(dt);
  if (!acting) return;
  updateSeals(dt); updateWalls(dt); updateMantle(dt, G.simClock);
}

/** The mage leaves the room: what spells left in it goes quietly (the mantle goes with the mage). */
export function leaveRoomShapes() {
  for (const b of bolts) dropBolt(b); bolts.length = 0;
  for (const b of beams) scene.remove(b.g); beams.length = 0;
  for (const f of flames) scene.remove(f.s); flames.length = 0;
  for (const s of seals) { scene.remove(s.mesh); s.mat.dispose(); } seals.length = 0;
  for (const w of walls) dropWall(w, true); walls.length = 0;
}
/** A new floor or run: nothing left at all. */
export function clearShapes() { leaveRoomShapes(); endMantle(true); }
