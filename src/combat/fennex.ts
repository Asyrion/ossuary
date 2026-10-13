/* Fen-Nex (M4.2, the owner's Fen-Nex, "fox man"; GDD: Artifacts): the Rune of Fen-Nex binds it to Azyrion. It runs at the
   mage's heel and darts at the nearest foe to bite it, then comes back. It grows as the run goes down: bound, it is a small
   fox of rune-light (the Rune Fox the owner drew, stage 1); a floor deeper it is full-grown (stage 2) and its bite burns;
   another floor, and it comes into its full shape (stage 3: a long white beast between fox, cat and dragon, its fur blown
   back into flame-tipped feathers, its legs plated dark blue with red spiral runes) and breathes Ember besides. The floor
   it was bound on is kept in the run (`G.run.fennexFrom`). Tuning in CFG.artifacts.fennex. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { blob, disposeTree } from '../render/materials';
import { mergeRig } from '../render/rig';
import { SCHOOL_LIGHT } from '../render/arcane';
import { fennexLook } from '../actors/fennexLook';
import { toast } from '../ui/hud';
import { burst } from './fx';
import { damageEnemy } from './damage';
import { fireSpellBolt } from './projectiles';
import { familiarMul } from './familiars';
import { angleLerp } from '../util';

const F = CFG.artifacts.fennex;
let fen: {
  g: THREE.Group;
  idle: (t: number) => void;
  mouth?: THREE.Sprite;
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
  mergeRig(L.group, L.idle, 'fennex:' + stage);
  L.group.scale.setScalar(F.scale[stage - 1]);
  g.add(L.group, blob(L.shadow * F.scale[stage - 1]));
  g.position.set(x, 0, z);
  scene.add(g);
  return {
    g,
    idle: L.idle,
    mouth: L.parts?.mouth as THREE.Sprite | undefined,
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
  for (const e of G.enemies) {
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
    burst(x, 0.6, z, stage === 3 ? 0xff8a2a : 0x8ff0ff, 30, 2.4, 0.06);
    Sfx.at(x, z).wake();
    toast(STR.toast.fennexGrows[stage - 2], 3.5);
  }
  if (!acting) return;
  const f = fen,
    speedOf = (s: number) => s * (1 + F.stageSpeed * (stage - 1));
  f.cd -= dt;
  f.breath -= dt;
  if (f.prey && (f.prey.dead || !G.enemies.includes(f.prey))) f.prey = null;
  if (!f.prey && f.cd <= 0) f.prey = nearest(player.x, player.z, F.reach + stage);
  let tx: number, tz: number, sp: number;
  if (f.prey) {
    // it darts at its prey and bites
    tx = f.prey.x;
    tz = f.prey.z;
    sp = speedOf(F.dash);
    if (Math.hypot(tx - f.x, tz - f.z) < f.prey.r + 0.35) {
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
  // full-grown, it breathes Ember at a foe near it
  if (stage === 3 && f.breath <= 0) {
    const e = nearest(f.x, f.z, F.breath.range);
    if (e) {
      const a = Math.atan2(e.z - f.z, e.x - f.x),
        B = F.breath;
      f.face = Math.atan2(Math.cos(a), Math.sin(a));
      for (let i = 0; i < B.count; i++) {
        const b = a + (i / (B.count - 1) - 0.5) * B.spread;
        fireSpellBolt(f.x + Math.cos(b) * 0.4, f.z + Math.sin(b) * 0.4, Math.cos(b), Math.sin(b), {
          damage: player.stats.damage * B.mul,
          range: B.range + 0.5,
          speed: B.speed,
          color: SCHOOL_LIGHT.ember,
          scale: 0.6,
          status: { burn: B.burn },
        });
      }
      if (f.mouth) f.mouth.material.opacity = 0.9;
      Sfx.at(f.x, f.z).ember();
      f.breath = B.every;
    } else f.breath = 0.3;
  }
  if (f.mouth) f.mouth.material.opacity *= Math.exp(-4 * dt);
  f.g.position.set(f.x, 0, f.z);
  f.g.rotation.y = f.face;
  f.idle(f.t);
}
/** Dev hooks: where Fen-Nex is, how grown, what it hunts; and growing it a stage (as if a floor had gone by). */
export const fennexInfo = () => (fen ? { stage: fen.stage, x: fen.x, z: fen.z, hunting: !!fen.prey } : null);
export function growFennex() {
  if (G.run.fennexFrom !== undefined && fennexStage() < 3) G.run.fennexFrom--;
}
