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
  /** M4.7: it steps round the ground other foes leave (the golems; elementals do too), where beasts blunder in. */ avoidsGround?: boolean;
  behaviour: string; params: Record<string, number | number[]>;
  /** The colour of what flies from it when it falls, and of the stain it leaves (none for what leaves none). */ gib: string; stain: string | null;
}
export type FoeId = keyof typeof foesData;
/** Every kind of foe: the placeholders (CFG.enemy: the old three, the training dummy, the bosses) and the foes in code. */
export type FoeType = EnemyType | FoeId;
export const FOES = Object.fromEntries(Object.entries(foesData).map(([id, d]) => [id, { id, ...d }])) as unknown as Record<FoeId, FoeDef>;
export const FOE_IDS = Object.keys(FOES) as FoeId[];
export const isFoe = (type: string): type is FoeId => type in FOES;
/** Whether a foe comes as many: a pack (M4.5's swarm, the wolves), or a nest that lets out its brood. A room rolls one. */
export const comesMany = (type: string) => isFoe(type) && (!!FOES[type].pack || FOES[type].params.brood !== undefined);

/** The parameters each behaviour needs (actors/foes.ts); the validator checks every foe has them. */
export const BEHAVIOUR_PARAMS: Record<string, readonly string[]> = {
  hopper: ['hopRate', 'puffEvery', 'puffTell', 'puffRange', 'dim'],
  flutter: ['orbit', 'orbitSpeed', 'flareEvery', 'flareTell', 'flareRange', 'motes', 'moteSpeed', 'lure', 'lureReach', 'relure', 'lureOrbit', 'flameReach', 'burnRate'],
  charger: ['sight', 'lineUp', 'tell', 'charge', 'stun', 'sparkSpeed'],
  mimic: ['wake', 'lonely', 'tell', 'shots', 'spread', 'shotSpeed', 'hop', 'shut', 'guard'],
  leaper: ['sit', 'crouch', 'leap', 'reach', 'leapsPerBreath', 'breathRange', 'breathTell', 'shots', 'cone', 'shotSpeed', 'chill'],
  lurker: ['under', 'rise', 'volley', 'volleyGap', 'shotSpeed', 'up', 'trapped', 'poolSize', 'stranded'],
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
  dropper: ['hang', 'creep', 'over', 'wait', 'height', 'tell', 'drop', 'ground', 'spitEvery', 'spitTell', 'spitRange', 'webSize', 'webTime', 'climb'],
  splitter: ['smearEvery', 'smearSize', 'smearTime', 'cloudEvery', 'cloudRange', 'cloudTell', 'dim', 'splitAt', 'splitScale', 'splitHp', 'crack'],
  tome: ['wake', 'lonely', 'rise', 'guard', 'keep', 'riffleEvery', 'tell', 'pages', 'spread', 'pageSpeed', 'biteEvery', 'biteRange', 'bite', 'biteTime', 'pageChance'],
  swarm: ['keep', 'wheel', 'drift', 'orbit', 'spin', 'streamEvery', 'tell', 'dash', 'dashTime', 'gap', 'flash'],
  singer: ['fly', 'giveUp', 'perch', 'songEvery', 'songRange', 'hasteTime', 'flee', 'diveTell', 'dive', 'diveTime'],
  mantis: ['keep', 'stalk', 'tell', 'lunge', 'lungeTime', 'open', 'parryArc', 'parrySpeed'],
  crab: ['wake', 'rise', 'hideGuard', 'guard', 'keep', 'turn', 'sparkEvery', 'tell', 'sparkSpeed', 'pinchEvery', 'pinch', 'pinchTime', 'flipped', 'flipGuard', 'lonely'],
  // floor 2
  snail: ['trailEvery', 'rimeSize', 'rimeTime', 'spitEvery', 'spitRange', 'shotSpeed', 'chill', 'shellAt', 'shellTime', 'shellGuard', 'crackTime', 'crackGuard'],
  newt: ['poolSize', 'roam', 'under', 'reach', 'patience', 'hunt', 'lunge', 'lungeTime', 'chill', 'land', 'stun'],
  serpent: ['poolSize', 'under', 'rise', 'up', 'volleys', 'volleyGap', 'shots', 'spread', 'shotSpeed', 'trapped', 'lost', 'stranded'],
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
  griffin: ['soar', 'near', 'far', 'high', 'past', 'tell', 'swoop', 'swoopTime', 'claw', 'buffetReach', 'buffetEvery', 'buffetTime', 'buffet', 'rise'],
  eye: ['shut', 'guard', 'keep', 'track', 'delay', 'hit'],
  harpy: ['perchH', 'perch', 'screechAt', 'screech', 'screechRange', 'push', 'tell', 'dive', 'diveTime'],
  magnet: ['pullRange', 'pull', 'bendRange', 'bend', 'ring', 'turn'],
  hearth: ['guard', 'throwEvery', 'throwRange', 'coals', 'spread', 'flight', 'fireTime', 'out'],
  shade: ['prowl', 'near', 'far', 'light', 'sink', 'gone', 'emerge', 'bite', 'biteTime', 'lurk'],
  roller: ['ball0', 'grow', 'launchAt', 'range', 'tell', 'flight', 'ring', 'shotSpeed', 'chill', 'bare', 'quick', 'weak'],
  // floor 5
  glacier: ['stompEvery', 'stompRange', 'tell', 'spikes', 'spikeEvery', 'gap', 'hit', 'arc', 'front', 'frozen', 'shatter'],
  hydra: ['headHp', 'regrow', 'attackEvery', 'keep', 'biteReach', 'shotSpeed', 'hex'],
  raven: ['wheel', 'keep', 'gloom', 'dim', 'light', 'cawEvery', 'shots', 'spread', 'shotSpeed', 'hex', 'tell', 'dive', 'diveTime'],
  wolf: ['keep', 'spin', 'lungeEvery', 'tell', 'lunge', 'lungeTime', 'howlEvery', 'haste', 'fear', 'scatter'],
  pangolin: ['walk', 'range', 'tell', 'roll', 'rollMax', 'daze', 'dust', 'dim', 'glance', 'open'],
  kiter: ['watch', 'keep', 'leap', 'leapTime', 'stampEvery', 'range', 'shards', 'spread', 'shotSpeed', 'chill', 'rime', 'rimeTime', 'fear', 'slide'],
  manticore: ['keep', 'volleyEvery', 'tailTell', 'spikes', 'spread', 'shotSpeed', 'hex', 'pounceEvery', 'pounceRange', 'crouch', 'pounceTime', 'pounceMax', 'landHit'],
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
    passed over while anything else could fill it, and with `noPack`, one that comes as many (a pack or a nest: a room has
    one of each at most); `eliteMul` weighs the elites (M4.9's pressure: deeper floors' come more often). */
export function pickFoe(table: RoleTable, role: Role, R: () => number, noElite = false, noPack = false, eliteMul = 1): FoeType {
  let list = table[role];
  if (noElite) { const plain = list.filter(([id]) => !(isFoe(id) && FOES[id].elite)); if (plain.length) list = plain; }
  if (noPack) { const lone = list.filter(([id]) => !comesMany(id)); if (lone.length) list = lone; }
  if (eliteMul !== 1) list = list.map(([id, w]): [FoeType, number] => [id, isFoe(id) && FOES[id].elite ? w * eliteMul : w]); // (M4.9: deeper floors' elites come more often)
  const total = list.reduce((s, [, w]) => s + w, 0);
  let x = R() * total;
  for (const [id, w] of list) { if (x < w) return id; x -= w; }
  return list[list.length - 1][0];
}

/** A floor's pairs (M4.7): how often a fight rolls one, and the pairs, weighted. */
export interface PairTable { chance: number; list: [string, string, number][] }
/** A fight's first wave as roles filled (rooms.ts's `buildRoom`): the kinds, and the roles they fill. */
type Slot = { kind: string; role: string };
/** Whether a room's first wave rolls a pair (M4.7: two foes made to work together, placed side by side): the pair (by
    `pairs`' weights) takes the first two of its slots that aren't the boss, and the rest keep the rule of one elite and
    one pack a room (an elite or a pack among them is drawn again from `table`). `R` from 0 to 1, from the room's seed.
    Returns the slots the pair took, or nothing when the wave has fewer than two or the roll says none. Pure. */
export function pairRoom(wave: Slot[], pairs: PairTable | undefined, table: RoleTable, R: () => number): [number, number] | undefined {
  const free = wave.map((f, i) => f.kind === 'boss' ? -1 : i).filter(i => i >= 0);
  if (!pairs?.list.length || free.length < 2 || R() >= pairs.chance) return undefined;
  const total = pairs.list.reduce((s, [, , w]) => s + w, 0);
  let x = R() * total, pair = pairs.list[pairs.list.length - 1];
  for (const p of pairs.list) { if (x < p[2]) { pair = p; break; } x -= p[2]; }
  const [a, b] = free;
  wave[a].kind = pair[0]; wave[b].kind = pair[1];
  let elite = [pair[0], pair[1]].some(k => isFoe(k) && FOES[k].elite), pack = [pair[0], pair[1]].some(comesMany);
  for (const i of free.slice(2)) {
    const k = wave[i].kind, isElite = isFoe(k) && !!FOES[k].elite, isPack = comesMany(k);
    if ((isElite && elite) || (isPack && pack)) wave[i].kind = pickFoe(table, wave[i].role as Role, R, true, true);
    elite ||= isFoe(wave[i].kind) && !!FOES[wave[i].kind as FoeId].elite; pack ||= comesMany(wave[i].kind);
  }
  return [a, b];
}
/** What is wrong with the floors' pairs (empty when all is well): an unknown foe, a pair of one foe, a chance outside 0
    to 1. */
export function validatePairs(floors: readonly { pairs?: PairTable }[]) {
  const out: string[] = [];
  floors.forEach((f, i) => {
    if (!f.pairs) return;
    if (!(f.pairs.chance >= 0 && f.pairs.chance <= 1)) out.push(`floor ${i + 1}: pair chance ${f.pairs.chance}`);
    for (const [a, b, w] of f.pairs.list) {
      for (const k of [a, b]) if (!isFoe(k)) out.push(`floor ${i + 1}: pair foe ${k}`);
      if (a === b) out.push(`floor ${i + 1}: a pair of ${a} alone`);
      if (!(w > 0)) out.push(`floor ${i + 1}: pair weight ${w}`);
    }
  });
  return out;
}

/* ---------- M4.9 The curve ---------- */

/** A floor's pressure (M4.9's dials, `pressure` in data/floors.json): the share of fights whose first wave gains one more
    walker or flier, how much likelier its elites are, and the waves an ordeal gains. They rise from floor to floor. */
export interface Pressure { extra: number; eliteMul: number; ordealWaves: number }
/** Whether a fight's first wave gains one more foe (M4.9): with chance `extra`, the slot whose role the new one copies
    (one of its walkers or fliers, never the boss, a heavy, an elite or a pack); -1 for none. `R` from the room's seed. Pure. */
export function extraSlot(wave: Slot[], extra: number, R: () => number): number {
  if (!(extra > 0) || R() >= extra) return -1;
  const ok = wave.map((f, i) => (f.role === 'R' || f.role === 'W') && f.kind !== 'boss' && !(isFoe(f.kind) && FOES[f.kind].elite) && !comesMany(f.kind) ? i : -1).filter(i => i >= 0);
  return ok.length ? ok[Math.floor(R() * ok.length)] : -1;
}
/** What is wrong with the floors' pressure (empty when all is well). */
export function validatePressure(floors: readonly { pressure?: Pressure }[]) {
  const out: string[] = [];
  floors.forEach((f, i) => {
    const p = f.pressure; if (!p) { out.push(`floor ${i + 1}: no pressure`); return; }
    if (!(p.extra >= 0 && p.extra <= 1)) out.push(`floor ${i + 1}: extra ${p.extra}`);
    if (!(p.eliteMul > 0)) out.push(`floor ${i + 1}: eliteMul ${p.eliteMul}`);
    if (!(Number.isInteger(p.ordealWaves) && p.ordealWaves >= 0)) out.push(`floor ${i + 1}: ordealWaves ${p.ordealWaves}`);
  });
  return out;
}

/** What a floor's foes are weak to, resist and drink (an elemental, its own school), each a share from 0 to 1 of the
    floor's rolls: each role counts alike, each foe in it by its weight. Pure (M4.9: the floor teaches its counter). */
export interface Weakness { weak: Record<School, number>; resist: Record<School, number>; drink: Record<School, number> }
export function floorWeakness(table: RoleTable): Weakness {
  const zero = () => Object.fromEntries(SCHOOLS.map(s => [s, 0])) as Record<School, number>;
  const out: Weakness = { weak: zero(), resist: zero(), drink: zero() }, roles = (Object.keys(table) as Role[]).filter(r => table[r].length);
  for (const role of roles) {
    const list = table[role].filter(([id]) => isFoe(id)), total = list.reduce((s, [, w]) => s + w, 0);
    for (const [id, w] of list) {
      const d = FOES[id as FoeId], share = w / total / roles.length;
      out.weak[d.weak] += share;
      (d.elemental ? out.drink : out.resist)[d.resist] += share;
    }
  }
  return out;
}
/** The schools a floor's foes are weak to, most first: those at least `CFG.curve.lean` of them are. */
export const leanSchools = (w: Weakness): School[] => SCHOOLS.filter(s => w.weak[s] >= CFG.curve.lean).sort((a, b) => w.weak[b] - w.weak[a]);
/** Whether a floor walls off `school`: at least `CFG.curve.wall` of its foes resist or drink it. */
export const wallsOff = (w: Weakness, school: School) => w.resist[school] + w.drink[school] >= CFG.curve.wall;
