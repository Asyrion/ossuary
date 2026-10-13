/* The jelly serpent's fight (M5 step 7, docs/archive/M5-plan.md; GDD: Potions and alchemy, The jelly serpent). Out of its vat in
   Dr. Jelly's laboratory (world/laboratory.ts breaks it out) or as a floor's boss (`?boss=serpent`, the dev menu's boss
   fights: then it pours its own jelly round it), it lives in the jelly. Under it, it swims where no bolt reaches it, only a
   ripple and the humps of its rings showing; it rises (bubbles and a widening ring where it will come up), then lunges at a
   mage near enough or rears and spits globs of jelly that land as puddles (more jelly to swim in), and stays up a moment,
   open, before it dives again. Out of the jelly (a lunge onto dry floor, or its jelly frozen over) it crawls back slowly,
   open all the while. A shock through its jelly, or its jelly freezing, traps it at the surface, stunned. Weak to Storm,
   resisting Frost. Its body is a chain of rings laid along the trail its head leaves (dragonPath.ts's `lay`), in world
   space under the boss's group as the Pillar Dragon's is. The look is serpentLooks.ts. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { mergeRig } from '../render/rig';
import { spawnShot } from '../combat/projectiles';
import { burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { floatText } from '../magic/statusFx';
import { addPool, jellyAt, poolAt, wadeAt } from '../world/pools';
import { isFreeAt } from '../world/rooms';
import { floodTiles } from '../world/flood';
import { lob } from './bestiaryGround';
import { lay, trim, type P3 } from './dragonPath';
import { SERPENT, serpentBody, serpentHead, type SerpentBody } from './serpentLooks';

const C = CFG.enemy.serpent;
interface Coil {
  body: SerpentBody;
  chain: THREE.Group;
  ripple: THREE.Mesh;
  /** Where its head has been (oldest first), the rings' places, how far under the jelly it is (0 up, 1 under). */ trail: P3[];
  at: P3[];
  depth: number;
  /** Puddles its globs have made; the lunge's way; globs still to spit; what trapped it. */ puddles: number;
  dir: { x: number; z: number };
  volleys: number;
  trap: 'shock' | 'frost' | null;
}
const coils = new WeakMap<Enemy, Coil>();
const UNDER = new Set(['swim', 'rise']);
/** Where it is in its jelly (a shock through it or a freeze traps it then; not while it crawls over jelly frozen already). */
const IN_JELLY = new Set(['dive', 'swim', 'rise', 'open', 'spit', 'windLunge']);

/** Pour `n` tiles of jelly over the open floor of `room` round (x, z): a pool of jelly (world/pools.ts). */
export function pourJelly(room: Room, x: number, z: number, n: number, rng: () => number = Math.random) {
  const b = room.bounds,
    rows = room.template.tiles.length,
    cols = room.template.tiles[0]?.length ?? 0;
  const open = (c: number, r: number) =>
    room.template.tiles[r][c] === 'floor' &&
    !room.poolGrid?.[r]?.[c] &&
    isFreeAt(room, b.minX + c + 0.5, b.minZ + r + 0.5);
  return addPool(room, 'water', floodTiles(open, Math.floor(x - b.minX), Math.floor(z - b.minZ), n, rng, cols, rows), {
    jelly: true,
  });
}

/** Build the serpent: its head as the boss's look, its body a chain of rings whose tail lies back along (`tx`, `tz`) (into
    its vat's window, when it breaks out); jelly poured round it if it has none; it rears up, then dives. */
export function buildSerpent(e: Enemy, tx = 0, tz = -1) {
  const L = serpentHead(),
    P = L.parts,
    body = serpentBody();
  e.mats = mergeRig(L.group, L.idle, 'boss:serpentHead', [P.eye, P.ring, P.head, P.jaw, P.fins]);
  e.mats.push(...body.mats);
  for (const m of e.mats) m.userData.base = m.emissive.clone();
  e.model = L.group;
  e.idle = L.idle;
  e.shadow = L.shadow;
  e.bossSchool = L.school;
  e.body.add(L.group);
  e.eye = P.eye;
  e.ring = P.ring;
  e.halo = P.halo;
  e.parts = P;
  e.bossAff = { weak: C.weak, resist: C.resist };
  const chain = new THREE.Group();
  chain.add(body.group);
  chain.position.set(-e.x, 0, -e.z);
  e.group.add(chain);
  const ripple = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.05, 6, 32),
    new THREE.MeshBasicMaterial({ color: SERPENT.pale, transparent: true, opacity: 0, depthWrite: false }),
  );
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.y = 0.03;
  ripple.visible = false;
  e.group.add(ripple);
  const len = body.n * body.spacing + 1,
    trail: P3[] = [],
    b = G.room.current.bounds,
    wall = 0.8; // (no deeper than the wall is thick: beyond it the tail would show above the wall)
  for (let k = 12; k >= 0; k--)
    trail.push([
      Math.min(b.maxX + wall, Math.max(b.minX - wall, e.x + (tx * len * k) / 12)),
      0,
      Math.min(b.maxZ + wall, Math.max(b.minZ - wall, e.z + (tz * len * k) / 12)),
    ]);
  const k: Coil = {
    body,
    chain,
    ripple,
    trail,
    at: [],
    depth: 0,
    puddles: 0,
    dir: { x: 0, z: 1 },
    volleys: 0,
    trap: null,
  };
  coils.set(e, k);
  if (!jellyAt(e.x, e.z)) pourJelly(G.room.current, e.x, e.z, C.flood);
  e.body.position.y = 0.45;
  e.state = 'open';
  e.st = 0.9;
  Sfx.at(e.x, e.z).serpentHiss(); // (it rears up, then goes under)
  pose(e, k);
}

/** The swimmable jelly tile nearest (x, z), if there is any. */
export function nearestJelly(x: number, z: number) {
  let best: { x: number; z: number } | null = null,
    bd = Infinity;
  for (const p of G.room.current.pools ?? [])
    if (p.jelly && p.state === 'still')
      for (const t of p.tiles) {
        const d = Math.hypot(t.x - x, t.z - z);
        if (d < bd) {
          bd = d;
          best = t;
        }
      }
  return best;
}
/** Swim towards (tx, tz), keeping in the jelly (sliding along its edge, or stopping there); true once there. */
function swimTo(e: Enemy, tx: number, tz: number, speed: number) {
  const dx = tx - e.x,
    dz = tz - e.z,
    d = Math.hypot(dx, dz),
    ahead = 0.45;
  if (d < 0.2) {
    e.vx = e.vz = 0;
    return true;
  }
  let ux = dx / d,
    uz = dz / d;
  if (!jellyAt(e.x + ux * ahead, e.z + uz * ahead)) {
    if (Math.abs(ux) > 0.1 && jellyAt(e.x + Math.sign(ux) * ahead, e.z)) {
      ux = Math.sign(ux);
      uz = 0;
    } else if (Math.abs(uz) > 0.1 && jellyAt(e.x, e.z + Math.sign(uz) * ahead)) {
      ux = 0;
      uz = Math.sign(uz);
    } else {
      e.vx = e.vz = 0;
      return true;
    }
  }
  e.vx = ux * speed;
  e.vz = uz * speed;
  return false;
}

/** Go under: the head sinks into the jelly. */
function dive(e: Enemy) {
  e.state = 'dive';
  e.st = 0.5;
  e.contact = 0;
  Sfx.at(e.x, e.z).dive();
}
/** Come up for good (from rising, or trapped): seen, struck, touching. */
function surfaceNow(e: Enemy, k: Coil) {
  e.hidden = false;
  e.flying = false;
  e.model!.visible = true;
  e.contact = 2;
  k.ripple.visible = false;
  burst(e.x, 0.3, e.z, SERPENT.jelly, 22, 3, 0.07);
  burst(e.x, 0.5, e.z, SERPENT.pale, 8, 2, 0.04);
}
/** Trapped at the surface by a shock through its jelly, or the jelly freezing over it. */
function trapped(e: Enemy, k: Coil, by: 'shock' | 'frost') {
  if (UNDER.has(e.state)) surfaceNow(e, k);
  k.trap = by;
  e.state = 'trapped';
  e.st = C.trapped;
  e.vx = e.vz = 0;
  k.depth = Math.min(k.depth, 0.3);
  e.body.position.y = 0.3;
  floatText(
    e.x,
    1.6,
    e.z,
    STR.bosses.serpent[by === 'shock' ? 'shocked' : 'frozen'],
    by === 'shock' ? 0xf0e890 : 0xbfe6ff,
  );
  if (by === 'shock') {
    damageEnemy(e, C.shock, 0, 0, 0, 'spell', 'storm');
    Sfx.at(e.x, e.z).sizzle();
  } // (no shock status: through its jelly it would trap it again)
  else Sfx.at(e.x, e.z).freeze();
  G.fx.shake = Math.max(G.fx.shake, 0.2);
}
/** Spit a glob of jelly at (x, z): half a heart to the mage where it lands, and a puddle of jelly there. */
function glob(e: Enemy, k: Coil, x: number, z: number) {
  const room = G.room.current;
  lob(
    room,
    e.x,
    e.z,
    x,
    z,
    SERPENT.jelly,
    C.spit.flight,
    (lx, lz) => {
      if (G.room.current !== room) return;
      burst(lx, 0.15, lz, SERPENT.jelly, 10, 1.8, 0.05);
      Sfx.at(lx, lz).glob();
      if (Math.hypot(player.x - lx, player.z - lz) < 0.6 + player.r) hurtPlayer(1, lx, lz);
      const c = Math.floor(lx - room.bounds.minX),
        r = Math.floor(lz - room.bounds.minZ);
      if (
        k.puddles < C.spit.puddles &&
        room.template.tiles[r]?.[c] === 'floor' &&
        !poolAt(lx, lz) &&
        isFreeAt(room, lx, lz)
      ) {
        addPool(room, 'water', [{ c, r }], { jelly: true });
        k.puddles++;
      }
    },
    1.5,
    1.2,
  );
}

/** One step of the serpent's fight. Returns the way it should face, when that isn't towards the mage. */
export function updateSerpent(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const k = coils.get(e)!,
    P = e.parts!,
    hurt = e.hp / e.maxHp < 0.5,
    quick = hurt ? C.hurtQuick : 1,
    shotMul = e.bossCfg?.shotSpeedMul ?? 1;
  const ripple = k.ripple,
    rmat = ripple.material as THREE.MeshBasicMaterial,
    d = Math.hypot(player.x - e.x, player.z - e.z);
  e.idle?.(e.t);
  e.halo!.material.opacity = UNDER.has(e.state) ? 0 : 0.3;
  for (const c of e.group.children) if (c.userData.blob) c.visible = !e.hidden; // (under the jelly it casts no shadow, which would read as a hole)
  const settle = 1 - Math.exp(-dt * 8);
  // a shock through its jelly, or the jelly freezing over it, while it is in it, traps it at the surface
  const pool = poolAt(e.x, e.z);
  if (pool?.jelly && IN_JELLY.has(e.state) && (pool.state === 'frozen' || pool.charged > 0)) {
    trapped(e, k, pool.state === 'frozen' ? 'frost' : 'shock');
    return undefined;
  }
  let face: number | undefined;
  if (e.state === 'dive') {
    // down into the jelly
    e.vx = e.vz = 0;
    e.contact = 0;
    const s = 1 - Math.max(0, e.st) / 0.5;
    k.depth = s;
    e.body.position.y = 0.45 - s * 0.9;
    P.fins.scale.y = 1 - s * 0.6;
    if (s > 0.5 && !e.hidden) {
      e.hidden = true;
      e.flying = true;
      e.model!.visible = false;
      burst(e.x, 0.1, e.z, SERPENT.jelly, 14, 2.2, 0.06);
    }
    if (e.st <= 0) {
      if (!jellyAt(e.x, e.z)) {
        surfaceNow(e, k);
        e.state = 'crawl';
        e.st = 2;
      } // (no jelly left to go under)
      else {
        e.state = 'swim';
        e.st = C.under * quick;
        ripple.visible = true;
      }
    }
  } else if (e.state === 'swim') {
    // under the jelly: a ripple gliding to where the jelly comes nearest the mage
    k.depth = 1;
    if (!jellyAt(e.x, e.z)) {
      surfaceNow(e, k);
      e.state = 'crawl';
      e.st = 2;
      return undefined;
    } // (off the jelly's edge: up it comes)
    const to = nearestJelly(player.x, player.z);
    const there = !to || swimTo(e, to.x, to.z, C.swim);
    if (Math.hypot(e.vx, e.vz) > 0.1) face = Math.atan2(e.vx, e.vz);
    rmat.opacity = 0.45 + Math.sin(e.t * 8) * 0.15;
    ripple.scale.setScalar(0.9 + Math.sin(e.t * 6) * 0.08);
    if (Math.random() < dt * 12)
      burst(e.x + (Math.random() - 0.5) * 0.6, 0.05, e.z + (Math.random() - 0.5) * 0.6, SERPENT.pale, 1, 0.6, 0.035);
    if (e.st <= 0 || (there && d < C.reach + 1.5)) {
      e.state = 'rise';
      e.st = C.tell;
      e.vx = e.vz = 0;
      Sfx.at(e.x, e.z).serpentHiss();
    }
  } else if (e.state === 'rise') {
    // a widening ring and bubbles where it will come up: the mage's cue to step away
    e.vx = e.vz = 0;
    const s = 1 - Math.max(0, e.st) / C.tell;
    ripple.scale.setScalar(0.9 + s * 1.1);
    rmat.opacity = 0.5 + Math.abs(Math.sin(e.t * 18)) * 0.5;
    if (Math.random() < dt * 30)
      burst(e.x + (Math.random() - 0.5) * 1.2, 0.05, e.z + (Math.random() - 0.5) * 1.2, SERPENT.pale, 1, 1.4, 0.04);
    if (e.st <= 0) {
      surfaceNow(e, k);
      Sfx.at(e.x, e.z).surface();
      G.fx.shake = Math.max(G.fx.shake, 0.2);
      P.jaw.rotation.x = 0.5;
      if (hurt) {
        const off = Math.random() * Math.PI,
          R = C.ring;
        for (let i = 0; i < R.count; i++) {
          const a = off + (i / R.count) * Math.PI * 2;
          spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), R.speed * shotMul, SERPENT.jelly, 0.9, 1.15);
        }
      }
      if (d < C.reach) {
        e.state = 'windLunge';
        e.st = C.lunge.tell;
      } else {
        e.state = 'spit';
        k.volleys = C.spit.count;
        e.st = 0.3;
      }
    }
  } else if (e.state === 'windLunge') {
    // it draws its head back, jaw wide
    e.vx = e.vz = 0;
    const s = 1 - Math.max(0, e.st) / C.lunge.tell;
    k.depth = 0;
    e.body.position.y += (0.55 - e.body.position.y) * settle;
    P.head.position.z = -0.2 * s;
    P.jaw.rotation.x = 0.7 * s;
    P.fins.scale.y = 1 + s * 0.3;
    if (e.st <= 0) {
      e.state = 'lunge';
      e.st = C.lunge.time;
      k.dir = { x: ux, z: uz };
      P.head.position.z = 0;
      Sfx.at(e.x, e.z).serpentHiss();
    }
  } else if (e.state === 'lunge') {
    // out across the floor at where the mage stood (as fast through jelly as out of it)
    const w = wadeAt(e.x, e.z);
    e.vx = (k.dir.x * C.lunge.speed) / w;
    e.vz = (k.dir.z * C.lunge.speed) / w;
    face = Math.atan2(k.dir.x, k.dir.z);
    e.body.position.y += (0.35 - e.body.position.y) * settle;
    if (e.st <= 0) {
      e.vx = e.vz = 0;
      P.jaw.rotation.x = 0;
      if (jellyAt(e.x, e.z)) {
        e.state = 'open';
        e.st = C.open;
      } else {
        e.state = 'crawl';
        e.st = 2.4 * quick;
        floatText(e.x, 1.4, e.z, STR.bosses.serpent.stranded, SERPENT.pale);
      }
    }
  } else if (e.state === 'spit') {
    // reared up, it spits globs at the mage and round them
    e.vx = e.vz = 0;
    e.body.position.y += (0.6 - e.body.position.y) * settle;
    P.jaw.rotation.x += (0.6 - P.jaw.rotation.x) * settle;
    if (e.st <= 0 && k.volleys > 0) {
      const i = C.spit.count - k.volleys,
        a = Math.random() * Math.PI * 2,
        r = i ? C.spit.spread * (0.5 + Math.random() * 0.5) : 0;
      glob(e, k, player.x + Math.cos(a) * r, player.z + Math.sin(a) * r);
      P.jaw.rotation.x = 0.9;
      k.volleys--;
      e.st = C.spit.every;
    } else if (e.st <= 0) {
      e.state = 'open';
      e.st = C.open * quick;
    }
  } else if (e.state === 'open') {
    // up a moment, swaying, before it goes under again
    e.vx = e.vz = 0;
    e.body.position.y += (0.45 + Math.sin(e.t * 2) * 0.05 - e.body.position.y) * settle;
    P.jaw.rotation.x *= 0.9;
    if (e.st <= 0) {
      if (jellyAt(e.x, e.z)) dive(e);
      else {
        e.state = 'crawl';
        e.st = 2.4 * quick;
      }
    }
  } else if (e.state === 'crawl') {
    // out of the jelly: slowly back to it, or, with none left to swim in, at the mage
    k.depth = 0;
    e.body.position.y += (0.3 - e.body.position.y) * settle;
    P.jaw.rotation.x *= 0.9;
    const to = nearestJelly(e.x, e.z);
    if (to && jellyAt(e.x, e.z)) dive(e);
    else {
      const tx = to ? to.x : player.x,
        tz = to ? to.z : player.z,
        dd = Math.hypot(tx - e.x, tz - e.z) || 1;
      e.vx = ((tx - e.x) / dd) * C.crawl;
      e.vz = ((tz - e.z) / dd) * C.crawl;
      face = Math.atan2(e.vx, e.vz);
      if (!to && e.st <= 0) {
        e.vx = e.vz = 0;
        if (d < C.reach) {
          e.state = 'windLunge';
          e.st = C.lunge.tell;
        } else {
          e.state = 'spit';
          k.volleys = C.spit.count;
          e.st = 0.3;
        }
      }
    }
  } else if (e.state === 'trapped') {
    // stunned at the surface, twitching, open
    e.vx = e.vz = 0;
    P.head.rotation.z = Math.sin(e.t * 14) * 0.25 * (e.st / C.trapped);
    if (Math.random() < dt * 10)
      burst(
        e.x + (Math.random() - 0.5) * 0.8,
        0.2,
        e.z + (Math.random() - 0.5) * 0.8,
        k.trap === 'shock' ? 0xf0e890 : 0xbfe6ff,
        1,
        1,
        0.035,
      );
    if (e.st <= 0) {
      P.head.rotation.z = 0;
      k.trap = null;
      if (jellyAt(e.x, e.z)) dive(e);
      else {
        e.state = 'crawl';
        e.st = 2 * quick;
      }
    }
  }
  if (e.state !== 'windLunge') P.fins.scale.y += ((e.hidden ? 0.4 : 1) - P.fins.scale.y) * settle;
  return face;
}

/** After the serpent has moved: the trail its head leaves, and the rings laid along it (in world space, as its group
    follows the head). */
export function serpentMoved(e: Enemy) {
  const k = coils.get(e);
  if (!k) return;
  const last = k.trail[k.trail.length - 1];
  if (Math.hypot(e.x - last[0], e.z - last[2]) > 0.05) {
    k.trail.push([e.x, 0, e.z]);
    trim(k.trail, k.body.n * k.body.spacing + 1);
  }
  k.chain.position.set(-e.x, 0, -e.z);
  pose(e, k);
}
/** Lay the rings along the trail: under the jelly low, only their humps showing as they swim; up, the first few rising to
    the head as a neck. */
function pose(e: Enemy, k: Coil) {
  lay([[e.x, 0, e.z], ...k.trail.slice().reverse()], k.body.n, k.body.spacing, 0.22, k.at);
  const headY = e.hidden ? 0 : e.body.position.y,
    under = k.depth;
  for (let i = 0; i < k.at.length; i++) {
    const low = 0.13 - under * 0.3 + under * 0.1 * Math.max(0, Math.sin(i * 0.9 - e.t * 5)),
      neck = Math.max(0, 1 - i / 4);
    k.at[i][1] = low + (1 - under) * neck * neck * Math.max(0, headY - 0.15 - low);
  }
  k.body.pose(k.at);
}
/** Dev hook: the serpent's state, whether it is under, where it is, and the jelly in the room (tiles, frozen or not). */
export function serpentInfo() {
  const e = G.room.enemies.find((f) => f.type === 'serpent' && !f.dead),
    k = e && coils.get(e);
  const jelly = (G.room.current.pools ?? []).filter((p) => p.jelly && p.state !== 'spent');
  return {
    serpent: k
      ? {
          state: e.state,
          hidden: !!e.hidden,
          x: e.x,
          z: e.z,
          hp: e.hp,
          maxHp: e.maxHp,
          trap: k.trap,
          puddles: k.puddles,
          under: poolAt(e.x, e.z)?.jelly ? poolAt(e.x, e.z)!.state : null,
        }
      : null,
    jelly: jelly.reduce((n, p) => n + p.tiles.length, 0),
    frozen: jelly.filter((p) => p.state === 'frozen').reduce((n, p) => n + p.tiles.length, 0),
  };
}
