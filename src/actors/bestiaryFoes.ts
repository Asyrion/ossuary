/* The bestiary's foes (docs/archive/M4.5-plan.md): the behaviours of the thirty-five, floor by floor, on the same footing as
   those in actors/foes.ts (which spreads them into its own; what each is lives in data/foes.json). What they leave on the ground
   and throw is in bestiaryGround.ts.

   The behaviours are in bestiaryFloor1.ts to bestiaryFloor5.ts, a file a floor, each describing its own; here are the
   helpers more than one floor uses, the five maps merged, and what enemies.ts asks of the bestiary (a lark's haste, a
   pack). */
import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { G } from '../state';
import { CFG } from '../config';
import { markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { spawnShot } from '../combat/projectiles';
import { freeSpotNear, isFreeAt } from '../world/rooms';
import { lerp } from '../util';
import { makeEnemy } from './enemies';
import { light, num, type Aim, type Behaviour, type Params } from './foeKit';
export { clearGround, updateGround } from './bestiaryGround';
import { BESTIARY_FLOOR1 } from './bestiaryFloor1';
import { BESTIARY_FLOOR2 } from './bestiaryFloor2';
import { BESTIARY_FLOOR3 } from './bestiaryFloor3';
import { BESTIARY_FLOOR4 } from './bestiaryFloor4';
import { BESTIARY_FLOOR5 } from './bestiaryFloor5';

/** Steer `e` towards (x, z) at `speed`, easing in over `ease` seconds (a flier's swoop rather than a turn on the spot). */
export function steer(e: Enemy, x: number, z: number, speed: number, dt: number, ease = 0.25) {
  const dx = x - e.x,
    dz = z - e.z,
    d = Math.hypot(dx, dz) || 1,
    sp = speed * Math.min(1, d / 0.6);
  const k = Math.min(1, dt / ease);
  e.vx = lerp(e.vx, (dx / d) * sp, k);
  e.vz = lerp(e.vz, (dz / d) * sp, k);
}

/** Keep `e` between `near` and `far` of the mage, circling it (`turn` +1 or -1): closer when far, back when near. */
export function circle(e: Enemy, a: Aim, near: number, far: number, speed: number, turn: number) {
  const rad = a.dist > far ? 1 : a.dist < near ? -1 : 0,
    side = 0.8;
  const vx = a.ux * rad - a.uz * side * turn,
    vz = a.uz * rad + a.ux * side * turn,
    n = Math.hypot(vx, vz) || 1;
  e.vx = (vx / n) * speed;
  e.vz = (vz / n) * speed;
}

/** Set part `o`'s tilt (rotation.x) to its rest, the look's own (kept the first time), plus `by`: for a part its look's idle
    leaves still, so a pose's offset doesn't pile up step on step. */
export function lean(o: THREE.Object3D, by: number) {
  o.userData.rx ??= o.rotation.x;
  o.rotation.x = (o.userData.rx as number) + by;
}

/** The same for how far forward a part reaches (position.z). */
export function thrust(o: THREE.Object3D, by: number) {
  o.userData.pz ??= o.position.z;
  o.position.z = (o.userData.pz as number) + by;
}

/** The way `e` faces (body.rotation.y) as a direction on the floor. */
export const facing = (e: Enemy) => ({ x: Math.sin(e.face), z: Math.cos(e.face) });

/** A shot from `e` at the mage, a little ahead of it. */
export const shoot = (
  e: Enemy,
  ux: number,
  uz: number,
  speed: number,
  size = 0.7,
  o: Parameters<typeof spawnShot>[8] = {},
  color: number = light(e),
) => spawnShot(e.x + ux * 0.35, e.z + uz * 0.35, ux, uz, speed, color, 0.55, size, o);

/** Foes in the current room still standing (and not hidden away), other than `e`. */
export const othersAwake = (e: Enemy) =>
  G.room.enemies.some((o) => o !== e && !o.dead && o.state !== 'hidden' && o.state !== 'shut' && o.type !== e.type);

/** A walking wave's ice, while the water under it is frozen: one shared block of ice. */
let iceBlock: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;

export function encase(e: Enemy, on: boolean, scale = 1) {
  if (!on) {
    if (e.extra) {
      e.body.remove(e.extra);
      e.extra = undefined;
    }
    return;
  }
  iceBlock ??= {
    geo: markShared(new THREE.IcosahedronGeometry(0.62, 0).scale(1, 1.6, 1).translate(0, 0.75, 0)),
    mat: markShared(
      new THREE.MeshStandardMaterial({
        color: 0xcfeaf8,
        emissive: 0x1a3a50,
        roughness: 0.08,
        metalness: 0.3,
        transparent: true,
        opacity: 0.55,
        flatShading: true,
      }),
    ),
  };
  const m = new THREE.Mesh(iceBlock.geo, iceBlock.mat);
  m.scale.setScalar(scale);
  e.body.add(m);
  e.extra = m;
}

/** A spot against the stone wall nearest (x, z) in `room` (not the low south wall), and the way out from it: on floor with
    the wall behind, clear of the north wall's pilasters and niches, open to the room `wallOpen` units in front (no pillar or
    tomb hiding it from the mage's bolts) and `wallApart` from `others` (another nest). Along the nearest wall first, then
    the others; the nearest free spot if no wall has one. */
export function againstWall(room: Room, x: number, z: number, others: readonly { x: number; z: number }[] = []) {
  const b = room.bounds,
    C = CFG.bestiary,
    sides = [
      { d: x - b.minX, x: b.minX + 0.55, z, ox: 1, oz: 0 },
      { d: b.maxX - x, x: b.maxX - 0.55, z, ox: -1, oz: 0 },
      { d: z - b.minZ, x, z: b.minZ + 0.55, ox: 0, oz: 1 },
    ].sort((p, q) => p.d - q.d);
  const solid = (px: number, pz: number) =>
    room.rocks.some((r) => Math.abs(px - r.x) < r.hx + 0.25 && Math.abs(pz - r.z) < r.hz + 0.25);
  const inside = (px: number, pz: number) =>
    px > b.minX &&
    px < b.maxX &&
    pz > b.minZ &&
    pz < b.maxZ &&
    room.template.tiles[Math.floor(pz - b.minZ)]?.[Math.floor(px - b.minX)] !== 'void';
  for (const s of sides) {
    const dressed = s.oz === 1 ? (room.dressed ?? []).filter((w) => Math.abs(w.z - s.z) < 1.5) : [];
    for (const o of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, 2.8, -2.8, 3.5, -3.5, 4.2, -4.2, 4.9, -4.9]) {
      const px = s.x + (s.oz ? o : 0),
        pz = s.z + (s.ox ? o : 0);
      if (!isFreeAt(room, px, pz) || inside(px - s.ox * 0.9, pz - s.oz * 0.9)) continue; // (on floor, the wall behind it)
      if (
        dressed.some((w) => Math.abs(w.x - px) < 0.75) ||
        others.some((n) => Math.hypot(n.x - px, n.z - pz) < C.wallApart)
      )
        continue;
      let open = true;
      for (let t = 0.5; t <= C.wallOpen && open; t += 0.3) {
        const qx = px + s.ox * t,
          qz = pz + s.oz * t;
        if (!inside(qx, qz) || solid(qx, qz)) open = false;
      }
      if (open) return { x: px, z: pz, ox: s.ox, oz: s.oz };
    }
  }
  const s = sides[0],
    at = freeSpotNear(room, s.x, s.z);
  return { x: at.x, z: at.z, ox: s.ox, oz: s.oz };
}

/** The braziers in `room`, and the one nearest (x, z) that is (or isn't) lit. */
export function brazierNear(room: Room, x: number, z: number, lit: boolean) {
  let best: { x: number; z: number } | undefined,
    d0 = Infinity;
  for (const b of room.props ?? [])
    if (b.prop.kind === 'brazier' && !!b.prop.lit === lit) {
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < d0) {
        d0 = d;
        best = b;
      }
    }
  return best;
}

/** `e` splits in two (an ink octopus, a magma ooze): it becomes the one half, smaller, and the other slides away. */
export function halve(e: Enemy, P: Params, dx: number, dz: number, color: number) {
  const k = num(P.splitScale),
    hp = e.maxHp * num(P.splitHp);
  e.gen = 1;
  e.hp = hp;
  e.scale *= k;
  e.r *= k;
  e.kx += -dz * 3;
  e.kz += dx * 3;
  const at = freeSpotNear(G.room.current, e.x + dz * 0.6, e.z - dx * 0.6),
    twin = makeEnemy(e.type, at.x, at.z);
  twin.gen = 1;
  twin.maxHp = e.maxHp;
  twin.hp = hp;
  twin.scale = e.scale;
  twin.r = e.r;
  twin.spawn = 0.15;
  twin.kx = dz * 3;
  twin.kz = -dx * 3;
  e.purse = twin.purse = (e.purse ?? 0) / 2; // (the two halves share one purse)
  burst(e.x, 0.4, e.z, color, 18, 2.4, 0.06);
}

export const splitsNow = (e: Enemy, dmg: number, P: Params) =>
  !((e.gen ?? 0) > 0 || e.hp - dmg > e.maxHp * num(P.splitAt) || e.hp - dmg <= 0);

export const BESTIARY_BEHAVIOURS: Record<string, Behaviour> = {
  ...BESTIARY_FLOOR1,
  ...BESTIARY_FLOOR2,
  ...BESTIARY_FLOOR3,
  ...BESTIARY_FLOOR4,
  ...BESTIARY_FLOOR5,
};
/** How fast a foe a lark has sung to moves (1: not sung to). */
export const songHaste = (e: Enemy) => ((e.sung ?? 0) > G.flow.clock ? CFG.bestiary.songHaste : 1);
/** Make a pack of `n` foes of one kind round (x, z), sharing one mind (the firefly swarm): each made by `make`. */
export function packOf(n: number, x: number, z: number, make: (x: number, z: number) => Enemy) {
  const first = make(x, z),
    pack = (first.pack ??= {
      members: [first],
      cx: x,
      cz: z,
      state: '',
      st: 0,
      stamp: -1,
      tx: 0,
      tz: 0,
      a: Math.random() * 6,
    }); // (a swarm makes its own as it begins; others, here)
  for (let i = 1; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      at = freeSpotNear(G.room.current, x + Math.cos(a) * 0.7, z + Math.sin(a) * 0.7);
    const m = make(at.x, at.z);
    pack.members.push(m);
    m.pack = pack;
    m.cycle = a;
  }
  return first;
}
