import type { TransformId } from './items/transformData';
import { CFG, type BossType } from './config';
import { START_FOCUS, computeStats } from './items/artifactData';
import { bottlesFor, type PotionId } from './items/alchemyData';
import { Rng } from './rng';
import type { FloorPlan } from './world/generate';
import type { Bolt, Enemy, Glyph, Particle, Pickup, Player, Trapdoor, Room, Shot, Transition } from './types';
import type * as THREE from 'three';
import type { Kinds } from './world/kitData';
import type { FoeId } from './actors/foeData';
import { noAttrs } from './progression/attributes';

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
    /** The floor on which the Last Rite last refused a killing blow (M4.1). */ riteFloor: -99,
    /** Items and containers already described by a lore card this run (ui/lore.ts). */ loreSeen: new Set<string>(),
    /** Hints already given this run (a heart or a mana vial left lying at full health or mana). */ hinted: new Set<string>(),
    /** The seeded stream for grimoire pages, and the spells given up this run, sold back at later libraries. */
    pages: new Rng(0), forgotten: [] as string[],
    /** M4.2: the seeded stream for the Wandering Merchant (when the merchant comes, what is for sale), and whether the merchant has come. */
    wanderer: new Rng(0), wandererMet: false,
    /** M4.2: the floor Fen-Nex was bound on (it grows a stage a floor), while it is. */ fennexFrom: undefined as number | undefined,
    /** M4.6: the transformations formed this run, in order (the latest wears its look; every gift stays). */ transforms: [] as TransformId[],
    /** M4.6: the stage of Asyrion's arc reached this run (each said once in a line). */ arc: 0,
    /** M4.11: the schools the mage has been attuned to this run (each said once). */ attuned: [] as string[],
    /** M5: the run's bottles (each potion's shape and draught, shuffled on the seed), the potions identified this run,
        the seeded stream for which potion or reagent a drop is, and the one for whether a foe or an object leaves a reagent
        (its own, so the other drops replay as before). */
    bottles: bottlesFor(0), identified: [] as PotionId[], alchemy: new Rng(0), reagents: new Rng(0),
    /** M5: the curse whose price a Bitter Remedy lifts until the floor ends. */ remedy: null as string | null,
    /** M5 step 7: the jelly serpent, in its vat until it breaks out (once a run at most), then slain or not; and whether it
        is restless this run (rolled on the seed: it breaks out by itself after the first brew in its laboratory). */
    serpent: 'caged' as 'caged' | 'out' | 'slain', restless: false,
    /** M6: insight gained this run (the GDD's XP), the level it reached, the levels whose choice still waits (the level-up
        screen, step 4), and the potions' kinds used this run (each pays the first time). */
    insight: 0, level: 1, pending: 0, potionsUsed: [] as PotionId[],
    /** M6 step 2: the points spent on each attribute this run. */ attrs: noAttrs(),
  },
  shake: 0,
  simClock: 0,
};

/** Dev menu switches (ui/devMenu.ts): god mode keeps the mage from harm; endless mana never runs out; `moveClip`
    tries the walk clip for all movement (with its feet in step, or at a natural pace), to compare with the run;
    `doors` moves every door off the middle of its edge where it fits, or none, in the floors made from now on. */
export const DEV = { /** M4.6: Asyrion's arc forced to a stage (the dev menu), else from what is held. */ arc: undefined as number | undefined, god: false, mana: false, fps: false, moveClip: 'run' as 'run' | 'walkInStep' | 'walkNatural', doors: 'data' as 'data' | 'shifted' | 'middle',
  /** The room kit in code (M3.5 step 3's proof: the fire objects, the crypt's floor and walls); off keeps the old looks. */
  roomKit: true,
  /** Kinds of the room kit forced on every room of the floor (the dev menu's Look tab), to compare; else each room draws. */
  kitKinds: {} as Partial<Kinds>,
  /** One foe in every template role on every floor (`?foe=`, the dev menu), to test it; else each floor fills its roles. */
  foe: undefined as FoeId | undefined,
  /** M4.6: the camera close on the mage (the dev menu's Costumes section), to see what is worn; `CFG.costume.closeUp`. */
  closeUp: false,
  /** M5: every fallen foe and broken object leaves its reagent (the dev menu's Alchemy), to test where they come from. */
  reagents: false };

export const player: Player = {
  dead: false, x: 0, z: 0, vx: 0, vz: 0, r: CFG.hero.radius, hp: 6, maxHp: 6, invuln: 0, fireCd: 0, eye: 1, yawA: 0, blessed: 0,
  squash: 0, bob: 0, focus: START_FOCUS, items: [], heartsPaid: 0, cleansed: [], stats: computeStats(START_FOCUS, [], CFG.hero),
  coins: 0, keys: 0, glyphs: 0, souls: [], still: 0,
  mana: CFG.hero.mana, spells: [null, null], spellCd: [0, 0], aim: { x: 0, z: -1 }, dim: 0, chill: 0, stone: 0, pull: { x: 0, z: 0 }, hexed: 0, drained: 0, hexDebt: 0, hexDebtUntil: 0, drawn: 0,
  belt: [], beltAt: 0, reagents: {},
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
