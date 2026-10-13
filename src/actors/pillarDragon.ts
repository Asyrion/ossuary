/* The Pillar Dragon's fight (M4.2, from the Eda lore; GDD: Bosses from the Eda lore). A long dragon, orange down one
   flank and blue-grey down the other, that coils round the top of the room's pillars. A room with fewer than three
   raises its own out of the floor as it comes down from above. Coiled on a pillar it leans out towards the mage (bolts
   reach only its head: its body is wound round the stone) and breathes down on the floor, fire and frost by turns, a
   sweeping stream of each; after two breaths it rears back and flies to another pillar, the one nearest the mage more
   often than not, its body unwinding after it. Below half health it calls the floor's flyers and throws a ring of fire and
   frost as it lands on each pillar. A glyph's blast at the foot of its pillar, or a bell rung in the room, knocks it off:
   it crashes to the floor in a heap and lies there a while, open (it takes more of each blow, and hurts to touch), then
   climbs the nearest pillar again.

   Its body is a chain of segments (bossLooks.ts: `dragonBody`), laid each step along the trail its head leaves as it
   moves along a route (dragonPath.ts); the chain lives in world space under the boss's group, which follows the head. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { mergeRig } from '../render/rig';
import { spawnShot } from '../combat/projectiles';
import { burst } from '../combat/fx';
import { floatText } from '../magic/statusFx';
import { PILLAR_TOP, freeSpotNear, isFreeAt, raisePillar, toWorld } from '../world/rooms';
import { dragonBody, dragonHead, type DragonBody } from './bossLooks';
import { arc, heap, lay, neck, spiral, spiralStart, trim, type P3 } from './dragonPath';
import { ease } from '../util';

const C = CFG.enemy.dragon;
interface Pillar {
  x: number;
  z: number;
  top: number;
}
interface Coil {
  body: DragonBody;
  chain: THREE.Group;
  pillars: Pillar[];
  rising: { g: THREE.Object3D; t: number }[];
  /** The pillar it is on (null in the air or on the floor), and the one it is making for. */ at: Pillar | null;
  goal: Pillar | null;
  /** Where its path has got to, the path behind (oldest first) and the route ahead, walked at `speed`. */ lead: P3;
  trail: P3[];
  route: P3[];
  speed: number;
  /** Where the head is drawn; how far it leans out (0 to 1); the segments' places, shown and wanted. */ head: P3;
  lean: number;
  shown: P3[];
  want: P3[];
  breaths: number;
  kind: 'fire' | 'frost';
  aim: number;
}
const coils = new WeakMap<Enemy, Coil>();
const ON_PILLAR = new Set(['coiled', 'windBreath', 'breath', 'windMove']);
const light = (kind: 'fire' | 'frost') => (kind === 'fire' ? SCHOOL_LIGHT.ember : SCHOOL_LIGHT.frost);

/** Build the Pillar Dragon: its head as the boss's look, its body as a chain; the room's pillars found (or raised); it
    comes down from above onto the pillar nearest where it stands. */
export function buildDragon(e: Enemy) {
  const L = dragonHead(),
    P = L.parts,
    body = dragonBody(),
    room = G.current;
  e.mats = mergeRig(L.group, L.idle, 'boss:dragonHead', [P.eye, P.ring, P.head, P.jaw, P.maw]);
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
  e.flying = true;
  e.contact = 0;
  const chain = new THREE.Group();
  chain.add(body.group);
  chain.position.set(-e.x, 0, -e.z);
  e.group.add(chain);
  const { pillars, rising } = pillarsOf(room),
    lead: P3 = [e.x, C.enter, e.z],
    len = body.n * body.spacing + 1;
  const k: Coil = {
    body,
    chain,
    pillars,
    rising,
    at: null,
    goal: null,
    lead,
    trail: [[e.x, C.enter + len, e.z], [...lead]],
    route: [],
    speed: C.fly.speed,
    head: [...lead],
    lean: 0,
    shown: [],
    want: [],
    breaths: 0,
    kind: 'fire',
    aim: 0,
  };
  coils.set(e, k);
  const first = pillars.reduce((a, b) => (Math.hypot(b.x - e.x, b.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? b : a));
  makeFor(k, first, 0.4, C.fly.speed);
  e.state = 'arrive';
  lie(k, 1);
  k.body.pose(k.shown);
}

/** The room's pillars, whole or broken; if it has fewer than three, whole ones raised at its quarter points (as many of
    the four as are clear), to rise out of the floor as the fight begins. */
function pillarsOf(room: Room) {
  const pillars: Pillar[] = room.rocks.filter((r) => r.pillar).map((r) => ({ x: r.x, z: r.z, top: r.pillar! })),
    rising: Coil['rising'] = [];
  if (pillars.length < 3) {
    const b = room.bounds,
      w = b.maxX - b.minX - 1,
      h = b.maxZ - b.minZ - 1;
    const spots = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        toWorld(room, Math.round(w / 2 + sx * Math.round(w * 0.25)), Math.round(h / 2 + sz * Math.round(h * 0.33))),
      ),
    );
    for (const p of spots) {
      if (
        !isFreeAt(room, p.x, p.z) ||
        Math.hypot(p.x - player.x, p.z - player.z) < 1.6 ||
        pillars.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 2)
      )
        continue;
      raise(room, p.x, p.z, pillars, rising);
    }
    if (!pillars.length) {
      const p = freeSpotNear(room, room.cx, room.cz - 1);
      raise(room, p.x, p.z, pillars, rising);
    }
  }
  return { pillars, rising };
}
function raise(room: Room, x: number, z: number, pillars: Pillar[], rising: Coil['rising']) {
  const g = raisePillar(room, x, z);
  g.position.y = -C.rise.depth;
  rising.push({ g, t: 0 });
  pillars.push({ x, z, top: PILLAR_TOP });
}

/** Set off for pillar `p`: a flight to the foot of its coil, then round and up it. */
function makeFor(k: Coil, p: Pillar, lift: number, speed: number) {
  const from = Math.atan2(k.lead[2] - p.z, k.lead[0] - p.x);
  k.route = [
    ...arc(k.lead, spiralStart(p.x, p.z, p.top, from, C.coil), lift),
    ...spiral(p.x, p.z, p.top, from, C.coil),
  ];
  k.goal = p;
  k.at = null;
  k.speed = speed;
}
/** Walk the path `dist` further along the route, leaving the trail behind. */
function advance(k: Coil, dist: number) {
  while (dist > 0 && k.route.length) {
    const n = k.route[0],
      d = Math.hypot(n[0] - k.lead[0], n[1] - k.lead[1], n[2] - k.lead[2]);
    if (d <= dist) {
      k.lead = n;
      k.trail.push(n);
      k.route.shift();
      dist -= d;
    } else {
      const s = dist / d;
      k.lead = [
        k.lead[0] + (n[0] - k.lead[0]) * s,
        k.lead[1] + (n[1] - k.lead[1]) * s,
        k.lead[2] + (n[2] - k.lead[2]) * s,
      ];
      dist = 0;
    }
  }
  trim(k.trail, k.body.n * k.body.spacing + 2);
}
/** Where the body wants to lie now (the head, then an arched neck back to the path, then the trail), and the segments
    moved `rate` of the way there (1: at once). */
function lie(k: Coil, rate: number) {
  const spine = [...neck(k.head, k.lead, 0.35 * k.lean), ...k.trail.slice().reverse()];
  lay(spine, k.body.n, k.body.spacing, 0.28, k.want);
  for (let i = 0; i < k.body.n; i++) {
    const s = (k.shown[i] ??= [...k.want[i]]),
      w = k.want[i];
    for (let a = 0; a < 3; a++) s[a] += (w[a] - s[a]) * rate;
  }
}

/** One step of the dragon's fight. Returns the way it should face, when that isn't towards the mage. */
export function updateDragon(e: Enemy, dt: number): number | undefined {
  const k = coils.get(e)!,
    P = e.parts!,
    halo = e.halo!,
    maw = P.maw as THREE.Sprite,
    hurt = e.hp / e.maxHp < 0.5,
    shotMul = e.bossCfg?.shotSpeedMul ?? 1,
    quick = hurt ? C.hurtQuick : 1;
  e.vx = e.vz = e.kx = e.kz = 0;
  const winding = e.state === 'windBreath' || e.state === 'windMove';
  e.idle?.(e.t);
  e.ring!.rotation.z += dt * (winding ? 5 : 1.2);
  for (const r of k.rising)
    if (r.t < 1) {
      // its pillars rise out of the floor
      if (r.t === 0) Sfx.at(r.g.position.x, r.g.position.z).rumble();
      r.t = Math.min(1, r.t + dt / C.rise.time);
      r.g.position.y = -C.rise.depth * (1 - ease(r.t));
      if (Math.random() < dt * 25) {
        const x = r.g.position.x + G.current.cx,
          z = r.g.position.z + G.current.cz;
        burst(x + (Math.random() - 0.5) * 0.8, 0.1, z + (Math.random() - 0.5) * 0.8, 0x8a8070, 2, 1.4, 0.06);
      }
      if (r.t >= 1) G.shake = Math.max(G.shake, 0.15);
    }
  let face: number | undefined,
    headTo: P3 = k.lead,
    rate = 1 - Math.exp(-14 * dt);
  const from = k.lead;
  if (e.state === 'arrive' || e.state === 'travel' || e.state === 'climb') {
    // along its route, then coiled on the pillar at its end
    advance(k, k.speed * dt);
    k.lean = Math.max(0, k.lean - dt * 3);
    const dx = k.lead[0] - from[0],
      dz = k.lead[2] - from[2];
    if (Math.hypot(dx, dz) > 1e-4) face = Math.atan2(dx, dz);
    if (!k.route.length) {
      k.at = k.goal;
      e.state = 'coiled';
      e.st = C.settle * quick;
      Sfx.at(k.lead[0], k.lead[2]).dragonCall();
      if (hurt) ring(e, shotMul);
    }
  } else if (ON_PILLAR.has(e.state)) {
    const p = k.at!,
      d = Math.hypot(player.x - p.x, player.z - p.z) || 1,
      reach = C.coil.radius + C.lean;
    k.lean = e.state === 'windMove' ? Math.max(0, k.lean - dt * 3) : Math.min(1, k.lean + dt * 2.5);
    headTo = [
      p.x + ((player.x - p.x) / d) * reach * k.lean + (k.lead[0] - p.x) * (1 - k.lean),
      p.top + 0.15 - 0.2 * k.lean,
      p.z + ((player.z - p.z) / d) * reach * k.lean + (k.lead[2] - p.z) * (1 - k.lean),
    ];
    if (e.state === 'coiled') {
      P.jaw.rotation.x *= 0.85;
      P.head.rotation.x *= 0.85;
      maw.material.opacity *= 0.85;
      halo.material.opacity = 0.3;
      if (e.st <= 0) {
        if (k.breaths < C.breaths) {
          e.state = 'windBreath';
          e.st = C.breath.tell;
          k.kind = k.kind === 'fire' ? 'frost' : 'fire';
          maw.material.color.setHex(light(k.kind));
          halo.material.color.setHex(light(k.kind));
        } else {
          e.state = 'windMove';
          e.st = 0.45;
        }
      }
    } else if (e.state === 'windBreath') {
      // its maw glows with what it will breathe; its head drops towards the floor
      const t = 1 - Math.max(0, e.st) / C.breath.tell;
      P.jaw.rotation.x = 0.5 * t;
      P.head.rotation.x = 0.35 * t;
      maw.material.opacity = 0.95 * t;
      maw.scale.setScalar(1.6 + t * 1.6);
      halo.material.opacity = 0.3 + t * 0.5;
      if (Math.random() < dt * 30) mouthMotes(e, k.kind, 1);
      if (e.st <= 0) {
        e.state = 'breath';
        e.st = C.breath.time;
        e.fireT = 0;
        k.aim = Math.atan2(player.z - e.z, player.x - e.x);
        Sfx.at(e.x, e.z)[k.kind === 'fire' ? 'dragonFire' : 'dragonFrost']();
      }
    } else if (e.state === 'breath') {
      // a stream down onto the floor, sweeping across where the mage stood
      const B = C.breath,
        s = 1 - Math.max(0, e.st) / B.time,
        a = k.aim + (s - 0.5) * B.sweep * 2,
        mx = e.x + Math.cos(a) * 0.6,
        mz = e.z + Math.sin(a) * 0.6;
      face = Math.atan2(Math.cos(a), Math.sin(a));
      e.fireT = e.fireT! - dt;
      if (e.fireT <= 0) {
        e.fireT = B.every;
        spawnShot(
          mx,
          mz,
          Math.cos(a),
          Math.sin(a),
          B.speed * shotMul,
          light(k.kind),
          0.55,
          1.1,
          k.kind === 'fire' ? { fire: true } : { chill: 1 },
        );
      }
      if (Math.random() < dt * 40) mouthMotes(e, k.kind, 2);
      if (e.st <= 0) {
        e.state = 'coiled';
        e.st = C.pause * quick;
        k.breaths++;
      }
    } else if (e.state === 'windMove') {
      // it rears back to go
      P.head.rotation.x = -0.3 * (1 - Math.max(0, e.st) / 0.45);
      maw.material.opacity *= 0.8;
      if (e.st <= 0) {
        const others = k.pillars.filter((q) => q !== p);
        if (!others.length) {
          e.state = 'coiled';
          e.st = C.pause;
          k.breaths = 0;
        } else {
          const near = others.reduce((a, b) =>
            Math.hypot(b.x - player.x, b.z - player.z) < Math.hypot(a.x - player.x, a.z - player.z) ? b : a,
          );
          makeFor(
            k,
            Math.random() < C.fly.nearest ? near : others[Math.floor(Math.random() * others.length)],
            C.fly.lift,
            C.fly.speed,
          );
          e.state = 'travel';
          k.breaths = 0;
          P.head.rotation.x = 0;
        }
      }
    }
  } else if (e.state === 'fall') {
    // knocked off: it crashes down in a heap
    headTo = k.lead;
    rate = 1 - Math.exp(-7 * dt);
    if (e.st <= 0) {
      e.state = 'down';
      e.st = C.down;
      e.contact = 2;
      e.guard = C.open;
      G.shake = Math.max(G.shake, 0.35);
      Sfx.at(e.x, e.z).boom();
      burst(e.x, 0.3, e.z, 0x8a8070, 26, 3, 0.08);
    }
  } else if (e.state === 'down') {
    // on the floor, open, thrashing
    headTo = [k.lead[0], 0.35, k.lead[2]];
    P.head.rotation.z = Math.sin(e.t * 13) * 0.25;
    maw.material.opacity *= 0.8;
    if (e.st <= 0) {
      P.head.rotation.z = 0;
      e.contact = 0;
      e.guard = undefined;
      const near = k.pillars.reduce((a, b) =>
        Math.hypot(b.x - e.x, b.z - e.z) < Math.hypot(a.x - e.x, a.z - e.z) ? b : a,
      );
      makeFor(k, near, 0.6, C.climb);
      e.state = 'climb';
    }
  }
  for (let a = 0; a < 3; a++) k.head[a] += (headTo[a] - k.head[a]) * rate;
  e.x = k.head[0];
  e.z = k.head[2];
  e.body.position.y = k.head[1];
  lie(k, rate);
  k.body.pose(k.shown);
  return face;
}

/** After the dragon has moved: its body, laid in the world, stays put as its group follows the head. */
export function dragonMoved(e: Enemy) {
  const k = coils.get(e);
  if (k) k.chain.position.set(-e.x, 0, -e.z);
}

/** Knocked off its pillar (a blast at the pillar's foot, a bell): down it comes, to lie in a heap at the foot. */
export function knockDragon(e: Enemy) {
  const k = coils.get(e);
  if (!k || !k.at || !ON_PILLAR.has(e.state) || e.dead) return false;
  const p = k.at,
    room = G.current,
    to = Math.atan2(room.cz - p.z, room.cx - p.x),
    at = freeSpotNear(room, p.x + Math.cos(to) * 1.4, p.z + Math.sin(to) * 1.4);
  const pile = heap(at.x, at.z, to);
  k.trail = pile;
  k.lead = pile[pile.length - 1];
  k.route = [];
  k.at = null;
  k.lean = 0;
  e.state = 'fall';
  e.st = 0.5;
  (e.parts!.maw as THREE.Sprite).material.opacity = 0;
  floatText(e.x, 2.2, e.z, STR.bosses.dragon.fall, 0xffc070);
  Sfx.at(p.x, p.z).rubble();
  G.shake = Math.max(G.shake, 0.25);
  burst(p.x, p.top, p.z, 0x8a8070, 18, 2.4, 0.07);
  return true;
}
/** A glyph's blast at (x, z) reaching `r`: the dragon on a pillar whose foot it reaches is knocked off. */
export function dragonBlast(x: number, z: number, r: number) {
  for (const e of G.enemies) {
    const k = e.type === 'dragon' ? coils.get(e) : undefined;
    if (k?.at && Math.hypot(k.at.x - x, k.at.z - z) < r + 0.4) knockDragon(e);
  }
}
/** A bell rung in the room: the dragon loses its hold. */
export function dragonBell() {
  for (const e of G.enemies) if (e.type === 'dragon') knockDragon(e);
}
/** Dev hook: the dragon's pillars, whether it is on one, and how high its head is. */
export function dragonInfo() {
  const e = G.enemies.find((f) => f.type === 'dragon'),
    k = e && coils.get(e);
  return k
    ? {
        state: e!.state,
        pillars: k.pillars.length,
        on: !!k.at,
        headY: k.head[1],
        risen: k.rising.every((r) => r.t >= 1),
      }
    : null;
}

/** Below half health, landing on a pillar: a ring of fire and frost by turns. */
function ring(e: Enemy, shotMul: number) {
  const R = C.ring,
    off = Math.random() * Math.PI;
  for (let i = 0; i < R.count; i++) {
    const a = off + (i / R.count) * Math.PI * 2,
      fire = i % 2 === 0;
    spawnShot(
      e.x,
      e.z,
      Math.cos(a),
      Math.sin(a),
      R.speed * shotMul,
      light(fire ? 'fire' : 'frost'),
      0.9,
      1.1,
      fire ? { fire: true } : { chill: 1 },
    );
  }
  burst(e.x, 1.4, e.z, SCHOOL_LIGHT.ember, 12, 3, 0.06);
  burst(e.x, 1.4, e.z, SCHOOL_LIGHT.frost, 12, 3, 0.06);
}
/** Embers or frost streaming from its maw down to the floor. */
function mouthMotes(e: Enemy, kind: 'fire' | 'frost', n: number) {
  const f = e.face,
    y = e.body.position.y;
  for (let i = 0; i < n; i++) {
    const s = Math.random();
    burst(
      e.x + Math.sin(f) * (0.7 + s * 0.8),
      y - 0.1 - s * (y - 0.3),
      e.z + Math.cos(f) * (0.7 + s * 0.8),
      light(kind),
      1,
      0.8,
      0.05,
    );
  }
}
