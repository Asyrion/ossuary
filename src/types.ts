import type * as THREE from 'three';
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

export type Side = 'n' | 's' | 'e' | 'w';
export type RoomType = 'start' | 'normal' | 'treasure' | 'boss' | 'ordeal' | 'altar' | 'merchant' | 'vault' | 'secret' | 'shrine' | 'library';
export type DoorStyle = 'normal' | 'treasure' | 'boss' | 'ordeal' | 'altar' | 'merchant' | 'vault' | 'secret' | 'shrine' | 'library';
export interface Vec2 { x: number; z: number }
/** Axis-aligned box on the floor plane: centre and half extents. */
export interface Box { x: number; z: number; hx: number; hz: number }
export interface Circle { x: number; z: number; r: number }

type RGB = [number, number, number];
/** How a floor looks: placeholder variety until the biome pass (M8). Lives in data/floors.json. */
/** What a niche in a dressed wall holds (world/dressing.ts). */
export type NicheKind = 'skull' | 'candle' | 'urn' | 'bones' | 'bell' | 'empty';
/** How a floor dresses its tall walls: a pilaster every `pilaster` tiles (0: none), and what niches hold, by weight. */
export interface WallDress { pilaster: number; niches: Partial<Record<NicheKind, number>> }
export interface FloorLook {
  name: string;
  /** Floor tiles: base colour, mortar, stain colour ("r,g,b"), scattered decoration and how many bones. */
  floor: { base: RGB; mortar: string; stain: string; decor: 'bones' | 'puddles' | 'ash' | 'wax'; bones: number };
  wall: { brick: RGB; mortar: string; stains: 'none' | 'moss' | 'soot' | 'gilt' | 'salt'; dress?: WallDress };
  /** The floor's lights: the wall torch's old style, its flame and light, and the wax of its candles (the room kit's). */
  torch: { style: 'bracket' | 'lantern' | 'brazier'; flame: string; light: string; intensity: number; wax?: string };
  /** Hemisphere sky and ground colours, and the moonlight. */
  light: { sky: string; ground: string; moon: string };
  /** The floor's pottery: an urn's clay and its painted bands (the room kit's urns). */
  urn: { clay: string; band: string };
  /** The room kit's kinds of wall, floor, wall light and brazier, weighted (world/kitData.ts). */
  kit?: KitWeights;
  /** The kinds this room drew from `kit` (set when the room is built). */
  kinds?: Kinds;
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
  /** M4.2: the ward drinks spells cast near it (magic/drinking.ts); the light filling it (its own material). */ drink: Drink; cup: THREE.Mesh;
}
/** A merchant's ware floating in its ward circle; the price is in obols (0 for a focus left behind). */
export interface WareSpot {
  ware: Ware; def?: ArtifactDef; price: number; x: number; z: number;
  g: THREE.Group; item: THREE.Object3D; circle?: THREE.Object3D; tag?: THREE.Object3D;
  sold: boolean; /** Refuses again only after the mage steps away. */ armed: boolean;
  /** The price its tag shows (the Pedlar's Scale lowers it). */ tagPrice?: number;
}
/** A wall light; dark rooms have their torches out (`lit` false). (x, z) is where its light sits. */
export interface Torch { flame: THREE.Object3D; glow: THREE.Sprite; x: number; z: number; lit: boolean }
/** A rock collider; Mason's Chisel breaks breakable ones. Pedestals, pillars and tombs are unbreakable "rocks";
    urns are "rocks" any bolt breaks, and rune-sealed ones only a blast. */
export interface RockBox extends Box { hp: number; breakable: boolean; mesh?: THREE.Object3D; tile?: { c: number; r: number }; urn?: 'plain' | 'sealed'; prop?: PropState; /** A pillar: how tall it stands (M4.2). */ pillar?: number }
/** One of the rooms' objects in play (world/props.ts, world/propData.ts): its kind, bolts it can still take, seconds
    left burning (0: not alight), the tiles it covers, and its look. */
export interface PropState {
  kind: PropKind; hits: number; burning: number; tiles: { c: number; r: number }[]; mesh: THREE.Object3D; flame?: THREE.Object3D;
  /** Mechanisms (world/mechanisms.ts): a brazier's or candle stand's fire; the school a rune stone is charged with;
      seconds until it can act again, and its own clock; parts of its look that move or light up. */
  lit?: boolean; school?: StatusKind; cd?: number; t?: number; parts?: Record<string, THREE.Object3D>;
  /** M4.2: a watching statue's charge (seconds of gaze), the seconds it stays blind, and the spot its ray will strike;
      a sapping obelisk's ward (the school that breaks it) and whether it is broken. */
  charge?: number; blind?: number; aim?: { x: number; z: number; t: number }; ward?: School; broken?: boolean;
}
/** An object in the room, with its box (how it blocks depends on its class: rocks, `lows`, or `soft`). */
export type PropBox = RockBox & { prop: PropState };
/** A cloud of glowcap spores hanging where a glowcap burst: fire in it flashes. */
export interface SporeCloud {
  x: number; z: number; t: number; g: THREE.Group;
  /** A Sporeling's puff (M4): it stings the mage who stands in it, once, and dims their sight this many seconds. */ sting?: number; stung?: boolean;
}
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
  /** Ice a spell raised (Glacial Wall): it stops the mage, foes and their shots, not the mage's bolts. */ barriers?: Box[];
  /** The room's objects (M3.6): all of them; the low ones that stop walking but not bolts; the soft ones walked into;
      glowcap spores hanging in the air. Tall objects and breakable piles are also among `rocks`. */
  props?: PropBox[]; lows?: PropBox[]; soft?: PropBox[]; spores?: SporeCloud[];
  /** A themed room's theme (M3.6, world/themeData.ts). */ theme?: ThemeDef;
  /** Every candle stand in the room lit (M3.6 mechanisms): what that does has happened. */ candlesLit?: boolean;
  /** The eyes of an ossuary's skull niches, one material lit in the last spell's colour (M3.6). */ eyes?: THREE.MeshBasicMaterial;
  /** Where the tall walls' pilasters and niches stand (world x on the wall face at world z), so what a foe sets in a wall
      or perches on keeps off them (M4.5: a wasps' nest, a harpy). */ dressed?: { x: number; z: number }[];
  /** Enemies to spawn, wave by wave (ordeals have 2 or 3 waves, other fights 1), in world positions. */
  /** Each wave's foes: what the floor put in each template role (or the boss), and where. */
  waves: { kind: FoeType | 'boss'; role: FoeKind; x: number; z: number }[][];
  /** The wave being fought, and whether the next one is on its way. */ wave: number; wavePending: boolean;
  /** Ambush rooms: waiting for the mage to reach the middle (armed), or already sprung. */ ambush?: 'armed' | 'sprung';
  /** Quiet rooms: a heart waits there on the first visit. */ quietHeart?: boolean;
  cleared: boolean; visited: boolean; known: boolean; locked: boolean;
  spots: ArtifactSpot[];
  /** The merchant's wares and the shade himself. */ wares?: WareSpot[]; shade?: THREE.Group;
  /** A locked vault forced open by blasts: its warden, a champion, rises when the mage comes in. */ warden?: boolean;
  /** M4.2: its ward burst full of this school: a Wardling of it is the warden. */ drunk?: School;
  /** M4.2: the tiles its pits' dark covers (a rope bridge's chasm too), drawn joined. */ pitTiles?: { c: number; r: number }[];
  /** M4.2: the way its water flows (from the template), and the waterfalls feeding it. */ flow?: Flow; falls?: { mesh: THREE.Mesh; tex: THREE.Texture }[];
  /** A secret room, once one of its walls has been blasted open. */ found?: boolean;
  /** The mage was hurt during this room's fight (Unbroken Oath). */ hurt?: boolean;
  /** A shrine: its circle's material, the motes around it and the offering stones. */
  shrine?: { mat: THREE.MeshBasicMaterial; motes: THREE.Sprite[]; stones: OfferingStone[] };
  /** Grimoire pages: a library's lecterns and shelf (laid out on the first visit), a boss's page, a dropped one. */
  pages?: Page[];
  /** Foes put to rest here towards the Ossuary Choir's next hymn (M4.1). */ choir?: number;
  /** Water and oil on the floor (world/pools.ts), and which pool each tile belongs to ([row][col]). */
  pools?: Pool[]; poolGrid?: (Pool | undefined)[][];
}

/** A pool of water or oil: tiles joined side by side, and what magic has done to it. */
export interface Pool {
  kind: 'water' | 'oil'; tiles: { c: number; r: number; x: number; z: number }[];
  /** Still; water frozen over, or oil burning, for a while (`t` seconds left); oil burnt away. */ state: 'still' | 'frozen' | 'burning' | 'spent'; t: number;
  /** Seconds the water still crackles with a shock (it won't spread one again meanwhile); the burn's next tick. */ charged: number; tick: number;
  mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial;
}

/** A grimoire page (magic/pages.ts): on a library's lectern, on its shelf for obols, or lying loose. */
export interface Page {
  spell: string; x: number; z: number; kind: 'lectern' | 'shelf' | 'loose';
  /** Obols it costs (a shelf page); 0 once it's free. */ price: number;
  /** Its stand, the leaf hovering over it (with its glow) and the price floating above. */ g: THREE.Group; hover?: THREE.Group; tag?: THREE.Object3D;
  /** Whether the mage has stepped away since it last asked or refused. */ armed: boolean; gone: boolean;
  /** The library's choice it belongs to: taking one burns the others. */ set?: Page[];
}

export interface Enemy extends Circle {
  type: FoeType; vx: number; vz: number; kx: number; kz: number; hp: number; maxHp: number;
  flying: boolean; spawn: number; t: number; flash: number; mats: THREE.MeshStandardMaterial[];
  group: THREE.Group; body: THREE.Group; face: number; contact: number; state: string; st: number;
  dead?: boolean; isBoss?: boolean; bossCfg?: BossConfig;
  /** Size and speed factors (champions are bigger and faster); the champion's glow. */ scale: number; speedMul: number;
  champion?: boolean; aura?: THREE.Sprite;
  /** M4.2: a drinking ward round it (actors/wardShield.ts): what it has drunk, and its light. */ ward?: { drink: Drink; fx: THREE.Mesh };
  // type-specific parts and AI state
  core?: THREE.Mesh; halo?: THREE.Sprite; target?: Vec2; fireT?: number; dir?: Vec2;
  eye?: THREE.Object3D; ring?: THREE.Object3D; cycle?: number; summoned?: boolean; volleys?: number;
  /** A boss built in code (M4: the Hollow Warden's looks, bossLooks.ts): its school, whose light its shots take. */ bossSchool?: School;
  /** The bosses of floors 4 and 5 (M4.1): their weakness and resistance; the hart's turning spokes. */ bossAff?: { weak: School; resist: School }; spin?: number;
  /** The Twin Guardians (M4.2): the other twin; which part it plays now; whether bolts glance off it (while it shields);
      whether it rages (its twin fallen); seconds until the shield passes across. */
  twin?: Enemy; role?: 'strike' | 'shield'; glance?: boolean; rage?: boolean; swapT?: number;
  /** The War-Tiger (M4.2): the plates it has left, and the damage they have turned since the last one fell. */ plates?: number; worn?: number;
  /** Sanctified by the Gilded Halo's first bolt already (M4.1). */ haloed?: boolean;
  /** A gilded treasury's guardian, standing like a statue until its gold is taken (M4.1, themes.ts). */ statue?: boolean;
  /** Marked by the Ferryman's Toll (M4.1, shapes.ts): mana back for each blow (at most every so often: `tollNext`), obols and a spreading hex if it falls. */ toll?: { mana: number; obols: number; spread: number; spreadRange: number }; tollNext?: number;
  /** Eclipsed (M4.1): the black sun hung over it while it is out of the fight. */ sun?: THREE.Object3D;
  /** Bosses: out of reach (under the floor, in the air), so neither hurt nor hurting. */ hidden?: boolean;
  /** Floor ring (the abbess's ripple, the knight's landing mark); where a leap started. */ marker?: THREE.Mesh; from?: Vec2;
  /** Called by a boss; falls when the boss does. */ servant?: boolean;
  /** Asleep (a pilgrims' rest's foes, M3.6): does nothing until hurt or until the mage comes close. */ asleep?: boolean;
  /** Held in ice (a frozen mausoleum's foes): asleep until hurt or thawed by fire; the ice around it. */ entombed?: THREE.Object3D;
  /** What struck it last: the cantrip's kills give mana back. */ lastHit?: 'cantrip' | 'spell';
  /** Status effects on it (magic/status.ts), the ice around it while frozen, and the training dummy's label. */
  status?: StatusState; ice?: THREE.Mesh; label?: THREE.Sprite;
  /** A foe built in code (M4, actors/foes.ts): what it is; its model and the model's idle, played on its own clock `at`
      at `animRate` (0 holds it still); how strongly it telegraphs (0 to 1: its school's glow, a swell); its shadow's size. */
  foe?: FoeDef; model?: THREE.Object3D; idle?: (t: number) => void; at?: number; animRate?: number; tele?: number; shadow?: number;
  /** Its model's parts its behaviour moves (a beetle's wing-cases, a mimic's lid); how open a lid or shell is (0 to 1);
      what it takes of a hit (a shut mimic, half); a behaviour's own clock (a salamander's trail); the glow of its telegraph. */
  parts?: Record<string, THREE.Object3D>; open?: number; guard?: number; tick?: number; teleGlow?: THREE.Sprite;
  /** M4.5's bestiary (actors/bestiaryFoes.ts): the pack whose one mind it shares (a firefly swarm); until when a lark's song
      hastens it; a splitter's generation (0 whole, 1 split); how high its model hangs (a spider on its thread); a piece its
      behaviour adds (the thread); a count its behaviour keeps (a mantis's parries). */
  pack?: Pack; sung?: number; gen?: number; height?: number; extra?: THREE.Object3D; count?: number;
  /** M4.5: the foe that made it (a nest's wasp, a rubble golem's stone). */ owner?: Enemy;
}
/** A pack of foes with one mind (M4.5: the firefly swarm): its members, the point they wheel round and where it is heading
    round the mage, what it is doing and for how long, the step it was last worked out on, and where a stream is aimed. */
export interface Pack { members: Enemy[]; cx: number; cz: number; a: number; state: string; st: number; stamp: number; tx: number; tz: number }

export interface Bolt extends Circle {
  y: number; vx: number; vz: number; speed: number; dist: number; range: number; mesh: THREE.Group;
  damage: number; color: number; path: BoltPath;
  /** Enemies it may still pass through, and walls it may still bounce off. */ pierce: number; bounces: number;
  returning: boolean; /** Enemies already hit on this pass. */ hit: Set<Enemy>;
  /** Burst bolts from artifacts (Knucklebone, Bell): straight, weaker, no focus pattern. */ secondary: boolean;
  /** Raven's Eye: this bolt strikes thrice as hard. */ crit?: boolean;
  /** Serpent Rod: the straight line the bolt weaves about, and the sideways direction it swings in. */ wave?: { ox: number; oz: number; px: number; pz: number };
  /** A spell's bolt (Rime Shards, Shatter's shards): its hits are spell hits, with the spell's statuses. */ spell?: boolean;
  status?: Partial<Record<SpellStatus, number>>;
  /** Set alight flying through a brazier's flame (M3.6): it trails embers. */ kindled?: boolean;
  /** M4.1: the Pendulum of Hours' turn (radians a second); seconds left hanging as a Lodestar Wand's star; whether it has
      echoed off a wall already (the Echo Stone). */ curve?: number; star?: number; echoed?: boolean;
}
export interface Shot extends Circle {
  y: number; vx: number; vz: number; color: number; mesh: THREE.Group;
  /** An ember (a mimic's, M4): it lights what burns along its way, oil, braziers and roots. */ fire?: boolean; fireT?: number;
  /** Cold (a toad's breath, M4): it freezes the water it passes and chills the mage it strikes this many seconds. */ chill?: number;
  /** A hex (an imp's flame, M4): it drains this much mana from the mage it strikes. */ hex?: number;
}
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
  /** Casts a chapel's candles still bless (M3.6): they strike harder, in gold. */ blessed: number;
  /** The equipped focus and every other artifact held, in pickup order. */ focus: string; items: string[];
  /** Heart containers given to bone altars this run. */ heartsPaid: number;
  /** Cursed artifacts cleansed at a shrine: their price gone, their gift halved. */ cleansed: string[];
  /** Obols, bone keys and blast glyphs carried (GDD: Coins, keys and blast glyphs). */ coins: number; keys: number; glyphs: number;
  /** Soul motes held, in the order taken (M4.1: items/souls.ts). */ souls: Soul[];
  /** Seconds the mage has stood still (the Twin Vigil Candles, the Salt Circle). */ still: number;
  /** Mana (GDD: Magic system); the spells in the two slots (Q and E) and the seconds before each can be cast
      again; where the mage last aimed or walked (a spell cast standing still goes that way). */
  mana: number; spells: (string | null)[]; spellCd: number[]; aim: Vec2;
  /** Derived from the base stats and the artifacts held (items/artifactData.ts computeStats). */ stats: Stats;
  /** Seconds the mage's sight stays dimmed (a Sporeling's spores, M4): the edges of the view darken. */ dim: number;
  /** Seconds the mage stays chilled (cold breath, rime, M4): slower (`CFG.afflict.chillSlow`), frost at the view's rim. */ chill: number;
  /** Seconds the mage stays heavy as stone in a basilisk's stare (M4.5): much slower (`CFG.bestiary.gazeSlow`). */ stone: number;
  /** A drift the mage is drawn along this step, over what they walk (the Deep Angler's lure, M4.1); spent each step. */ pull: { x: number; z: number };
}
