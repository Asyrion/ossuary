/* Steam (Ember + Frost): a cloud where fire met cold. It comes from the reaction on a foe (a chilled foe
   set burning, a burning one chilled; magic/status.ts) and from the floor (fire on ice, frost on burning oil; world/pools.ts).
   Foes inside can't aim: their shots go wide (`spawnShot`). Eyes can't see the mage through one: a basilisk's stare, a
   radiant eye, a watching statue (`steamBetween`). Water under it is scalded, and what hides in it comes up (`hearGround`'s
   'steam'). Each cloud is a few puffs, drifting up and thinning out, drawn as pixel art draws fog: a dither of solid
   pixels in two tones, as many as the puff is thick (overlapping puffs don't pile up into a white wall), and thinner
   over the mage, so the fight inside it still reads (`CFG.steamLook`). */
import * as THREE from 'three';
import type { Room } from '../types';
import { G, player } from '../state';
import { scene } from '../render/renderer';
import { fogTex, glowTex } from '../render/textures';
import { MAGIC } from './status';
import { groundHears } from '../world/groundHooks';
import { damageEnemy } from '../combat/damage';
import { burst } from '../combat/fx';
import { renderHearts } from '../notify';
import { inflict } from './statusFx';
import { strikeFx } from './spellFx';
import { weaveAt } from './weaveFx';
import { CFG } from '../config';
import { heroDrink } from '../actors/hero';

const S = MAGIC.reactions.steam,
  PUFFS = 7;
interface Cloud {
  room: Room;
  x: number;
  z: number;
  r: number;
  t: number;
  life: number;
  puffs: THREE.Sprite[];
  mat: THREE.SpriteMaterial;
  /** the school that charged it (Thundercloud, Incense, Miasma), its clock, and whether its incense has mended the mage. */ school?: Charge;
  tick?: number;
  mended?: boolean;
}
/** The schools a cloud takes (the chains), what each makes of it, and its colour. */
export type Charge = 'storm' | 'hallow' | 'umbral';
const CHAIN: Record<Charge, 'thundercloud' | 'incense' | 'miasma'> = {
  storm: 'thundercloud',
  hallow: 'incense',
  umbral: 'miasma',
};
const TINT: Record<Charge, number> = { storm: 0xf4eeb0, hallow: 0xffe8a8, umbral: 0x5a4078 };
const clouds: Cloud[] = [];

/** Shared by every cloud's material: where the mage stands, in the world (the dither thins round it). */
const U = {
  uMage: { value: new THREE.Vector3(0, -1e4, 0) },
  uHole: { value: CFG.steamLook.hole },
  uHoleK: { value: CFG.steamLook.holeK },
  uDense: { value: CFG.steamLook.dense },
  uSolid: { value: CFG.steamLook.solid },
  uChecker: { value: CFG.steamLook.checker },
  uSparse: { value: CFG.steamLook.sparse },
  uFogChecker: { value: CFG.steamLook.fog },
  uShade: { value: CFG.steamLook.shade },
};
/** A puff's sprite material drawn as pixel art draws fog: where the puff is thick, solid pixels in its lighter tone,
    shaded at its bottom right (`shade`); thinner, every other pixel (a checker) in a darker one; thinner still, one
    pixel in four; then none (`CFG.steamLook.solid`, `checker`, `sparse`); all of it inside the cloud's round shape
    (`edge`) and its room. A fog of darkness (`fog`) never goes solid. */
function ditherSteam(mat: THREE.SpriteMaterial, fog = false) {
  // the cloud's own round shape on screen (its middle in the world, and its radius), and whether it is a fog of
  // darkness (dithered as steam is, but never solid: a checker in its core, one pixel in four round it)
  const own = {
    uCloud: { value: new THREE.Vector4(0, 0, 0, 0) },
    uFog: { value: fog ? 1 : 0 },
    uRoom: { value: new THREE.Vector2(-1e4, 1e4) },
  };
  mat.userData.dither = own;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, own);
    // (the mage and the cloud's middle are given in the world and taken into the view of the camera that draws, so
    // they hold however the pixel look snaps it)
    sh.vertexShader = sh.vertexShader
      .replace(
        'void main() {',
        'uniform vec3 uMage;\nuniform vec4 uCloud;\nvarying vec2 vSteamView, vMageView, vCloudView;\nvarying float vSteamX;\nvoid main() {',
      )
      .replace(
        '#include <logdepthbuf_vertex>',
        `vSteamView = mvPosition.xy;
vSteamX = (inverse(viewMatrix) * mvPosition).x;
vMageView = (viewMatrix * vec4(uMage, 1.0)).xy;
vCloudView = (viewMatrix * vec4(uCloud.xyz, 1.0)).xy;
#include <logdepthbuf_vertex>`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        'void main() {',
        `varying vec2 vSteamView, vMageView, vCloudView;
varying float vSteamX;
uniform vec4 uCloud;
uniform vec2 uRoom;
uniform float uHole, uHoleK, uDense, uSolid, uChecker, uSparse, uFog, uFogChecker, uShade;
void main() {`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `float d = length(vSteamView - vMageView) / uHole;
float a = diffuseColor.a * uDense * (d < 1.0 ? uHoleK : d < 1.5 ? mix(uHoleK, 1.0, 0.5) : 1.0);
vec2 e = (vSteamView - vCloudView) / max(uCloud.w, 1e-3);
float r = length(vec2(e.x, e.y * 1.2));
if (r > 1.0 || vSteamX < uRoom.x || vSteamX > uRoom.y) discard; // (clipped to the cloud's round shape, and to its room's width: never over the dark beyond a side wall)
if (r > 0.82) a = min(a, uSparse); // (and thinning to one pixel in four at its rim)
float solidT = uFog > 0.5 ? 9.0 : uSolid, checkT = uFog > 0.5 ? uFogChecker : uChecker;
vec2 q = mod(floor(gl_FragCoord.xy), 2.0);
bool checker = q.x == q.y, sparse = q.x + q.y < 0.5;
if (a < uSparse || (a < checkT && !sparse) || (a < solidT && !checker)) discard;
// (the thick of a puff lit at its top left and shaded in a crescent at its bottom right, as pixel art draws a billow:
// never a flat white disc)
float rim = texture2D(map, vMapUv + vec2(uShade, -uShade)).a * opacity * uDense; // (thin a step away from the light: its shaded side)
diffuseColor.rgb *= a < solidT ? 0.82 : rim < solidT ? 0.55 : 1.0;
diffuseColor.a = 1.0;`,
      );
  };
  mat.customProgramCacheKey = () => 'steamDither';
  return mat;
}

/** A cloud of steam at (x, z) in the current room, `r` across (the reaction's, by default), for `time` seconds. A
    `dark` one (a thrown Shadowstep Tincture) is darkness, not steam: foes in it can't aim either, but water keeps still. */
export function steamAt(x: number, z: number, r = S.radius, time = S.time, dark = false) {
  // (drawn over what stands in it, clipped to its own round shape: tested against depth, a wall cut it off in a hard
  // rectangle with a stepped corner)
  const room = G.room.current,
    mat = dark
      ? ditherSteam(
          new THREE.SpriteMaterial({
            map: fogTex,
            color: 0x2a1a40,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
          }),
          true,
        ) // (darkness in hard bands of dither: overlapping see-through puffs piled up into a soft blur)
      : ditherSteam(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: 0xd8e6ee,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
          }),
        );
  (mat.userData.dither as { uRoom: { value: THREE.Vector2 } }).uRoom.value.set(room.bounds.minX, room.bounds.maxX);
  const puffs = Array.from({ length: PUFFS }, (_, i) => {
    const s = new THREE.Sprite(mat),
      a = (i / PUFFS) * Math.PI * 2,
      d = r * (0.25 + (0.45 * ((i * 37) % 7)) / 7);
    s.position.set(x + Math.cos(a) * d, 0.5 + (i % 3) * 0.35, z + Math.sin(a) * d);
    s.scale.setScalar(r * 1.1);
    s.renderOrder = 6;
    s.userData.rise = 0.15 + (i % 4) * 0.06;
    scene.add(s);
    return s;
  });
  clouds.push({ room, x, z, r, t: time, life: time, puffs, mat });
  if (!dark) groundHears('steam', x, z, r); // (scalded water: what hides in it comes up)
}

/** A school lands at (x, z): a cloud there not yet charged takes it: Storm makes it a thundercloud, Hallow incense,
    Umbral a miasma. Returns whether one did. */
export function chargeSteam(x: number, z: number, school: Charge) {
  const c = clouds.find((c) => c.room === G.room.current && !c.school && Math.hypot(x - c.x, z - c.z) < c.r);
  if (!c) return false;
  c.school = school;
  c.tick = 0;
  c.mat.color.setHex(TINT[school]);
  if (school === 'umbral') {
    // (a miasma is a fog of darkness: in hard bands of dither, as the Shadowstep's)
    c.mat.map = fogTex;
    (c.mat.userData.dither as { uFog: { value: number } }).uFog.value = 1;
  }
  weaveAt(CHAIN[school], c.x, c.z);
  return true;
}
/** Each second, a charged cloud does its school's work on the foes inside (and incense mends the mage once). */
function chargedTick(c: Cloud) {
  const W = MAGIC.weaves,
    T = W[CHAIN[c.school!]];
  c.tick = T.every;
  for (const e of G.room.enemies) {
    if (e.dead || e.hidden || e.spawn > 0 || Math.hypot(e.x - c.x, e.z - c.z) > c.r + e.r * 0.5) continue;
    if (c.school === 'storm') {
      strikeFx({ x: c.x, y: 1.4, z: c.z }, { x: e.x, y: 0.7, z: e.z }, 0xf0e890, CFG.spellFx.strike, true);
      damageEnemy(e, W.thundercloud.damage, 0, 0, 0, 'spell', 'storm');
      inflict(e, { shock: W.thundercloud.shock }, 'mage');
    } else if (c.school === 'hallow') inflict(e, { sanct: W.incense.sanct });
    else inflict(e, { hex: W.miasma.hex });
  }
  if (
    c.school === 'hallow' &&
    !c.mended &&
    player.hp < player.maxHp &&
    Math.hypot(player.x - c.x, player.z - c.z) < c.r
  ) {
    c.mended = true;
    player.hp = Math.min(player.maxHp, player.hp + W.incense.heal);
    renderHearts();
    heroDrink();
    burst(player.x, 0.9, player.z, 0xffe8a8, 10, 1.4, 0.04);
  }
}

/** Whether (x, z) in the current room is inside a cloud of steam. */
export const inSteam = (x: number, z: number) =>
  clouds.some((c) => c.room === G.room.current && Math.hypot(x - c.x, z - c.z) < c.r);
/** Whether steam hangs between (x0, z0) and (x1, z1) in the current room, or round either end: an eye can't see through it. */
export function steamBetween(x0: number, z0: number, x1: number, z1: number) {
  const dx = x1 - x0,
    dz = z1 - z0,
    l2 = dx * dx + dz * dz || 1;
  return clouds.some((c) => {
    if (c.room !== G.room.current) return false;
    const k = Math.max(0, Math.min(1, ((c.x - x0) * dx + (c.z - z0) * dz) / l2));
    return Math.hypot(x0 + dx * k - c.x, z0 + dz * k - c.z) < c.r * S.sight; // (the thick of it)
  });
}
/** The clouds in the current room (tests, the dev menu). */
export const steamCount = () => clouds.filter((c) => c.room === G.room.current).length;

function drop(c: Cloud) {
  for (const s of c.puffs) scene.remove(s);
  c.mat.dispose();
  clouds.splice(clouds.indexOf(c), 1);
}
/** Every step: the clouds drift up and thin out, and go. Only the current room's show. */
export function updateSteam(dt: number) {
  U.uMage.value.set(player.x, 0.7, player.z);
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.t -= dt;
    if (c.t <= 0) {
      drop(c);
      continue;
    }
    const k = c.t / c.life,
      here = c.room === G.room.current;
    c.mat.opacity = Math.min(1, (1 - k) * 6) * Math.min(1, k * 2.5) * 0.5; // (it billows up, then thins out)
    let y = 0;
    for (const s of c.puffs) {
      s.visible = here;
      s.position.y += s.userData.rise * dt;
      s.scale.setScalar(c.r * (1.1 + (1 - k) * 0.5));
      y += s.position.y / c.puffs.length;
    }
    // its round shape on screen: round its puffs' middle, as wide as it has grown
    (c.mat.userData.dither as { uCloud: { value: THREE.Vector4 } }).uCloud.value.set(
      c.x,
      y,
      c.z,
      c.r * CFG.steamLook.edge * (1 + (1 - k) * 0.45),
    );
    if (c.school && here && (c.tick = (c.tick ?? 0) - dt) <= 0) chargedTick(c);
    if (c.school === 'storm' && here && Math.random() < dt * 6)
      burst(
        c.x + (Math.random() - 0.5) * c.r,
        1 + Math.random() * 0.6,
        c.z + (Math.random() - 0.5) * c.r,
        0xf0e890,
        1,
        1.4,
        0.025,
      ); // (a thundercloud crackles)
  }
}
/** A new floor or run: every cloud goes. */
export function clearSteam() {
  while (clouds.length) drop(clouds[0]);
}
