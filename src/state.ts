import { CFG } from './config';
import type { Bolt, Enemy, Particle, Pickup, Player, Portal, Room, Shot, Transition } from './types';
import type * as THREE from 'three';

export type GameState = 'title' | 'play' | 'pause' | 'dying' | 'end';

/** Shared mutable game state. Modules read and write it through this one object. */
export const G = {
  state: 'title' as GameState,
  trans: null as Transition | null,
  rooms: [] as Room[],
  roomMap: new Map<string, Room>(),
  current: undefined as unknown as Room, // set by buildFloor() during boot
  enemies: [] as Enemy[],
  bolts: [] as Bolt[],
  shots: [] as Shot[],
  pickups: [] as Pickup[],
  particles: [] as Particle[],
  decals: [] as THREE.Mesh[],
  portal: null as Portal | null,
  stats: { time: 0, kills: 0 },
  shake: 0,
  simClock: 0,
};

export const player: Player = {
  dead: false, x: 0, z: 0, vx: 0, vz: 0, r: CFG.hero.radius, hp: 6, maxHp: 6, invuln: 0, fireCd: 0, eye: 1, yawA: 0,
  damage: CFG.hero.damage, boltScale: 1, boltColor: 0xffcf7a, squash: 0, items: [], bob: 0,
};

/* Gameplay timers run on simulation time (not setTimeout), so they pause with the game and
   advance under __game.sim(). They tick while the state is 'play' or 'dying'. */
const timers: { t: number; fn: () => void }[] = [];
export function after(seconds: number, fn: () => void) { timers.push({ t: seconds, fn }); }
export function clearTimers() { timers.length = 0; }
export function updateTimers(dt: number) {
  for (let i = timers.length - 1; i >= 0; i--) {
    const tm = timers[i]; tm.t -= dt;
    if (tm.t <= 0) { timers.splice(i, 1); tm.fn(); }
  }
}
