import type * as THREE from 'three';
import type { EnemyType } from './config';

export type Side = 'n' | 's' | 'e' | 'w';
export type RoomType = 'start' | 'normal' | 'treasure' | 'boss';
export type DoorStyle = 'normal' | 'treasure' | 'boss';
export interface Vec2 { x: number; z: number }
/** Axis-aligned box on the floor plane: centre and half extents. */
export interface Box { x: number; z: number; hx: number; hz: number }
export interface Circle { x: number; z: number; r: number }

export interface RoomDef {
  gx: number; gy: number; type: RoomType; seed: number;
  rocks?: [number, number][];
  foes?: [EnemyType, number, number][];
  relic?: string;
}

export interface RelicDef {
  id: string; name: string; pickup: string; color: string;
  effects: { damageAdd?: number; boltScale?: number; boltColor?: string };
}

export interface Door { side: Side; nb: Room; bars: THREE.Group; barH: number; open: boolean; style: DoorStyle; box: Box }
export interface Torch { flame: THREE.Mesh; glow: THREE.Sprite; x: number; z: number }
export interface RelicSpot { def: RelicDef; group: THREE.Group; taken: boolean; x: number; z: number }

export interface Room {
  def: RoomDef; type: RoomType; gx: number; gy: number; cx: number; cz: number;
  group: THREE.Group; doors: Partial<Record<Side, Door>>; walls: Box[]; rocks: Box[]; torches: Torch[];
  cleared: boolean; visited: boolean; known: boolean; locked: boolean;
  relic?: RelicSpot;
}

export interface Enemy extends Circle {
  type: EnemyType; vx: number; vz: number; kx: number; kz: number; hp: number; maxHp: number;
  flying: boolean; spawn: number; t: number; flash: number; mats: THREE.MeshStandardMaterial[];
  group: THREE.Group; body: THREE.Group; face: number; contact: number; state: string; st: number;
  dead?: boolean; isBoss?: boolean;
  // type-specific parts and AI state
  core?: THREE.Mesh; halo?: THREE.Sprite; target?: Vec2; fireT?: number; dir?: Vec2;
  eye?: THREE.Mesh; ring?: THREE.Mesh; cycle?: number; summoned?: boolean; volleys?: number;
}

export interface Bolt extends Circle { y: number; vx: number; vz: number; dist: number; mesh: THREE.Group }
export interface Shot extends Circle { y: number; vx: number; vz: number; color: number; mesh: THREE.Group }
export interface Particle { m: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; vx: number; vy: number; vz: number; life: number }
export interface Pickup extends Circle { kind: 'heart'; value: number; g: THREE.Group; m: THREE.Mesh; t: number; drop: number }
export interface Portal { g: THREE.Group; x: number; z: number; ring: THREE.Mesh; t: number }

export interface Transition { t: number; dur: number; nb: Room; fx: number; fz: number; tx: number; tz: number; cfx: number; cfz: number }

export interface Player extends Circle {
  dead: boolean; vx: number; vz: number; hp: number; maxHp: number; invuln: number; fireCd: number;
  eye: number; yawA: number; damage: number; boltScale: number; boltColor: number; squash: number;
  items: string[]; bob: number;
}
