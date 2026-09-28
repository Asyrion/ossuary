/* Recognise animation clips by name keywords. Tripo/Mixamo names vary ("standing_relax.001").
   Shared by the game and tools/prepare-asset.ts, so keep this module free of three.js. */

export type Role = 'idle' | 'run' | 'walk' | 'cast' | 'hit' | 'death' | 'deathAlt' | 'drink' | 'eat';
/** Roles every hero should have (the game makes do without them); the rest are extras used when present. */
export const CORE_ROLES: Role[] = ['idle', 'run', 'cast', 'hit', 'death'];

const DEATH = /fall|death|die|dead|defeat/i;
export const ROLE_PATTERNS: Record<Role, RegExp> = {
  death: DEATH, deathAlt: DEATH,
  hit: /hit|hurt|damage|impact/i,
  drink: /drink|potion|quaff/i,
  eat: /(^|[^a-z])eat|bite|snack/i, // "Eat", "eating", but not "defeat"
  cast: /cast|spell|attack|shoot|throw/i,
  run: /run|jog|sprint/i,
  walk: /walk|move|locomot/i,
  idle: /idle|stand|relax|breath/i,
};

/** Assign clips to roles. Order matters: death (and a second death clip, played at random), hit, drink,
    eat, cast, run, walk, then idle (falling back to the first remaining clip). The mage runs everywhere,
    so a model with a walk but no run runs with its walk; a missing run or idle borrows the other. */
export function assignRoles<T>(clips: readonly T[], nameOf: (c: T) => string): Partial<Record<Role, T>> {
  const rest = clips.slice();
  const take = (re: RegExp) => { const i = rest.findIndex(c => re.test(nameOf(c))); return i < 0 ? undefined : rest.splice(i, 1)[0]; };
  const roles: Partial<Record<Role, T>> = {};
  for (const r of ['death', 'deathAlt', 'hit', 'drink', 'eat', 'cast', 'run', 'walk'] as const) roles[r] = take(ROLE_PATTERNS[r]);
  roles.idle = take(ROLE_PATTERNS.idle) ?? rest.shift();
  if (!roles.run) { roles.run = roles.walk; roles.walk = undefined; }
  roles.run ??= roles.idle;
  roles.idle ??= roles.run;
  for (const k of Object.keys(roles) as Role[]) if (roles[k] === undefined) delete roles[k];
  return roles;
}

/** Bones of the hip joint. */
export const HIPS_RE = /hips|pelvis/i;

/** Mean horizontal offset of a hips position track from a reference (x, z). The game re-centres clips
    whose offset is at least HIPS_OFFSET_LIMIT. */
export const HIPS_OFFSET_LIMIT = 0.02;
export function hipsOffset(values: ArrayLike<number>, refX: number, refZ: number) {
  let mx = 0, mz = 0; const n = values.length / 3;
  for (let i = 0; i < n; i++) { mx += values[i * 3]; mz += values[i * 3 + 2]; }
  mx /= n; mz /= n;
  return { dx: refX - mx, dz: refZ - mz, dist: Math.hypot(mx - refX, mz - refZ) };
}
