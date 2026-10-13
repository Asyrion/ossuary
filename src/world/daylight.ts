/* Daylight (M7 step 3; docs/M7-plan.md, decision 5): a run won ends in daylight. Kaelith kneels and a shaft of daylight
   opens in its hall (`openShaft`, from onBossDead: the way out, as a trapdoor is on the floors above); stepping into it
   (`enterDaylight`, from the player's step) brings the mage out at the cave mouth at dawn (daylightLooks.ts): a white
   fading, the mage walking out of the cave's dark to the terrace's edge as the rock opens on the valleys, the mist
   drifting and the water falling; then the end screen lies over it (`daylightHooks.done`, flow.ts's endGame), the scene
   still moving behind it. A new run takes it away (`leaveDaylight`, from buildFloor). Step 9 makes the scene the Vigil's
   Cave Mouth. The dev menu's "Daylight now" steps into it from anywhere. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { camTarget, scene, setViewScale } from '../render/renderer';
import { disposeTree } from '../render/materials';
import { setDarkness, setDaylight } from '../render/lights';
import { clearLines, line } from '../notify';
import { emit } from '../events';
import { buildVista, shaftLook, type Vista } from './daylightLooks';
import { daylightPhase } from './daylightData';
import type { Room } from '../types';

const C = () => CFG.daylight;
/** What daylight hands back to the run's flow (flow.ts sets it: the end screen, won). */
export const daylightHooks: { done?: () => void } = {};

let shaft: { motes: THREE.Group } | null = null;
let day: { vista: Vista; t: number; ended: boolean; room: Room | null } | null = null;

/** Kaelith's way out: a shaft of daylight at (x, z) in `room`, which the mage steps into (player.ts, `G.floor.trapdoor`'s
    `kind`). */
export function openShaft(room: Room, x: number, z: number) {
  const look = shaftLook();
  look.group.position.set(x - room.cx, 0, z - room.cz);
  room.group.add(look.group);
  G.floor.trapdoor = { g: look.group, x, z, ring: look.ring, t: 0, kind: 'shaft' };
  shaft = { motes: look.motes };
  Sfx.at(x, z).shaft();
  line(STR.seal.shaft, 5); // (after Kaelith's own line)
}

/** Step into the daylight: the cave mouth at dawn, the mage walking out to its edge. */
export function enterDaylight() {
  if (day) return;
  const [ax, az] = C().at,
    w = C().walk;
  const vista = buildVista();
  vista.root.position.set(ax, 0, az);
  scene.add(vista.root);
  const room = G.current ?? null;
  if (room) room.group.visible = false;
  day = { vista, t: 0, ended: false, room };
  G.state = 'daylight';
  G.trans = null;
  G.fx.shake = 0;
  Object.assign(player, { x: ax, z: az + w.from, vx: 0, vz: -w.speed, yawA: Math.PI, invuln: 0 }); // (nothing can hurt it here: no blinking)
  clearLines(); // (what was said below stays below)
  camTarget.set(ax, 0, az - C().look);
  setViewScale(1);
  setDaylight(true);
  setDarkness(0, true);
  emit('dawn'); // (a white flash fading, `C().flash` seconds)
  Sfx.dawn();
  vistaStep(0);
}

/** Each step: the shaft's dust turning; in daylight, the walk out, the rock opening, the mist and the water, and the end
    screen when it is due. */
export function updateDaylight(dt: number) {
  if (shaft) shaft.motes.rotation.y += dt * 0.6;
  if (!day) return;
  day.t += dt;
  const w = C().walk,
    edge = C().at[1] + w.to;
  if (player.z > edge) {
    player.vz = -w.speed;
    player.z = Math.max(edge, player.z - w.speed * dt);
  } else player.vz = 0;
  player.vx = 0;
  player.x = C().at[0];
  vistaStep(dt);
  if (daylightPhase(day.t, C()).end && !day.ended) {
    day.ended = true;
    daylightHooks.done?.();
  }
}

function vistaStep(dt: number) {
  if (!day) return;
  const v = day.vista,
    ph = daylightPhase(day.t, C()),
    open = 1 - ph.lift;
  v.cave.top.position.y = open * -3.6;
  v.cave.left.position.x = open * 3;
  v.cave.right.position.x = -open * 3;
  v.sun.position.y = 1.5 + ph.lift * 0.3;
  for (const m of v.mists) {
    m.x += m.speed * C().mist * dt;
    m.m.position.x = Math.sin(m.x) * 1.4;
  }
  v.fall.offset.y += dt * C().fall;
  v.spray.forEach((s, i) => {
    s.material.opacity = 0.3 + Math.sin(day!.t * 3 + i * 1.7) * 0.1;
  });
}

/** Take the daylight away (a new run, a new floor). */
export function leaveDaylight() {
  shaft = null;
  if (!day) return;
  day.vista.root.removeFromParent();
  disposeTree(day.vista.root);
  day.vista.fall.dispose();
  if (day.room) day.room.group.visible = true;
  day = null;
  setDaylight(false);
  emit('daylightGone');
}

/** Whether the mage is out in the daylight (the music and the soundscape follow it). */
export const daylightOn = () => !!day;
/** What the dev menu and the browser tests read of it. */
export function daylightInfo() {
  if (!day) return { on: false, shaft: !!shaft };
  const ph = daylightPhase(day.t, C());
  return {
    on: true,
    shaft: !!shaft,
    t: +day.t.toFixed(2),
    lift: +ph.lift.toFixed(2),
    ended: day.ended,
    walking: player.vz !== 0,
    mage: { x: player.x, z: player.z },
  };
}
