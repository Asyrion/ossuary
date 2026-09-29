/* Mechanisms (M3.6 step 4, docs/M3.6-plan.md decision 7): objects in rooms that answer to the mage's magic with
   more than breaking or burning. They are objects like the others (propData.ts, props.ts); this is what they do.
   - Brazier: fire lights it (anything that calls fireAt: Burn, the lance, the seal, a glyph, a burning bolt); a bolt
     of the mage's flying through a lit brazier's flame catches fire (Burn on what it strikes).
   - Candle stand: fire lights it. With every stand in a room lit, a reliquary there opens, a dark room's dark lifts,
     and in a chapel nave the mage's next casts are blessed (harder, in gold). A blast knocks one over.
   - Bell: a bolt or a blast rings it, and every foe in the room reels (stunned) for a moment; then it must settle.
   - Rune stone: the first status that reaches it (a bolt carrying one, a spell's fire, frost or shock landing near)
     charges it with that school; charged, it pulses the status on foes round it while the fight lasts.
   - Lodestone: shock reaching it leaps to every other lodestone near enough, hurting and shocking what stands
     between (the mage too).
   - Hanging censer: a bolt through its chain brings it down on what is under it, spilling burning oil.
   - Reliquary: sealed until the room's candle stands are all lit; then it opens.
   - Dead tree: burns (like roots, longer).
   Placeholder shapes until they come from Tripo. Geometries and materials are shared; a rune stone's glyph has its own. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Bolt, PropBox, Room } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, blob, glow, markShared } from '../render/materials';
import { setDarkness } from '../render/lights';
import { burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { inflict } from '../magic/statusFx';
import { newStatus } from '../magic/status';
import { lightning, riseMote } from '../magic/shapes';
import type { StatusKind } from '../magic/spellData';
import { rollTable } from '../items/loot';
import { spawnPickup } from '../items/pickups';
import { toast } from '../ui/hud';
import { freeSpotNear } from './rooms';
import { addPool, fireAt } from './pools';
import { removeProp } from './props';
import type { MechanismKind } from './propData';

const C = CFG.mech;
const FIRE = 0xff7a2a, EMBER = 0xffc060, GOLD = 0xffd98a;
const CHAIN = 7.5; // a censer's chain runs up out of sight, into the dark under the vault
export const SCHOOL_COLOR: Record<StatusKind, number> = { burn: 0xff7a2a, chill: 0x4aa8ff, shock: 0xf0e070 };

/* ---------- looks ---------- */

const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
const std = (color: number, o: THREE.MeshStandardMaterialParameters = {}) => markShared(new THREE.MeshStandardMaterial({ color, roughness: .8, ...o }));
const MAT = {
  bronze: std(0x8a6a3a, { roughness: .45, metalness: .7, emissive: 0x1a1006 }), wood: std(0x4a3222, { roughness: .95 }),
  coals: std(0x2a2622, { roughness: 1 }), ember: std(0x5a1a08, { emissive: 0x8a2a06, roughness: 1 }), lode: std(0x34323c, { roughness: .5, metalness: .6 }), wax: std(0xe8dcc0, { emissive: 0x2a2010 }), stone: std(0x6a6660, { roughness: .95 }),
  iron: M.iron, copper: std(0xa0603a, { roughness: .4, metalness: .8 }), gilt: std(0xb89048, { roughness: .55, metalness: .6, emissive: 0x140e04 }),
  bark: std(0x5a5048, { roughness: 1 }), ice: markShared(new THREE.MeshStandardMaterial({ color: 0xcfeeff, transparent: true, opacity: .55, roughness: .15, metalness: .1, emissive: 0x1a3a4a })),
  flame: markShared(new THREE.MeshBasicMaterial({ color: 0xffb04a })), seal: markShared(new THREE.MeshBasicMaterial({ color: GOLD })),
};
const GEO = {
  leg: shared(new THREE.CylinderGeometry(.025, .03, .6, 5)), bowl: shared(new THREE.CylinderGeometry(.32, .16, .2, 10, 1, true)), coals: shared(new THREE.SphereGeometry(.26, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2)),
  rim: shared(new THREE.TorusGeometry(.32, .03, 4, 16)), ember: shared(new THREE.SphereGeometry(.04, 5, 3)),
  flame: shared(new THREE.ConeGeometry(.2, .5, 7)), small: shared(new THREE.ConeGeometry(.03, .08, 5)), candle: shared(new THREE.CylinderGeometry(.04, .045, .2, 6)),
  pole: shared(new THREE.CylinderGeometry(.03, .04, 1.1, 6)), dish: shared(new THREE.CylinderGeometry(.22, .18, .04, 10)), foot: shared(new THREE.CylinderGeometry(.2, .24, .06, 10)),
  post: shared(new THREE.BoxGeometry(.12, 1.7, .12)), beam: shared(new THREE.BoxGeometry(1.1, .12, .14)),
  bell: shared(new THREE.LatheGeometry([[0, .62], [.12, .6], [.2, .5], [.23, .25], [.3, .08], [.36, 0], [.33, 0], [0, .02]].map(([x, y]) => new THREE.Vector2(x, y)), 14)),
  stone: shared(new THREE.CylinderGeometry(.26, .36, 1.15, 5)), stroke: shared(new THREE.PlaneGeometry(.045, 1)),
  lode: shared(new THREE.CylinderGeometry(.12, .27, 1.3, 6)), lodeTip: shared(new THREE.ConeGeometry(.12, .3, 6)), band: shared(new THREE.TorusGeometry(1, .12, 4, 6)),
  chain: shared(new THREE.CylinderGeometry(.012, .012, CHAIN, 4)), censer: shared(new THREE.SphereGeometry(.15, 10, 8)), cap: shared(new THREE.ConeGeometry(.14, .14, 8)),
  plinth: shared(new THREE.BoxGeometry(.8, .55, .6)), box: shared(new THREE.BoxGeometry(.64, .36, .44)), lid: shared(new THREE.BoxGeometry(.7, .08, .5)), seal: shared(new THREE.TorusGeometry(.14, .02, 5, 16)),
  trunk: shared(new THREE.CylinderGeometry(.1, .2, 1.6, 7)), ice: shared(new THREE.IcosahedronGeometry(.55, 0)),
};
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
/** Remember the parts of a look that move or light up (props.ts copies them onto the object). */
const withParts = (g: THREE.Group, parts: Record<string, THREE.Object3D>) => { g.userData.parts = parts; return g; };

type Look = (R: () => number, len: number) => THREE.Group;
export const MECH_LOOKS: Record<MechanismKind, Look> = {
  brazier() { // an iron bowl of coals on three legs; its fire shows once lit
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = mesh(GEO.leg, MAT.iron, Math.cos(a) * .18, .3, Math.sin(a) * .18); l.rotation.set(Math.sin(a) * .25, 0, -Math.cos(a) * .25); g.add(l); }
    const bowl = mesh(GEO.bowl, MAT.iron, 0, .66, 0), coals = mesh(GEO.coals, MAT.coals, 0, .68, 0); coals.scale.y = .45;
    const rim = mesh(GEO.rim, MAT.iron, 0, .76, 0); rim.rotation.x = Math.PI / 2;
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + .4, r = .06 + (i % 2) * .1; g.add(mesh(GEO.ember, MAT.ember, Math.cos(a) * r, .77, Math.sin(a) * r)); } // cold embers in the ash
    const flame = mesh(GEO.flame, MAT.flame, 0, .98, 0), gl = glow(FIRE, 1.6, .8); gl.position.y = 1;
    flame.visible = gl.visible = false; g.add(bowl, coals, rim, flame, gl, blob(.9));
    return withParts(g, { flame, glow: gl });
  },
  candles(R) { // an iron stand with a dish of candles; lit one by one by fire
    const g = new THREE.Group(), flames = new THREE.Group();
    g.add(mesh(GEO.foot, MAT.iron, 0, .03, 0), mesh(GEO.pole, MAT.iron, 0, .6, 0), mesh(GEO.dish, MAT.iron, 0, 1.15, 0));
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + R(), x = Math.cos(a) * .12, z = Math.sin(a) * .12, h = .7 + R() * .5;
      const c = mesh(GEO.candle, MAT.wax, x, 1.17 + .1 * h, z); c.scale.y = h; g.add(c);
      flames.add(mesh(GEO.small, MAT.flame, x, 1.2 + .2 * h + .04, z));
    }
    const gl = glow(0xffc36a, 1, .7); gl.position.y = 1.4; flames.add(gl);
    flames.visible = false; g.add(flames, blob(.6));
    return withParts(g, { flames });
  },
  bell() { // a bronze bell hanging from a wooden frame
    const g = new THREE.Group(), swing = new THREE.Group(); swing.position.y = 1.6;
    g.add(mesh(GEO.post, MAT.wood, -.48, .85, 0), mesh(GEO.post, MAT.wood, .48, .85, 0), mesh(GEO.beam, MAT.wood, 0, 1.68, 0));
    const bell = mesh(GEO.bell, MAT.bronze, 0, -.7, 0); swing.add(bell); g.add(swing, blob(1.1));
    return withParts(g, { swing });
  },
  rune() { // a standing stone with a rune cut into its face, dull until a school charges it
    const g = new THREE.Group(), s = mesh(GEO.stone, MAT.stone, 0, .575, 0); s.rotation.y = .3;
    const rune = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: .8 }); // its own material: a charge colours it
    for (const [x, y, len, a] of [[0, 0, .42, 0], [-.06, .12, .18, .7], [.06, .12, .18, -.7], [0, -.1, .14, 1.57]]) { const s = mesh(GEO.stroke, mat, x, y, 0); s.scale.y = len; s.rotation.z = a; rune.add(s); }
    rune.position.set(0, .72, .31); rune.rotation.x = -.14; // on the stone's leaning face
    const gl = glow(0xffffff, 1, .55); gl.position.set(0, .75, .35); gl.visible = false;
    g.add(s, rune, gl, blob(.9));
    return withParts(g, { rune, glow: gl });
  },
  lodestone() { // a pillar of dark iron-stone bound in copper; a spark gathers at its top when it leaps
    const g = new THREE.Group();
    const body = new THREE.Group(); body.rotation.set(.06, .4, -.05); // a rough-hewn shard, leaning a little
    body.add(mesh(GEO.lode, MAT.lode, 0, .65, 0), mesh(GEO.lodeTip, MAT.lode, 0, 1.45, 0));
    for (const y of [.3, .85]) { const b = mesh(GEO.band, MAT.copper, 0, y, 0); b.rotation.set(Math.PI / 2, 0, Math.PI / 6); b.scale.setScalar(.27 - .15 * y / 1.3 + .01); body.add(b); } // copper bands, hexagonal like the shard
    const tip = glow(0xf0e890, .8, .6); tip.position.y = 1.62; g.add(body, tip, blob(.8));
    return withParts(g, { tip });
  },
  censer() { // a censer swinging on a long chain from the dark above, its smoke glowing faintly
    const g = new THREE.Group(), swing = new THREE.Group(); swing.position.y = 1.5 + CHAIN;
    swing.add(mesh(GEO.chain, MAT.iron, 0, -CHAIN / 2, 0));
    const pot = new THREE.Group(); pot.position.y = -CHAIN;
    pot.add(mesh(GEO.censer, MAT.bronze), mesh(GEO.cap, MAT.bronze, 0, .15, 0));
    const gl = glow(0xffb060, .7, .5); pot.add(gl); swing.add(pot);
    const shadow = blob(.7); g.add(swing, shadow);
    return withParts(g, { swing, pot });
  },
  reliquary() { // a gilded reliquary on a plinth, bound by a seal of candle-light
    const g = new THREE.Group();
    g.add(mesh(GEO.plinth, MAT.stone, 0, .275, 0), mesh(GEO.box, MAT.gilt, 0, .73, 0), mesh(GEO.lid, MAT.gilt, 0, .95, 0));
    const seal = mesh(GEO.seal, MAT.seal, 0, .75, .23); const gl = glow(GOLD, .9, .6); gl.position.set(0, .75, .3);
    g.add(seal, gl, blob(1.1));
    return withParts(g, { seal });
  },
  tree(R) { // a dead tree, grown down here in the dark and died of it
    const g = new THREE.Group(); g.add(mesh(GEO.trunk, MAT.bark, 0, .8, 0));
    for (let i = 0; i < 4; i++) {
      const a = R() * Math.PI * 2, h = .9 + R() * .6, len = .5 + R() * .5;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, h, 0), new THREE.Vector3(Math.cos(a) * len * .6, h + .3, Math.sin(a) * len * .6), new THREE.Vector3(Math.cos(a) * len, h + .45 + R() * .3, Math.sin(a) * len)]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, .065, 5, false), MAT.bark));
    }
    g.add(blob(1.2)); return g;
  },
};

/* ---------- what reaches them ---------- */

const near = (box: PropBox, x: number, z: number, r: number) => Math.hypot(box.x - x, box.z - z) < r;
const mechs = (room: Room, kind: MechanismKind) => (room.props ?? []).filter(b => b.prop.kind === kind);

/** A status reaches (x, z) and `r` round it (fire, frost or shock landing, a status put on a foe standing there):
    braziers and candle stands catch fire, rune stones take a charge, lodestones leap, the ice round a frozen foe melts. */
export function elementAt(kind: StatusKind, x: number, z: number, r = 0) {
  const room = G.current;
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (kind === 'burn' && (p.kind === 'brazier' || p.kind === 'candles') && !p.lit && near(box, x, z, C.kindle + r)) light(room, box);
    else if (p.kind === 'rune' && !p.school && near(box, x, z, C.runeCatch + r)) charge(box, kind);
    else if (kind === 'shock' && p.kind === 'lodestone' && near(box, x, z, C.lodeCatch + r)) leap(room, box);
  }
  if (kind === 'burn') for (const e of G.enemies) if (e.entombed && e.asleep && Math.hypot(e.x - x, e.z - z) < C.thawReach + r) e.asleep = false; // thawed
}

/** A bolt or a blast struck a mechanism. Returns whether it was one (so it neither breaks nor clunks). */
export function strikeMechanism(room: Room, box: PropBox, blast: boolean, status?: Partial<Record<StatusKind, number>>) {
  const p = box.prop;
  switch (p.kind) {
    case 'bell': ring(room, box); return true;
    case 'rune': { const k = (Object.keys(status ?? {}) as StatusKind[])[0]; if (k && !p.school) charge(box, k); else burst(box.x, .7, box.z, 0x8a8078, 3, 1.2, .04); return true; }
    case 'lodestone': if (status?.shock) leap(room, box); else burst(box.x, .7, box.z, 0x8a8078, 3, 1.2, .04); return true;
    case 'candles':
      if (blast) { removeProp(room, box); burst(box.x, .8, box.z, MAT.wax.color.getHex(), 10, 2, .05); fireAt(box.x, box.z, .6); checkCandles(room); } // knocked over, burning wax
      return true;
    case 'reliquary': burst(box.x, .5, box.z, GOLD, 5, 1.4, .035); Sfx.at(box.x, box.z).wardTink(); return true; // the seal holds
    case 'brazier': case 'censer': case 'tree': return true;
  }
  return false;
}

/** A bolt of the mage's on its way: through a lit brazier's flame it catches fire; a burning bolt lights an unlit one;
    through a censer's chain it brings the censer down. */
export function boltThrough(b: Bolt) {
  const room = G.current;
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (p.kind === 'brazier' && Math.hypot(b.x - box.x, b.z - box.z) < C.brazierCatch) {
      if (p.lit && !b.status?.burn) { b.status = { ...b.status, burn: C.brazierBurn }; burst(b.x, .7, b.z, FIRE, 6, 1.6, .045); Sfx.at(b.x, b.z).catchFire(); }
      else if (!p.lit && b.status?.burn) light(room, box);
    } else if (p.kind === 'censer' && Math.hypot(b.x - box.x, b.z - box.z) < C.censerCatch) dropCenser(room, box);
  }
  if (b.status?.burn && Math.random() < .25) riseMote(b.x, b.y, b.z, EMBER, .35); // a burning bolt trails embers
}

/* ---------- what they do ---------- */

function light(room: Room, box: PropBox) {
  const p = box.prop; p.lit = true;
  if (p.parts?.flame) p.parts.flame.visible = true;
  if (p.parts?.glow) p.parts.glow.visible = true;
  if (p.parts?.flames) p.parts.flames.visible = true;
  burst(box.x, 1, box.z, FIRE, 6, 1.6, .05); Sfx.at(box.x, box.z).catchFire();
  if (p.kind === 'candles') checkCandles(room);
}

/** Every candle stand in the room lit: reliquaries open, the dark lifts, and a chapel blesses the mage's casts. */
function checkCandles(room: Room) {
  const stands = mechs(room, 'candles');
  if (room.candlesLit || !stands.length || stands.some(b => !b.prop.lit)) return;
  room.candlesLit = true;
  Sfx.candlesLit();
  for (const box of mechs(room, 'reliquary')) openReliquary(room, box);
  if (room.plan.variant === 'dark') { setDarkness(0); toast(STR.mech.darkLifted, 2.5); }
  if (room.theme?.twist === 'blessing') { player.blessed = C.blessCasts; toast(STR.mech.blessed(C.blessCasts), 3); burst(player.x, 1, player.z, GOLD, 16, 2, .05); }
}

function openReliquary(room: Room, box: PropBox) {
  removeProp(room, box);
  burst(box.x, .6, box.z, GOLD, 24, 2.6, .06); Sfx.at(box.x, box.z).unbind(); toast(STR.mech.reliquary, 2.5);
  rollTable(G.run.drops, 'chest').forEach((item, i, all) => {
    const a = Math.PI / 2 + (i - (all.length - 1) / 2) * .75, s = freeSpotNear(room, box.x + Math.cos(a) * .9, box.z + Math.sin(a) * .9);
    spawnPickup(item, s.x, s.z);
  });
}

/** The bell rings: every foe in the room reels (bosses shrug it off), and it must settle before it rings again. */
function ring(room: Room, box: PropBox) {
  const p = box.prop;
  if ((p.cd ?? 0) > 0) { Sfx.at(box.x, box.z).wardTink(); return; }
  p.cd = C.bellCooldown; p.t = 0;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || e.isBoss) continue;
    e.status ??= newStatus(); e.status.stun = Math.max(e.status.stun, C.bellStun);
    burst(e.x, 1, e.z, GOLD, 4, 1.2, .04);
  }
  wave(room, box.x, box.z, GOLD, 9); Sfx.at(box.x, box.z).toll(); G.shake = Math.max(G.shake, .12);
}

/** A rune stone takes the school that reached it, and glows in its colour (`quiet`: as the room is built). */
function charge(box: PropBox, school: StatusKind, quiet = false) {
  const p = box.prop; p.school = school; p.t = 0;
  const color = SCHOOL_COLOR[school], stroke = p.parts?.rune?.children[0] as THREE.Mesh | undefined, gl = p.parts?.glow as THREE.Sprite | undefined;
  if (stroke) { const m = stroke.material as THREE.MeshStandardMaterial; m.emissive.setHex(color); m.color.setHex(color); } // (its strokes share it)
  if (gl) { gl.material.color.setHex(color); gl.visible = true; }
  if (!quiet) { burst(box.x, .8, box.z, color, 10, 1.8, .05); Sfx.at(box.x, box.z).runeCharge(); }
}
/** Every rune stone of a room already charged with `school` (the frozen mausoleum's stones hold frost). */
export function chargeRunes(room: Room, school: StatusKind) { for (const box of mechs(room, 'rune')) if (!box.prop.school) charge(box, school, true); }

/** Shock leaps from a lodestone to every other lodestone near enough, hurting and shocking what stands between. */
function leap(room: Room, box: PropBox) {
  const p = box.prop; if ((p.cd ?? 0) > 0) return;
  p.cd = C.lodeCooldown;
  const others = mechs(room, 'lodestone').filter(o => o !== box && Math.hypot(o.x - box.x, o.z - box.z) < C.lodeReach);
  if (!others.length) { burst(box.x, 1.3, box.z, SCHOOL_COLOR.shock, 6, 1.6, .04); return; }
  Sfx.at(box.x, box.z).arc(others.length);
  for (const o of others) {
    o.prop.cd = Math.max(o.prop.cd ?? 0, C.lodeCooldown); // no leaping straight back
    lightning({ x: box.x, y: 1.3, z: box.z }, { x: o.x, y: 1.3, z: o.z }, SCHOOL_COLOR.shock, .9);
    const dx = o.x - box.x, dz = o.z - box.z, len2 = dx * dx + dz * dz || 1;
    const dist = (x: number, z: number) => { const k = Math.max(0, Math.min(1, ((x - box.x) * dx + (z - box.z) * dz) / len2)); return Math.hypot(box.x + dx * k - x, box.z + dz * k - z); };
    for (const e of G.enemies) {
      if (e.dead || e.spawn > 0 || e.hidden || dist(e.x, e.z) > C.lodeWidth + e.r) continue;
      damageEnemy(e, C.lodeDamage, 0, 0, .3, 'spell'); inflict(e, { shock: 1 });
    }
    if (dist(player.x, player.z) < C.lodeWidth) hurtPlayer(1, player.x - dz * .01, player.z + dx * .01);
  }
}

/** A censer's chain cut: it falls, strikes what is under it, and its oil spills burning. */
function dropCenser(room: Room, box: PropBox) {
  const { x, z } = box, at = box.prop.tiles[0];
  removeProp(room, box);
  const pot = new THREE.Group(); pot.add(mesh(GEO.censer, MAT.bronze), mesh(GEO.cap, MAT.bronze, 0, .15, 0)); pot.position.set(x - room.cx, 1.5, z - room.cz); room.group.add(pot);
  Sfx.at(x, z).chainSnap();
  falling.push({ room, pot, x, z, at, t: 0 });
}
const falling: { room: Room; pot: THREE.Group; x: number; z: number; at: { c: number; r: number }; t: number }[] = [];
function censerLands(f: (typeof falling)[number]) {
  const { room, x, z } = f;
  room.group.remove(f.pot);
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || e.flying || Math.hypot(e.x - x, e.z - z) > C.censerReach + e.r) continue;
    damageEnemy(e, C.censerDamage, 0, 0, .5, 'spell'); inflict(e, { burn: C.censerBurn });
  }
  if (Math.hypot(player.x - x, player.z - z) < C.censerHitsMage) hurtPlayer(1, x, z);
  // the oil: its tile and a few free ones round it, alight at once
  const t = room.template.tiles, tiles = [f.at], seen = new Set([f.at.c + ',' + f.at.r]);
  for (let i = 0; i < tiles.length && tiles.length <= C.censerSpill; i++) for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const c = tiles[i].c + dc, r = tiles[i].r + dr, k = c + ',' + r;
    if (!seen.has(k) && tiles.length <= C.censerSpill && t[r]?.[c] === 'floor' && !room.poolGrid?.[r]?.[c]) { seen.add(k); tiles.push({ c, r }); }
  }
  if (t[f.at.r][f.at.c] === 'floor' || t[f.at.r][f.at.c] === 'censer') { t[f.at.r][f.at.c] = 'floor'; addPool(room, 'oil', tiles); }
  burst(x, .3, z, FIRE, 16, 2.6, .07); burst(x, .2, z, 0x8a6a3a, 8, 2, .05); Sfx.at(x, z).clang(); G.shake = Math.max(G.shake, .15);
  fireAt(x, z, .8);
}

/* ---------- rings of light ---------- */

const waves: { room: Room; ring: THREE.Mesh; t: number; to: number }[] = [];
let waveGeo: THREE.RingGeometry | null = null;
function wave(room: Room, x: number, z: number, color: number, to: number) {
  waveGeo ??= shared(new THREE.RingGeometry(.9, 1, 40).rotateX(-Math.PI / 2));
  const ring = new THREE.Mesh(waveGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.set(x - room.cx, .08, z - room.cz); room.group.add(ring); waves.push({ room, ring, t: 0, to });
}

/* ---------- every step ---------- */

export function updateMechanisms(dt: number) {
  const room = G.current, fighting = room.locked && G.enemies.some(e => !e.dead && e.spawn <= 0);
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (p.cd && p.cd > 0) p.cd = Math.max(0, p.cd - dt);
    if (p.kind === 'brazier' && p.lit && p.parts?.flame) { p.parts.flame.scale.set(1, .85 + Math.sin(G.simClock * 17 + box.x) * .15, 1); if (Math.random() < dt * 4) riseMote(box.x, 1.1, box.z, EMBER, .4); }
    if (p.kind === 'bell' && p.parts?.swing) { p.t = (p.t ?? 99) + dt; p.parts.swing.rotation.z = Math.sin(p.t * 9) * .35 * Math.exp(-p.t * 1.2); }
    if (p.kind === 'censer' && p.parts?.swing) p.parts.swing.rotation.z = Math.sin(G.simClock * 1.3 + box.x) * .016; // (a long chain: a small swing)
    if (p.kind === 'lodestone' && p.parts?.tip) (p.parts.tip as THREE.Sprite).material.opacity = .25 + .5 * (p.cd ?? 0) / C.lodeCooldown + Math.sin(G.simClock * 3 + box.z) * .1;
    // a charged rune stone pulses its school on the foes round it while the fight lasts
    if (p.kind === 'rune' && p.school && fighting && ((p.t = (p.t ?? 0) + dt) >= C.runeEvery)) {
      p.t = 0;
      for (const e of G.enemies) if (!e.dead && e.spawn <= 0 && !e.hidden && Math.hypot(e.x - box.x, e.z - box.z) < C.runeReach + e.r) inflict(e, { [p.school]: C.runeAmount });
      wave(room, box.x, box.z, SCHOOL_COLOR[p.school], C.runeReach); Sfx.at(box.x, box.z).runePulse();
    }
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i]; f.t += dt; f.pot.position.y = Math.max(.15, 1.5 - 9 * f.t * f.t); f.pot.rotation.z += dt * 6;
    if (f.pot.position.y <= .15 || f.room !== G.current) { falling.splice(i, 1); if (f.room === G.current) censerLands(f); else f.room.group.remove(f.pot); } // (its geometries are shared)
  }
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]; w.t += dt; const k = Math.min(1, w.t / .45);
    w.ring.scale.setScalar(.3 + (w.to - .3) * k); (w.ring.material as THREE.MeshBasicMaterial).opacity = .8 * (1 - k);
    if (k >= 1) { w.room.group.remove(w.ring); (w.ring.material as THREE.Material).dispose(); waves.splice(i, 1); }
  }
}

/** A new floor: nothing left falling or ringing from the last one. */
export function clearMechanisms() { falling.length = 0; for (const w of waves) (w.ring.material as THREE.Material).dispose(); waves.length = 0; }

/** Dev menu and tests: fire, frost or shock at (x, z), as a spell landing there would. */
export function elementDev(kind: StatusKind, x: number, z: number) {
  if (kind === 'burn') fireAt(x, z, .6); else elementAt(kind, x, z, .6);
  burst(x, .4, z, SCHOOL_COLOR[kind], 8, 1.6, .05);
}
