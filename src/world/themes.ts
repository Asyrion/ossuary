/* Themed rooms in play (M3.6 step 3; the data is in themeData.ts and data/themes.json): the dressing a theme scatters
   over the floor, which never blocks, and the twists:
   - risingBones  the ossuary's bone piles and skull heaps rise as rotlings, one at a time, if the fight drags on;
   - pages        a scroll heap in the scriptorium sometimes hides a torn grimoire page;
   - sleepers     the pilgrims' rest's foes sleep until hurt, or until the mage comes close;
   - caveIn       a glyph's blast in the collapsed crypt brings more of the ceiling down: stones fall round it a moment
                  later (their shadows show where), hurting what they land on and leaving rubble. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Enemy, Room } from '../types';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, blob, glow, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { makeEnemy } from '../actors/enemies';
import { dropPage } from '../magic/pages';
import { toast } from '../ui/hud';
import { mulberry } from '../util';
import { FLOORS } from './generate';
import { addProp, removeProp } from './props';
import type { ScatterKind } from './themeData';

const C = CFG.themes;

/* ---------- scatter ---------- */

const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
const std = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => markShared(new THREE.MeshStandardMaterial({ color, roughness: .9, ...o }));
const MAT = {
  wax: std(0xe8dcc0, { emissive: 0x2a2010 }), flame: markShared(new THREE.MeshBasicMaterial({ color: 0xffc36a })), paper: std(0xd8cbaa, { side: THREE.DoubleSide }),
  blanket: std(0x5a3e34, { roughness: 1 }), blanket2: std(0x3e4a5a, { roughness: 1 }), ash: std(0x2a2622, { roughness: 1 }), stone: M.rock,
};
const GEO = {
  candle: shared(new THREE.CylinderGeometry(.035, .04, .16, 6)), flame: shared(new THREE.ConeGeometry(.025, .07, 5)),
  page: shared(new THREE.PlaneGeometry(.22, .28).rotateX(-Math.PI / 2)), bone: shared(new THREE.CylinderGeometry(.025, .025, .3, 5)),
  roll: shared(new THREE.CylinderGeometry(.13, .13, .7, 10)), blanket: shared(new THREE.BoxGeometry(.7, .04, 1.1)),
  pebble: shared(new THREE.DodecahedronGeometry(.07, 0)), ash: shared(new THREE.CircleGeometry(.3, 12).rotateX(-Math.PI / 2)),
  patch: shared(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), shaft: shared(new THREE.CylinderGeometry(.5, .75, 4, 12, 1, true)),
};
let patchTex: THREE.CanvasTexture | null = null;
/** A soft round blotch, for moss and stains. */
function blotch() {
  if (patchTex) return patchTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
  for (let i = 0; i < 9; i++) {
    const x = 16 + Math.random() * 32, y = 16 + Math.random() * 32, r = 8 + Math.random() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  }
  patchTex = new THREE.CanvasTexture(c); return patchTex;
}
const patchMats = new Map<string, THREE.Material>();
const patchMat = (color: number, glowing = false, opacity = .8) => {
  const key = color + (glowing ? 'g' : '') + opacity; let m = patchMats.get(key);
  if (!m) {
    m = markShared(glowing ? new THREE.MeshBasicMaterial({ color, alphaMap: blotch(), transparent: true, depthWrite: false, opacity, blending: THREE.AdditiveBlending })
      : new THREE.MeshStandardMaterial({ color, alphaMap: blotch(), transparent: true, depthWrite: false, roughness: 1, opacity }));
    patchMats.set(key, m);
  }
  return m;
};
let shaftMat: THREE.Material | null = null;

type Dress = (R: () => number) => THREE.Object3D;
const DRESS: Record<ScatterKind, Dress> = {
  candles(R) {
    const g = new THREE.Group();
    for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++) {
      const h = .6 + R() * .8, x = (R() - .5) * .3, z = (R() - .5) * .3;
      const c = new THREE.Mesh(GEO.candle, MAT.wax); c.scale.y = h; c.position.set(x, .08 * h, z);
      const f = new THREE.Mesh(GEO.flame, MAT.flame); f.position.set(x, .16 * h + .03, z); g.add(c, f);
    }
    const gl = glow(0xffc36a, .7, .5); gl.position.y = .2; g.add(gl); return g;
  },
  pages(R) {
    const g = new THREE.Group();
    for (let i = 0, n = 2 + Math.floor(R() * 3); i < n; i++) { const p = new THREE.Mesh(GEO.page, MAT.paper); p.position.set((R() - .5) * .5, .006 + i * .002, (R() - .5) * .5); p.rotation.y = R() * 6; g.add(p); }
    return g;
  },
  bones(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 2; i++) { const b = new THREE.Mesh(GEO.bone, M.bone); b.rotation.set(0, R() * 6, Math.PI / 2); b.position.set((R() - .5) * .4, .03, (R() - .5) * .4); g.add(b); }
    return g;
  },
  bedrolls(R) {
    const g = new THREE.Group(), m = R() < .5 ? MAT.blanket : MAT.blanket2;
    const b = new THREE.Mesh(GEO.blanket, m); b.position.y = .02; const r = new THREE.Mesh(GEO.roll, m); r.rotation.z = Math.PI / 2; r.position.set(0, .12, -.5);
    g.add(b, r); g.rotation.y = R() * 6; return g;
  },
  embers(R) { // a cold fire: a ring of stones round the ash, a last glow in it
    const g = new THREE.Group(), ash = new THREE.Mesh(GEO.ash, MAT.ash); ash.position.y = .005; g.add(ash);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, s = new THREE.Mesh(GEO.pebble, MAT.stone); s.scale.setScalar(1.3 + R() * .5); s.position.set(Math.cos(a) * .36, .05, Math.sin(a) * .36); g.add(s); }
    const gl = glow(0xff6a2a, .6, .35); gl.position.y = .08; g.add(gl); return g;
  },
  moss(R) { const m = new THREE.Mesh(GEO.patch, patchMat(0x1e2c16, false, .7)); m.scale.setScalar(.6 + R() * .6); m.position.y = .004; m.rotation.y = R() * 6; return m; },
  glowmoss(R) {
    const g = new THREE.Group(), m = new THREE.Mesh(GEO.patch, patchMat(0x2a8a6a, true, .35)); m.scale.setScalar(.5 + R() * .5); m.position.y = .005; g.add(m);
    const gl = glow(0x5fe8b0, .9, .35); gl.position.y = .1; g.add(gl); return g;
  },
  pebbles(R) {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(GEO.pebble, MAT.stone); p.scale.setScalar(.6 + R()); p.position.set((R() - .5) * .7, .03, (R() - .5) * .7); p.rotation.set(R() * 3, R() * 3, 0); g.add(p); }
    return g;
  },
  daylight() { // a shaft of daylight down through the broken ceiling, and the pale disc it makes on the floor
    shaftMat ??= markShared(new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: .09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const g = new THREE.Group(), s = new THREE.Mesh(GEO.shaft, shaftMat); s.position.y = 2; g.add(s);
    const disc = new THREE.Mesh(GEO.patch, patchMat(0xfff0c0, true, .16)); disc.scale.setScalar(1.6); disc.position.y = .006; g.add(disc);
    return g;
  },
  stains(R) { const m = new THREE.Mesh(GEO.patch, patchMat(0x3a2e0c, false, .7)); m.scale.setScalar(.7 + R() * .7); m.position.y = .004; m.rotation.y = R() * 6; return m; },
};

/** Scatter a themed room's dressing over its free floor (seeded, so a room looks the same every time). */
export function dressTheme(room: Room) {
  const theme = room.theme; if (!theme) return;
  const R = mulberry(room.plan.seed ^ 0x7e3e), t = room.template, free: { c: number; r: number }[] = [];
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) if (t.tiles[r][c] === 'floor' && !room.template.foes.some(f => f.c === c && f.r === r)) free.push({ c, r });
  const scale = Math.max(1, (t.w * t.h) / (13 * 7) * .7); // larger rooms get more of it
  for (const [kind, n] of Object.entries(theme.scatter) as [ScatterKind, number][]) {
    const count = kind === 'daylight' ? n : Math.round(n * scale);
    for (let i = 0; i < count && free.length; i++) {
      // daylight falls near the middle; the rest anywhere
      const pick = kind === 'daylight' ? free.sort((a, b) => Math.hypot(a.c - t.w / 2, a.r - t.h / 2) - Math.hypot(b.c - t.w / 2, b.r - t.h / 2))[Math.floor(R() * Math.min(6, free.length))] : free[Math.floor(R() * free.length)];
      free.splice(free.indexOf(pick), 1);
      const o = DRESS[kind](R); o.position.x += room.bounds.minX + pick.c + .5 + (R() - .5) * .3 - room.cx; o.position.z += room.bounds.minZ + pick.r + .5 + (R() - .5) * .3 - room.cz;
      room.group.add(o);
    }
  }
}

/* ---------- twists ---------- */

/** Entering a themed room: its name the first time, and the pilgrims' rest's foes asleep. */
export function enterTheme(room: Room, firstVisit: boolean, spawned: Enemy[]) {
  const theme = room.theme; if (!theme) return;
  if (firstVisit) toast(STR.themeEntered(theme.name), 2.5);
  if (theme.twist === 'sleepers') for (const e of spawned) if (!e.isBoss) { e.asleep = true; e.spawn = 0; }
  riseT = C.riseAfter; risen = 0;
}

let riseT = 0, risen = 0, zzT = 0;
export function updateThemes(dt: number) {
  const room = G.current, twist = room.theme?.twist;
  // sleepers wake when the mage comes close (a hit wakes them in damageEnemy)
  if ((zzT -= dt) <= 0) zzT = .7;
  for (const e of G.enemies) {
    if (!e.asleep) continue;
    if (Math.hypot(player.x - e.x, player.z - e.z) < C.wakeReach) { e.asleep = false; burst(e.x, .8, e.z, 0xd8e0ff, 6, 1.4, .04); Sfx.at(e.x, e.z).wake(); }
    else if (zzT === .7) burst(e.x + .15, 1, e.z, 0xd8e0ff, 1, .3, .05); // a breath of sleep
  }
  // the ossuary's dead don't all stay down
  if (twist === 'risingBones' && room.locked && G.enemies.some(e => !e.dead) && risen < C.riseMost && (riseT -= dt) <= 0) {
    riseT = C.riseEvery;
    const piles = (room.props ?? []).filter(b => b.prop.kind === 'bones' || b.prop.kind === 'skulls');
    const pile = piles[Math.floor(Math.random() * piles.length)];
    if (pile) {
      removeProp(room, pile);
      burst(pile.x, .3, pile.z, 0xd8ccb2, 14, 2, .05); Sfx.at(pile.x, pile.z).bones();
      makeEnemy('rotling', pile.x, pile.z, FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp);
      risen++;
    }
  }
}

/** A scroll heap broke: in the scriptorium, now and then a torn grimoire page was in it. */
export function scrollsBroken(room: Room, x: number, z: number) {
  if (room.theme?.twist === 'pages' && Math.random() < C.pageChance) dropPage(room, x, z);
}

/** A glyph's blast at (x, z): in the collapsed crypt, stones fall round it a moment later. */
export function caveIn(room: Room, x: number, z: number) {
  if (room.theme?.twist !== 'caveIn') return;
  const t = room.template, spots: { x: number; z: number; c: number; r: number }[] = [];
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) {
    const px = room.bounds.minX + c + .5, pz = room.bounds.minZ + r + .5, d = Math.hypot(px - x, pz - z);
    if (t.tiles[r][c] === 'floor' && d > 1 && d < C.caveReach) spots.push({ x: px, z: pz, c, r });
  }
  for (let i = 0; i < C.caveStones && spots.length; i++) {
    const s = spots.splice(Math.floor(Math.random() * spots.length), 1)[0];
    const shadow = blob(.2); shadow.position.set(s.x - room.cx, .013, s.z - room.cz); room.group.add(shadow);
    let grow = 0; const tick = () => { grow += .05; shadow.scale.setScalar(.2 + grow * 1.2); if (grow < 1) after(.05 * C.caveDelay, tick); };
    tick();
    after(C.caveDelay + i * .15, () => {
      room.group.remove(shadow);
      if (G.current !== room) return;
      burst(s.x, .8, s.z, 0x6b625a, 16, 2.8, .09); burst(s.x, .2, s.z, 0x8a8278, 10, 1.2, .08); Sfx.at(s.x, s.z).rubble(); G.shake = Math.max(G.shake, .18);
      for (const e of G.enemies) if (!e.dead && !e.hidden && e.spawn <= 0 && Math.hypot(e.x - s.x, e.z - s.z) < .8 + e.r) damageEnemy(e, C.caveDamage, 0, 0, 0, 'spell');
      if (Math.hypot(player.x - s.x, player.z - s.z) < .7) hurtPlayer(1, s.x, s.z);
      else if (room.template.tiles[s.r][s.c] === 'floor' && !G.enemies.some(e => !e.dead && Math.hypot(e.x - s.x, e.z - s.z) < .7)) addProp(room, 'rubble', s.c, s.r);
    });
  }
}
