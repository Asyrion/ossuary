import { CFG, type BossType } from './config';
import { START_FOCUS, computeStats } from './items/artifactData';
import { Rng } from './rng';
import type { FloorPlan } from './world/generate';
import type { Bolt, Enemy, Glyph, Particle, Pickup, Player, Trapdoor, Room, Shot, Transition } from './types';
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
  glyphs: [] as Glyph[],
  particles: [] as Particle[],
  decals: [] as THREE.Mesh[],
  trapdoor: null as Trapdoor | null,
  stats: { time: 0, kills: 0, obols: 0 },
  /** The current run: its seed, which floor (0-based), the seeded streams for artifacts (loot) and for what
      rooms and enemies drop (drops); this floor's boss and the bosses the run has met. */
  run: {
    seed: '', floor: 0, loot: new Rng(0), drops: new Rng(0), seen: new Set<string>(), plan: null as FloorPlan | null,
    boss: 'warden' as BossType, bossesMet: [] as BossType[],
    /** Artifacts offered on this floor, and guaranteed sources still to come (see items/artifacts.ts). */
    budget: { used: 0, reserved: 0 },
    /** Foes put to rest towards the Leech Jar's next half heart. */ leech: 0,
    /** The floor on which the Sexton's Keyring last opened a vault for free. */ freeVault: -1,
  },
  shake: 0,
  simClock: 0,
};

/** Dev menu switches (ui/devMenu.ts): god mode keeps the mage from harm. */
export const DEV = { god: false };

export const player: Player = {
  dead: false, x: 0, z: 0, vx: 0, vz: 0, r: CFG.hero.radius, hp: 6, maxHp: 6, invuln: 0, fireCd: 0, eye: 1, yawA: 0,
  squash: 0, bob: 0, focus: START_FOCUS, items: [], heartsPaid: 0, cleansed: [], stats: computeStats(START_FOCUS, [], CFG.hero),
  coins: 0, keys: 0, glyphs: 0,
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
