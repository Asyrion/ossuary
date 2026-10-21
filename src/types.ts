import type * as THREE from 'three';
import type { MantleId } from './actors/mantleData';
import type { PropKind } from './world/propData';
import type { ThemeDef } from './world/themeData';
import type { BossConfig, PlannedRoom } from './world/generate';
import type { FoeKind, Flow, Template } from './world/templates';
import type { FoeDef, FoeType, School } from './actors/foeData';
import type { StatusState } from './magic/status';
import type { SpellStatus, StatusKind } from './magic/spellData';
import type { Drink } from './magic/drinking';
import type { ArtifactDef, BoltPath, Stats } from './items/artifactData';
import type { Drop, Item, Soul, Ware } from './items/loot';
import type { Kinds, KitWeights } from './world/kitData';
import type { RuneId, Socket } from './magic/runeData';
import type { DustSource } from './vigil/vigilData';

export type Side = 'n' | 's' | 'e' | 'w';
export type RoomType =
  | 'start'
  | 'normal'
  | 'treasure'
  | 'boss'
  | 'ordeal'
  | 'altar'
  | 'merchant'
  | 'vault'
  | 'secret'
  | 'shrine'
  | 'library'
  | 'laboratory'
  | 'waystone'
  | 'vigil';
export type DoorStyle =
  | 'normal'
  | 'treasure'
  | 'boss'
  | 'ordeal'
  | 'altar'
  | 'merchant'
  | 'vault'
  | 'secret'
  | 'shrine'
  | 'library'
  | 'laboratory'
  | 'waystone';
export interface Vec2 {
  x: number;
  z: number;
}
/** Axis-aligned box on the floor plane: centre and half extents. */
export interface Box {
  x: number;
  z: number;
  hx: number;
  hz: number;
}
export interface Circle {
  x: number;
  z: number;
  r: number;
}

type RGB = [number, number, number];
/** How a floor looks: placeholder variety. Lives in data/floors.json. */
/** What a niche in a dressed wall holds (world/dressing.ts). */
export type NicheKind = 'skull' | 'candle' | 'urn' | 'bones' | 'bell' | 'empty';
/** How a floor dresses its tall walls: a pilaster every `pilaster` tiles (0: none), and what niches hold, by weight. */
export interface WallDress {
  pilaster: number;
  /** The chance a spot between pilasters holds a niche (0.65 when absent). */
  fill?: number;
  niches: Partial<Record<NicheKind, number>>;
}
export interface FloorLook {
  name: string;
  /** Floor tiles: base colour, mortar, stain colour ("r,g,b"), scattered decoration and how many bones. */
  floor: { base: RGB; mortar: string; stain: string; decor: 'bones' | 'puddles' | 'ash' | 'wax'; bones: number };
  wall: { brick: RGB; mortar: string; stains: 'none' | 'moss' | 'soot' | 'gilt' | 'salt'; dress?: WallDress };
  /** The floor's lights: the wall torch's flame and light, and the wax of its candles (a room's wall light is the kind
      it drew from `kit`). */
  torch: {
    flame: string;
    light: string;
    intensity: number;
    wax?: string;
    /** A candle stand's own flame and light, where they differ from the wall lights' (the Seal's warm candles under its violet lights) */ candle?: [
      string,
      string,
    ];
  };
  /** Hemisphere sky and ground colours, and the moonlight; `fill` scales the fill and the moonlight (1 when absent). */
  light: { sky: string; ground: string; moon: string; fill?: number };
  /** The pixel look's grade for this floor (docs/art-bible.md 4.2): the darks leaned toward `shadow` by `amount`, and
      black lifted to it by `lift`, and the outlines drawn toward a near black tinted by it by `ink` (4.4), wherever a nearer surface stands `gap` units or more before a farther one (CFG.pixelLook.outlineGap
      when absent). None, no grade. */
  grade?: { shadow: string; amount: number; lift: number; ink?: number; gap?: number };
  /** What a plain fight or the start scatter over their floor (the themes' kinds, world/themes.ts), each kind's count
      varied a room. */
  scatter?: Partial<Record<import('./world/themeData').ScatterKind, number>>;
  /** The made relics its `relics` scatter strews (prop ids, data/assets.json); floor 1's vault's when absent. */
  relics?: string[];
  /** The floor's own colours for the room kit's materials and objects, by name (world/kitColours.ts): '#rrggbb'. */
  materials?: Record<string, string>;
  /** The floor's pottery: an urn's clay and its painted bands (the room kit's urns). */
  urn: { clay: string; band: string };
  /** The room kit's kinds of wall, floor, wall light and brazier, weighted (world/kitData.ts). */
  kit: KitWeights;
  /** The kinds this room drew from `kit` (set when the room is built). */
  kinds?: Kinds;
}
/** A built room's look: the kinds it drew are always there. */
export type RoomLook = FloorLook & { kinds: Kinds };

/** A doorway: (x, z) is its middle on this room's inside edge; `link` is the matching door in `nb`. */
export interface Door {
  side: Side;
  nb: Room;
  link?: Door;
  x: number;
  z: number;
  bars: THREE.Group;
  barH: number;
  open: boolean;
  style: DoorStyle;
  box: Box;
  /** A locked vault's door: the ward shared by both sides of the doorway. */ seal?: VaultSeal;
  /** A secret room's hidden doorway: a cracked wall until a blast opens it. */ secret?: SecretWall;
  /** A way at the Vigil still barred by its school: the wall filling the doorway (rooms.ts's `unplugDoor`). */ plug?: THREE.Object3D;
}
/** One side of a secret room's hidden doorway (GDD: Secret room): a stretch of cracked wall filling the
    doorway, in `room`. The cantrip divines it (it rings hollow and the crack glows); a glyph's blast opens
    both sides at once. */
export interface SecretWall {
  room: Room;
  open: boolean;
  divined: boolean;
  /** The wall piece filling the doorway, and the crack's glow (shown once divined). */ plug: THREE.Group;
  glow: THREE.MeshBasicMaterial[];
  /** Seconds until dust next drifts from the crack. */ dust: number;
}
/** The ward sealing a locked vault's door (GDD: Locked vault): a bone key unbinds it, or enough glyph
    blasts force it and wake the vault's warden. `outer` is the door on the neighbour's side. */
export interface VaultSeal {
  sealed: boolean;
  blasts: number;
  vault: Room;
  inner: Door;
  outer: Door;
  outerRoom: Room;
  /** The ward disc and padlock on the outer side. */ mark: THREE.Group;
  /** Says it's sealed again only after the mage steps away. */ armed: boolean;
  /** The ward drinks spells cast near it (magic/drinking.ts); the light filling it (its own material). */ drink: Drink;
  cup: THREE.Mesh;
}
/** A merchant's ware floating in its ward circle; the price is in obols (0 for a focus left behind). */
export interface WareSpot {
  ware: Ware;
  def?: ArtifactDef;
  price: number;
  x: number;
  z: number;
  g: THREE.Group;
  item: THREE.Object3D;
  circle?: THREE.Object3D;
  tag?: THREE.Object3D;
  sold: boolean;
  /** Refuses again only after the mage steps away. */ armed: boolean;
  /** The price its tag shows (the Pedlar's Scale lowers it). */ tagPrice?: number;
  /** Which potion, reagent or rune it is. */ potion?: string;
  reagent?: string;
  rune?: string;
}
/** A wall light; dark rooms have their torches out (`lit` false). (x, z) is where its light sits. */
export interface Torch {
  flame: THREE.Object3D;
  glow: THREE.Sprite;
  x: number;
  z: number;
  lit: boolean;
}
/** A rock collider; Mason's Chisel breaks breakable ones. Pedestals, pillars and tombs are unbreakable "rocks";
    urns are "rocks" any bolt breaks, and rune-sealed ones only a blast. */
export interface RockBox extends Box {
  hp: number;
  breakable: boolean;
  mesh?: THREE.Object3D;
  tile?: { c: number; r: number };
  urn?: 'plain' | 'sealed';
  prop?: PropState;
  /** A pillar: how tall it stands. */ pillar?: number;
  /** One of the Vigil's ways, barred by this school. */ bar?: import('./magic/spellData').School;
  /** A chained shade. */ shade?: boolean;
}
/** One of the rooms' objects in play (world/props.ts, world/propData.ts): its kind, bolts it can still take, seconds
    left burning (0: not alight), the tiles it covers, and its look. */
export interface PropState {
  kind: PropKind;
  hits: number;
  burning: number;
  tiles: { c: number; r: number }[];
  mesh: THREE.Object3D;
  flame?: THREE.Object3D;
  /** Mechanisms (world/mechanisms.ts): a brazier's or candle stand's fire; the school a rune stone is charged with;
      seconds until it can act again, and its own clock; parts of its look that move or light up. */
  lit?: boolean;
  school?: StatusKind;
  cd?: number;
  t?: number;
  parts?: Record<string, THREE.Object3D>;
  /** A watching statue's charge (seconds of gaze), the seconds it stays blind, and the spot its ray will strike;
      a sapping obelisk's ward (the school that breaks it) and whether it is broken. */
  charge?: number;
  blind?: number;
  aim?: { x: number; z: number; t: number };
  ward?: School;
  broken?: boolean;
  /** Seconds a sluice gate stands open (the room's water drained). */ open?: number;
  /** One of Kaelith's ward pillars: an obelisk with no field, dormant until the seal cracks (actors/kaelith.ts). */ seal?: boolean;
  /** A brazier burning with Blackfire (darkness took its fire). */ black?: boolean;
  /** A brazier lit once already (its first fire may leave Ember Salt, items/reagents.ts). */ salted?: boolean;
  /** A flowering plant Seedfall sowed (it holds no reagent). */ sown?: boolean;
}
/** An object in the room, with its box (how it blocks depends on its class: rocks, `lows`, or `soft`). */
export type PropBox = RockBox & { prop: PropState };
/** A cloud of glowcap spores hanging where a glowcap burst: fire in it flashes. */
export interface SporeCloud {
  x: number;
  z: number;
  t: number;
  g: THREE.Group;
  /** A Sporeling's puff: it stings the mage who stands in it, once, and dims their sight this many seconds. */ sting?: number;
  stung?: boolean;
  /** The kind of foe that puffed it (its own kind isn't stung). */ by?: string;
}
/** An artifact on a pedestal. `pair` links the boss's two choices: taking one makes the other vanish. */
export interface ArtifactSpot {
  def: ArtifactDef;
  room: Room;
  x: number;
  z: number;
  taken: boolean;
  /** False right after swapping foci, until the mage steps away. */ armed: boolean;
  pedestal: THREE.Group;
  visual: THREE.Group;
  collider: RockBox;
  pair?: ArtifactSpot;
  /** Bone altars ask a heart container; the floating price tag goes when it's taken. */ price?: {
    hearts: number;
    tag: THREE.Object3D;
  };
}

/** A shrine's offering stone: the cursed artifact it stands for, in one of the shrine's spots. False `armed`
    right after the mage walked into it, until they step away. */
export interface OfferingStone {
  id: string;
  slot: number;
  x: number;
  z: number;
  g: THREE.Group;
  visual: THREE.Group;
  collider: RockBox;
  armed: boolean;
}

export interface Room {
  plan: PlannedRoom;
  template: Template;
  look: RoomLook;
  type: RoomType;
  gx: number;
  gy: number;
  cx: number;
  cz: number;
  /** The inside's bounding box in world units; `w` × `h` tiles, of which `mask` marks the inside. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  w: number;
  h: number;
  mask: boolean[][];
  /** What its scatter put down, by kind (world/themes.ts `dressTheme`). */
  strewn?: Partial<Record<import('./world/themeData').ScatterKind, number>>;
  group: THREE.Group;
  doors: Door[];
  walls: Box[];
  rocks: RockBox[];
  pits: Box[];
  torches: Torch[];
  /** Ice a spell raised (Glacial Wall): it stops the mage, foes and their shots, not the mage's bolts. */ barriers?: Box[];
  /** The room's objects: all of them; the low ones that stop walking but not bolts; the soft ones walked into;
      glowcap spores hanging in the air. Tall objects and breakable piles are also among `rocks`. */
  props?: PropBox[];
  lows?: PropBox[];
  soft?: PropBox[];
  spores?: SporeCloud[];
  /** A themed room's theme (world/themeData.ts). */ theme?: ThemeDef;
  /** Every candle stand in the room lit: what that does has happened. */ candlesLit?: boolean;
  /** The eyes of an ossuary's skull niches, one material lit in the last spell's colour. */ eyes?: THREE.MeshBasicMaterial;
  /** Where the tall walls' pilasters and niches stand (world x on the wall face at world z), so what a foe sets in a wall
      or perches on keeps off them (a wasps' nest, a harpy). */ dressed?: { x: number; z: number }[];
  /** Enemies to spawn, wave by wave (ordeals have 2 or 3 waves, other fights 1), in world positions. */
  /** Each wave's foes: what the floor put in each template role (or the boss), and where. */
  waves: { kind: FoeType | 'boss'; role: FoeKind; x: number; z: number }[][];
  /** The wave being fought, and whether the next one is on its way. */ wave: number;
  wavePending: boolean;
  /** Ambush rooms: waiting for the mage to reach the middle (armed), or already sprung. */ ambush?: 'armed' | 'sprung';
  /** Quiet rooms: a heart waits there on the first visit. */ quietHeart?: boolean;
  /** Its first clear has paid its insight. */ paid?: boolean;
  cleared: boolean;
  visited: boolean;
  known: boolean;
  locked: boolean;
  spots: ArtifactSpot[];
  /** The merchant's wares and the shade himself. */ wares?: WareSpot[];
  shade?: THREE.Group;
  /** A locked vault forced open by blasts: its warden, a champion, rises when the mage comes in. */ warden?: boolean;
  /** The pair of foes made to work together its first wave rolled, if any. */ pair?: [string, string];
  /** Its ward burst full of this school: a Wardling of it is the warden. */ drunk?: School;
  /** The tiles its pits' dark covers (a rope bridge's chasm too), drawn joined. */ pitTiles?: {
    c: number;
    r: number;
  }[];
  /** The way its water flows (from the template), and the waterfalls feeding it. */ flow?: Flow;
  falls?: { mesh: THREE.Mesh; tex: THREE.Texture }[];
  /** A secret room, once one of its walls has been blasted open. */ found?: boolean;
  /** The mage was hurt during this room's fight (Unbroken Oath). */ hurt?: boolean;
  /** A shrine: its circle's material, the motes around it and the offering stones. */
  shrine?: { mat: THREE.MeshBasicMaterial; motes: THREE.Sprite[]; stones: OfferingStone[] };
  /** Grimoire pages: a library's lecterns and shelf (laid out on the first visit), a boss's page, a dropped one. */
  pages?: Page[];
  /** Dr. Jelly's laboratory (world/laboratory.ts): where its table and Dr. Jelly stand, the vat window's look, whether a
      potion was identified free this visit, and whether walking up to the table or to Dr. Jelly opens the table again
      (after stepping away). */
  /** The waystone risen here (in the waystone room, the first time it is entered after the boss falls; in the boss room as it falls where the floor has none): where, how far it has
      risen (0 to 1), whether its runes are kindled, its rest taken, the pair it offers (null once one is taken), the walk-up
      latch, the slot its screen carves into, and its look's parts. */
  /** A shrine's bargain stone: where, whether it waits, is open on a deal (the school cast into it) or was kept
      (once a shrine), the walk-up latch, and its look (its runes' one material). */
  bargain?: {
    x: number;
    z: number;
    state: 'idle' | 'open' | 'kept';
    school: import('./magic/spellData').School | null;
    armed: boolean;
    look: {
      group: THREE.Group;
      runes: THREE.MeshBasicMaterial;
      glows?: { price: THREE.Object3D; kept: THREE.Object3D };
    };
  };
  waystone?: {
    x: number;
    z: number;
    rise: number;
    lit: boolean;
    rested: boolean;
    pair: string[] | null;
    armed: boolean;
    target: number;
    look: { group: THREE.Group; parts: { runes: THREE.Group; hollows: THREE.Mesh[]; glow: THREE.Sprite } };
  };
  lab?: {
    table: { x: number; z: number; hx: number; hz: number };
    jelly: { x: number; z: number; g: THREE.Object3D };
    vat: THREE.Object3D;
    tableLook: THREE.Object3D;
    identified: boolean;
    armedTable: boolean;
    armedJelly: boolean;
    /** The vat window's cracks (bolts), when the last was counted (sim time), whether it is broken (the serpent
        out, here or on a floor before), and whether a brew has stirred the serpent. */ cracks: number;
    crackAt: number;
    broken: boolean;
    stirred: boolean;
  };
  /** Spans of wall the torches and the wall's dressing keep off (the Vigil's pieces and barred ways stand
      against them): on its `side`, centred at world `at` along it, `half` either way. */ keepClear?: {
    side: Side;
    at: number;
    half: number;
  }[];
  /** Foes put to rest here towards the Ossuary Choir's next hymn. */ choir?: number;
  /** An overgrown foe has flowered here (its flower mends once a room). */ flowered?: boolean;
  /** The overgrown garden's word has risen here (once a room). */ gardenSaid?: boolean;
  /** The boons (and the runes: `rune:<id>`) whose name has risen here (once a room each), the half hearts boons have mended here (Votive
      Heart and Thirsting Hex share them), and whether Votive Heart's mend has come here. */ boonsSaid?: Set<string>;
  boonMended?: number;
  votive?: boolean;
  /** Water and oil on the floor (world/pools.ts), and which pool each tile belongs to ([row][col]). */
  pools?: Pool[];
  poolGrid?: (Pool | undefined)[][];
}

/** A pool of water or oil: tiles joined side by side, and what magic has done to it. */
export interface Pool {
  kind: 'water' | 'oil';
  tiles: { c: number; r: number; x: number; z: number }[];
  /** Still; water frozen over, or oil burning, for a while (`t` seconds left); oil burnt away. */ state:
    'still' | 'frozen' | 'burning' | 'spent';
  t: number;
  /** Seconds the water still crackles with a shock (it won't spread one again meanwhile); the burn's next tick. */ charged: number;
  tick: number;
  /** The sim time before which fire on this water won't boil it into steam again. */ boilAt?: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  /** Drained to mud by an open sluice (still slow to wade; nothing hides in it). */ mud?: boolean;
  /** The jelly serpent's jelly (water, green and slower to wade; it swims in it). */ jelly?: boolean;
}

/** A grimoire page (magic/pages.ts): on a library's lectern, on its shelf for obols, or lying loose. */
export interface Page {
  spell: string;
  x: number;
  z: number;
  kind: 'lectern' | 'shelf' | 'loose';
  /** Obols it costs (a shelf page); 0 once it's free. */ price: number;
  /** Its stand, the leaf hovering over it (with its glow) and the price floating above. */ g: THREE.Group;
  hover?: THREE.Group;
  tag?: THREE.Object3D;
  /** Whether the mage has stepped away since it last asked or refused. */ armed: boolean;
  gone: boolean;
  /** The library's choice it belongs to: taking one burns the others. */ set?: Page[];
}

export interface Enemy extends Circle {
  /** Grown by a thrown Giant's Brew (slower and bigger, once). */ giant?: boolean;
  /** The jelly serpent out of its vat: a boss with its own rewards (world/laboratory.ts), not the floor's. */ labBoss?: boolean;
  type: FoeType;
  vx: number;
  vz: number;
  kx: number;
  kz: number;
  hp: number;
  maxHp: number;
  flying: boolean;
  spawn: number;
  t: number;
  flash: number;
  mats: THREE.MeshStandardMaterial[];
  group: THREE.Group;
  body: THREE.Group;
  face: number;
  contact: number;
  state: string;
  st: number;
  dead?: boolean;
  isBoss?: boolean;
  bossCfg?: BossConfig;
  /** Size and speed factors (champions are bigger and faster); the champion's glow. */ scale: number;
  speedMul: number;
  champion?: boolean;
  aura?: THREE.Sprite;
  /** A champion's school mantle (actors/mantles.ts), its ring of runes, the seconds until it acts again (a trail
      of fire, a spark), and the seconds left open after it was stripped. */ mantle?: MantleId;
  mantleRing?: THREE.Object3D;
  mantleT?: number;
  unbound?: number;
  saidAt?: number;
  /** In another kind's ground: the way it slides on rime, and the seconds before the ground harms it again. */ slide?: {
    x: number;
    z: number;
  };
  groundT?: number;
  inGround?: string;
  /** A Gloom Raven driven off by a light (its counter's word rises as it turns away). */ shunned?: boolean;
  /** A drinking ward round it (actors/wardShield.ts): what it has drunk, and its light. */ ward?: {
    drink: Drink;
    fx: THREE.Mesh;
  };
  // type-specific parts and AI state
  halo?: THREE.Sprite;
  target?: Vec2;
  fireT?: number;
  dir?: Vec2;
  eye?: THREE.Object3D;
  ring?: THREE.Object3D;
  cycle?: number;
  summoned?: boolean;
  volleys?: number;
  /** A boss built in code (the Hollow Warden's looks, bossLooks.ts): its school, whose light its shots take. */ bossSchool?: School;
  /** The bosses of floors 4 and 5: their weakness and resistance; the hart's turning spokes. */ bossAff?: {
    weak: School;
    resist: School;
  };
  spin?: number;
  /** The Twin Guardians: the other twin; which part it plays now; whether bolts glance off it (while it shields);
      whether it rages (its twin fallen); seconds until the shield passes across. */
  twin?: Enemy;
  role?: 'strike' | 'shield';
  glance?: boolean;
  rage?: boolean;
  swapT?: number;
  /** The War-Tiger: the plates it has left, and the damage they have turned since the last one fell. */ plates?: number;
  worn?: number;
  /** Sanctified by the Gilded Halo's first bolt already. */ haloed?: boolean;
  /** A gilded treasury's guardian, standing like a statue until its gold is taken (themes.ts). */ statue?: boolean;
  /** Marked by the Ferryman's Toll (shapes.ts): mana back for each blow (at most every so often: `tollNext`), obols and a spreading hex if it falls. */ toll?: {
    mana: number;
    obols: number;
    spread: number;
    spreadRange: number;
  };
  tollNext?: number;
  /** Eclipsed: the black sun hung over it while it is out of the fight. */ sun?: THREE.Object3D;
  /** What an eclipse's blow is worth as it ends (Eclipse Ground: half again), and whether Storm reached its black sun
      (Corona: the blow leaps as lightning). */ eclipseMul?: number;
  corona?: boolean;
  /** Bosses: out of reach (under the floor, in the air), so neither hurt nor hurting. */ hidden?: boolean;
  /** Floor ring (the abbess's ripple, the knight's landing mark); where a leap started. */ marker?: THREE.Mesh;
  from?: Vec2;
  /** Called by a boss; falls when the boss does. */ servant?: boolean;
  /** The insight it pays as it falls (progression/levelData.ts `purseOf`, fixed when it is made); none for one a boss's
      ward broke into (`unpaid`). */ purse?: number;
  unpaid?: boolean;
  /** Frozen by a thawing foe's breath (Cold Snap), so its own thaw breathes nothing. */ snapped?: boolean;
  /** The last blow that struck it was its weakness (Scavenger). */ weakBlow?: boolean;
  /** Asleep (a pilgrims' rest's foes): does nothing until hurt or until the mage comes close. */ asleep?: boolean;
  /** Held in ice (a frozen mausoleum's foes): asleep until hurt or thawed by fire; the ice around it. */ entombed?: THREE.Object3D;
  /** What struck it last: the cantrip's kills give mana back. */ lastHit?: 'cantrip' | 'spell';
  /** Status effects on it (magic/status.ts), the ice around it while frozen, and the training dummy's label. */
  status?: StatusState;
  ice?: THREE.Mesh;
  label?: THREE.Sprite;
  /** A foe built in code (actors/foes.ts): what it is; its model and the model's idle, played on its own clock `at`
      at `animRate` (0 holds it still); how strongly it telegraphs (0 to 1: its school's glow, a swell); its shadow's size. */
  foe?: FoeDef;
  model?: THREE.Object3D;
  idle?: (t: number) => void;
  at?: number;
  animRate?: number;
  tele?: number;
  shadow?: number;
  /** Its model's parts its behaviour moves (a beetle's wing-cases, a mimic's lid); how open a lid or shell is (0 to 1);
      what it takes of a hit (a shut mimic, half); a behaviour's own clock (a salamander's trail); the glow of its telegraph. */
  parts?: Record<string, THREE.Object3D>;
  open?: number;
  guard?: number;
  tick?: number;
  teleGlow?: THREE.Sprite;
  /** Bestiary foes (actors/bestiaryFoes.ts): the pack whose one mind it shares (a firefly swarm); until when a lark's song
      hastens it; a splitter's generation (0 whole, 1 split); how high its model hangs (a spider on its thread); a piece its
      behaviour adds (the thread); a count its behaviour keeps (a mantis's parries). */
  pack?: Pack;
  sung?: number;
  gen?: number;
  height?: number;
  extra?: THREE.Object3D;
  count?: number;
  /** The foe that made it (a nest's wasp, a rubble golem's stone). */ owner?: Enemy;
}
/** A pack of foes with one mind (the firefly swarm): its members, the point they wheel round and where it is heading
    round the mage, what it is doing and for how long, the step it was last worked out on, and where a stream is aimed. */
export interface Pack {
  members: Enemy[];
  cx: number;
  cz: number;
  a: number;
  state: string;
  st: number;
  stamp: number;
  tx: number;
  tz: number;
}

export interface Bolt extends Circle {
  y: number;
  vx: number;
  vz: number;
  speed: number;
  dist: number;
  range: number;
  mesh: THREE.Group;
  damage: number;
  color: number;
  path: BoltPath;
  /** Enemies it may still pass through, and walls it may still bounce off. */ pierce: number;
  bounces: number;
  returning: boolean;
  /** Enemies already hit on this pass. */ hit: Set<Enemy>;
  /** Burst bolts from artifacts (Knucklebone, Bell): straight, weaker, no focus pattern. */ secondary: boolean;
  /** Raven's Eye: this bolt strikes thrice as hard. */ crit?: boolean;
  /** Serpent Rod: the straight line the bolt weaves about, and the sideways direction it swings in. */ wave?: {
    ox: number;
    oz: number;
    px: number;
    pz: number;
  };
  /** A spell's bolt (Rime Shards, Shatter's shards): its hits are spell hits, with the spell's statuses. */ spell?: boolean;
  status?: Partial<Record<SpellStatus, number>>;
  /** Set alight flying through a brazier's flame: it trails embers. */ kindled?: boolean;
  /** A splinter of ice rather than an orb (Rime Shards, the Shatter's). */ shard?: boolean;
  /** One of the Shatter's shards (fire catches it as molten glass); a shard sanctified crossing holy ground. */ shatter?: boolean;
  hallowed?: boolean;
  /** The Pendulum of Hours' turn (radians a second); seconds left hanging as a Lodestar Wand's star; whether it has
      echoed off a wall already (the Echo Stone). */ curve?: number;
  star?: number;
  echoed?: boolean;
}
export interface Shot extends Circle {
  y: number;
  vx: number;
  vz: number;
  color: number;
  mesh: THREE.Group;
  /** An ember (a mimic's): it lights what burns along its way, oil, braziers and roots. */ fire?: boolean;
  fireT?: number;
  /** Cold (a toad's breath): it freezes the water it passes and chills the mage it strikes this many seconds. */ chill?: number;
  /** A hex (an imp's flame): it drains this much mana from the mage it strikes. */ hex?: number;
  /** The foe that threw it (a hex's mana runs back to it). */ from?: Enemy;
}
export interface Particle {
  m: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}
/** Something lying on the floor to pick up; `m` is the part that bobs and spins, `drop` the fall-in time left. */
export interface Pickup extends Circle {
  kind: Drop;
  g: THREE.Group;
  m: THREE.Object3D;
  t: number;
  drop: number;
  /** Rising out of a broken urn: the pale soul above it, until it has risen. */ rise?: THREE.Sprite;
  /** Coffers and chests: what's inside, whether opened, the lid, the chest's ward seal, and whether it may
      refuse the mage again (only after they step away). */
  contents?: Item[];
  opened?: boolean;
  lid?: THREE.Object3D;
  ward?: THREE.Object3D;
  armed?: boolean;
  /** A gilded reliquary chest: a relic inside (an artifact outside the floor's budget); only a key opens it. */ gilded?: boolean;
  /** Which potion a bottle is, which reagent a reagent is, which rune a rune is. */ potion?: string;
  reagent?: string;
  rune?: string;
}
/** A blast glyph chalked on the floor: it flares when `fuse` runs out or one of the mage's bolts strikes it. */
/** A chalked glyph: its fuse and how long it was (the Warding Band's is shorter), and how far its blast reaches
    (wider with the Glyphwright's Chalk). */
export interface Glyph {
  x: number;
  z: number;
  t: number;
  fuse: number;
  fuseMax: number;
  radius: number;
  color: number;
  g: THREE.Group;
  rune: THREE.Mesh;
  reach: THREE.Mesh;
  glow: THREE.Sprite;
  lastTick: number;
  spent: boolean;
}
export interface Trapdoor {
  g: THREE.Group;
  x: number;
  z: number;
  ring: THREE.Mesh;
  t: number;
  /** Kaelith's way out is a shaft of daylight (world/daylight.ts) */ kind?: 'shaft';
}

/** The pan between rooms: the mage walks from (fx, fz) to (tx, tz), the camera from (cfx, cfz) to (ctx, ctz)
    and its view scale from vf to vt (larger halls are seen from further back). */
export interface Transition {
  t: number;
  dur: number;
  nb: Room;
  fx: number;
  fz: number;
  tx: number;
  tz: number;
  cfx: number;
  cfz: number;
  ctx: number;
  ctz: number;
  vf: number;
  vt: number;
}

export interface Player extends Circle {
  dead: boolean;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  invuln: number;
  fireCd: number;
  eye: number;
  yawA: number;
  squash: number;
  bob: number;
  /** Casts a chapel's candles still bless: they strike harder, in gold. */ blessed: number;
  /** The equipped focus and every other artifact held, in pickup order. */ focus: string;
  items: string[];
  /** Heart containers given to bone altars this run. */ heartsPaid: number;
  /** Cursed artifacts cleansed at a shrine: their price gone, their gift halved. */ cleansed: string[];
  /** Obols, bone keys and blast glyphs carried (GDD: Coins, keys and blast glyphs). */ coins: number;
  keys: number;
  glyphs: number;
  /** Soul motes held, in the order taken (items/souls.ts). */ souls: Soul[];
  /** Seconds the mage has stood still (the Twin Vigil Candles, the Salt Circle). */ still: number;
  /** Mana (GDD: Magic system); the spells in the two slots (Q and E) and the seconds before each can be cast
      again; where the mage last aimed or walked (a spell cast standing still goes that way). */
  mana: number;
  spells: (string | null)[];
  spellCd: number[];
  aim: Vec2;
  /** Derived from the base stats and the artifacts held (items/artifactData.ts computeStats). */ stats: Stats;
  /** Seconds the mage's sight stays dimmed (a Sporeling's spores): the edges of the view darken. */ dim: number;
  /** Seconds the mage stays chilled (cold breath, rime): slower (`CFG.afflict.chillSlow`), frost at the view's rim. */ chill: number;
  /** Seconds the mage stays heavy as stone in a basilisk's stare: much slower (`CFG.bestiary.gazeSlow`). */ stone: number;
  /** A drift the mage is drawn along this step, over what they walk (the Deep Angler's lure); spent each step. */ pull: {
    x: number;
    z: number;
  };
  /** Seconds the hexed chip shows, and the mana the last hexing blow took (ui/afflictions.ts). */ hexed: number;
  drained: number;
  /** What the last hex took, which a Hallow cast before `hexDebtUntil` (sim time) gives back. */ hexDebt: number;
  hexDebtUntil: number;
  /** Seconds the drawn-in chip shows, after a pull worth showing (a lure, a lodestone golem, a griffin's wings). */ drawn: number;
  /** The potions carried in the belt (PotionIds, the order taken), the one chosen, and the reagents in the pouch (how
      many of each). */ belt: string[];
  beltAt: number;
  reagents: Record<string, number>;
  /** Each slot's socket (how many runes it holds, those carved: a new array on every change, so the runed spell's
      cache knows), and the runes in the pouch (a spell given up sends its runes there). */ sockets: Socket[];
  runes: RuneId[];
}

/** A lore card: what something taken is (ui/lore.ts shows it). */
export interface LoreEntry {
  name: string;
  kind: string;
  effect: string;
  lore: string;
  icon: string;
}
/** Things described the first time they're taken in a run: items and containers. */
export type LoreItem =
  | 'coin'
  | 'purse'
  | 'key'
  | 'glyph'
  | 'halfHeart'
  | 'heart'
  | 'mana'
  | 'paleSoul'
  | 'blackSoul'
  | 'hallowedSoul'
  | 'shard'
  | 'coffer'
  | 'chest'
  | 'gilded';

/** The screens over the game (ui/screens.ts). */
export type ScreenName = 'title' | 'pause' | 'end' | 'inv' | 'lab' | 'level' | 'stone' | 'lectern' | 'talk';
/** How a run went, for the end screen. `floor` is 1-based; `artifacts` lists the focus first. */
export interface RunSummary {
  won: boolean;
  floor: number;
  floors: number;
  time: number;
  kills: number;
  seed: string;
  artifacts: string[];
  /** Cursed artifacts cleansed at a shrine (they lose their red ring). */ cleansed: string[];
  /** Obols picked up during the run. */ obols: number;
  /** The level reached, and the insight gained. */ level: number;
  insight: number;
  /** What the run brings home (its Dust from each source; the obols carried and those that come home) and, after
      a death, what struck last. */
  home?: {
    dust: { total: number; lines: { source: DustSource; count: number; dust: number }[] };
    carried: number;
    obols: number;
    struck: string | null;
  };
}
