/* Hero animation: base layer (idle, and walk or run by speed) on the whole body, one-shot overlays (cast,
   hit, and the gestures: drinking when healed, eating now and then when standing still) on the upper body,
   death on everything. Clips are recognised by name (clipRoles.ts), so any Tripo/Mixamo export with similar
   names works; the extras (walk, a second death, drink, eat) are used when a model has them. */
import * as THREE from 'three';
import { CFG } from '../config';
import { DEV } from '../state';
import { clamp, lerp } from '../util';
import { HIPS_OFFSET_LIMIT, HIPS_RE, assignRoles, hipsOffset, type Role } from './clipRoles';

export type Gesture = 'drink' | 'eat';
export interface HeroAnim {
  mixer: THREE.AnimationMixer;
  roles: Partial<Record<Role, THREE.AnimationClip>>;
  /** Blend weights: moving, casting, hit, gesture. */ m: number;
  c: number;
  h: number;
  g: number;
  castLeft: number;
  hitLeft: number;
  gestLeft: number;
  dead: boolean;
  idleL?: THREE.AnimationAction;
  idleU?: THREE.AnimationAction;
  runL?: THREE.AnimationAction;
  runU?: THREE.AnimationAction;
  /** A slow walk, blended in below running speed when the model has one. */ walkL?: THREE.AnimationAction;
  walkU?: THREE.AnimationAction;
  cast?: THREE.AnimationAction;
  castLen: number;
  castWin?: [number, number];
  hit?: THREE.AnimationAction;
  hitLen: number;
  /** Death clips; one is picked at random. */ deaths: { action: THREE.AnimationAction; len: number }[];
  gestures: Partial<Record<Gesture, { action: THREE.AnimationAction; len: number; speed: number }>>;
  gesture?: THREE.AnimationAction;
  /** Seconds standing still, and when the mage next eats something. */ still: number;
  fidgetAt: number;
}

const UPPER_RE = /spine|chest|neck|head|shoulder|clavicle|arm|hand|thumb|index|middle|ring|pinky/i;

function findHips(root: THREE.Object3D) {
  let hips: THREE.Bone | null = null;
  root.traverse((o) => {
    if (!hips && (o as THREE.Bone).isBone && HIPS_RE.test(o.name)) hips = o as THREE.Bone;
  });
  return hips as THREE.Bone | null;
}

/** Split a clip into upper body (spine and above) or lower body. */
export function bodyPart(clip: THREE.AnimationClip, upper: boolean, name?: string) {
  const tracks = clip.tracks.filter((t) => {
    const bone = t.name.split('.')[0];
    const up = UPPER_RE.test(bone) && !/upleg/i.test(bone);
    return upper ? up : !up;
  });
  return new THREE.AnimationClip(name ?? clip.name + (upper ? '_upper' : '_lower'), clip.duration, tracks);
}

/** Overlay clips (cast, hit) often turn the whole body at the hips. Since we only borrow their upper body,
    move that hip turn into the spine so the torso and arms still point where the clip intended. */
export function alignUpperToHips(clip: THREE.AnimationClip, root: THREE.Object3D, refClip?: THREE.AnimationClip) {
  const hips = findHips(root);
  const spine = hips?.children.find((c) => (c as THREE.Bone).isBone && UPPER_RE.test(c.name));
  if (!hips || !spine) return clip;
  const hT = clip.tracks.find((t) => t.name === hips.name + '.quaternion'),
    sT = clip.tracks.find((t) => t.name === spine.name + '.quaternion');
  if (!hT || !sT) return clip;
  const rT = refClip?.tracks.find((t) => t.name === hips.name + '.quaternion');
  const ref = rT ? new THREE.Quaternion().fromArray(rT.values, 0) : hips.quaternion.clone();
  const inv = ref.invert(),
    hi = (hT as unknown as { createInterpolant(): THREE.Interpolant }).createInterpolant(), // runtime API, missing from @types/three
    vals = sT.values.slice(),
    qh = new THREE.Quaternion(),
    qs = new THREE.Quaternion();
  for (let i = 0; i < sT.times.length; i++) {
    qh.fromArray(hi.evaluate(sT.times[i]));
    qs.fromArray(vals, i * 4)
      .premultiply(qh)
      .premultiply(inv)
      .normalize();
    qs.toArray(vals, i * 4);
  }
  const nt = new THREE.QuaternionKeyframeTrack(sT.name, Array.from(sT.times), Array.from(vals));
  return new THREE.AnimationClip(
    clip.name,
    clip.duration,
    clip.tracks.map((t) => (t === sT ? nt : t)),
  );
}

/** Some locomotion clips shift the whole body forward (hips offset). Pull it back over the collision circle. */
export function centreHips(clip: THREE.AnimationClip, root: THREE.Object3D, refClip?: THREE.AnimationClip) {
  const hips = findHips(root);
  if (!hips) return clip;
  const tr = clip.tracks.find((t) => t.name === hips.name + '.position');
  if (!tr) return clip;
  const ref = refClip?.tracks.find((t) => t.name === hips.name + '.position');
  const rx = ref ? ref.values[0] : hips.position.x,
    rz = ref ? ref.values[2] : hips.position.z;
  const off = hipsOffset(tr.values, rx, rz);
  if (off.dist < HIPS_OFFSET_LIMIT) return clip;
  const vals = tr.values.slice();
  const n = vals.length / 3;
  for (let i = 0; i < n; i++) {
    vals[i * 3] += off.dx;
    vals[i * 3 + 2] += off.dz;
  }
  const nt = new THREE.VectorKeyframeTrack(tr.name, Array.from(tr.times), Array.from(vals));
  return new THREE.AnimationClip(
    clip.name,
    clip.duration,
    clip.tracks.map((t) => (t === tr ? nt : t)),
  );
}

let castHand = '';
/** The bone of the hand the cast clip thrusts forward (found by `castWindow`): the focus is held in it (M4.6). */
export const castHandName = () => castHand;
/** Find the moment a hand thrusts forward fastest; that's the "release" we replay on every shot. */
export function castWindow(root: THREE.Object3D, clip: THREE.AnimationClip): [number, number] {
  const hands: THREE.Object3D[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && /hand$/i.test(o.name)) hands.push(o);
  });
  if (!hands.length) return [0, clip.duration];
  const mx = new THREE.AnimationMixer(root);
  mx.clipAction(clip).play();
  const v = new THREE.Vector3(),
    dt = 1 / 30;
  let prev: number[] | null = null,
    best = -Infinity,
    bt = clip.duration / 2;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (let t = 0; t <= clip.duration; t += dt) {
    mx.setTime(t);
    root.updateMatrixWorld(true);
    const zs = hands.map((h) => h.getWorldPosition(v).applyMatrix4(inv).z);
    if (prev) {
      const p = prev;
      zs.forEach((z, i) => {
        const vel = (z - p[i]) / dt;
        if (vel > best) {
          best = vel;
          bt = t;
          castHand = hands[i].name;
        }
      });
    }
    prev = zs;
  }
  mx.stopAllAction();
  mx.uncacheRoot(root);
  return [Math.max(0, bt - 0.22), Math.min(clip.duration, bt + 0.38)];
}

/** The moment a hand is raised highest (to the mouth, when drinking or eating), with `before` and `after`
    seconds around it. */
export function peakWindow(
  root: THREE.Object3D,
  clip: THREE.AnimationClip,
  before: number,
  after: number,
): [number, number] {
  const hands: THREE.Object3D[] = [];
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone && /hand$/i.test(o.name)) hands.push(o);
  });
  if (!hands.length) return [0, clip.duration];
  const mx = new THREE.AnimationMixer(root);
  mx.clipAction(clip).play();
  const v = new THREE.Vector3();
  let best = -Infinity,
    bt = clip.duration / 2;
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  for (let t = 0; t <= clip.duration; t += 1 / 30) {
    mx.setTime(t);
    root.updateMatrixWorld(true);
    for (const h of hands) {
      const y = h.getWorldPosition(v).applyMatrix4(inv).y;
      if (y > best) {
        best = y;
        bt = t;
      }
    }
  }
  mx.stopAllAction();
  mx.uncacheRoot(root);
  return [Math.max(0, bt - before), Math.min(clip.duration, bt + after)];
}

const fidgetDelay = () => CFG.hero.fidget[0] + Math.random() * (CFG.hero.fidget[1] - CFG.hero.fidget[0]);

/** Build the layered animation controller for a rigged model. */
export function buildHeroAnim(holder: THREE.Object3D, clips: THREE.AnimationClip[]): HeroAnim {
  const roles = assignRoles(clips, (c) => c.name);
  for (const k of ['run', 'walk', 'cast', 'hit', 'death', 'deathAlt', 'drink', 'eat'] as const) {
    const c = roles[k];
    if (c && c !== roles.idle) roles[k] = centreHips(c, holder, roles.idle);
  }
  const mixer = new THREE.AnimationMixer(holder);
  const act = (clip: THREE.AnimationClip, loop = true) => {
    const a = mixer.clipAction(clip);
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    a.clampWhenFinished = !loop;
    return a;
  };
  const A: HeroAnim = {
    mixer,
    m: 0,
    c: 0,
    h: 0,
    g: 0,
    castLeft: 0,
    hitLeft: 0,
    gestLeft: 0,
    dead: false,
    roles,
    castLen: 0,
    hitLen: 0,
    deaths: [],
    gestures: {},
    still: 0,
    fidgetAt: fidgetDelay(),
  };
  if (roles.run && roles.idle) {
    A.idleL = act(bodyPart(roles.idle, false));
    A.idleU = act(bodyPart(roles.idle, true));
    A.runL = act(bodyPart(roles.run, false));
    A.runU = act(bodyPart(roles.run, true));
    if (roles.walk) {
      A.walkL = act(bodyPart(roles.walk, false));
      A.walkU = act(bodyPart(roles.walk, true));
    }
    for (const a of [A.idleL, A.idleU, A.runL, A.runU, A.walkL, A.walkU]) {
      a?.play();
      a?.setEffectiveWeight(0);
    }
  }
  if (roles.cast) {
    const [t0, t1] = castWindow(holder, roles.cast);
    const sub = THREE.AnimationUtils.subclip(
      alignUpperToHips(roles.cast, holder, roles.run),
      'cast_release',
      Math.round(t0 * 30),
      Math.round(t1 * 30),
      30,
    );
    A.cast = act(bodyPart(sub, true, 'cast_upper'), false);
    A.castLen = sub.duration;
    A.castWin = [t0, t1];
  }
  if (roles.hit) {
    A.hit = act(bodyPart(alignUpperToHips(roles.hit, holder, roles.run), true, 'hit_upper'), false);
    A.hitLen = roles.hit.duration;
  }
  for (const c of [roles.death, roles.deathAlt]) if (c) A.deaths.push({ action: act(c, false), len: c.duration });
  // drinking: just the draught, around the moment the flask is highest; eating: the whole clip, unhurried
  if (roles.drink) {
    const [t0, t1] = peakWindow(holder, roles.drink, 1, 0.5);
    const sub = THREE.AnimationUtils.subclip(
      alignUpperToHips(roles.drink, holder, roles.run),
      'drink_draught',
      Math.round(t0 * 30),
      Math.round(t1 * 30),
      30,
    );
    A.gestures.drink = {
      action: act(bodyPart(sub, true, 'drink_upper'), false),
      len: sub.duration,
      speed: CFG.hero.drinkSpeed,
    };
  }
  if (roles.eat)
    A.gestures.eat = {
      action: act(bodyPart(alignUpperToHips(roles.eat, holder, roles.run), true, 'eat_upper'), false),
      len: roles.eat.duration,
      speed: 1,
    };
  return A;
}

/** Play the cast thrust, fast enough to finish within the current fire delay. */
export function playCast(A: HeroAnim, fireDelay: number) {
  if (!A.cast || A.dead) return;
  const ts = Math.max(1, A.castLen / (fireDelay * 1.35));
  A.cast.reset();
  A.cast.timeScale = ts;
  A.cast.play();
  A.castLeft = A.castLen / ts;
  A.c = Math.max(A.c, 0.6);
}
export function playHit(A: HeroAnim) {
  if (!A.hit || A.dead) return;
  A.hit.reset();
  A.hit.timeScale = 1.6;
  A.hit.play();
  A.hitLeft = A.hitLen / 1.6;
  A.h = Math.max(A.h, 0.5);
}
/** An upper-body gesture: drinking (when healed) or eating (a fidget when standing still). */
export function playGesture(A: HeroAnim, which: Gesture) {
  const gst = A.gestures[which];
  if (!gst || A.dead) return false;
  if (A.gesture && A.gesture !== gst.action) A.gesture.stop();
  A.gesture = gst.action;
  gst.action.reset();
  gst.action.timeScale = gst.speed;
  gst.action.play();
  A.gestLeft = gst.len / gst.speed;
  A.still = 0;
  return true;
}
/** Returns how long the death takes, in seconds. Models with two death clips fall one way or the other. */
export function playDeath(A: HeroAnim) {
  if (!A.deaths.length) return 0.9;
  const d = A.deaths[Math.floor(Math.random() * A.deaths.length)];
  A.dead = true;
  d.action.reset();
  d.action.timeScale = 1.25;
  d.action.play();
  d.action.setEffectiveWeight(1);
  return Math.min(2.6, d.len / 1.25);
}
export function resetAnim(A: HeroAnim) {
  A.dead = false;
  A.c = A.h = A.g = 0;
  A.castLeft = A.hitLeft = A.gestLeft = 0;
  A.still = 0;
  A.fidgetAt = fidgetDelay();
  for (const d of A.deaths) d.action.stop();
  A.cast?.stop();
  A.hit?.stop();
  A.gesture?.stop();
  A.gesture = undefined;
}

/** Blend weights: lower = idle, walk or run by speed; upper = base, cast, hit, gesture; death overrides.
    Standing still long enough, the mage eats something (when the model can). */
export function updateHeroAnim(A: HeroAnim, dt: number, sp: number) {
  const k = 1 - Math.exp(-12 * dt),
    H = CFG.hero;
  A.m = lerp(A.m, sp > 0.12 ? 1 : 0, k);
  A.castLeft -= dt;
  A.hitLeft -= dt;
  A.gestLeft -= dt;
  if (sp > 0.12 || A.castLeft > 0) A.gestLeft = Math.min(A.gestLeft, 0); // moving or casting puts the flask or the bite away
  A.c = A.castLeft > 0 ? lerp(A.c, 1, 1 - Math.exp(-30 * dt)) : lerp(A.c, 0, 1 - Math.exp(-10 * dt));
  A.h = A.hitLeft > 0 ? lerp(A.h, 1, 1 - Math.exp(-30 * dt)) : lerp(A.h, 0, 1 - Math.exp(-8 * dt));
  A.g = A.gestLeft > 0 ? lerp(A.g, 1, 1 - Math.exp(-14 * dt)) : lerp(A.g, 0, 1 - Math.exp(-8 * dt));
  if (A.c < 0.01 && A.castLeft <= 0 && A.cast) {
    A.cast.stop();
    A.c = 0;
  }
  if (A.h < 0.01 && A.hitLeft <= 0 && A.hit) {
    A.hit.stop();
    A.h = 0;
  }
  if (A.g < 0.01 && A.gestLeft <= 0 && A.gesture) {
    A.gesture.stop();
    A.gesture = undefined;
    A.g = 0;
  }
  // the fidget: standing still, not casting or hurt, for a while
  A.still = sp < 0.05 && A.castLeft <= 0 && A.hitLeft <= 0 && !A.gesture && !A.dead ? A.still + dt : 0;
  if (A.still > A.fidgetAt) {
    playGesture(A, 'eat');
    A.still = 0;
    A.fidgetAt = fidgetDelay();
  }
  const live = A.dead ? 0 : 1;
  if (A.runL && A.runU && A.idleL && A.idleU) {
    const hw = A.hit ? A.h : 0,
      cw = A.cast ? A.c * (1 - hw) : 0,
      gw = A.gesture ? A.g * (1 - hw - cw) : 0,
      bu = 1 - cw - hw - gw;
    // below running speed a walk takes over from the run, when the model has one (the dev menu can make it walk always)
    const walkOnly = !!A.walkL && DEV.moveClip !== 'run';
    const rs = walkOnly ? 0 : A.walkL ? clamp((sp - H.walkToRun[0]) / (H.walkToRun[1] - H.walkToRun[0]), 0, 1) : 1;
    A.idleL.setEffectiveWeight((1 - A.m) * live);
    A.idleU.setEffectiveWeight((1 - A.m) * bu * live);
    A.runL.setEffectiveWeight(A.m * rs * live);
    A.runU.setEffectiveWeight(A.m * rs * bu * live);
    A.walkL?.setEffectiveWeight(A.m * (1 - rs) * live);
    A.walkU?.setEffectiveWeight(A.m * (1 - rs) * bu * live);
    A.cast?.setEffectiveWeight(cw * live);
    A.hit?.setEffectiveWeight(hw * live);
    A.gesture?.setEffectiveWeight(gw * live);
    const s = clamp(sp, 0, 1.2);
    A.runL.timeScale = A.runU.timeScale = Math.max(0.8, H.runAnimSpeed * s);
    if (A.walkL && A.walkU)
      A.walkL.timeScale = A.walkU.timeScale = Math.max(
        0.6,
        (DEV.moveClip === 'walkNatural' ? H.walkNatural : H.walkAnimSpeed) * s,
      );
  }
  A.mixer.update(dt);
}
