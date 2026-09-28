import type * as THREE from 'three';
import type { EnemyType } from './config';
import type { BossConfig, PlannedRoom } from './world/generate';
import type { FoeKind, Template } from './world/templates';
import type { StatusState } from './magic/status';
import type { ArtifactDef, BoltPath, Stats } from './items/artifactData';
import type { Drop, Item, Ware } from './items/loot';

export type Side = 'n' | 's' | 'e' | 'w';
export type RoomType = 'start' | 'normal' | 'treasure' | 'boss' | 'ordeal' | 'altar' | 'merchant' | 'vault' | 'secret' | 'shrine';
export type DoorStyle = 'normal' | 'treasure' | 'boss' | 'ordeal' | 'altar' | 'merchant' | 'vault' | 'secret' | 'shrine';
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

/** A doorway: (x, z) is its middle on this room's inside edge; `link` is the matching door in `nb`. */
export interface Door {
  side: Side; nb: Room; link?: Door; x: number; z: number;
  bars: THREE.Group; barH: number; open: boolean; style: DoorStyle; box: Box;
  /** A locked vault's door: the ward shared by both sides of the doorway. */ seal?: VaultSeal;
  /** A secret room's hidden doorway: a cracked wall until a blast opens it. */ secret?: SecretWall;
}
/** One side of a secret room's hidden doorway (GDD: Secret room): a stretch of cracked wall filling the
    doorway, in `room`. The cantrip divines it (it rings hollow and the crack glows); a glyph's blast opens
    both sides at once. */
export interface SecretWall {
  room: Room; open: boolean; divined: boolean;
  /** The wall piece filling the doorway, and the crack's glow (shown once divined). */ plug: THREE.Group; glow: THREE.MeshBasicMaterial[];
  /** Seconds until dust next drifts from the crack. */ dust: number;
}
/** The ward sealing a locked vault's door (GDD: Locked vault): a bone key unbinds it, or enough glyph
    blasts force it and wake the vault's warden. `outer` is the door on the neighbour's side. */
export interface VaultSeal {
  sealed: boolean; blasts: number; vault: Room; inner: Door; outer: Door; outerRoom: Room;
  /** The ward disc and padlock on the outer side. */ mark: THREE.Group;
  /** Says it's sealed again only after the mage steps away. */ armed: boolean;
}
/** A merchant's ware floating in its ward circle; the price is in obols (0 for a focus left behind). */
export interface WareSpot {
  ware: Ware; def?: ArtifactDef; price: number; x: number; z: number;
  g: THREE.Group; item: THREE.Object3D; circle?: THREE.Object3D; tag?: THREE.Object3D;
  sold: boolean; /** Refuses again only after the mage steps away. */ armed: boolean;
  /** The price its tag shows (the Pedlar's Scale lowers it). */ tagPrice?: number;
}
/** A wall light; dark rooms have their torches out (`lit` false). (x, z) is where its light sits. */
export interface Torch { flame: THREE.Mesh; glow: THREE.Sprite; x: number; z: number; lit: boolean }
/** A rock collider; Mason's Chisel breaks breakable ones. Pedestals, pillars and tombs are unbreakable "rocks";
    urns are "rocks" any bolt breaks, and rune-sealed ones only a blast. */
export interface RockBox extends Box { hp: number; breakable: boolean; mesh?: THREE.Object3D; tile?: { c: number; r: number }; urn?: 'plain' | 'sealed' }
/** An artifact on a pedestal. `pair` links the boss's two choices: taking one makes the other vanish. */
export interface ArtifactSpot {
  def: ArtifactDef; room: Room; x: number; z: number; taken: boolean;
  /** False right after swapping foci, until the mage steps away. */ armed: boolean;
  pedestal: THREE.Group; visual: THREE.Group; collider: RockBox; pair?: ArtifactSpot;
  /** Bone altars ask a heart container; the floating price tag goes when it's taken. */ price?: { hearts: number; tag: THREE.Object3D };
}

/** A shrine's offering stone: the cursed artifact it stands for, in one of the shrine's spots. False `armed`
    right after the mage walked into it, until they step away. */
export interface OfferingStone { id: string; slot: number; x: number; z: number; g: THREE.Group; visual: THREE.Group; collider: RockBox; armed: boolean }

export interface Room {
  plan: PlannedRoom; template: Template; look: FloorLook; type: RoomType; gx: number; gy: number; cx: number; cz: number;
  /** The inside's bounding box in world units; `w` × `h` tiles, of which `mask` marks the inside. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; w: number; h: number; mask: boolean[][];
  group: THREE.Group; doors: Door[]; walls: Box[]; rocks: RockBox[]; pits: Box[]; torches: Torch[];
  /** Enemies to spawn, wave by wave (ordeals have 2 or 3 waves, other fights 1), in world positions. */
  waves: { kind: FoeKind; x: number; z: number }[][];
  /** The wave being fought, and whether the next one is on its way. */ wave: number; wavePending: boolean;
  /** Ambush rooms: waiting for the mage to reach the middle (armed), or already sprung. */ ambush?: 'armed' | 'sprung';
  /** Quiet rooms: a heart waits there on the first visit. */ quietHeart?: boolean;
  cleared: boolean; visited: boolean; known: boolean; locked: boolean;
  spots: ArtifactSpot[];
  /** The merchant's wares and the shade himself. */ wares?: WareSpot[]; shade?: THREE.Group;
  /** A locked vault forced open by blasts: its warden, a champion, rises when the mage comes in. */ warden?: boolean;
  /** A secret room, once one of its walls has been blasted open. */ found?: boolean;
  /** The mage was hurt during this room's fight (Unbroken Oath). */ hurt?: boolean;
  /** A shrine: its circle's material, the motes around it and the offering stones. */
  shrine?: { mat: THREE.MeshBasicMaterial; motes: THREE.Sprite[]; stones: OfferingStone[] };
}

export interface Enemy extends Circle {
  type: EnemyType; vx: number; vz: number; kx: number; kz: number; hp: number; maxHp: number;
  flying: boolean; spawn: number; t: number; flash: number; mats: THREE.MeshStandardMaterial[];
  group: THREE.Group; body: THREE.Group; face: number; contact: number; state: string; st: number;
  dead?: boolean; isBoss?: boolean; bossCfg?: BossConfig;
  /** Size and speed factors (champions are bigger and faster); the champion's glow. */ scale: number; speedMul: number;
  champion?: boolean; aura?: THREE.Sprite;
  // type-specific parts and AI state
  core?: THREE.Mesh; halo?: THREE.Sprite; target?: Vec2; fireT?: number; dir?: Vec2;
  eye?: THREE.Mesh; ring?: THREE.Mesh; cycle?: number; summoned?: boolean; volleys?: number;
  /** Bosses: out of reach (under the floor, in the air), so neither hurt nor hurting. */ hidden?: boolean;
  /** Floor ring (the abbess's ripple, the knight's landing mark); where a leap started. */ marker?: THREE.Mesh; from?: Vec2;
  /** Called by a boss; falls when the boss does. */ servant?: boolean;
  /** What struck it last: the cantrip's kills give mana back. */ lastHit?: 'cantrip' | 'spell';
  /** Status effects on it (magic/status.ts), the ice around it while frozen, and the training dummy's label. */
  status?: StatusState; ice?: THREE.Mesh; label?: THREE.Sprite;
}

export interface Bolt extends Circle {
  y: number; vx: number; vz: number; speed: number; dist: number; range: number; mesh: THREE.Group;
  damage: number; color: number; path: BoltPath;
  /** Enemies it may still pass through, and walls it may still bounce off. */ pierce: number; bounces: number;
  returning: boolean; /** Enemies already hit on this pass. */ hit: Set<Enemy>;
  /** Burst bolts from artifacts (Knucklebone, Bell): straight, weaker, no focus pattern. */ secondary: boolean;
  /** Raven's Eye: this bolt strikes thrice as hard. */ crit?: boolean;
  /** Serpent Rod: the straight line the bolt weaves about, and the sideways direction it swings in. */ wave?: { ox: number; oz: number; px: number; pz: number };
}
export interface Shot extends Circle { y: number; vx: number; vz: number; color: number; mesh: THREE.Group }
export interface Particle { m: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>; vx: number; vy: number; vz: number; life: number }
/** Something lying on the floor to pick up; `m` is the part that bobs and spins, `drop` the fall-in time left. */
export interface Pickup extends Circle {
  kind: Drop; g: THREE.Group; m: THREE.Object3D; t: number; drop: number;
  /** Rising out of a broken urn: the pale soul above it, until it has risen. */ rise?: THREE.Sprite;
  /** Coffers and chests: what's inside, whether opened, the lid, the chest's ward seal, and whether it may
      refuse the mage again (only after they step away). */
  contents?: Item[]; opened?: boolean; lid?: THREE.Object3D; ward?: THREE.Object3D; armed?: boolean;
  /** A gilded reliquary chest: a relic inside (an artifact outside the floor's budget); only a key opens it. */ gilded?: boolean;
}
/** A blast glyph chalked on the floor: it flares when `fuse` runs out or one of the mage's bolts strikes it. */
/** A chalked glyph: its fuse and how long it was (the Warding Band's is shorter), and how far its blast reaches
    (wider with the Glyphwright's Chalk). */
export interface Glyph { x: number; z: number; t: number; fuse: number; fuseMax: number; radius: number; color: number; g: THREE.Group; rune: THREE.Mesh; reach: THREE.Mesh; glow: THREE.Sprite; lastTick: number; spent: boolean }
export interface Trapdoor { g: THREE.Group; x: number; z: number; ring: THREE.Mesh; t: number }

/** The pan between rooms: the mage walks from (fx, fz) to (tx, tz), the camera from (cfx, cfz) to (ctx, ctz)
    and its view scale from vf to vt (larger halls are seen from further back). */
export interface Transition { t: number; dur: number; nb: Room; fx: number; fz: number; tx: number; tz: number; cfx: number; cfz: number; ctx: number; ctz: number; vf: number; vt: number }

export interface Player extends Circle {
  dead: boolean; vx: number; vz: number; hp: number; maxHp: number; invuln: number; fireCd: number;
  eye: number; yawA: number; squash: number; bob: number;
  /** The equipped focus and every other artifact held, in pickup order. */ focus: string; items: string[];
  /** Heart containers given to bone altars this run. */ heartsPaid: number;
  /** Cursed artifacts cleansed at a shrine: their price gone, their gift halved. */ cleansed: string[];
  /** Obols, bone keys and blast glyphs carried (GDD: Coins, keys and blast glyphs). */ coins: number; keys: number; glyphs: number;
  /** Mana (GDD: Magic system); the spells in the two slots (Q and E) and the seconds before each can be cast
      again; where the mage last aimed or walked (a spell cast standing still goes that way). */
  mana: number; spells: (string | null)[]; spellCd: number[]; aim: Vec2;
  /** Derived from the base stats and the artifacts held (items/artifactData.ts computeStats). */ stats: Stats;
}
