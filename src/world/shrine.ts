/* The shrine (GDD: Shrine cleansing), on floor 2: a circle of pale runes on the floor, and an offering stone
   for every cursed artifact the mage holds, the artifact floating above it. For 10 obols the shrine cleanses
   one: its price goes and its gift is halved. The curse fights back: walking into its stone draws it out as a
   wisp that flits about the room and spits at the mage. Bolts only strike it inside the circle; put it down
   there before the motes around the circle go out (10 s) and the artifact is cleansed, and the obols paid.
   If time runs out, or the mage leaves the room, the curse slips back into its stone, to be tried again. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Bolt, FloorLook, OfferingStone, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { basicMat, disposeTree, glow, sphereGeo } from '../render/materials';
import { offeringStoneLook } from './specialLooks';
import { shrineCircleTexture } from '../render/textures';
import { scene } from '../render/renderer';
import { burst } from '../combat/fx';
import { spawnShot } from '../combat/projectiles';
import { banner, hideBossBar, renderMinimap, showBossBar, toast, updateBossBar } from '../notify';
import { artifact } from '../items/artifactData';
import { cleanseArtifact, heldCurses, makeArtifactVisual } from '../items/artifacts';
import { CURSED_RED } from '../items/artifactLooks';
import { giveResources } from '../items/pickups';
import { LOOT } from '../items/loot';
import { clamp } from '../util';
import { buildBargain } from './bargain';

const C = CFG.shrine,
  HOLY = 0xf4e2b0,
  CURSE = CURSED_RED,
  MOTES = 24,
  STONE_R = 0.32,
  FLEE = 0.5;
const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);

/** A shrine's look: the floor's, lit warm white. */
export const shrineLook = (look: FloorLook): FloorLook => ({
  ...look,
  torch: { ...look.torch, flame: C.flame, light: C.light, intensity: look.torch.intensity * C.torchMul },
});

/* ---------- the circle and the stones ---------- */

/** Lay the circle in the middle of the room, with motes of light around it, and a stone for each curse held. */
export function buildShrine(room: Room) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: shrineCircleTexture(),
    color: HOLY,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const circle = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  circle.rotation.x = -Math.PI / 2;
  circle.scale.set(C.circle * 2.13, C.circle * 2.13, 1);
  circle.position.y = 0.015; // the outer ring on the radius
  const motes = Array.from({ length: MOTES }, (_, i) => {
    const a = (i / MOTES) * Math.PI * 2,
      m = glow(0xffe8b0, 0.3, 0.3);
    m.position.set(Math.cos(a) * C.circle, 0.08, Math.sin(a) * C.circle);
    return m;
  });
  g.add(circle, ...motes);
  room.group.add(g);
  room.shrine = { mat, motes, stones: [] };
  syncStones(room);
  buildBargain(room); // (M6 step 11: the bargain stone at the circle's head)
}

function makeStone(room: Room, id: string, slot: number): OfferingStone {
  const [lx, lz] = C.stones[slot],
    g = new THREE.Group();
  g.position.set(lx, 0, lz);
  g.add(offeringStoneLook(room.look, slot * 0.7, CURSE)); // (specialLooks.ts)
  const visual = makeArtifactVisual(artifact(id));
  visual.scale.setScalar(0.8);
  visual.position.y = 1.2;
  g.add(visual);
  room.group.add(g);
  const x = room.cx + lx,
    z = room.cz + lz,
    collider = { x, z, hx: 0.28, hz: 0.28, hp: Infinity, breakable: false };
  room.rocks.push(collider);
  return { id, slot, x, z, g, visual, collider, armed: true };
}

function removeStone(room: Room, s: OfferingStone, crumble: boolean) {
  room.group.remove(s.g);
  disposeTree(s.g);
  room.rocks = room.rocks.filter((r) => r !== s.collider);
  if (crumble) {
    burst(s.x, 0.5, s.z, 0x8a8278, 16, 2.2, 0.07);
    burst(s.x, 1, s.z, HOLY, 12, 1.8, 0.05);
  }
}

/** One stone for each curse the mage holds: a new curse takes the first free spot, a stone whose curse is
    gone (cleansed, or the artifacts reset) goes too. */
function syncStones(room: Room) {
  const sh = room.shrine!,
    want = heldCurses();
  for (const s of sh.stones) if (!want.includes(s.id)) removeStone(room, s, false);
  sh.stones = sh.stones.filter((s) => want.includes(s.id));
  for (const id of want) {
    if (sh.stones.some((s) => s.id === id)) continue;
    const slot = C.stones.findIndex((_, i) => !sh.stones.some((s) => s.slot === i));
    if (slot < 0) break;
    sh.stones.push(makeStone(room, id, slot));
  }
}

/** The mage walks in: bring the stones up to date; the first time, say what the shrine does. */
export function enterShrine(room: Room, firstVisit: boolean) {
  syncStones(room);
  if (!firstVisit) return;
  banner(...STR.banner.shrine(LOOT.shrine.price));
  if (!room.shrine!.stones.length) toast(STR.toast.shrineIdle, 3.5);
}

/* ---------- the rite: the curse drawn out as a wisp ---------- */

interface Rite {
  room: Room;
  stone: OfferingStone;
  g: THREE.Group;
  halo: THREE.Sprite;
  ring: THREE.Mesh;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  /** Where it's heading; whether that's inside the circle; seconds left lingering there. */ tx: number;
  tz: number;
  inside: boolean;
  linger: number;
  /** Seconds left; bolts still to strike it; until its next shot; how long it flickers after a bolt passes through. */ t: number;
  hits: number;
  shotCd: number;
  flash: number;
  /** Told that bolts pass through it outside the circle; fleeing back into its stone (seconds so far). */ warned: boolean;
  flee: number;
  fx: number;
  fz: number;
  struck: WeakSet<Bolt>;
}
let rite: Rite | null = null;

const inCircle = (r: Rite) => Math.hypot(r.x - r.room.cx, r.z - r.room.cz) < C.circle;

/** Where the wisp goes next: into the circle, or out to somewhere in the room away from the mage. */
function pickTarget(r: Rite) {
  const room = r.room;
  r.inside = !r.inside;
  r.linger = 0;
  if (r.inside) {
    const a = Math.random() * Math.PI * 2,
      d = Math.random() * C.circle * 0.6;
    r.tx = room.cx + Math.cos(a) * d;
    r.tz = room.cz + Math.sin(a) * d;
    return;
  }
  let best = -1;
  for (let i = 0; i < 8; i++) {
    const x = room.bounds.minX + 1 + Math.random() * (room.w - 2),
      z = room.bounds.minZ + 1 + Math.random() * (room.h - 2);
    if (Math.hypot(x - room.cx, z - room.cz) < C.circle + 0.8) continue;
    const score = Math.hypot(x - player.x, z - player.z) + Math.random() * 3;
    if (score > best) {
      best = score;
      r.tx = x;
      r.tz = z;
    }
  }
  if (best < 0) {
    r.tx = room.cx + C.circle + 1.5;
    r.tz = room.cz;
  }
}

/** Walk into a stone to begin (or be refused: too few obols). */
function begin(room: Room, s: OfferingStone) {
  const price = LOOT.shrine.price;
  if (player.coins < price) {
    toast(STR.toast.shrinePoor(price, player.coins), 3.2);
    Sfx.refuse();
    burst(s.x, 1.2, s.z, CURSE, 6, 1.2, 0.04);
    return;
  }
  const def = artifact(s.id),
    g = new THREE.Group();
  const core = new THREE.Mesh(sphereGeo(0.12), basicMat(0x2a0606));
  const halo = glow(CURSE, 1.3, 0.9),
    heart = glow(new THREE.Color(def.color).getHex(), 0.55, 0.9);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.018, 4, 18),
    new THREE.MeshBasicMaterial({ color: 0xd23a2a }),
  );
  g.add(core, halo, heart, ring);
  g.position.set(s.x, 1.2, s.z);
  scene.add(g);
  rite = {
    room,
    stone: s,
    g,
    halo,
    ring,
    x: s.x,
    z: s.z,
    y: 1.2,
    vx: 0,
    vz: 0,
    tx: s.x,
    tz: s.z,
    inside: false,
    linger: 0,
    t: C.time,
    hits: C.hits,
    shotCd: C.shotEvery[1],
    flash: 0,
    warned: false,
    flee: -1,
    fx: 0,
    fz: 0,
    struck: new WeakSet(),
  };
  s.visual.visible = false; // the curse has left its artifact
  pickTarget(rite);
  burst(s.x, 1.2, s.z, CURSE, 20, 2.4, 0.06);
  burst(s.x, 0.3, s.z, 0x3a0a0a, 10, 1.4, 0.07);
  Sfx.curseDrawn();
  G.fx.shake = Math.max(G.fx.shake, 0.2);
  banner(...STR.banner.riteBegins, 2.4);
  showBossBar(STR.curseOf(def.name), { hp: C.hits, maxHp: C.hits });
}

/** Walking into an offering stone draws its curse out (called every step while playing). */
export function checkShrine() {
  const room = G.room.current,
    sh = room.shrine;
  if (!sh || rite) return;
  for (const s of sh.stones) {
    const d = Math.hypot(player.x - s.x, player.z - s.z);
    if (d > player.r + STONE_R + 0.8) {
      s.armed = true;
      continue;
    }
    if (d > player.r + STONE_R + C.reach || !s.armed) continue;
    s.armed = false;
    begin(room, s);
    return;
  }
}

/** Put the wisp away: the stone shows its artifact again (if it's still there). */
function endRite() {
  const r = rite;
  if (!r) return;
  scene.remove(r.g);
  disposeTree(r.g);
  hideBossBar();
  r.stone.visual.visible = true;
  r.stone.armed = false;
  rite = null;
}
/** A new floor or run: no rite carries over. */
export function clearRite() {
  endRite();
}

function strike(r: Rite, n: number) {
  r.hits = Math.max(0, r.hits - n);
  updateBossBar({ hp: r.hits, maxHp: C.hits });
  burst(r.x, r.y, r.z, HOLY, 10, 2.2, 0.05);
  burst(r.x, r.y, r.z, CURSE, 6, 1.6, 0.05);
  Sfx.at(r.x, r.z).wispHit();
  if (r.hits > 0) return;
  // put down: the artifact is cleansed, the obols are paid and the stone crumbles
  const room = r.room,
    s = r.stone,
    def = artifact(s.id);
  burst(r.x, r.y, r.z, HOLY, 30, 3.2, 0.07);
  endRite();
  giveResources({ coins: -LOOT.shrine.price });
  cleanseArtifact(s.id);
  room.shrine!.stones = room.shrine!.stones.filter((x) => x !== s);
  removeStone(room, s, true);
  banner(...STR.banner.cleansed(def.name, def.curse!.cleansed), 3.2);
  Sfx.cleanse();
  renderMinimap();
}

/** A bolt reached the wisp: inside the circle it strikes (true, and the bolt is spent unless it pierces), outside
    it passes through. Each bolt counts once. */
export function strikeWisp(b: Bolt) {
  const r = rite;
  if (!r || r.flee >= 0 || r.struck.has(b) || Math.hypot(b.x - r.x, b.z - r.z) > C.wispR + b.r) return false;
  r.struck.add(b);
  if (!inCircle(r)) {
    r.flash = 0.25;
    if (!r.warned) {
      r.warned = true;
      toast(STR.toast.outsideCircle, 3);
    }
    return false;
  }
  strike(r, 1);
  return true;
}
/** A glyph's blast at (x, z): inside the circle it strikes the wisp twice. */
export function blastWisp(x: number, z: number, radius: number) {
  const r = rite;
  if (!r || r.flee >= 0 || Math.hypot(x - r.x, z - r.z) > radius + C.wispR) return;
  if (inCircle(r)) strike(r, 2);
  else r.flash = 0.25;
}

/** Time ran out: the wisp flees back into its stone. */
function escape(r: Rite) {
  r.flee = 0;
  r.fx = r.x;
  r.fz = r.z;
  hideBossBar();
  Sfx.curseEscaped();
  toast(STR.toast.curseEscaped(artifact(r.stone.id).name), 3.5);
}

/** The circle breathes (brighter during a rite, brightest while the curse is in it); the motes go out as time
    runs down; the wisp hunts for gaps and spits at the mage. `acting` is false while paused or in a pan. */
export function updateShrine(dt: number, now: number, acting: boolean) {
  const room = G.room.current,
    sh = room.shrine,
    r = rite;
  if (sh) {
    const inside = !!r && r.flee < 0 && inCircle(r);
    const target = !r ? 0.3 + Math.sin(now * 1.4) * 0.06 : inside ? 0.8 + Math.sin(now * 14) * 0.1 : 0.45;
    sh.mat.opacity += (target - sh.mat.opacity) * Math.min(1, dt * 6);
    const lit = r && r.flee < 0 ? Math.ceil((MOTES * r.t) / C.time) : MOTES;
    sh.motes.forEach((m, i) => {
      m.material.opacity = i >= lit ? 0.04 : r ? 0.9 : 0.3 + Math.sin(now * 2 + i) * 0.08;
    });
    for (const s of sh.stones) {
      s.visual.position.y = 1.2 + Math.sin(now * 2 + s.x) * 0.06;
      s.visual.rotation.y = now * 1.1;
    }
    if (acting && !r) syncStones(room); // curses taken or cleansed meanwhile (the dev menu)
  }
  if (!r) return;
  if (r.room !== room || G.flow.trans || player.dead) {
    // the mage left: the curse slips back at once
    if (r.flee < 0 && !player.dead) toast(STR.toast.curseEscaped(artifact(r.stone.id).name), 3.5);
    endRite();
    return;
  }
  // the look: a dark core in a crimson halo that turns pale gold while it can be struck, smaller with each hit
  const vulnerable = r.flee < 0 && inCircle(r);
  r.y = 1.1 + Math.sin(now * 5) * 0.1;
  r.g.position.set(r.x, r.y, r.z);
  r.g.scale.setScalar(0.6 + (0.4 * r.hits) / C.hits);
  r.ring.rotation.set(now * 3, now * 2, 0);
  r.halo.material.color.setHex(vulnerable && Math.sin(now * 30) > -0.3 ? 0xffd890 : CURSE);
  r.halo.material.opacity = r.flash > 0 ? 0.3 + Math.random() * 0.3 : 0.9;
  if (!acting) return;
  r.flash -= dt;
  if (Math.random() < dt * 18) burst(r.x, r.y, r.z, vulnerable ? 0xffd8a0 : 0x6a0a0a, 1, 0.4, 0.04);
  if (r.flee >= 0) {
    // streaking back into its stone
    r.flee += dt;
    const k = Math.min(1, r.flee / FLEE);
    r.x = r.fx + (r.stone.x - r.fx) * k;
    r.z = r.fz + (r.stone.z - r.fz) * k;
    if (k >= 1) {
      burst(r.stone.x, 1.2, r.stone.z, CURSE, 16, 2, 0.06);
      endRite();
    }
    return;
  }
  r.t -= dt;
  if (r.t <= 0) {
    escape(r);
    return;
  }
  // on to the next spot, lingering a while inside the circle; shy of the mage
  const wx = r.tx - r.x,
    wz = r.tz - r.z,
    d = Math.hypot(wx, wz);
  if (r.linger > 0) {
    r.linger -= dt;
    if (r.linger <= 0) pickTarget(r);
  } else if (d < 0.3) {
    if (r.inside) r.linger = between(C.linger);
    else pickTarget(r);
  }
  let ax: number, az: number;
  if (r.linger > 0) {
    ax = Math.cos(now * 2.3) * C.wispSpeed * 0.3;
    az = Math.sin(now * 2.3) * C.wispSpeed * 0.3;
  } // a lazy loop
  else {
    ax = d > 0.01 ? (wx / d) * C.wispSpeed : 0;
    az = d > 0.01 ? (wz / d) * C.wispSpeed : 0;
  }
  const mx = r.x - player.x,
    mz = r.z - player.z,
    md = Math.hypot(mx, mz);
  if (md < C.shy && md > 0.01) {
    const k = ((C.shy - md) / C.shy) * C.wispSpeed * 1.2;
    ax += (mx / md) * k;
    az += (mz / md) * k;
  }
  r.vx += (ax - r.vx) * Math.min(1, dt * 4);
  r.vz += (az - r.vz) * Math.min(1, dt * 4);
  const b = room.bounds;
  r.x = clamp(r.x + r.vx * dt, b.minX + 0.5, b.maxX - 0.5);
  r.z = clamp(r.z + r.vz * dt, b.minZ + 0.5, b.maxZ - 0.5);
  // and it fights back
  r.shotCd -= dt;
  if (r.shotCd <= 0) {
    r.shotCd = between(C.shotEvery);
    const dx = player.x - r.x,
      dz = player.z - r.z,
      l = Math.hypot(dx, dz) || 1;
    spawnShot(r.x, r.z, dx / l, dz / l, C.shotSpeed, CURSE, 0.8, 0.9);
    Sfx.at(r.x, r.z).wispShot();
  }
}

/** For tests and the dev hooks: the rite under way, if any. */
export function riteState() {
  const r = rite;
  return r ? { id: r.stone.id, x: r.x, z: r.z, hits: r.hits, t: r.t, inside: inCircle(r), fleeing: r.flee >= 0 } : null;
}

/** Dev menu: cleanse the oldest curse held at once, with no fight and no obols. */
export function cleanseAtOnce() {
  const id = heldCurses()[0];
  if (!id) return false;
  if (rite?.stone.id === id) endRite();
  cleanseArtifact(id);
  const def = artifact(id);
  banner(...STR.banner.cleansed(def.name, def.curse!.cleansed), 3.2);
  Sfx.cleanse();
  if (G.room.current.shrine) syncStones(G.room.current);
  renderMinimap();
  return true;
}
