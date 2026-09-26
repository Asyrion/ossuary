/* Recognise animation clips by name keywords. Tripo/Mixamo names vary ("standing_relax.001").
   Shared by the game and tools/prepare-asset.ts, so keep this module free of three.js. */

export type Role = 'idle' | 'walk' | 'cast' | 'hit' | 'death';

export const ROLE_PATTERNS: Record<Role, RegExp> = {
  death: /fall|death|die|dead/i,
  hit: /hit|hurt|damage|impact/i,
  cast: /cast|spell|attack|shoot|throw/i,
  walk: /walk|run|jog|move|locomot/i,
  idle: /idle|stand|relax|breath/i,
};

/** Assign clips to roles. Order matters: death, hit, cast, walk, then idle (falling back to the first
    remaining clip). A missing walk or idle borrows the other. */
export function assignRoles<T>(clips: readonly T[], nameOf: (c: T) => string): Partial<Record<Role, T>> {
  const rest = clips.slice();
  const take = (re: RegExp) => { const i = rest.findIndex(c => re.test(nameOf(c))); return i < 0 ? undefined : rest.splice(i, 1)[0]; };
  const roles: Partial<Record<Role, T>> = {};
  roles.death = take(ROLE_PATTERNS.death);
  roles.hit = take(ROLE_PATTERNS.hit);
  roles.cast = take(ROLE_PATTERNS.cast);
  roles.walk = take(ROLE_PATTERNS.walk);
  roles.idle = take(ROLE_PATTERNS.idle) ?? rest.shift();
  roles.walk ??= roles.idle;
  roles.idle ??= roles.walk;
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
