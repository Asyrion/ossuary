/* The foes built in code (M4, docs/M4-plan.md): what each is, as data (data/foes.json), and the pure rules about them.
   Each has a floor, a school, a weakness and a resistance (+50% and −50% from damage of that school; GDD: Enemy
   affinities), health before the floor's `enemyHp`, its size and speed, what it costs on contact, whether it flies, and
   a behaviour with its parameters (actors/foes.ts). Its look is the model option of the same id (actors/modelOptions.ts).
   Templates name roles, not foes (`R` a walker, `W` a flyer or shooter, `H` a charger or heavy); each floor fills them
   from its own foes, weighted (`foes` in data/floors.json). */
import foesData from '../../data/foes.json';
import { CFG, type EnemyType } from '../config';
import { SCHOOLS, type School, type StatusKind } from '../magic/spellData';

export type { School } from '../magic/spellData';
const STATUS_SCHOOL: Record<StatusKind, School> = { burn: 'ember', chill: 'frost', shock: 'storm' };
/** The school a hit carries from the statuses it brings (a burning bolt is Ember's), if any. */
export const schoolOf = (status?: Partial<Record<StatusKind, number>>) => {
  const k = status && (Object.keys(status) as StatusKind[]).find(s => (status[s] ?? 0) > 0);
  return k ? STATUS_SCHOOL[k] : undefined;
};
export type Role = 'R' | 'W' | 'H';
export const ROLES: readonly Role[] = ['R', 'W', 'H'];

export interface FoeDef {
  id: FoeId; floor: 1 | 2 | 3; school: School; weak: School; resist: School;
  hp: number; r: number; speed: number; contact: number; flying: boolean;
  /** Only one in a room (the Rime Drakeling); the rest of its role's picks go to the others. */ elite?: boolean;
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
};

/** What is wrong with the foes' data (an empty list when nothing is). */
export function validateFoes(defs: Record<string, FoeDef> = FOES) {
  const errors: string[] = [];
  for (const [id, d] of Object.entries(defs)) {
    const at = (m: string) => errors.push(`${id}: ${m}`);
    if (![1, 2, 3].includes(d.floor)) at(`floor ${d.floor}`);
    for (const k of ['school', 'weak', 'resist'] as const) if (!SCHOOLS.includes(d[k])) at(`${k} ${d[k]}`);
    if (d.weak === d.resist) at('weak to what it resists');
    for (const k of ['hp', 'r', 'speed'] as const) if (!(d[k] > 0)) at(`${k} ${d[k]}`);
    if (!(d.contact >= 0)) at(`contact ${d.contact}`);
    const need = BEHAVIOUR_PARAMS[d.behaviour];
    if (!need) at(`behaviour ${d.behaviour}`);
    else for (const p of need) if (d.params[p] === undefined) at(`${d.behaviour} needs ${p}`);
    if (!/^#[0-9a-f]{6}$/i.test(d.gib) || (d.stain !== null && !/^#[0-9a-f]{6}$/i.test(d.stain))) at('gib or stain colour');
  }
  return errors;
}

/** Damage of `school` to a foe: half again from its weakness, half from its resistance, as it is otherwise. */
export function affinityMul(def: Pick<FoeDef, 'weak' | 'resist'> | undefined, school?: School) {
  if (!def || !school) return 1;
  return school === def.weak ? CFG.affinity.weak : school === def.resist ? CFG.affinity.resist : 1;
}

/** A foe of `role` for the floor to call up in the middle of a fight (a boss's helpers, the ossuary's rising bones):
    never an elite, nor one that waits in disguise. */
export function callFoe(table: RoleTable, role: Role, R: () => number): FoeType {
  const list = table[role].filter(([id]) => !(isFoe(id) && (FOES[id].elite || FOES[id].behaviour === 'mimic')));
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
