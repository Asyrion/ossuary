/* Hero animation: base layer (idle/walk) on the whole body, one-shot overlays (cast, hit) on the upper body,
   death on everything. Clips are recognised by name (clipRoles.ts), so any Tripo/Mixamo export with similar
   names works. */
import * as THREE from 'three';
import { CFG } from '../config';
import { clamp, lerp } from '../util';
import { HIPS_OFFSET_LIMIT, HIPS_RE, assignRoles, hipsOffset, type Role } from './clipRoles';

export interface HeroAnim {
  mixer: THREE.AnimationMixer; roles: Partial<Record<Role, THREE.AnimationClip>>;
  m: number; c: number; h: number; castLeft: number; hitLeft: number; dead: boolean;
  idleL?: THREE.AnimationAction; idleU?: THREE.AnimationAction; walkL?: THREE.AnimationAction; walkU?: THREE.AnimationAction;
  cast?: THREE.AnimationAction; castLen: number; castWin?: [number, number];
  hit?: THREE.AnimationAction; hitLen: number;
  death?: THREE.AnimationAction; deathLen: number;
}

const UPPER_RE = /spine|chest|neck|head|shoulder|clavicle|arm|hand|thumb|index|middle|ring|pinky/i;

function findHips(root: THREE.Object3D) {
  let hips: THREE.Bone | null = null;
  root.traverse(o => { if (!hips && (o as THREE.Bone).isBone && HIPS_RE.test(o.name)) hips = o as THREE.Bone; });
  return hips as THREE.Bone | null;
}

/** Split a clip into upper body (spine and above) or lower body. */
export function bodyPart(clip: THREE.AnimationClip, upper: boolean, name?: string) {
  const tracks = clip.tracks.filter(t => {
    const bone = t.name.split('.')[0]; const up = UPPER_RE.test(bone) && !/upleg/i.test(bone); return upper ? up : !up;
  });
  return new THREE.AnimationClip(name ?? clip.name + (upper ? '_upper' : '_lower'), clip.duration, tracks);
}

/** Overlay clips (cast, hit) often turn the whole body at the hips. Since we only borrow their upper body,
    move that hip turn into the spine so the torso and arms still point where the clip intended. */
export function alignUpperToHips(clip: THREE.AnimationClip, root: THREE.Object3D, refClip?: THREE.AnimationClip) {
  const hips = findHips(root);
  const spine = hips?.children.find(c => (c as THREE.Bone).isBone && UPPER_RE.test(c.name));
  if (!hips || !spine) return clip;
  const hT = clip.tracks.find(t => t.name === hips.name + '.quaternion'), sT = clip.tracks.find(t => t.name === spine.name + '.quaternion');
  if (!hT || !sT) return clip;
  const rT = refClip?.tracks.find(t => t.name === hips.name + '.quaternion');
  const ref = rT ? new THREE.Quaternion().fromArray(rT.values, 0) : hips.quaternion.clone();
  const inv = ref.invert(), hi = (hT as unknown as { createInterpolant(): THREE.Interpolant }).createInterpolant(), // runtime API, missing from @types/three
    vals = sT.values.slice(), qh = new THREE.Quaternion(), qs = new THREE.Quaternion();
  for (let i = 0; i < sT.times.length; i++) {
    qh.fromArray(hi.evaluate(sT.times[i]));
    qs.fromArray(vals, i * 4).premultiply(qh).premultiply(inv).normalize(); qs.toArray(vals, i * 4);
  }
  const nt = new THREE.QuaternionKeyframeTrack(sT.name, Array.from(sT.times), Array.from(vals));
  return new THREE.AnimationClip(clip.name, clip.duration, clip.tracks.map(t => t === sT ? nt : t));
}

/** Some locomotion clips shift the whole body forward (hips offset). Pull it back over the collision circle. */
export function centreHips(clip: THREE.AnimationClip, root: THREE.Object3D, refClip?: THREE.AnimationClip) {
  const hips = findHips(root);
  if (!hips) return clip;
  const tr = clip.tracks.find(t => t.name === hips.name + '.position'); if (!tr) return clip;
  const ref = refClip?.tracks.find(t => t.name === hips.name + '.position');
  const rx = ref ? ref.values[0] : hips.position.x, rz = ref ? ref.values[2] : hips.position.z;
  const off = hipsOffset(tr.values, rx, rz);
  if (off.dist < HIPS_OFFSET_LIMIT) return clip;
  const vals = tr.values.slice(); const n = vals.length / 3;
  for (let i = 0; i < n; i++) { vals[i * 3] += off.dx; vals[i * 3 + 2] += off.dz; }
  const nt = new THREE.VectorKeyframeTrack(tr.name, Array.from(tr.times), Array.from(vals));
  return new THREE.AnimationClip(clip.name, clip.duration, clip.tracks.map(t => t === tr ? nt : t));
}

/** Find the moment a hand thrusts forward fastest; that's the "release" we replay on every shot. */
export function castWindow(root: THREE.Object3D, clip: THREE.AnimationClip): [number, number] {
  const hands: THREE.Object3D[] = []; root.traverse(o => { if ((o as THREE.Bone).isBone && /hand$/i.test(o.name)) hands.push(o); });
  if (!hands.length) return [0, clip.duration];
  const mx = new THREE.AnimationMixer(root); mx.clipAction(clip).play();
  const v = new THREE.Vector3(), dt = 1 / 30; let prev: number[] | null = null, best = -Infinity, bt = clip.duration / 2;
  root.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (let t = 0; t <= clip.duration; t += dt) {
    mx.setTime(t); root.updateMatrixWorld(true);
    const zs = hands.map(h => h.getWorldPosition(v).applyMatrix4(inv).z);
    if (prev) { const p = prev; zs.forEach((z, i) => { const vel = (z - p[i]) / dt; if (vel > best) { best = vel; bt = t; } }); }
    prev = zs;
  }
  mx.stopAllAction(); mx.uncacheRoot(root);
  return [Math.max(0, bt - .22), Math.min(clip.duration, bt + .38)];
}

/** Build the layered animation controller for a rigged model. */
export function buildHeroAnim(holder: THREE.Object3D, clips: THREE.AnimationClip[]): HeroAnim {
  const roles = assignRoles(clips, c => c.name);
  for (const k of ['walk', 'cast', 'hit', 'death'] as const) {
    const c = roles[k]; if (c && c !== roles.idle) roles[k] = centreHips(c, holder, roles.idle);
  }
  const mixer = new THREE.AnimationMixer(holder);
  const act = (clip: THREE.AnimationClip, loop = true) => {
    const a = mixer.clipAction(clip); a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop; return a;
  };
  const A: HeroAnim = { mixer, m: 0, c: 0, h: 0, castLeft: 0, hitLeft: 0, dead: false, roles, castLen: 0, hitLen: 0, deathLen: 0 };
  if (roles.walk && roles.idle) {
    A.idleL = act(bodyPart(roles.idle, false)); A.idleU = act(bodyPart(roles.idle, true));
    A.walkL = act(bodyPart(roles.walk, false)); A.walkU = act(bodyPart(roles.walk, true));
    for (const a of [A.idleL, A.idleU, A.walkL, A.walkU]) { a.play(); a.setEffectiveWeight(0); }
  }
  if (roles.cast) {
    const [t0, t1] = castWindow(holder, roles.cast);
    const sub = THREE.AnimationUtils.subclip(alignUpperToHips(roles.cast, holder, roles.walk), 'cast_release', Math.round(t0 * 30), Math.round(t1 * 30), 30);
    A.cast = act(bodyPart(sub, true, 'cast_upper'), false); A.castLen = sub.duration; A.castWin = [t0, t1];
  }
  if (roles.hit) { A.hit = act(bodyPart(alignUpperToHips(roles.hit, holder, roles.walk), true, 'hit_upper'), false); A.hitLen = roles.hit.duration; }
  if (roles.death) { A.death = act(roles.death, false); A.deathLen = roles.death.duration; }
  return A;
}

export function playCast(A: HeroAnim) {
  if (!A.cast || A.dead) return;
  const ts = Math.max(1, A.castLen / (CFG.hero.fireDelay * 1.35));
  A.cast.reset(); A.cast.timeScale = ts; A.cast.play(); A.castLeft = A.castLen / ts; A.c = Math.max(A.c, .6);
}
export function playHit(A: HeroAnim) {
  if (!A.hit || A.dead) return;
  A.hit.reset(); A.hit.timeScale = 1.6; A.hit.play(); A.hitLeft = A.hitLen / 1.6; A.h = Math.max(A.h, .5);
}
/** Returns how long the death takes, in seconds. */
export function playDeath(A: HeroAnim) {
  if (!A.death) return .9;
  A.dead = true; A.death.reset(); A.death.timeScale = 1.25; A.death.play(); A.death.setEffectiveWeight(1);
  return Math.min(2.6, A.deathLen / 1.25);
}
export function resetAnim(A: HeroAnim) {
  A.dead = false; A.c = A.h = 0; A.castLeft = A.hitLeft = 0;
  A.death?.stop(); A.cast?.stop(); A.hit?.stop();
}

/** Blend weights: lower = idle/run by speed; upper = base, cast, hit; death overrides. */
export function updateHeroAnim(A: HeroAnim, dt: number, sp: number) {
  const k = 1 - Math.exp(-12 * dt);
  A.m = lerp(A.m, sp > .12 ? 1 : 0, k);
  A.castLeft -= dt; A.hitLeft -= dt;
  A.c = A.castLeft > 0 ? lerp(A.c, 1, 1 - Math.exp(-30 * dt)) : lerp(A.c, 0, 1 - Math.exp(-10 * dt));
  A.h = A.hitLeft > 0 ? lerp(A.h, 1, 1 - Math.exp(-30 * dt)) : lerp(A.h, 0, 1 - Math.exp(-8 * dt));
  if (A.c < .01 && A.castLeft <= 0 && A.cast) { A.cast.stop(); A.c = 0; }
  if (A.h < .01 && A.hitLeft <= 0 && A.hit) { A.hit.stop(); A.h = 0; }
  const live = A.dead ? 0 : 1;
  if (A.walkL && A.walkU && A.idleL && A.idleU) {
    const hw = A.hit ? A.h : 0, cw = A.cast ? A.c * (1 - hw) : 0, bu = (1 - cw - hw);
    A.idleL.setEffectiveWeight((1 - A.m) * live); A.walkL.setEffectiveWeight(A.m * live);
    A.idleU.setEffectiveWeight((1 - A.m) * bu * live); A.walkU.setEffectiveWeight(A.m * bu * live);
    A.cast?.setEffectiveWeight(cw * live); A.hit?.setEffectiveWeight(hw * live);
    const ts = Math.max(.8, CFG.hero.runAnimSpeed * clamp(sp, 0, 1.2)); A.walkL.timeScale = A.walkU.timeScale = ts;
  }
  A.mixer.update(dt);
}
