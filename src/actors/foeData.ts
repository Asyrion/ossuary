/* The foes built in code (M4, docs/M4-plan.md): what each is, as data (data/foes.json), and the pure rules about them.
   Each has a floor, a school, a weakness and a resistance (+50% and −50% from damage of that school; GDD: Enemy
   affinities), health before the floor's `enemyHp`, its size and speed, what it costs on contact, whether it flies, and
   a behaviour with its parameters (actors/foes.ts). Its look is the model option of the same id (actors/modelOptions.ts).
   Templates name roles, not foes (`R` a walker, `W` a flyer or shooter, `H` a charger or heavy); each floor fills them
   from its own foes, weighted (`foes` in data/floors.json). */
import foesData from '../../data/foes.json';
import floorsData from '../../data/floors.json';
import { CFG, type EnemyType } from '../config';
import { SCHOOLS, type School, type SpellStatus } from '../magic/spellData';

export type { School } from '../magic/spellData';
const STATUS_SCHOOL: Record<SpellStatus, School> = { burn: 'ember', chill: 'frost', shock: 'storm', sanct: 'hallow', hex: 'umbral', root: 'umbral' };
/** The school a hit carries from the statuses it brings (a burning bolt is Ember's), if any. */
export const schoolOf = (status?: Partial<Record<SpellStatus, number>>) => {
  const k = status && (Object.keys(status) as SpellStatus[]).find(s => (status[s] ?? 0) > 0);
  return k ? STATUS_SCHOOL[k] : undefined;
};
export type Role = 'R' | 'W' | 'H';
export const ROLES: readonly Role[] = ['R', 'W', 'H'];

export interface FoeDef {
  id: FoeId; floor: number; school: School; weak: School; resist: School;
  hp: number; r: number; speed: number; contact: number; flying: boolean;
  /** Only one in a room (the Rime Drakeling); the rest of its role's picks go to the others. */ elite?: boolean;
  /** M4.5: the look it wears if not the one of its own id (a firefly swarm's beetle), and how many come together (a swarm,
      a pack), sharing one mind. */ look?: string; pack?: [number, number];
  /** M4.5: an elemental (GDD: The Bestiary). Its own school (which it resists) heals it, blows and statuses alike, and its
      weakness hurts it twice over. */ elemental?: boolean;
  behaviour: string; params: Record<string, number | number[]>;
  /** The colour of what flies from it when it falls, and of the stain it leaves (none for what leaves none). */ gib: string; stain: string | null;
}
export type FoeId = keyof typeof foesData;
/** Every kind of foe: the placeholders (CFG.enemy: the old three, the training dummy, the bosses) and the foes in code. */
export type FoeType = EnemyType | FoeId;
export const FOES = Object.fromEntries(Object.entries(foesData).map(([id, d]) => [id, { id, ...d }])) as unknown as Record<FoeId, FoeDef>;
export const FOE_IDS = Object.keys(FOES) as FoeId[];
export const isFoe = (type: string): type is FoeId => type in FOES;

/** The parameters each behaviour needs (actors/foes.ts); the validator checks every foe has them. */
export const BEHAVIOUR_PARAMS: Record<string, readonly string[]> = {
  hopper: ['hopRate', 'puffEvery', 'puffTell', 'puffRange', 'dim'],
  flutter: ['orbit', 'orbitSpeed', 'flareEvery', 'flareTell', 'flareRange', 'motes', 'moteSpeed', 'lure', 'lureReach', 'relure', 'lureOrbit', 'flameReach', 'burnRate'],
  charger: ['sight', 'lineUp', 'tell', 'charge', 'stun', 'sparkSpeed'],
  mimic: ['wake', 'lonely', 'tell', 'shots', 'spread', 'shotSpeed', 'hop', 'shut', 'guard'],
  leaper: ['sit', 'crouch', 'leap', 'reach', 'leapsPerBreath', 'breathRange', 'breathTell', 'shots', 'cone', 'shotSpeed', 'chill'],
  lurker: ['under', 'rise', 'volley', 'volleyGap', 'shotSpeed', 'up', 'trapped', 'poolSize'],
  drifter: ['pulseRange', 'pulseEvery', 'pulseTell', 'pulseRadius'],
  scurrier: ['zig', 'angle', 'pause', 'pauseTime', 'trailEvery', 'trailTime'],
  blinker: ['hover', 'vanish', 'gone', 'near', 'raise', 'shotSpeed', 'hex'],
  drake: ['act', 'breathRange', 'flyEvery', 'inhale', 'shots', 'cone', 'shotSpeed', 'chill', 'takeoff', 'flySpeed', 'landNear', 'flyMax', 'landTime', 'landRing'],
  // floor 4 (M4.1)
  scamper: ['near', 'peep', 'dart', 'dartTime', 'hide', 'oilEvery', 'dropFire'],
  chimer: ['orbit', 'orbitSpeed', 'chimeEvery', 'chimeTell', 'strikeDelay', 'mark', 'range'],
  gargoyle: ['wake', 'lonely', 'rest', 'tell', 'crouch', 'leap', 'reach', 'pounces', 'ring', 'shotSpeed', 'chill', 'guard'],
  healer: ['keep', 'healEvery', 'healTell', 'healRange', 'healShare', 'bossShare'],
  // floor 5 (M4.1)
  burrower: ['up', 'dig', 'under', 'burrowSpeed', 'tell', 'reach', 'motes', 'shotSpeed'],
  glider: ['turn', 'overshoot', 'passSpeed', 'sparkEvery', 'sparkTime'],
  absorber: ['keep', 'hold', 'tell', 'perBolt', 'shotSpeed', 'spent', 'open'],
  shell: ['walk', 'hide', 'spinSpeed', 'spinTime', 'bounces', 'dizzy', 'guard', 'open', 'bounceShots', 'shotSpeed', 'chill'],
  // M4.2: the Wardlings a drinking ward lets out (and, by school, `fire`, `chill`, `hex` on their shots, `ring` of them)
  wardling: ['keep', 'orbitSpeed', 'volleyEvery', 'tell', 'shots', 'spread', 'shotSpeed'],
  // M4.5's bestiary (actors/bestiaryFoes.ts), floor 1
  dropper: ['hang', 'creep', 'height', 'tell', 'drop', 'ground', 'spitEvery', 'spitTell', 'spitRange', 'webSize', 'webTime', 'climb'],
  splitter: ['smearEvery', 'smearSize', 'smearTime', 'cloudEvery', 'cloudTell', 'dim', 'splitAt', 'splitScale', 'splitHp', 'crack'],
  tome: ['wake', 'lonely', 'rise', 'guard', 'keep', 'riffleEvery', 'tell', 'pages', 'spread', 'pageSpeed', 'biteEvery', 'bite', 'biteTime', 'pageChance'],
  swarm: ['keep', 'wheel', 'drift', 'orbit', 'spin', 'streamEvery', 'tell', 'dash', 'dashTime', 'gap', 'flash'],
  singer: ['fly', 'perch', 'songEvery', 'songRange', 'hasteTime', 'flee', 'diveTell', 'dive', 'diveTime'],
  mantis: ['keep', 'stalk', 'tell', 'lunge', 'lungeTime', 'open', 'parryArc', 'parrySpeed'],
  crab: ['wake', 'rise', 'hideGuard', 'guard', 'keep', 'turn', 'sparkEvery', 'tell', 'sparkSpeed', 'pinchEvery', 'pinch', 'pinchTime', 'flipped', 'flipGuard'],
  // floor 2
  snail: ['trailEvery', 'rimeSize', 'rimeTime', 'spitEvery', 'spitRange', 'shotSpeed', 'chill', 'shellAt', 'shellTime', 'shellGuard', 'crackTime', 'crackGuard'],
  newt: ['poolSize', 'roam', 'under', 'reach', 'patience', 'hunt', 'lunge', 'lungeTime', 'chill', 'land', 'stun'],
  serpent: ['poolSize', 'under', 'rise', 'up', 'volleys', 'volleyGap', 'shots', 'spread', 'shotSpeed', 'trapped'],
  wave: ['pourEvery', 'pourMax', 'slamEvery', 'slamRange', 'tell', 'ring', 'shotSpeed', 'ice', 'shatter'],
  cloud: ['rest', 'over', 'gather', 'rain', 'sparks', 'reach', 'sparkTime'],
  darter: ['hover', 'aim', 'dash', 'dashMax', 'sparkEvery', 'sparkTime'],
  mine: ['trigger', 'tell', 'dim', 'ring', 'shotSpeed'],
  // floor 3 (and what two of them make: a nest's wasps, a golem's stones)
  nest: ['first', 'every', 'brood', 'guard'],
  wasp: ['hover', 'keep', 'tell', 'dash', 'dashTime', 'burn'],
  djinn: ['hurlEvery', 'hurlRange', 'hurlTime', 'fireTime', 'keep', 'rest', 'heal', 'snuff'],
  ooze: ['trailEvery', 'trailTime', 'splitAt', 'splitScale', 'splitHp', 'rock', 'shatter'],
  phoenix: ['circleTime', 'orbit', 'featherEvery', 'feathers', 'spread', 'featherSpeed', 'tell', 'dive', 'diveTime', 'fireEvery', 'fireTime', 'rebirth', 'reborn', 'ring'],
  basilisk: ['gazeEvery', 'keep', 'range', 'tell', 'gaze', 'cone', 'sweep', 'hold'],
  bodyguard: ['slamEvery', 'slamRange', 'tell', 'ring', 'shotSpeed', 'gap', 'melt'],
  breaker: ['slamEvery', 'slamRange', 'tell', 'rocks', 'spread', 'fall', 'hit', 'stones', 'reform', 'gather'],
  stone: [],
  // floor 4
  griffin: ['soar', 'high', 'past', 'tell', 'swoop', 'swoopTime', 'claw', 'buffetReach', 'buffetEvery', 'buffetTime', 'buffet', 'rise'],
  eye: ['shut', 'guard', 'keep', 'track', 'delay', 'hit'],
  harpy: ['perchH', 'perch', 'screechAt', 'screech', 'screechRange', 'push', 'tell', 'dive', 'diveTime'],
  magnet: ['pullRange', 'pull', 'bendRange', 'bend', 'ring', 'turn'],
  hearth: ['guard', 'throwEvery', 'throwRange', 'coals', 'spread', 'flight', 'fireTime', 'out'],
  shade: ['prowl', 'near', 'far', 'light', 'sink', 'gone', 'emerge', 'bite', 'biteTime'],
  roller: ['ball0', 'grow', 'launchAt', 'range', 'tell', 'flight', 'ring', 'shotSpeed', 'chill', 'bare', 'quick', 'weak'],
};

/** What is wrong with the foes' data (an empty list when nothing is). */
export function validateFoes(defs: Record<string, FoeDef> = FOES) {
  const errors: string[] = [];
  for (const [id, d] of Object.entries(defs)) {
    const at = (m: string) => errors.push(`${id}: ${m}`);
    if (!Number.isInteger(d.floor) || d.floor < 0 || d.floor > floorsData.length) at(`floor ${d.floor}`); // (a floor of the run's; 0: no floor's, called up by a drinking ward)
    for (const k of ['school', 'weak', 'resist'] as const) if (!SCHOOLS.includes(d[k])) at(`${k} ${d[k]}`);
    if (d.weak === d.resist) at('weak to what it resists');
    for (const k of ['hp', 'r', 'speed'] as const) if (!(d[k] > 0)) at(`${k} ${d[k]}`);
    if (!(d.contact >= 0)) at(`contact ${d.contact}`);
    const need = BEHAVIOUR_PARAMS[d.behaviour];
    if (!need) at(`behaviour ${d.behaviour}`);
    else for (const p of need) if (d.params[p] === undefined) at(`${d.behaviour} needs ${p}`);
    if (!/^#[0-9a-f]{6}$/i.test(d.gib) || (d.stain !== null && !/^#[0-9a-f]{6}$/i.test(d.stain))) at('gib or stain colour');
    if (d.pack && !(d.pack[0] >= 1 && d.pack[1] >= d.pack[0])) at(`pack ${d.pack}`);
    if (d.elemental && d.resist !== d.school) at('an elemental resists (drinks) its own school');
  }
  return errors;
}

/** Damage of `school` to a foe: half again from its weakness, half from its resistance, as it is otherwise. An elemental
    (M4.5) takes twice from its weakness, and its own school heals it: a negative share (part of the blow, as health). */
export function affinityMul(def: Pick<FoeDef, 'weak' | 'resist'> & { elemental?: boolean } | undefined, school?: School) {
  if (!def || !school) return 1;
  if (def.elemental) return school === def.weak ? CFG.affinity.elemental : school === def.resist ? -CFG.affinity.drink : 1;
  return school === def.weak ? CFG.affinity.weak : school === def.resist ? CFG.affinity.resist : 1;
}
/** Whether a status of `status`'s school feeds an elemental instead of taking hold (a Thunderhead drinks a shock). */
export const drinksStatus = (def: Pick<FoeDef, 'resist'> & { elemental?: boolean } | undefined, status: SpellStatus) => !!def?.elemental && STATUS_SCHOOL[status] === def.resist;

/** Behaviours that wait in disguise until the mage comes near (an urn, a book, a heap of rubble), and a nest set in a wall
    letting out its brood (M4.5). */
const WAITERS = ['mimic', 'tome', 'crab', 'nest'];
/** A foe of `role` for the floor to call up in the middle of a fight (a boss's helpers, the ossuary's rising bones):
    never an elite, nor one that waits in disguise or lets out others, nor one that comes as a pack (M4.5's swarm). */
export function callFoe(table: RoleTable, role: Role, R: () => number): FoeType {
  const list = table[role].filter(([id]) => !(isFoe(id) && (FOES[id].elite || WAITERS.includes(FOES[id].behaviour) || FOES[id].pack)));
  return pickFoe({ ...table, [role]: list.length ? list : table[role] }, role, R, true);
}

/** A floor's roles: for each, the foes that fill it and how often (weights). */
export type RoleTable = Record<Role, [FoeType, number][]>;
/** The foe that fills `role` on a floor, picked by `R` (0 to 1) from its weighted list; with `noElite`, an elite is
    passed over while anything else could fill it. */
export function pickFoe(table: RoleTable, role: Role, R: () => number, noElite = false): FoeType {
  let list = table[role];
  if (noElite) { const plain = list.filter(([id]) => !(isFoe(id) && FOES[id].elite)); if (plain.length) list = plain; }
  const total = list.reduce((s, [, w]) => s + w, 0);
  let x = R() * total;
  for (const [id, w] of list) { if (x < w) return id; x -= w; }
  return list[list.length - 1][0];
}
