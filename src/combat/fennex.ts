/* Fen-Nex ("fox man"; GDD: Artifacts): the Rune of Fen-Nex binds it to Azyrion. It runs at the
   mage's heel and darts at the nearest foe to bite it, then comes back. It grows as the run goes down: bound, it is a small
   fox of rune-light (the Rune Fox, stage 1); a floor deeper it is full-grown (stage 2) and its bite burns;
   another floor, and it comes into its full shape (stage 3: a long white beast between fox, cat and dragon, its fur blown
   back into flame-tipped feathers, its legs plated dark blue with red spiral runes) and breathes Ember besides. The floor
   it was bound on is kept in the run (`G.run.fennexFrom`). Its look is an animated creature made in Tripo for each
   shape (fennexLook.ts, docs/creatures.md): it stands, trots at the mage's heel and gallops on a dart, bites and breathes
   over its gait, and shakes itself as it grows. Tuning in CFG.artifacts.fennex. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { blob, disposeTree } from '../render/materials';
import { mergeRig } from '../render/rig';
import { markActor, markThing } from '../render/pixelLook';
import { SCHOOL_LIGHT } from '../render/arcane';
import { fennexLook, type Built } from '../actors/fennexLook';
import { CREATURES } from '../actors/madeCreatures';
import { toast } from '../notify';
import { burst } from './fx';
import { damageEnemy } from './damage';
import { fireSpellBolt } from './projectiles';
import { familiarMul } from './familiars';
import { angleLerp } from '../util';

const F = CFG.artifacts.fennex;
let fen: {
  g: THREE.Group;
  look: Built;
  idle: (t: number) => void;
  mouth?: THREE.Sprite;
  /** Its own clock, for a creature's clips (`t` is its gait's, which runs with its pace). */
  clock: number;
  /** Seconds until the bolts of a breath it has drawn go out (an animated creature's breath, timed to its clip). */
  windup: number;
  /** How fast it has gone of late (tiles a second, smoothed: it catches up in small steps at the heel). */
  pace: number;
  stage: number;
  x: number;
  z: number;
  face: number;
  t: number;
  cd: number;
  breath: number;
  prey: Enemy | null;
} | null = null;

/** How grown Fen-Nex is: 1 on the floor it was bound, 2 a floor deeper, 3 (its full shape) from the next. */
export const fennexStage = () =>
  G.run.fennexFrom === undefined ? 1 : 1 + Math.min(2, Math.max(0, G.run.floor - G.run.fennexFrom));

function make(stage: number, x: number, z: number, face: number) {
  const L = fennexLook(stage),
    g = new THREE.Group();
  if (!L.creature) mergeRig(L.group, L.idle, 'fennex:' + stage);
  L.group.scale.setScalar(F.scale[stage - 1]);
  // (its closed outline in the pixel look: as an animated creature an actor's, with its rim, as the bosses' creatures;
  // built in code a thing's, its colours as made: art bible 4.4)
  (L.creature ? markActor : markThing)(L.group);
  g.add(L.group, blob(L.shadow * F.scale[stage - 1]));
  g.position.set(x, 0, z);
  scene.add(g);
  return {
    g,
    look: L,
    idle: L.idle,
    mouth: L.parts?.mouth as THREE.Sprite | undefined,
    clock: 0,
    windup: 0,
    pace: 0,
    stage,
    x,
    z,
    face,
    t: 0,
    cd: F.bite.every,
    breath: F.breath.every,
    prey: null,
  };
}
/** The nearest foe it can see from (x, z), within `reach`. */
function nearest(x: number, z: number, reach: number) {
  let best: Enemy | null = null,
    bd = reach;
  for (const e of G.room.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || e.asleep) continue;
    const d = Math.hypot(e.x - x, e.z - z);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

/** Each step: Fen-Nex follows, hunts and grows; `acting` is false while paused, in a pan or dying (it only waits). */
export function updateFennex(dt: number, acting: boolean) {
  if (!player.stats.effects.has('fennex')) {
    if (fen) {
      scene.remove(fen.g);
      disposeTree(fen.g);
      fen = null;
    }
    return;
  }
  G.run.fennexFrom ??= G.run.floor;
  const stage = fennexStage();
  if (!fen || Math.hypot(fen.x - player.x, fen.z - player.z) > F.leash) {
    // (bound, or left behind in another room: it comes to the mage's side)
    if (fen) {
      scene.remove(fen.g);
      disposeTree(fen.g);
    }
    fen = make(stage, player.x - 0.6, player.z + 0.4, 0);
    burst(fen.x, 0.4, fen.z, 0x8ff0ff, 10, 1.4, 0.04);
  } else if (fen.stage !== stage) {
    // it grows
    const { x, z, face } = fen;
    scene.remove(fen.g);
    disposeTree(fen.g);
    fen = make(stage, x, z, face);
    fen.look.clip?.('shake'); // (it shakes itself into its new shape)
    burst(x, 0.6, z, stage === 3 ? 0xff8a2a : 0x8ff0ff, 30, 2.4, 0.06);
    Sfx.at(x, z).wake();
    toast(STR.toast.fennexGrows[stage - 2], 3.5);
  }
  if (!acting) return;
  const f = fen,
    speedOf = (s: number) => s * (1 + F.stageSpeed * (stage - 1));
  f.cd -= dt;
  f.breath -= dt;
  if (f.prey && (f.prey.dead || !G.room.enemies.includes(f.prey))) f.prey = null;
  if (!f.prey && f.cd <= 0) f.prey = nearest(player.x, player.z, F.reach + stage);
  let tx: number, tz: number, sp: number;
  if (f.prey) {
    // it darts at its prey and bites
    tx = f.prey.x;
    tz = f.prey.z;
    sp = speedOf(F.dash);
    const gap = Math.hypot(tx - f.x, tz - f.z) - (f.prey.r + 0.35);
    // (its snap starts as far out as it runs in the time the clip takes to snap shut)
    if (f.look.creature && gap < sp * (CREATURES[f.look.creature].clips.bite?.at ?? 0)) f.look.clip?.('bite');
    if (gap < 0) {
      const e = f.prey,
        dx = e.x - f.x,
        dz = e.z - f.z,
        d = Math.hypot(dx, dz) || 1;
      damageEnemy(
        e,
        player.stats.damage * F.bite.mul[stage - 1] * familiarMul(),
        dx / d,
        dz / d,
        0.4,
        undefined,
        stage > 1 ? 'ember' : undefined,
      );
      burst(e.x, 0.5, e.z, stage > 1 ? SCHOOL_LIGHT.ember : 0x8ff0ff, 8, 1.6, 0.04);
      Sfx.at(e.x, e.z).bite();
      f.prey = null;
      f.cd = F.bite.every;
    }
  } else {
    // at the mage's heel: behind them, a little to the side
    const ax = player.aim.x,
      az = player.aim.z,
      al = Math.hypot(ax, az) || 1;
    tx = player.x - (ax / al) * F.heel + (az / al) * 0.35;
    tz = player.z - (az / al) * F.heel - (ax / al) * 0.35;
    sp = speedOf(F.speed);
  }
  const dx = tx - f.x,
    dz = tz - f.z,
    d = Math.hypot(dx, dz),
    step = Math.min(d, sp * dt);
  if (d > 0.05) {
    f.x += (dx / d) * step;
    f.z += (dz / d) * step;
    f.face = angleLerp(f.face, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt));
    f.t += dt * Math.min(1.6, 0.5 + step / dt / F.speed);
  }
  if (f.look.clip) {
    // its gait by how fast it goes: standing, trotting at the mage's heel, galloping on a dart (or to catch up)
    const M = F.made;
    f.pace += ((d > M.moved ? step / dt : 0) - f.pace) * (1 - Math.exp(-M.settle * dt));
    const v = f.pace;
    f.look.clip(v < M.still ? 'idle' : f.prey || v > speedOf(F.speed) * M.run ? 'run' : 'trot', { speed: v });
  }
  // full-grown, it breathes Ember at a foe near it (as a creature, its bolts go out as its clip throws its head forward)
  if (stage === 3 && f.windup > 0) {
    f.windup -= dt;
    const e = nearest(f.x, f.z, F.breath.range + F.breath.reach);
    if (e) f.face = Math.atan2(e.x - f.x, e.z - f.z);
    if (f.windup <= 0 && e) breathe(f, e);
  } else if (stage === 3 && f.breath <= 0) {
    const e = nearest(f.x, f.z, F.breath.range),
      at = f.look.creature ? CREATURES[f.look.creature].clips.breathe?.at : undefined;
    if (e && at) {
      f.look.clip?.('breathe');
      f.windup = at;
      f.breath = F.breath.every;
    } else if (e) breathe(f, e);
    else f.breath = 0.3;
  }
  if (f.mouth) f.mouth.material.opacity *= Math.exp(-4 * dt);
  f.g.position.set(f.x, 0, f.z);
  f.g.rotation.y = f.face;
  f.clock += dt;
  f.idle(f.look.creature ? f.clock : f.t);
}
/** Its breath: a fan of Ember bolts at foe `e`, its mouth lit. */
function breathe(f: NonNullable<typeof fen>, e: Enemy) {
  const a = Math.atan2(e.z - f.z, e.x - f.x),
    B = F.breath;
  f.face = Math.atan2(Math.cos(a), Math.sin(a));
  for (let i = 0; i < B.count; i++) {
    const b = a + (i / (B.count - 1) - 0.5) * B.spread;
    fireSpellBolt(f.x + Math.cos(b) * 0.4, f.z + Math.sin(b) * 0.4, Math.cos(b), Math.sin(b), {
      damage: player.stats.damage * B.mul,
      range: B.range + B.reach,
      speed: B.speed,
      color: SCHOOL_LIGHT.ember,
      scale: 0.6,
      status: { burn: B.burn },
    });
  }
  if (f.mouth) f.mouth.material.opacity = 0.9;
  Sfx.at(f.x, f.z).ember();
  f.breath = B.every;
}
/** Dev hooks: where Fen-Nex is, how grown, what it hunts; and growing it a stage (as if a floor had gone by). */
export const fennexInfo = () =>
  fen
    ? {
        stage: fen.stage,
        x: fen.x,
        z: fen.z,
        hunting: !!fen.prey,
        creature: fen.look.creature ?? null, // (the animated creature it is, or null built in code)
        clip: fen.look.clipNow?.() ?? null, // (the clip it plays, its time and pace, and the clips over it)
      }
    : null;
export function growFennex() {
  if (G.run.fennexFrom !== undefined && fennexStage() < 3) G.run.fennexFrom--;
}
/** Build its look again where it stands (the dev menu's switch between its creature and its look in code). */
export function remakeFennex() {
  if (!fen) return;
  const { x, z, face, stage } = fen;
  scene.remove(fen.g);
  disposeTree(fen.g);
  fen = make(stage, x, z, face);
}
