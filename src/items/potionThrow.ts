/* A potion thrown (docs/archive/M5-plan.md; GDD: Potions and alchemy): the bottle arcs to where the mage aims and shatters in
   a splash. Its throw effect lands through the hooks the spells use (fireAt, frostAt, shockAt, hallowAt, umbralAt and
   inflict), so a splash lights oil, freezes water, wakes mechanisms and sets off reactions like any spell. While the
   potion key is held a ring shows where it will land. The Grave Draught's thrall, a skeleton that fights for the mage
   until the room is quiet, lives here too. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { scene } from '../render/renderer';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { damageEnemy } from '../combat/damage';
import { blastAt } from '../combat/glyphs';
import { inflict, floatText } from '../magic/statusFx';
import { MAGIC, newStatus } from '../magic/status';
import { ringFx, strikeFx } from '../magic/spellFx';
import { steamAt } from '../magic/steam';
import { aimDir } from '../magic/spells';
import { fireAt, frostAt, shockAt } from '../world/pools';
import { hallowAt, umbralAt } from '../world/mechanisms';
import { layFire } from '../actors/foes';
import { renderHearts } from '../notify';
import { disposeTree } from '../render/materials';
import { gradeNow } from '../render/pixelLook';
import { itemTones } from '../world/kitColours';
import { decalImage } from '../assets/models';
import { mesh, tone } from '../world/kitParts';
import { potionHold } from '../input';
import { POTIONS, type PotionDef, type PotionId, type ThrowEffect } from './alchemyData';
import { bottleLook } from './alchemyLooks';
import type { Enemy } from '../types';
import { boonActs, boonMul } from '../progression/boonHooks';
import { knownPotion } from './potions';

const A = CFG.alchemy;
interface Flight {
  id: PotionId;
  g: THREE.Object3D;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  t: number;
  room: object;
}
const flights: Flight[] = [];
interface Storm {
  x: number;
  z: number;
  t: number;
  next: number;
  def: PotionDef;
  room: object;
}
const storms: Storm[] = [];

/** Where a potion thrown now lands: as far as it reaches along where the mage aims, inside the room. */
export function landing() {
  const d = aimDir(null),
    b = G.room.current.bounds;
  return {
    x: Math.min(b.maxX - 0.3, Math.max(b.minX + 0.3, player.x + d.x * A.reach)),
    z: Math.min(b.maxZ - 0.3, Math.max(b.minZ + 0.3, player.z + d.z * A.reach)),
  };
}

/** Where a throw lands: once, or (the Alchemist's split) twice, `CFG.alchemy.split` apart across the aim. */
function landings() {
  const to = landing(),
    b = G.room.current.bounds;
  if (!player.stats.effects.has('splitThrow')) return [to];
  const dx = to.x - player.x,
    dz = to.z - player.z,
    d = Math.hypot(dx, dz) || 1,
    px = ((-dz / d) * A.split) / 2,
    pz = ((dx / d) * A.split) / 2;
  return [-1, 1].map((s) => ({
    x: Math.min(b.maxX - 0.3, Math.max(b.minX + 0.3, to.x + px * s)),
    z: Math.min(b.maxZ - 0.3, Math.max(b.minZ + 0.3, to.z + pz * s)),
  }));
}

/** Throw a potion: its bottle flies off in an arc. The Alchemist's gift (`splitThrow`) splits it in two in
    the air: two bottles, landing `CFG.alchemy.split` apart across the aim, each a whole splash. */
export function throwPotion(id: PotionId) {
  const lands = landings();
  for (const at of lands) {
    const g = bottleLook(G.run.bottles[id]);
    g.position.set(player.x, 1, player.z);
    scene.add(g);
    flights.push({ id, g, x0: player.x, z0: player.z, x1: at.x, z1: at.z, t: 0, room: G.room.current });
  }
  if (lands.length > 1) burst(player.x, 1.2, player.z, 0x7ae070, 6, 1.2, 0.03); // (the bottle splits as it leaves the hand)
  Sfx.throwPotion();
}

const near = (x: number, z: number, r: number) =>
  G.room.enemies.filter((e) => !e.dead && e.spawn <= 0 && !e.hidden && Math.hypot(e.x - x, e.z - z) < r + e.r);
const mageIn = (x: number, z: number, r: number) => Math.hypot(player.x - x, player.z - z) < r + player.r;
const num = (v: number | string | undefined) => Number(v ?? 0);
const col = (def: PotionDef) => parseInt(def.color.slice(1), 16);
/** A splash's colour: the potion's, lifted in its own hue to `splashLight` at least (the hex brew's dark violet was
    the floor's shadow colour). */
function ringCol(def: PotionDef) {
  const c = new THREE.Color(col(def)),
    hsl = c.getHSL({ h: 0, s: 0, l: 0 });
  return hsl.l < A.splashLight ? c.setHSL(hsl.h, hsl.s, A.splashLight).getHex() : c.getHex();
}

/** Each throw, where it splashes (`r` across). */
const THROW: Record<ThrowEffect, (x: number, z: number, r: number, def: PotionDef) => void> = {
  healSplash(x, z, r, def) {
    hallowAt(x, z, r);
    if (mageIn(x, z, r)) {
      player.hp = Math.min(player.maxHp, player.hp + num(def.throw.halves));
      renderHearts();
      floatText(player.x, 1.8, player.z, '+', 0xff8a8a, 40);
    }
  },
  daze(x, z, r, def) {
    // (a boss only as a shock stuns it, as briefly, then a guard before another lands)
    for (const e of near(x, z, r)) {
      const s = (e.status ??= newStatus());
      if (e.isBoss) {
        if (s.stunGuard > 0) continue;
        s.stunGuard = MAGIC.shock.bossStunGuard;
      }
      s.stun = Math.max(s.stun, e.isBoss ? MAGIC.shock.stun : num(def.throw.seconds));
      floatText(e.x, 1.4, e.z, '…', 0x9ec8ff, 30);
    }
  },
  firePool(x, z, r, def) {
    fireAt(x, z, r);
    layFire(G.room.current, x, z, num(def.throw.seconds), breathing ? 'mage' : undefined);
    for (const e of near(x, z, r)) inflict(e, { burn: num(def.throw.burn) });
  }, // (breathed out: the mage's own fire, which spares them)
  freezeSplash(x, z, r, def) {
    // (a boss is never frozen, as by chill: it only takes the chill)
    frostAt(x, z, r);
    const longer = boonMul('deepWinter', 'frozenMul'); // (Deep Winter's second rank holds its ice longer too)
    for (const e of near(x, z, r)) {
      inflict(e, { chill: num(def.throw.chill) });
      if (e.dead || e.isBoss) continue;
      const s = (e.status ??= newStatus());
      s.frozen = Math.max(s.frozen, num(def.throw.seconds) * longer);
      if (longer > 1) boonActs('deepWinter', e.x, e.z);
    }
  },
  stormSplash(x, z, _r, def) {
    storms.push({ x, z, t: num(def.throw.seconds), next: 0, def, room: G.room.current });
    shockAt(x, z, undefined, true);
  },
  echoSplash(x, z, r) {
    // each foe in the splash strikes the nearest other foe, as hard as its own touch
    const hit = near(x, z, r);
    for (const e of hit) {
      const o = G.room.enemies
        .filter((f) => f !== e && !f.dead && f.spawn <= 0 && !f.hidden)
        .sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
      if (!o) continue;
      const d = Math.hypot(o.x - e.x, o.z - e.z) || 1;
      strikeFx({ x: e.x, y: 0.8, z: e.z }, { x: o.x, y: 0.8, z: o.z }, 0xe8e0c8, 0.25, true);
      damageEnemy(o, (e.contact || 1) * A.echoMul, (o.x - e.x) / d, (o.z - e.z) / d);
    }
  },
  giantSplash(x, z, r, def) {
    for (const e of near(x, z, r)) {
      if (e.giant) continue;
      e.giant = true;
      e.speedMul = (e.speedMul ?? 1) * (1 - num(def.throw.speed));
      e.model?.scale.multiplyScalar(num(def.throw.scale));
    }
  },
  darkSplash(x, z, r, def) {
    steamAt(x, z, r * 1.3, num(def.throw.seconds), true);
    umbralAt(x, z, r);
  },
  cleanseSplash(x, z, r) {
    for (const e of near(x, z, r)) {
      if (e.status) Object.assign(e.status, newStatus());
    }
    if (mageIn(x, z, r)) Object.assign(player, { chill: 0, stone: 0, dim: 0 });
    burst(x, 0.6, z, 0xf0e0b0, 14, 2, 0.05);
  },
  explode(x, z) {
    blastAt(x, z, breathing);
  }, // (breathed out, it spares the mage)
  hexSplash(x, z, r, def) {
    umbralAt(x, z, r);
    for (const e of near(x, z, r)) inflict(e, { hex: num(def.throw.stacks) });
  },
  raiseThrall(x, z) {
    raiseThrall(x, z);
  },
};

/** Brewer's Breath: a potion drunk breathes its throw out round the mage's feet, sparing the mage (their own fire, a blast
    turned aside); a throw that would only touch the mage (the healing splash) adds nothing. */
let breathing = false;
export function breathe(id: PotionId) {
  const def = POTIONS[id];
  if (def.throw.effect === 'healSplash') return;
  const x = player.x,
    z = player.z,
    c = ringCol(def),
    r = A.splash;
  ringFx(x, 0.08, z, c, 0.2, r, 0.45, true);
  burst(x, 0.5, z, c, 14, 2, 0.05);
  burst(x, 1.1, z, 0xf0e8d8, 6, 1.2, 0.04); // (a breath of it, from the mouth to the floor)
  breathing = true;
  try {
    THROW[def.throw.effect](x, z, r, def);
  } finally {
    breathing = false;
  }
  boonActs('brewersBreath', x, z);
}

/* ---------- a splash's look ---------- */

interface Edge {
  m: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  t: number;
  to: number;
}
const edges: Edge[] = [],
  idleEdges: Edge[] = [];
let edgeGeo: THREE.RingGeometry | null = null;
/** The edge under a splash's ring, in the floor's shadow colour (or its own, `items.splashEdge`): it grows with the ring and fades in flat steps. */
function splashEdge(x: number, z: number, to: number) {
  const E = A.splashEdge,
    g = gradeNow();
  let e = idleEdges.pop();
  if (!e) {
    edgeGeo ??= new THREE.RingGeometry(E.inner, E.outer, 40).rotateX(-Math.PI / 2);
    edgeGeo.userData.shared = true;
    const m = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    m.renderOrder = -1; // (drawn before the ring, so the ring lies over it)
    scene.add(m);
    e = { m, t: 0, to };
  }
  e.m.material.color.set(itemTones().splashEdge ?? (g.amount > 0 ? g.shadow : A.splashLook.noShadow)); // (a floor's own: floor 3's shadow sank into its dark red)
  e.m.position.set(x, A.splashLook.lift, z);
  e.m.visible = true;
  e.t = 0;
  e.to = to;
  edges.push(e);
  stepEdge(e, 0);
}
function stepEdge(e: Edge, dt: number) {
  e.t += dt;
  const k = Math.min(1, e.t / RING_LIFE),
    E = A.splashEdge;
  e.m.scale.setScalar(0.2 + (e.to - 0.2) * (1 - (1 - k) ** 3)); // (as the ring grows: magic/spellFx.ts)
  e.m.material.opacity = (E.opacity * Math.ceil((1 - k) * E.steps)) / E.steps;
  return k >= 1;
}
/** The glass of a splash, in the floor's shadow's colour. */
function glassCol() {
  const g = gradeNow(),
    c = new THREE.Color(0xd8e8f0);
  if (g.amount > 0) c.lerp(new THREE.Color(g.shadow), A.shard);
  return c;
}
/** A spray of glass, in the floor's shadow's colour, and drawn over the floor (`burst`'s, recoloured). */
function shards(x: number, z: number, n: number, spd: number) {
  const from = G.fx.particles.length;
  burst(x, 0.2, z, glassCol().getHex(), n, spd, 0.03);
  for (const p of G.fx.particles.slice(from)) p.m.material.depthWrite = false;
}
const RING_LIFE = 0.45;

/* the made splash (data/assets.json `decals`, tools/art/splash.py): a picture's tones at the kit's texel, painted per
   potion and floor, lying on the floor under the ring in place of the edge */
interface Decal {
  m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  t: number;
  /** its scale at full size (1: a texel to a game pixel) */ to: number;
  /** its flips (a flip keeps the texel grid, a turn would not) */ fx: number;
  fz: number;
  /** its size in units at scale 1 */ w: number;
  d: number;
}
const decals: Decal[] = [],
  idleDecals: Decal[] = [];
let decalGeo: THREE.PlaneGeometry | null = null;
const WHITE = new THREE.Color(0xffffff);
const tonesOf = new Map<HTMLImageElement, Uint8Array>(),
  painted = new Map<string, THREE.CanvasTexture>();
/** A decal's tone a texel (255 clear), read once from its grey PNG. */
function tones(img: HTMLImageElement) {
  let t = tonesOf.get(img);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data,
    n = A.splashLook.tones - 1;
  t = new Uint8Array(c.width * c.height);
  for (let i = 0; i < t.length; i++)
    t[i] = px[i * 4 + 3] < A.splashLook.clear ? 255 : Math.round((px[i * 4] * n) / 255);
  tonesOf.set(img, t);
  return t;
}
/** The made splash painted: its liquid in the potion's colour (`ringCol`), stepped dark to light, its rim leaning to the
    floor's shadow (or the floor's own splash edge), its glass as the shards are. Made once a colour and floor. */
function splashPaint(img: HTMLImageElement, def: PotionDef) {
  const L = A.splashLook,
    g = gradeNow(),
    edge = new THREE.Color(itemTones().splashEdge ?? (g.amount > 0 ? g.shadow : A.splashLook.noShadow)),
    liquid = new THREE.Color(ringCol(def)),
    glass = glassCol(),
    key = `${img.src}|${liquid.getHex()}|${edge.getHex()}|${glass.getHex()}`;
  let tex = painted.get(key);
  if (tex) return tex;
  const hsl = liquid.getHSL({ h: 0, s: 0, l: 0 }),
    dark = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l * L.dark).lerp(edge, L.cool),
    ramp = [edge.clone().lerp(dark, L.rimTint), glass, dark, ...L.light.map((k) => liquid.clone().lerp(WHITE, k))],
    bytes = ramp.map((c) => {
      const h = c.getHex(); // (sRGB bytes, as the canvas holds them)
      return [(h >> 16) & 255, (h >> 8) & 255, h & 255];
    });
  const t = tones(img),
    c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d')!,
    out = ctx.createImageData(c.width, c.height);
  for (let i = 0; i < t.length; i++) {
    const b = bytes[t[i]];
    if (!b) continue; // (clear)
    out.data.set([b[0], b[1], b[2], 255], i * 4);
  }
  ctx.putImageData(out, 0, 0);
  tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  painted.set(key, tex);
  return tex;
}
/** The made splash where a bottle lands (`r` its reach), or false when none is loaded (the edge drawn in code stays). */
function splashDecal(x: number, z: number, r: number, def: PotionDef) {
  const wide = r > A.splash * A.splashLook.wide,
    img = (wide ? decalImage('splash_wide') : null) ?? decalImage('splash');
  if (!img) return false;
  const [tx, tz] = CFG.roomKit.texel;
  let e = idleDecals.pop();
  if (!e) {
    decalGeo ??= new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    decalGeo.userData.shared = true;
    const m = new THREE.Mesh(
      decalGeo,
      // (no depth, as every mark on the floor: written, it hid the fire a throw lays; both sides, for its flips)
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    m.renderOrder = -1; // (drawn before the ring, so the ring lies over it)
    scene.add(m);
    e = { m, t: 0, to: 1, fx: 1, fz: 1, w: 1, d: 1 };
  }
  if (!e.m.material.map) e.m.material.needsUpdate = true; // (a map where there was none: the shader changes, once)
  e.m.material.map = splashPaint(img, def);
  e.m.position.set(x, A.splashLook.lift, z);
  e.m.visible = true;
  e.t = 0;
  // (a picture made for the plain splash grown for the Retort's; one made wide lies as it is)
  e.to = img === decalImage('splash_wide') ? 1 : r / A.splash;
  e.w = img.naturalWidth / tx; // (texels over the kit's texel: it lies a texel to a game pixel)
  e.d = img.naturalHeight / tz;
  e.fx = Math.random() < 0.5 ? -1 : 1; // (visual only)
  e.fz = Math.random() < 0.5 ? -1 : 1;
  decals.push(e);
  stepDecal(e, 0);
  return true;
}
function stepDecal(e: Decal, dt: number) {
  e.t += dt;
  const k = Math.min(1, e.t / RING_LIFE),
    L = A.splashLook,
    g = Math.min(1, e.t / L.grow),
    f = e.to * (L.from + (1 - L.from) * (1 - (1 - g) ** 2));
  e.m.scale.set(e.w * f * e.fx, 1, e.d * f * e.fz);
  e.m.material.opacity = (L.opacity * Math.ceil((1 - k) * L.steps)) / L.steps;
  return k >= 1;
}

/** A bottle lands: it shatters, its splash rings out in its colour over the made splash (or a dark edge), and its throw
    effect lands there. */
function splash(f: Flight) {
  const def = POTIONS[f.id],
    c = ringCol(def),
    retort = player.stats.effects.has('retort'),
    r = A.splash * (retort ? A.retort.splashMul : 1);
  Sfx.at(f.x1, f.z1).bottleBreak();
  if (!splashDecal(f.x1, f.z1, r, def)) splashEdge(f.x1, f.z1, r);
  ringFx(f.x1, 0.08, f.z1, c, 0.2, r, RING_LIFE, true);
  const from = G.fx.particles.length;
  burst(f.x1, 0.3, f.z1, c, 18, 2.6, 0.05);
  for (const p of G.fx.particles.slice(from)) p.m.material.depthWrite = false; // (its colour, not an outline's black)
  shards(f.x1, f.z1, retort ? 16 : 8, retort ? 3 : 2);
  if (retort) for (const e of near(f.x1, f.z1, r)) damageEnemy(e, A.retort.cut, 0, 0, 0, 'spell'); // (the Cracked Retort's glass cuts)
  THROW[def.throw.effect](f.x1, f.z1, r, def);
}
/** Dev hook: the bottles in the air, and where each will land. */
export const flightsNow = () => flights.map((f) => ({ id: f.id, x: f.x1, z: f.z1 }));

/* ---------- the Grave Draught's thrall ---------- */

interface Thrall {
  g: THREE.Group;
  x: number;
  z: number;
  cd: number;
  room: object;
  legs: THREE.Object3D[];
  t: number;
}
let thrall: Thrall | null = null;
const BONE = 0xe4d8bc;
/** A skeleton rises from the splash and fights for the mage until the room is quiet (or the mage leaves it). */
function raiseThrall(x: number, z: number) {
  if (thrall) dropThrall();
  const g = new THREE.Group(),
    bone = tone(BONE, 0.1),
    dark = tone(0x2a2220);
  mesh(g, new THREE.SphereGeometry(0.14, 8, 6), bone, 0, 0.78, 0); // skull
  for (const s of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.035, 5, 4), dark, s * 0.05, 0.79, 0.12); // eye sockets
  mesh(g, new THREE.CylinderGeometry(0.04, 0.05, 0.34, 6), bone, 0, 0.5, 0); // spine
  for (let i = 0; i < 3; i++)
    mesh(
      g,
      new THREE.TorusGeometry(0.11 - i * 0.012, 0.015, 3, 10, Math.PI * 1.4),
      bone,
      0,
      0.58 - i * 0.07,
      0,
    ).rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
  for (const s of [-1, 1])
    mesh(g, new THREE.CylinderGeometry(0.025, 0.02, 0.3, 5), bone, s * 0.15, 0.5, 0).rotation.z = s * 0.25; // arms
  const legs = [-1, 1].map((s) => {
    const l = mesh(g, new THREE.CylinderGeometry(0.03, 0.025, 0.34, 5), bone, s * 0.07, 0.17, 0);
    return l;
  });
  g.position.set(x, 0, z);
  scene.add(g);
  thrall = { g, x, z, cd: 0.4, room: G.room.current, legs, t: 0 };
  burst(x, 0.4, z, 0x7a8a70, 16, 2, 0.05);
  Sfx.at(x, z).throwPotion();
}
function dropThrall() {
  if (!thrall) return;
  burst(thrall.x, 0.4, thrall.z, BONE, 14, 2, 0.04);
  scene.remove(thrall.g);
  disposeTree(thrall.g);
  thrall = null;
}
function updateThrall(dt: number) {
  const t = thrall;
  if (!t) return;
  if (t.room !== G.room.current || (!G.room.current.locked && !G.room.enemies.some((e) => !e.dead))) {
    dropThrall();
    return;
  }
  t.t += dt;
  t.cd -= dt;
  const e = G.room.enemies
    .filter((f) => !f.dead && f.spawn <= 0 && !f.hidden)
    .sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z))[0] as Enemy | undefined;
  if (!e) return;
  const dx = e.x - t.x,
    dz = e.z - t.z,
    d = Math.hypot(dx, dz) || 1;
  if (d > A.thrall.near) {
    const s = Math.min(d - A.thrall.near * 0.8, A.thrall.speed * dt);
    t.x += (dx / d) * s;
    t.z += (dz / d) * s;
  } else if (t.cd <= 0) {
    t.cd = A.thrall.every;
    damageEnemy(e, A.thrall.damage, dx / d, dz / d, 0.6);
    burst(e.x, 0.7, e.z, BONE, 5, 1.4, 0.03);
  }
  t.g.position.set(t.x, 0, t.z);
  t.g.rotation.y = Math.atan2(dx, dz);
  t.legs.forEach((l, i) => {
    l.rotation.x = Math.sin(t.t * 9 + i * Math.PI) * 0.5;
  });
}

/* ---------- the aim, the flights, the storms ---------- */

const markers: THREE.Mesh[] = [];
/** Every step: bottles in flight arc and land; a bottled storm strikes; the thrall fights; and while the potion key is held
    (long enough to throw), a ring shows where the chosen potion will land. */
export function updateThrows(dt: number) {
  for (let i = flights.length - 1; i >= 0; i--) {
    const f = flights[i];
    f.t += dt / A.flight;
    const k = Math.min(1, f.t);
    f.g.position.set(f.x0 + (f.x1 - f.x0) * k, 0.9 + Math.sin(k * Math.PI) * A.arc - 0.7 * k, f.z0 + (f.z1 - f.z0) * k);
    f.g.rotation.z += dt * 10;
    f.g.rotation.x += dt * 6;
    if (k >= 1 || f.room !== G.room.current) {
      scene.remove(f.g);
      disposeTree(f.g);
      flights.splice(i, 1);
      if (f.room === G.room.current) splash(f);
    }
  }
  for (let i = storms.length - 1; i >= 0; i--) {
    const s = storms[i];
    s.t -= dt;
    s.next -= dt;
    if (s.t <= 0 || s.room !== G.room.current) {
      storms.splice(i, 1);
      continue;
    }
    if (s.next > 0) continue;
    s.next = num(s.def.throw.every);
    const hit = near(s.x, s.z, A.splash * 1.4),
      e = hit[Math.floor(G.run.alchemy.next() * hit.length)];
    const tx = e ? e.x : s.x + (Math.random() - 0.5) * A.splash * 2,
      tz = e ? e.z : s.z + (Math.random() - 0.5) * A.splash * 2;
    strikeFx({ x: tx, y: 3.2, z: tz }, { x: tx, y: 0.1, z: tz }, 0xb49aff, 0.18);
    Sfx.at(tx, tz).throwPotion();
    if (e) {
      damageEnemy(e, num(s.def.throw.damage), 0, 0, 0.3, undefined, 'storm');
      inflict(e, { shock: 1 }, 'mage');
    }
    shockAt(tx, tz, undefined, true);
  }
  for (let i = edges.length - 1; i >= 0; i--)
    if (stepEdge(edges[i], dt)) {
      edges[i].m.visible = false;
      idleEdges.push(...edges.splice(i, 1));
    }
  for (let i = decals.length - 1; i >= 0; i--)
    if (stepDecal(decals[i], dt)) {
      decals[i].m.visible = false;
      idleDecals.push(...decals.splice(i, 1));
    }
  updateThrall(dt);
  // the aim: a ring where it will land (two for a split throw, as wide as the Retort makes the splash), in the potion's
  // colour once it is known
  const aiming = potionHold.since > 0 && performance.now() - potionHold.since > A.hold * 1000 && player.belt.length > 0;
  if (aiming) {
    if (!markers.length) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
        geo = new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2);
      for (let i = 0; i < 2; i++) {
        const m = new THREE.Mesh(geo, mat);
        m.renderOrder = 4;
        m.visible = false;
        scene.add(m);
        markers.push(m);
      }
    }
    const id = player.belt[Math.min(player.beltAt, player.belt.length - 1)] as PotionId,
      lands = landings();
    (markers[0].material as THREE.MeshBasicMaterial).color.set(knownPotion(id) ? col(POTIONS[id]) : 0xffffff);
    const r = A.splash * (player.stats.effects.has('retort') ? A.retort.splashMul : 1);
    markers.forEach((m, i) => {
      const at = lands[i];
      m.visible = !!at;
      if (at) {
        m.position.set(at.x, 0.05, at.z);
        m.scale.setScalar(r);
      }
    });
  } else for (const m of markers) m.visible = false;
}

/** A new room or run: nothing left in the air, no storm, no thrall. */
export function clearThrows() {
  for (const f of flights) {
    scene.remove(f.g);
    disposeTree(f.g);
  }
  flights.length = 0;
  storms.length = 0;
  for (const e of edges) e.m.visible = false;
  idleEdges.push(...edges.splice(0));
  for (const e of decals) e.m.visible = false;
  idleDecals.push(...decals.splice(0));
  dropThrall();
  for (const m of markers) m.visible = false;
}
/** For the tests: what is in the air, the storms, and the thrall. */
export const throwsNow = () => ({
  flying: flights.length,
  storms: storms.length,
  thrall: !!thrall,
  decals: decals.length,
  edges: edges.length,
});
