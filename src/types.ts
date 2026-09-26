import type * as THREE from 'three';
import type { EnemyType } from './config';
import type { BossConfig, PlannedRoom } from './world/generate';
import type { FoeKind, Template } from './world/templates';
import type { ArtifactDef, BoltPath, Stats } from './items/artifactData';

export type Side = 'n' | 's' | 'e' | 'w';
export type RoomType = 'start' | 'normal' | 'treasure' | 'boss';
export type DoorStyle = 'normal' | 'treasure' | 'boss';
export interface Vec2 { x: number; z: number }
/** Axis-aligned box on the floor plane: centre and half extents. */
export interface Box { x: number; z: number; hx: number; hz: number }
export interface Circle { x: number; z: number; r: number }

type RGB = [number, number, number];
/** How a floor looks: placeholder variety until the biome pass (M8). Lives in data/floors.json. */
export interface FloorLook {
  name: string;
  /** Floor tiles: base colour, mortar, stain colour ("r,g,b"), scattered decoration and how many bones. */
  floor: { base: RGB; mortar: string; stain: string; decor: 'bones' | 'puddles' | 'ash'; bones: number };
  wall: { brick: RGB; mortar: string; stains: 'none' | 'moss' | 'soot' };
  torch: { style: 'bracket' | 'lantern' | 'brazier'; flame: string; light: string; intensity: number };
  /** Hemisphere sky and ground colours, and the moonlight. */
  light: { sky: string; ground: string; moon: string };
}

export interface Door { side: Side; nb: Room; bars: THREE.Group; barH: number; open: boolean; style: DoorStyle; box: Box }
export interface Torch { flame: THREE.Mesh; glow: THREE.Sprite; x: number; z: number }
/** A rock collider; Mason's Chisel breaks breakable ones. Pedestals are unbreakable "rocks". */
export interface RockBox extends Box { hp: number; breakable: boolean; mesh?: THREE.Object3D; tile?: { c: number; r: number } }
/** An artifact on a pedestal. `pair` links the boss's two choices: taking one makes the other vanish. */
export interface ArtifactSpot {
  def: ArtifactDef; room: Room; x: number; z: number; taken: boolean;
  /** False right after swapping foci, until the mage steps away. */ armed: boolean;
  pedestal: THREE.Group; visual: THREE.Group; collider: RockBox; pair?: ArtifactSpot;
}

export interface Room {
  plan: PlannedRoom; template: Template; look: FloorLook; type: RoomType; gx: number; gy: number; cx: number; cz: number;
  /** Interior in world units. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  group: THREE.Group; doors: Partial<Record<Side, Door>>; walls: Box[]; rocks: RockBox[]; pits: Box[]; torches: Torch[];
  /** Enemies to spawn on first entry, in world positions. */
  foes: { kind: FoeKind; x: number; z: number }[];
  cleared: boolean; visited: boolean; known: boolean; locked: boolean;
  spots: ArtifactSpot[];
}

export interface Enemy extends Circle {
  type: EnemyType; vx: number; vz: number; kx: number; kz: number; hp: number; maxHp: number;
  flying: boolean; spawn: number; t: number; flash: number; mats: THREE.MeshStandardMaterial[];
  group: THREE.Group; body: THREE.Group; face: number; contact: number; state: string; st: number;
  dead?: boolean; isBoss?: boolean; bossCfg?: BossConfig;
  // type-specific parts and AI state
  core?: THREE.Mesh; halo?: THREE.Sprite; target?: Vec2; fireT?: number; dir?: Vec2;
  eye?: THREE.Mesh; ring?: THREE.Mesh; cycle?: number; summoned?: boolean; volleys?: number;
}

export interface Bolt extends Circle {
  y: number; vx: number; vz: number; speed: number; dist: number; range: number; mesh: THREE.Group;
  damage: number; color: number; path: BoltPath;
  /** Enemies it may still pass through, and walls it may still bounce off. */ pierce: number; bounces: number;
  returning: boolean; /** Enemies already hit on this pass. */ hit: Set<Enemy>;
  /** Burst bolts from artifacts (Knucklebone, Bell): straight, weaker, no focus pattern. */ secondary: boolean;
}
export interface Shot extends Circle { y: number; vx: number; vz: number; color: number; mesh: THREE.Group }
export interface Particle { m: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; vx: number; vy: number; vz: number; life: number }
export interface Pickup extends Circle { kind: 'heart'; value: number; g: THREE.Group; m: THREE.Mesh; t: number; drop: number }
export interface Trapdoor { g: THREE.Group; x: number; z: number; ring: THREE.Mesh; t: number }

export interface Transition { t: number; dur: number; nb: Room; fx: number; fz: number; tx: number; tz: number; cfx: number; cfz: number }

export interface Player extends Circle {
  dead: boolean; vx: number; vz: number; hp: number; maxHp: number; invuln: number; fireCd: number;
  eye: number; yawA: number; squash: number; bob: number;
  /** The equipped focus and every other artifact held, in pickup order. */ focus: string; items: string[];
  /** Derived from the base stats and the artifacts held (items/artifactData.ts computeStats). */ stats: Stats;
}
