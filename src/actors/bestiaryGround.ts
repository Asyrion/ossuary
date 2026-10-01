/* What M4.5's foes leave on the ground and throw (docs/M4.5-plan.md): a crypt spider's webs and an ink octopus's smears,
   which slow the mage who walks through them (fire burns a web away), a rime snail's trail of rime, on which the mage
   slides (fire melts it), and lobs, anything thrown in an arc to land on a
   spot (a spider's web gob; later floors' snowballs and coals), and stones dropped from above (a rubble golem's). Each kind of patch is drawn at once, one instanced mesh
   a kind, so a room full of them stays cheap. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Room } from '../types';
import { G } from '../state';
import { CFG } from '../config';
import { Sfx } from '../audio/sfx';
import { scene } from '../render/renderer';
import { glowShared, markShared } from '../render/materials';
import { glowTex } from '../render/textures';
import { burst } from '../combat/fx';
import { hearGround } from '../world/groundHooks';

export type GroundKind = 'web' | 'ink' | 'rime';
interface Patch { room: Room; kind: GroundKind; x: number; z: number; r: number; t: number; life: number }
const patches: Patch[] = [];
const MAX = 48; // (of each kind)

/** A web: eight spokes and three rings of silk, flat, one unit across from the middle. */
function webGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) parts.push(new THREE.BoxGeometry(1, .01, .035).translate(.5, 0, 0).rotateY(i / 8 * Math.PI * 2));
  for (const r of [.3, .58, .86]) for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, b = (i + 1) / 8 * Math.PI * 2, len = 2 * r * Math.sin(Math.PI / 8) * 1.04;
    parts.push(new THREE.BoxGeometry(len, .01, .03).rotateY(-(a + b) / 2 + Math.PI / 2).translate(Math.cos((a + b) / 2) * r * .96, 0, Math.sin((a + b) / 2) * r * .96));
  }
  const g = mergeGeometries(parts)!; for (const p of parts) p.dispose(); return g;
}
const meshes: Record<GroundKind, THREE.InstancedMesh | null> = { web: null, ink: null, rime: null };
function meshOf(kind: GroundKind) {
  const had = meshes[kind]; if (had) return had;
  const geo = kind === 'web' ? webGeometry() : new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2);
  // (ink and rime fade at their edges, so neither reads as a hole in the floor: ink a glossy violet sheen, never a pit's
  // black; rime a faint frost-blue that overlapping patches don't stack into a white plank)
  const mat = kind === 'web' ? new THREE.MeshBasicMaterial({ color: 0xd8d0e8, transparent: true, opacity: .55, depthWrite: false })
    : kind === 'rime' ? new THREE.MeshStandardMaterial({ color: 0x8fc8ec, emissive: 0x123450, roughness: .45, metalness: .1, transparent: true, opacity: .28, alphaMap: glowTex, depthWrite: false })
    : new THREE.MeshStandardMaterial({ color: 0x4a3480, emissive: 0x1c0e3a, roughness: .1, metalness: .4, transparent: true, opacity: .62, alphaMap: glowTex, depthWrite: false });
  const m = new THREE.InstancedMesh(geo, mat, MAX); m.count = 0; m.frustumCulled = false; m.renderOrder = 1; scene.add(m);
  return meshes[kind] = m;
}

/** A patch of `kind` at (x, z), `r` across, for `time` seconds. */
export function layGround(room: Room, kind: GroundKind, x: number, z: number, r: number, time: number) {
  const mine = patches.filter(p => p.kind === kind); if (mine.length >= MAX) patches.splice(patches.indexOf(mine[0]), 1);
  patches.push({ room, kind, x, z, r, t: time, life: time });
}
/** How fast one can walk at (x, z) in the current room: slower through webs and ink (1: not at all). */
export function stickyAt(x: number, z: number) {
  let k = 1;
  for (const p of patches) if (p.kind !== 'rime' && p.room === G.current && Math.hypot(x - p.x, z - p.z) < p.r) k = Math.min(k, p.kind === 'web' ? CFG.bestiary.webSlow : CFG.bestiary.inkSlow);
  return k;
}
/** Whether (x, z) in the current room is on rime, where the mage slides. */
export const slipAt = (x: number, z: number) => patches.some(p => p.kind === 'rime' && p.room === G.current && Math.hypot(x - p.x, z - p.z) < p.r);
/** The patches of `kind` in the current room (tests). */
export const groundCount = (kind: GroundKind) => patches.filter(p => p.kind === kind && p.room === G.current).length;

// fire burns a web away and melts rime
hearGround((kind, x, z, r) => {
  if (kind !== 'fire') return;
  for (let i = patches.length - 1; i >= 0; i--) {
    const p = patches[i];
    if (p.kind === 'ink' || p.room !== G.current || Math.hypot(x - p.x, z - p.z) > r + p.r) continue;
    patches.splice(i, 1);
    if (p.kind === 'web') { burst(p.x, .1, p.z, 0xff9a3a, 8, 1.6, .04); Sfx.at(p.x, p.z).webBurn(); } else { burst(p.x, .1, p.z, 0xd4ecf8, 5, 1.2, .04); Sfx.at(p.x, p.z).thaw(); }
  }
});

/* ---------- lobs: thrown in an arc to land on a spot ---------- */

interface Lob { room: Room; fx: number; fz: number; tx: number; tz: number; t: number; dur: number; h: number; m: THREE.Object3D; land: (x: number, z: number) => void; fall?: boolean }
const lobs: Lob[] = [];
const lobGeo = markShared(new THREE.SphereGeometry(.11, 8, 6)), lobMats = new Map<number, THREE.MeshBasicMaterial>();
/** Throw something of `color` from (fx, fz) to land on (tx, tz) after `dur` seconds, as high as `h` at the top of its arc;
    `land` is called where it lands (unless the mage has left the room). */
export function lob(room: Room, fx: number, fz: number, tx: number, tz: number, color: number, dur: number, land: (x: number, z: number) => void, h = 1.2, size = 1) {
  let mat = lobMats.get(color); if (!mat) lobMats.set(color, mat = markShared(new THREE.MeshBasicMaterial({ color })));
  const m = new THREE.Group(); m.add(new THREE.Mesh(lobGeo, mat), glowShared(color, .55, .7)); m.scale.setScalar(size); scene.add(m);
  lobs.push({ room, fx, fz, tx, tz, t: 0, dur, h, m, land });
}
/** A stone dropped from `h` up onto (x, z), landing after `dur` seconds (a rubble golem's slam brings the roof down). */
const stoneGeo = markShared(new THREE.DodecahedronGeometry(.26, 0)), stoneMat = markShared(new THREE.MeshStandardMaterial({ color: 0x6a645c, roughness: .95, flatShading: true }));
export function fallOn(room: Room, x: number, z: number, dur: number, land: (x: number, z: number) => void, h = 4) {
  const m = new THREE.Mesh(stoneGeo, stoneMat); m.rotation.set(Math.random() * 3, Math.random() * 3, 0); scene.add(m);
  lobs.push({ room, fx: x, fz: z, tx: x, tz: z, t: 0, dur, h, m, land, fall: true });
}

const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
/** Every step: patches fade and go; lobs fly and land. */
export function updateGround(dt: number) {
  updateSpikes(dt);
  for (let i = patches.length - 1; i >= 0; i--) { const p = patches[i]; p.t -= dt; if (p.t <= 0 || p.room !== G.current) patches.splice(i, 1); }
  for (const kind of ['web', 'ink', 'rime'] as const) {
    const list = patches.filter(p => p.kind === kind);
    if (!list.length && !meshes[kind]?.count) continue;
    const mesh = meshOf(kind);
    list.forEach((p, i) => { const k = Math.min(1, p.t / .5, (p.life - p.t) / .25 + .3); mesh.setMatrixAt(i, m4.compose(v3.set(p.x, kind === 'web' ? .03 : kind === 'rime' ? .025 : .02, p.z), q0, s3.set(p.r * k, 1, p.r * k))); });
    mesh.count = list.length; mesh.instanceMatrix.needsUpdate = true;
  }
  for (let i = lobs.length - 1; i >= 0; i--) {
    const l = lobs[i]; l.t += dt;
    const k = Math.min(1, l.t / l.dur);
    l.m.position.set(l.fx + (l.tx - l.fx) * k, l.fall ? .25 + l.h * (1 - k * k) : .4 + Math.sin(k * Math.PI) * l.h, l.fz + (l.tz - l.fz) * k);
    if (k < 1 && l.room === G.current) continue;
    scene.remove(l.m); lobs.splice(i, 1);
    if (l.room === G.current) l.land(l.tx, l.tz);
  }
}
/** A new floor or a room left: the ground is clear and nothing is in the air. */
export function clearGround() {
  patches.length = 0; for (const m of Object.values(meshes)) if (m) m.count = 0;
  for (const l of lobs) scene.remove(l.m); lobs.length = 0;
  for (const s of spikes) scene.remove(s.m); spikes.length = 0;
}

/* ---------- ice spikes: a glacier golem's stomp ---------- */

const spikeGeo = markShared(new THREE.ConeGeometry(.2, 1, 5).translate(0, .5, 0)), spikeMat = markShared(new THREE.MeshStandardMaterial({ color: 0xcfeaf8, emissive: 0x1e5a8a, roughness: .15, metalness: .2, transparent: true, opacity: .9, flatShading: true }));
const spikes: { room: Room; m: THREE.Mesh; t: number }[] = [];
const SPIKE_LIFE = .7;
/** An ice spike thrust up from the floor at (x, z), gone again in a moment. */
export function spikeAt(room: Room, x: number, z: number) {
  const m = new THREE.Mesh(spikeGeo, spikeMat); m.position.set(x, 0, z); m.rotation.set((Math.random() - .5) * .3, Math.random() * 3, (Math.random() - .5) * .3); m.scale.set(1, .01, 1); scene.add(m);
  spikes.push({ room, m, t: 0 });
}
function updateSpikes(dt: number) {
  for (let i = spikes.length - 1; i >= 0; i--) {
    const s = spikes[i]; s.t += dt;
    if (s.t > SPIKE_LIFE || s.room !== G.current) { scene.remove(s.m); spikes.splice(i, 1); continue; }
    s.m.scale.y = Math.min(1, s.t / .1) * Math.min(1, (SPIKE_LIFE - s.t) / .25) * .9 + .01; // (up fast, down slow)
  }
}
