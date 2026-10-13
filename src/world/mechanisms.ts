/* Mechanisms (M3.6 step 4, docs/archive/M3.6-plan.md decision 7): objects in rooms that answer to the mage's magic with
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
   - Watching statue (M4.2, from the Eda lore): a Warden's statue whose head follows the mage; while a fight lasts, the
     mage standing in its sight (no pillar, rock or ice between) charges it, and full, it marks where the mage stands
     and a ray strikes there a moment later. A hex (a Hex Bolt, Grasp of the Grave's hands) blinds it for a while.
   - Candle stand in water (M4.2): a candle stand standing in a pool, lit and counted as any other; lit, it lights the
     water round it, and shock running through its pool puts it out.
   - Sapping obelisk (M4.2): its field weakens the cantrip of the mage standing in it and drains their mana. Its ward
     answers to one school, shown in its runes; that school landing on it (a bolt carrying it, fire, frost or shock,
     holy ground or a pillar of light, darkness) breaks the ward, and the field goes out.
   Their looks are the room kit's, in fireLooks.ts, mechLooks.ts and objectLooks.ts (the dead tree). */
import * as THREE from 'three';
import { objectReagent } from '../items/reagents';
import { vigilHooks } from '../vigil/where';
import { CFG } from '../config';
import type { Bolt, Box, Pool, PropBox, Room, RoomLook } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { disposeTree, glow, markShared } from '../render/materials';
import { setDarkness } from '../render/lights';
import { recolourFire, type FirePalette } from '../render/fire';
import { burst } from '../combat/fx';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { SCHOOL_LIGHT } from '../render/arcane';
import { glowTex } from '../render/textures';
import { boxAt } from './collision';
import { floatText, inflict, tileReaction } from '../magic/statusFx';
import { chargeSteam } from '../magic/steam';
import { REACTIONS, type Reaction } from '../magic/status';
import { laySpark } from '../actors/foes';
import { MAGIC, newStatus } from '../magic/status';
import { hexGround, riseMote } from '../magic/shapes';
import { ringFx, strikeFx } from '../magic/spellFx';
import { SCHOOLS, elemental, type School, type SpellStatus, type StatusKind } from '../magic/spellData';
import { LOOT, rollTable } from '../items/loot';
import { soulsHere } from '../items/souls';
import { spawnPickup } from '../items/pickups';
import { toast } from '../notify';
import { freeSpotNear } from './rooms';
import { addPool, fireAt, frostAt, setMud } from './pools';
import { removeProp } from './props';
import type { MechanismKind } from './propData';
import { RUNE_LIT, brazierLook, candleStandLook } from './fireLooks';
import {
  EYE_BLIND,
  EYE_DIM,
  EYE_LIT,
  bellLook,
  censerLook,
  censerPot,
  emblemOf,
  lodestoneLook,
  obeliskLook,
  reliquaryLook,
  runeStoneLook,
  sluiceLook,
  statueLook,
  updateMechLook,
} from './mechLooks';
import { driveUpAll } from '../actors/foes';
import { treeLook } from './objectLooks';
import { dragonBell } from '../actors/pillarDragon';
import { steamBetween } from '../magic/steam';

const C = CFG.mech;
/** The schools an obelisk's ward may hold: those that reach a mechanism (M5's Verdant, growth, reaches none). */
const WARDS = SCHOOLS.filter((s) => s !== 'verdant');
const FIRE = 0xff7a2a,
  EMBER = 0xffc060,
  GOLD = 0xffd98a,
  WAX = 0xe8dcc0,
  BLACKFIRE = 0xb070ff;
/** A brazier's flames burning with Blackfire (M4.10): a pale violet core in a deep violet sheath, a near-black edge. */
const BLACK_FLAMES: FirePalette = { core: 0xeedcff, body: 0x9a48f0, edge: 0x2a0c48, ember: 0xc890ff };
const CHAIN = 7.5; // a censer's chain runs up out of sight, into the dark under the vault
export const SCHOOL_COLOR: Record<StatusKind, number> = { burn: 0xff7a2a, chill: 0x4aa8ff, shock: 0xf0e070 };
/** The school each status carries (an obelisk's ward answers to one). */
const STATUS_SCHOOL: Record<SpellStatus, School> = {
  burn: 'ember',
  chill: 'frost',
  shock: 'storm',
  sanct: 'hallow',
  hex: 'umbral',
  root: 'umbral',
  grow: 'verdant',
};

/* ---------- looks ---------- */

const shared = <T extends THREE.BufferGeometry>(g: T) => {
  g.userData.shared = true;
  return g;
};
/** Remember the parts of a look that move or light up (props.ts copies them onto the object). */
const withParts = (g: THREE.Group, parts: Record<string, THREE.Object3D>) => {
  g.userData.parts = parts;
  return g;
};
/** A look from the room kit (fireLooks.ts, mechLooks.ts), flagged so its own magic moves each step (`updateMechLook`). */
const kitLook = (k: { group: THREE.Group; parts: Record<string, THREE.Object3D> }) => {
  k.group.userData.kit = true;
  return withParts(k.group, k.parts);
};

type Look = (R: () => number, len: number, look: RoomLook) => THREE.Group;
export const MECH_LOOKS: Record<MechanismKind, Look> = {
  sluice(_R, _len, look) {
    return kitLook(sluiceLook(look));
  }, // (M4.9)
  brazier(_R, _len, look) {
    // a bowl of coals, the kind the room drew; its fire shows once lit
    return kitLook(brazierLook(look.kinds.brazier));
  },
  candles(R, _len, look) {
    // a stand with a dish of candles; lit one by one by fire
    return kitLook(candleStandLook(R, look.torch));
  },
  bell() {
    // a bronze bell hanging from a frame
    return kitLook(bellLook());
  },
  rune() {
    // a standing stone with a rune cut into its face, dull until a school charges it
    return kitLook(runeStoneLook());
  },
  lodestone() {
    // a shard of dark iron-stone bound in copper; a spark gathers at its top when it leaps
    return kitLook(lodestoneLook());
  },
  censer() {
    // a censer swinging on a long chain from the dark above, its smoke glowing faintly
    return kitLook(censerLook(CHAIN));
  },
  reliquary() {
    // a gilded reliquary on a plinth, bound by a seal of candle-light
    return kitLook(reliquaryLook());
  },
  tree(R) {
    // a dead tree, grown down here in the dark and died of it
    return treeLook(R);
  },
  wetCandles(R, len, look) {
    // a candle stand standing in water, ripples round its foot; lit, a pool of light on the water
    const g = MECH_LOOKS.candles(R, len, look),
      parts = g.userData.parts as Record<string, THREE.Object3D>;
    const ripple = new THREE.Mesh(RIPPLE, MAT_RIPPLE);
    ripple.position.y = 0.03;
    g.add(ripple);
    const waterGlow = new THREE.Mesh(
      POOL_OF_LIGHT,
      new THREE.MeshBasicMaterial({
        map: glowTex,
        color: 0xffa040,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    waterGlow.position.y = 0.025;
    waterGlow.visible = false;
    g.add(waterGlow);
    return withParts(g, { ...parts, waterGlow });
  },
  // M4.2
  statue() {
    return kitLook(statueLook());
  },
  obelisk(R) {
    // its ward's school, drawn on the room's seed, colours its runes and its field
    const ward = WARDS[Math.floor(R() * WARDS.length)],
      g = kitLook(obeliskLook(ward, C.obelisk.reach));
    g.userData.ward = ward;
    return g;
  },
};

const RIPPLE = shared(new THREE.RingGeometry(0.26, 0.3, 20).rotateX(-Math.PI / 2)),
  POOL_OF_LIGHT = shared(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2));
const MAT_RIPPLE = markShared(
  new THREE.MeshBasicMaterial({ color: 0xbfe0ea, transparent: true, opacity: 0.35, depthWrite: false }),
);

/* ---------- what reaches them ---------- */

const near = (box: PropBox, x: number, z: number, r: number) => Math.hypot(box.x - x, box.z - z) < r;
const mechs = (room: Room, kind: MechanismKind) => (room.props ?? []).filter((b) => b.prop.kind === kind);
/** A candle stand, on the floor or standing in water (M4.2). */
const isStand = (kind: string) => kind === 'candles' || kind === 'wetCandles';

/** A status reaches (x, z) and `r` round it (fire, frost or shock landing, a status put on a foe standing there):
    braziers and candle stands catch fire, rune stones take a charge, lodestones leap, the ice round a frozen foe melts. */
export function elementAt(kind: StatusKind, x: number, z: number, r = 0) {
  const room = G.current;
  vigilHooks.landed(kind === 'burn' ? 'ember' : kind === 'chill' ? 'frost' : 'storm', x, z, r); // (M7 step 6: a chained shade's chains)
  if (kind === 'shock') chargeSteam(x, z, 'storm'); // (M4.10: a storm in steam makes a thundercloud)
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (kind === 'burn' && (p.kind === 'brazier' || isStand(p.kind)) && !p.lit && near(box, x, z, C.kindle + r))
      light(room, box);
    else if (p.kind === 'rune' && near(box, x, z, C.runeCatch + r)) {
      if (!p.school) charge(box, kind);
      else if (p.school !== kind) runeReaction(room, box, kind);
    } // (M4.10: a second school sets off their reaction at its foot)
    else if (kind === 'shock' && p.kind === 'lodestone' && near(box, x, z, C.lodeCatch + r)) leap(room, box);
    else if (kind === 'shock' && p.kind === 'bell' && near(box, x, z, C.runeCatch + r)) {
      if (ring(room, box)) sparkRing(room, box);
    } // (M4.10: a shock beside a bell rings it, and it rings out sparks)
    else if (p.kind === 'obelisk' && p.ward === STATUS_SCHOOL[kind] && near(box, x, z, C.obelisk.catch + r))
      breakWard(box);
  }
  if (kind === 'burn')
    for (const e of G.enemies)
      if (e.entombed && e.asleep && Math.hypot(e.x - x, e.z - z) < C.thawReach + r) e.asleep = false; // thawed
}

/** Holy light lands at (x, z) within `r` (M4.1: Consecrate's ground, Judgement's pillar): candle stands kindle, as the
    chapel's did for its prayers, and an obelisk warded in Hallow breaks its ward (M4.2). */
export function hallowAt(x: number, z: number, r = 0) {
  const room = G.current;
  vigilHooks.landed('hallow', x, z, r);
  chargeSteam(x, z, 'hallow'); // (M4.10: holy light in steam is incense)
  for (const box of room.props ?? []) {
    if (isStand(box.prop.kind) && !box.prop.lit && near(box, x, z, C.kindle + r)) light(room, box);
    else if (box.prop.kind === 'obelisk' && box.prop.ward === 'hallow' && near(box, x, z, C.obelisk.catch + r))
      breakWard(box);
  }
}
/** Darkness lands at (x, z) within `r` (M4.2: Grasp of the Grave's hands): a watching statue there is blinded, and an
    obelisk warded in Umbral breaks its ward; on Consecrate's holy ground, the ground goes dark (M4.8). */
export function umbralAt(x: number, z: number, r = 0) {
  vigilHooks.landed('umbral', x, z, r);
  hexGround(x, z); // (M4.8: a hex on holy ground eclipses what stands in it)
  chargeSteam(x, z, 'umbral'); // (M4.10: darkness in steam is a miasma)
  for (const box of G.current.props ?? []) {
    if (box.prop.kind === 'brazier' && box.prop.lit && !box.prop.black && near(box, x, z, C.kindle + r)) blacken(box); // (M4.10: a lit brazier takes the dark, and burns with Blackfire)
    if (box.prop.kind === 'statue' && near(box, x, z, C.statue.umbralCatch + r)) blind(box);
    else if (box.prop.kind === 'obelisk' && box.prop.ward === 'umbral' && near(box, x, z, C.obelisk.catch + r))
      breakWard(box);
  }
}

/** A bolt or a blast struck a mechanism. Returns whether it was one (so it neither breaks nor clunks). */
export function strikeMechanism(
  room: Room,
  box: PropBox,
  blast: boolean,
  status?: Partial<Record<SpellStatus, number>>,
) {
  const p = box.prop;
  switch (p.kind) {
    case 'bell':
      if (ring(room, box) && status?.shock) sparkRing(room, box);
      return true; // (M4.10: rung by a shock, it rings out sparks)
    case 'sluice':
      openSluice(room, box);
      return true;
    case 'rune': {
      const k = (Object.keys(elemental(status) ?? {}) as StatusKind[])[0];
      if (k && !p.school) charge(box, k);
      else if (k && p.school !== k) runeReaction(room, box, k);
      else burst(box.x, 0.7, box.z, 0x8a8078, 3, 1.2, 0.04);
      return true;
    }
    case 'statue':
      if (status?.hex || status?.root) blind(box);
      else burst(box.x, 1.2, box.z, 0x8a8078, 3, 1.2, 0.04);
      return true;
    case 'obelisk':
      if (blast && p.seal && !p.broken) {
        breakWard(box);
        return true;
      } // (M7: a glyph's blast shuts any of Kaelith's wards)
      if (!p.broken && (Object.keys(status ?? {}) as SpellStatus[]).some((k) => STATUS_SCHOOL[k] === p.ward))
        breakWard(box);
      else {
        burst(box.x, 1.2, box.z, p.broken ? 0x8a8078 : SCHOOL_LIGHT[p.ward ?? 'umbral'], 4, 1.2, 0.04);
        if (!p.broken) Sfx.at(box.x, box.z).wardTink();
      }
      return true;
    case 'lodestone':
      if (status?.shock) leap(room, box);
      else burst(box.x, 0.7, box.z, 0x8a8078, 3, 1.2, 0.04);
      return true;
    case 'wetCandles': // knocked over into the water: its flames go out with a hiss
      if (blast) {
        removeProp(room, box);
        burst(box.x, 0.5, box.z, 0x9ad0ff, 12, 2, 0.05);
        Sfx.at(box.x, box.z).sizzle();
        checkCandles(room);
      }
      return true;
    case 'candles':
      if (blast) {
        removeProp(room, box);
        burst(box.x, 0.8, box.z, WAX, 10, 2, 0.05);
        fireAt(box.x, box.z, 0.6);
        checkCandles(room);
      } // knocked over, burning wax
      return true;
    case 'reliquary':
      burst(box.x, 0.5, box.z, GOLD, 5, 1.4, 0.035);
      Sfx.at(box.x, box.z).wardTink();
      return true; // the seal holds
    case 'brazier':
    case 'censer':
    case 'tree':
      return true;
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
      if (p.lit && !b.status?.burn) {
        b.status = { ...b.status, burn: C.brazierBurn, ...(p.black && { hex: 1 }) };
        b.kindled = true;
        burst(b.x, 0.7, b.z, p.black ? BLACKFIRE : FIRE, 6, 1.6, 0.045);
        Sfx.at(b.x, b.z).catchFire();
      } // (a black brazier's fire carries a hex: M4.10)
      else if (p.lit && b.status?.hex && !p.black)
        blacken(box); // (a hexing bolt through a lit brazier turns its fire black)
      else if (!p.lit && b.status?.burn) light(room, box);
    } else if (p.kind === 'censer' && Math.hypot(b.x - box.x, b.z - box.z) < C.censerCatch) dropCenser(room, box);
  }
  if (b.kindled && Math.random() < 0.25) riseMote(b.x, b.y, b.z, EMBER, 0.35); // a bolt lit by a brazier trails embers
}

/* ---------- what they do ---------- */

/** M4.10, the room joins in: a lit brazier taken by darkness burns with Blackfire (a violet glow over its fire), and the
    bolts it sets alight carry a hex. Its name rises as Blackfire's does on a foe. */
function blacken(box: PropBox) {
  const p = box.prop;
  p.black = true;
  if (p.parts?.flame?.userData.fire) recolourFire(p.parts.flame, BLACK_FLAMES); // (the room kit's fire: its flames go violet, so it reads at a glance)
  if (p.parts?.glow) p.parts.glow.visible = false; // (its warm light gives way to the dark one)
  const gl = glow(BLACKFIRE, 1.4, 0.8);
  gl.position.y = 1.05;
  box.mesh?.add(gl);
  p.parts = { ...p.parts, blackGlow: gl };
  burst(box.x, 1, box.z, BLACKFIRE, 14, 1.8, 0.05);
  tileReaction('blackfire', box.x, box.z);
  Sfx.at(box.x, box.z).blackfire();
}
/** M4.10: a rune stone charged with one school, struck by another, sets off their reaction at its foot: on every foe in its
    reach (both statuses laid on in turn), and its name rises there even with none; then it holds the new school. */
let runeReacting = false;
function runeReaction(room: Room, box: PropBox, kind: StatusKind) {
  if (runeReacting) return; // (the statuses it lays on its foes reach the stone again through touchPools: once is enough)
  const was = box.prop.school!,
    r = (Object.keys(REACTIONS) as Reaction[]).find((k) => REACTIONS[k].includes(was) && REACTIONS[k].includes(kind));
  if (!r) return;
  runeReacting = true;
  try {
    tileReaction(r, box.x, box.z);
    ringFx(box.x, 0.05, box.z, SCHOOL_COLOR[kind], 0.3, C.runeReach, CFG.spellFx.shockwave, true);
    const stacks = (k: StatusKind) => (k === 'chill' ? MAGIC.chill.freezeAt : C.runeStacks); // (cold enough to freeze, so Shatter can go off)
    for (const e of G.enemies)
      if (!e.dead && e.spawn <= 0 && !e.hidden && Math.hypot(e.x - box.x, e.z - box.z) < C.runeReach + e.r) {
        inflict(e, { [was]: stacks(was) });
        inflict(e, { [kind]: stacks(kind) });
      }
    charge(box, kind);
  } finally {
    runeReacting = false;
  }
  void room;
}
/** M4.10: a bell rung by a shock rings out a ring of sparks round it (armed in a moment, stinging what stands in them). */
function sparkRing(room: Room, box: PropBox) {
  const { n, d, time } = C.bellSparks;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    laySpark(room, box.x + Math.cos(a) * d, box.z + Math.sin(a) * d, time, '');
  }
  ringFx(box.x, 0.05, box.z, SCHOOL_LIGHT.storm, 0.3, d + 0.3, CFG.spellFx.shockwave, true);
}

function light(room: Room, box: PropBox) {
  const p = box.prop;
  p.lit = true;
  if (p.parts?.flame) p.parts.flame.visible = true;
  if (p.parts?.glow) p.parts.glow.visible = true;
  if (p.parts?.flames) p.parts.flames.visible = true;
  if (p.parts?.runes) ((p.parts.runes as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(RUNE_LIT); // the brazier's runes kindle
  burst(box.x, 1, box.z, FIRE, 6, 1.6, 0.05);
  Sfx.at(box.x, box.z).catchFire();
  if (p.parts?.waterGlow) p.parts.waterGlow.visible = true; // (a stand in water lights the water round it)
  if (p.kind === 'brazier' && !p.salted) {
    p.salted = true;
    objectReagent('brazier', box.x, box.z + 0.8);
  } // (M5: its first fire may leave Ember Salt)
  if (isStand(p.kind)) checkCandles(room);
}

/** Every candle stand in the room lit: reliquaries open, the dark lifts, and a chapel blesses the mage's casts. With
    every stand knocked over, nothing holds a reliquary's seal and it breaks open, but that is all. */
function checkCandles(room: Room) {
  const stands = (room.props ?? []).filter((b) => isStand(b.prop.kind));
  if (!stands.length) {
    for (const box of mechs(room, 'reliquary')) openReliquary(room, box);
    return;
  }
  if (room.candlesLit || stands.some((b) => !b.prop.lit)) return;
  room.candlesLit = true;
  Sfx.candlesLit();
  for (const box of mechs(room, 'reliquary')) openReliquary(room, box);
  if (room.plan.variant === 'dark') {
    setDarkness(0);
    toast(STR.mech.darkLifted, 2.5);
  }
  if (room.theme?.twist === 'blessing') {
    player.blessed = C.blessCasts;
    toast(STR.mech.blessed(C.blessCasts), 3);
    burst(player.x, 1, player.z, GOLD, 16, 2, 0.05);
  }
}

function openReliquary(room: Room, box: PropBox) {
  removeProp(room, box);
  burst(box.x, 0.6, box.z, GOLD, 24, 2.6, 0.06);
  Sfx.at(box.x, box.z).unbind();
  toast(STR.mech.reliquary, 2.5);
  rollTable(G.run.drops, 'chest', LOOT, soulsHere()).forEach((item, i, all) => {
    const a = Math.PI / 2 + (i - (all.length - 1) / 2) * 0.75,
      s = freeSpotNear(room, box.x + Math.cos(a) * 0.9, box.z + Math.sin(a) * 0.9);
    spawnPickup(item, s.x, s.z);
  });
}

/** The bell rings: every foe in the room reels (bosses shrug it off, but the Pillar Dragon loses its hold), and it must
    settle before it rings again. */
function ring(room: Room, box: PropBox) {
  const p = box.prop;
  if ((p.cd ?? 0) > 0) {
    Sfx.at(box.x, box.z).wardTink();
    return false;
  }
  p.cd = C.bellCooldown;
  p.t = 0;
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || e.isBoss) continue;
    e.status ??= newStatus();
    e.status.stun = Math.max(e.status.stun, C.bellStun);
    burst(e.x, 1, e.z, GOLD, 4, 1.2, 0.04);
  }
  dragonBell(); // (M4.2: the Pillar Dragon loses its hold)
  wave(room, box.x, box.z, GOLD, 9);
  Sfx.at(box.x, box.z).toll();
  G.shake = Math.max(G.shake, 0.12);
  return true;
}

/** A rune stone takes the school that reached it, and glows in its colour (`quiet`: as the room is built). */
function charge(box: PropBox, school: StatusKind, quiet = false) {
  const p = box.prop;
  p.school = school;
  p.t = 0;
  const color = SCHOOL_COLOR[school],
    rune = p.parts?.rune,
    gl = p.parts?.glow as THREE.Sprite | undefined;
  const stroke = ((rune as THREE.Mesh | undefined)?.isMesh ? rune : rune?.children[0]) as THREE.Mesh | undefined; // (the room kit's carving is one mesh)
  if (stroke) {
    const m = stroke.material as THREE.MeshStandardMaterial;
    m.emissive.setHex(color);
    m.color.setHex(color);
  } // (its strokes share it)
  const aura = p.parts?.aura; // (the room kit's stone: runes of its school circle it)
  if (aura) {
    ((aura.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(color);
    aura.visible = true;
  }
  if (gl) {
    gl.material.color.setHex(color);
    gl.visible = true;
  }
  if (!quiet) {
    burst(box.x, 0.8, box.z, color, 10, 1.8, 0.05);
    Sfx.at(box.x, box.z).runeCharge();
  }
}
/** Every rune stone of a room already charged with `school` (the frozen mausoleum's stones hold frost). */
export function chargeRunes(room: Room, school: StatusKind) {
  for (const box of mechs(room, 'rune')) if (!box.prop.school) charge(box, school, true);
}

/** Shock leaps from a lodestone to every other lodestone near enough, hurting and shocking what stands between. */
function leap(room: Room, box: PropBox) {
  const p = box.prop;
  if ((p.cd ?? 0) > 0) return;
  p.cd = C.lodeCooldown;
  const others = mechs(room, 'lodestone').filter(
    (o) => o !== box && Math.hypot(o.x - box.x, o.z - box.z) < C.lodeReach,
  );
  if (!others.length) {
    burst(box.x, 1.3, box.z, SCHOOL_COLOR.shock, 6, 1.6, 0.04);
    return;
  }
  Sfx.at(box.x, box.z).arc(others.length);
  for (const o of others) {
    o.prop.cd = Math.max(o.prop.cd ?? 0, C.lodeCooldown); // no leaping straight back
    strikeFx({ x: box.x, y: 1.3, z: box.z }, { x: o.x, y: 1.3, z: o.z }, SCHOOL_COLOR.shock);
    const dx = o.x - box.x,
      dz = o.z - box.z,
      len2 = dx * dx + dz * dz || 1;
    const dist = (x: number, z: number) => {
      const k = Math.max(0, Math.min(1, ((x - box.x) * dx + (z - box.z) * dz) / len2));
      return Math.hypot(box.x + dx * k - x, box.z + dz * k - z);
    };
    for (const e of G.enemies) {
      if (e.dead || e.spawn > 0 || e.hidden || dist(e.x, e.z) > C.lodeWidth + e.r) continue;
      damageEnemy(e, C.lodeDamage, 0, 0, C.lodeKnock, 'spell', 'storm');
      inflict(e, { shock: 1 });
    }
    if (dist(player.x, player.z) < C.lodeWidth) hurtPlayer(C.lodeHurt, player.x - dz * 0.01, player.z + dx * 0.01);
  }
}

/** A censer's chain cut: it falls, strikes what is under it, and its oil spills burning. */
function dropCenser(room: Room, box: PropBox) {
  const { x, z } = box,
    at = box.prop.tiles[0];
  removeProp(room, box);
  const pot = censerPot();
  pot.position.set(x - room.cx, 1.5, z - room.cz);
  room.group.add(pot);
  Sfx.at(x, z).chainSnap();
  falling.push({ room, pot, x, z, at, t: 0 });
}
const falling: { room: Room; pot: THREE.Group; x: number; z: number; at: { c: number; r: number }; t: number }[] = [];
function censerLands(f: (typeof falling)[number]) {
  const { room, x, z } = f;
  room.group.remove(f.pot);
  disposeTree(f.pot);
  for (const e of G.enemies) {
    if (e.dead || e.spawn > 0 || e.hidden || e.flying || Math.hypot(e.x - x, e.z - z) > C.censerReach + e.r) continue;
    damageEnemy(e, C.censerDamage, 0, 0, C.censerKnock, 'spell', 'ember');
    inflict(e, { burn: C.censerBurn });
  }
  if (Math.hypot(player.x - x, player.z - z) < C.censerHitsMage) hurtPlayer(C.censerHurt, x, z);
  // the oil: its tile and a few free ones round it, alight at once
  const t = room.template.tiles,
    tiles = [f.at],
    seen = new Set([f.at.c + ',' + f.at.r]);
  for (let i = 0; i < tiles.length && tiles.length <= C.censerSpill; i++)
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const c = tiles[i].c + dc,
        r = tiles[i].r + dr,
        k = c + ',' + r;
      if (!seen.has(k) && tiles.length <= C.censerSpill && t[r]?.[c] === 'floor' && !room.poolGrid?.[r]?.[c]) {
        seen.add(k);
        tiles.push({ c, r });
      }
    }
  if (t[f.at.r][f.at.c] === 'floor' || t[f.at.r][f.at.c] === 'censer') {
    t[f.at.r][f.at.c] = 'floor';
    addPool(room, 'oil', tiles);
  }
  burst(x, 0.3, z, FIRE, 16, 2.6, 0.07);
  burst(x, 0.2, z, 0x8a6a3a, 8, 2, 0.05);
  Sfx.at(x, z).clang();
  G.shake = Math.max(G.shake, 0.15);
  fireAt(x, z, 0.8);
}

/* ---------- M4.2: the watching statue and the sapping obelisk ---------- */

const S = C.statue,
  dim = new THREE.Color(EYE_DIM),
  bright = new THREE.Color(EYE_LIT);
const eyesOf = (p: PropBox['prop']) => p.parts?.head?.userData.eyes as THREE.MeshBasicMaterial | undefined;

/** A hex reaches a watching statue: its eyes go dark and its charge is lost, for a while. */
function blind(box: PropBox) {
  const p = box.prop,
    was = (p.blind ?? 0) > 0;
  p.blind = S.blind;
  p.charge = 0;
  p.aim = undefined;
  eyesOf(p)?.color.setHex(EYE_BLIND);
  if (p.parts?.gaze) p.parts.gaze.visible = false;
  burst(box.x, 1.55, box.z, SCHOOL_LIGHT.umbral, 12, 1.4, 0.045);
  if (!was) Sfx.at(box.x, box.z).statueBlind();
}

/** Nothing tall between the statue and (x, z): walls, rocks, pillars, other statues, a spell's ice. */
const solids: Box[] = []; // (reused each look)
function inSight(room: Room, box: PropBox, x: number, z: number) {
  solids.length = 0;
  for (const list of [room.walls, room.rocks, room.barriers ?? []]) for (const b of list) if (b !== box) solids.push(b);
  const dx = x - box.x,
    dz = z - box.z,
    n = Math.ceil(Math.hypot(dx, dz) / 0.2);
  for (let i = 1; i < n; i++) if (boxAt(box.x + (dx * i) / n, box.z + (dz * i) / n, solids)) return false;
  return true;
}

/** A watching statue each step: its head follows the mage; while the fight lasts, the mage in its sight charges it, and
    full it marks where they stand; the ray strikes there after a moment, hurting what stands in it. */
function updateStatue(room: Room, box: PropBox, dt: number, fighting: boolean) {
  const p = box.prop,
    head = p.parts?.head,
    gaze = p.parts?.gaze as THREE.Line | undefined;
  const dx = player.x - box.x,
    dz = player.z - box.z,
    blind = (p.blind ?? 0) > 0;
  if (blind && (p.blind! -= dt) <= 0) {
    p.blind = 0;
    eyesOf(p)?.color.setHex(EYE_DIM);
  }
  if (head && !blind) {
    // (the neck turns so far and no further)
    const want = Math.max(-1.3, Math.min(1.3, Math.atan2(dx, dz)));
    head.rotation.y += (want - head.rotation.y) * Math.min(1, dt * 5);
  }
  const sees =
    fighting &&
    !blind &&
    !player.dead &&
    Math.hypot(dx, dz) < S.reach &&
    inSight(room, box, player.x, player.z) &&
    !steamBetween(box.x, box.z, player.x, player.z); // (steam hides the mage from it)
  if (p.aim) {
    if ((p.aim.t -= dt) <= 0) {
      strikeRay(box, p.aim.x, p.aim.z);
      p.aim = undefined;
      p.charge = 0;
      p.cd = S.rest;
    }
  } else if ((p.cd ?? 0) <= 0) {
    p.charge = sees ? Math.min(S.charge, (p.charge ?? 0) + dt) : Math.max(0, (p.charge ?? 0) - dt * S.cool);
    if (p.charge >= S.charge) {
      // its gaze settles: the spot is marked
      p.aim = { x: player.x, z: player.z, t: S.delay };
      ringFx(player.x, 0.06, player.z, EYE_LIT, S.radius * 2.4, S.radius * 0.5, S.delay, true);
      Sfx.at(box.x, box.z).statueMark();
    }
  }
  const k = Math.min(1, (p.charge ?? 0) / S.charge);
  if (!blind) eyesOf(p)?.color.lerpColors(dim, bright, p.aim ? 1 : k);
  if (gaze) {
    gaze.visible = !blind && (sees || !!p.aim) && k > 0.05;
    if (gaze.visible) {
      const to = p.aim ?? player,
        pos = gaze.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, Math.sin(head?.rotation.y ?? 0) * 0.18, 1.5, Math.cos(head?.rotation.y ?? 0) * 0.18);
      pos.setXYZ(1, to.x - box.x, 0.5, to.z - box.z);
      pos.needsUpdate = true;
      (gaze.material as THREE.LineBasicMaterial).opacity = 0.15 + 0.6 * k;
    }
  }
}
/** The statue's ray lands at (x, z): a straight beam of gold from its eyes, and what stands there is struck (the mage,
    and foes too). */
function strikeRay(box: PropBox, x: number, z: number) {
  beam(G.current, { x: box.x, y: 1.52, z: box.z }, { x, y: 0.05, z }, EYE_LIT);
  ringFx(x, 0.06, z, EYE_LIT, 0.2, S.radius * 1.2, 0.35, true);
  burst(x, 0.3, z, EYE_LIT, 16, 2.2, 0.05);
  Sfx.at(x, z).statueRay();
  if (!player.dead && Math.hypot(player.x - x, player.z - z) < S.radius) hurtPlayer(S.hurt, box.x, box.z);
  for (const e of G.enemies)
    if (!e.dead && e.spawn <= 0 && !e.hidden && !e.flying && Math.hypot(e.x - x, e.z - z) < S.radius + e.r)
      damageEnemy(e, S.damage, 0, 0, 0, 'spell', 'hallow');
}

/** An obelisk's ward breaks: its runes and shard go dull, and its field goes out. */
function breakWard(box: PropBox) {
  const p = box.prop;
  if (p.broken) return;
  p.broken = true;
  const color = SCHOOL_LIGHT[p.ward ?? 'umbral'];
  dull(p);
  burst(box.x, 2.2, box.z, color, 22, 2.6, 0.05);
  ringFx(box.x, 0.06, box.z, color, 0.3, p.seal ? 1.4 : C.obelisk.reach, 0.5, true);
  Sfx.at(box.x, box.z).wardShatter();
  if (p.seal) wardHooks.shut?.(box);
  else toast(STR.mech.wardBroken, 2.5); // (M7: Kaelith's fight says what a ward shut does)
  if (sapping === box) sapping = null;
}
/** An obelisk's runes and shard gone dull, its field and glow out. */
function dull(p: PropBox['prop']) {
  for (const k of ['runes', 'crystal'])
    ((p.parts?.[k] as THREE.Mesh | undefined)?.material as THREE.MeshBasicMaterial | undefined)?.color.setHex(0x2e2a34);
  if (p.parts?.field) p.parts.field.visible = false;
  if (p.parts?.glow) p.parts.glow.visible = false;
}
/** M7 step 2: what hears one of Kaelith's wards shut (its fight, actors/kaelith.ts). */
export const wardHooks: { shut?: (box: PropBox) => void } = {};
/** M7 step 2: an obelisk made one of Kaelith's ward pillars: no field, no drain, dormant (dull, as if broken) until it wakes. */
export function sealWard(box: PropBox) {
  const p = box.prop;
  p.seal = true;
  p.broken = true;
  p.ward = undefined;
  dull(p);
}
/** M7 step 2: a ward pillar wakes in `school`: its emblem and runes lit in that school's light (its field stays out). */
export function wakeWard(box: PropBox, school: School) {
  const p = box.prop,
    color = SCHOOL_LIGHT[school];
  p.ward = school;
  p.broken = false;
  for (const k of ['runes', 'crystal'])
    ((p.parts?.[k] as THREE.Mesh | undefined)?.material as THREE.MeshBasicMaterial | undefined)?.color.setHex(color);
  if (p.parts?.crystal) (p.parts.crystal as THREE.Mesh).geometry = emblemOf(school);
  const gl = p.parts?.glow as THREE.Sprite | undefined;
  if (gl) {
    gl.visible = true;
    gl.material.color.setHex(color);
  }
  burst(box.x, 2.2, box.z, color, 14, 2, 0.05);
}

/** The unbroken obelisk whose field the mage stands in, if any (set each step). */
let sapping: PropBox | null = null,
  tether = 0;
const told = new WeakSet<Room>();
/** What the cantrip's blows are worth where the mage stands: less inside a sapping obelisk's field (M4.2). */
export const sapMul = () => (sapping ? C.obelisk.sap : 1);
/** The mage inside an obelisk's field: mana drains, and pale threads run from them to its point. */
function updateSapping(room: Room, dt: number) {
  sapping = null;
  if (player.dead) return;
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (p.kind !== 'obelisk' || p.broken || p.seal) continue;
    const inside = Math.hypot(player.x - box.x, player.z - box.z) < C.obelisk.reach;
    if (p.parts?.field)
      ((p.parts.field as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = inside
        ? 0.55 + Math.sin(G.simClock * 8) * 0.15
        : 0.35;
    if (inside && !sapping) sapping = box;
  }
  if (!sapping) return;
  player.mana = Math.max(0, player.mana - C.obelisk.drain * dt);
  const color = SCHOOL_LIGHT[sapping.prop.ward ?? 'umbral'];
  if ((tether -= dt) <= 0) {
    tether = 0.3;
    strikeFx({ x: sapping.x, y: 2.2, z: sapping.z }, { x: player.x, y: 0.9, z: player.z }, color, 0.22, true);
  }
  if (!told.has(room)) {
    told.add(room);
    toast(STR.mech.sapped(STR.schools[sapping.prop.ward ?? 'umbral']), 4);
  }
}

/* ---------- beams: a watching statue's ray ---------- */

const beams: { room: Room; mesh: THREE.Mesh; t: number }[] = [];
let beamGeo: THREE.CylinderGeometry | null = null;
const UP = new THREE.Vector3(0, 1, 0),
  dir = new THREE.Vector3();
/** A straight beam of `color` from `a` to `b` that flares and fades (its own material, freed when it goes). */
function beam(
  room: Room,
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  color: number,
) {
  beamGeo ??= shared(new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0));
  const m = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  dir.set(b.x - a.x, b.y - a.y, b.z - a.z);
  const len = dir.length();
  m.position.set(a.x - room.cx, a.y, a.z - room.cz);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.scale.set(0.07, len, 0.07);
  room.group.add(m);
  beams.push({ room, mesh: m, t: 0 });
}

/* ---------- rings of light ---------- */

const waves: { room: Room; ring: THREE.Mesh; t: number; to: number }[] = [];
let waveGeo: THREE.RingGeometry | null = null;
function wave(room: Room, x: number, z: number, color: number, to: number) {
  waveGeo ??= shared(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2));
  const ring = new THREE.Mesh(
    waveGeo,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  ring.position.set(x - room.cx, 0.08, z - room.cz);
  room.group.add(ring);
  waves.push({ room, ring, t: 0, to });
}

/* ---------- the sluice gate (M4.9) ---------- */

/** A bolt or a blast strikes a sluice gate: it lifts, and the room's water drains to mud for `CFG.mech.sluice.open`
    seconds: wading still slows, but nothing can hide in it (the water foes are driven up, and kept up). */
function openSluice(room: Room, box: PropBox) {
  const p = box.prop,
    S = C.sluice;
  if ((p.open ?? 0) > 0 || (p.cd ?? 0) > 0) {
    burst(box.x, 1, box.z, 0x8a8078, 3, 1.2, 0.04);
    return;
  } // (open already, or just shut)
  p.open = S.open;
  p.t = 0;
  setMud(room, true);
  driveUpAll('sluice');
  floatText(box.x, 2.1, box.z, STR.curve.drained, 0xbfe4f4, 40);
  burst(box.x, 0.6, box.z + 0.4, 0xbfe4f4, 18, 2.2, 0.05);
  Sfx.at(box.x, box.z).sluice(true);
}
/** Each step of an open sluice: the gate lifts and the wheel turns, water falls through, the water foes stay driven up;
    when its time is up it drops, and the water comes back. */
function updateSluice(room: Room, box: PropBox, dt: number) {
  const p = box.prop,
    parts = p.parts,
    S = C.sluice,
    open = (p.open ?? 0) > 0;
  if (open) {
    p.open! -= dt;
    p.t = (p.t ?? 0) + dt;
    if (p.t >= S.drive) {
      p.t = 0;
      driveUpAll('sluice');
    }
    if (p.open! <= 0) {
      p.open = 0;
      p.cd = S.rest;
      setMud(room, false);
      burst(box.x, 0.3, box.z + 0.4, 0x5a8a9a, 12, 1.6, 0.05);
      Sfx.at(box.x, box.z).sluice(false);
    }
  }
  if (!parts) return;
  const lift = open ? 1 : 0,
    gate = parts.gate;
  const up = lift * C.sluice.lift; // (it lifts under its lintel, leaving a gap the water falls through)
  gate.position.y += (up - gate.position.y) * Math.min(1, dt * 4);
  if (open || Math.abs(gate.position.y - up) > 0.01)
    parts.wheel.rotation.z += dt * (open ? 3 : -3) * Math.min(1, Math.abs(gate.position.y - up) * 4 + (open ? 0.3 : 0));
  parts.fall.visible = parts.foam.visible = open;
  if (open) {
    parts.fall.scale.y = 0.92 + Math.sin(G.simClock * 23 + box.x) * 0.08;
    parts.foam.scale.setScalar(0.9 + Math.sin(G.simClock * 9) * 0.1);
    if (Math.random() < dt * 10) burst(box.x + (Math.random() - 0.5) * 0.5, 0.1, box.z + 0.5, 0xd8f0ff, 1, 1, 0.03);
  }
}

/* ---------- every step ---------- */

export function updateMechanisms(dt: number) {
  const room = G.current,
    fighting = room.locked && G.enemies.some((e) => !e.dead && e.spawn <= 0);
  updateSapping(room, dt);
  for (const box of room.props ?? []) {
    const p = box.prop;
    if (p.cd && p.cd > 0) p.cd = Math.max(0, p.cd - dt);
    if (p.kind === 'statue') updateStatue(room, box, dt, fighting);
    if (p.kind === 'sluice') updateSluice(room, box, dt);
    if (p.parts && box.mesh?.userData.kit) updateMechLook(p.parts, G.simClock, box.x);
    if (p.kind === 'bell' && p.parts?.swing) {
      p.t = (p.t ?? 99) + dt;
      p.parts.swing.rotation.z = Math.sin(p.t * 9) * 0.35 * Math.exp(-p.t * 1.2);
    }
    if (p.kind === 'censer' && p.parts?.swing) p.parts.swing.rotation.z = Math.sin(G.simClock * 1.3 + box.x) * 0.016; // (a long chain: a small swing)
    if (p.kind === 'lodestone' && p.parts?.tip)
      (p.parts.tip as THREE.Sprite).material.opacity =
        0.25 + (0.5 * (p.cd ?? 0)) / C.lodeCooldown + Math.sin(G.simClock * 3 + box.z) * 0.1;
    // a charged rune stone pulses its school on the foes round it while the fight lasts
    if (p.kind === 'rune' && p.school && fighting && (p.t = (p.t ?? 0) + dt) >= C.runeEvery) {
      p.t = 0;
      for (const e of G.enemies)
        if (!e.dead && e.spawn <= 0 && !e.hidden && Math.hypot(e.x - box.x, e.z - box.z) < C.runeReach + e.r)
          inflict(e, { [p.school]: C.runeAmount });
      wave(room, box.x, box.z, SCHOOL_COLOR[p.school], C.runeReach);
      Sfx.at(box.x, box.z).runePulse();
    }
  }
  for (let i = falling.length - 1; i >= 0; i--) {
    const f = falling[i];
    f.t += dt;
    f.pot.position.y = Math.max(0.15, 1.5 - 9 * f.t * f.t);
    f.pot.rotation.z += dt * 6;
    if (f.pot.position.y <= 0.15 || f.room !== G.current) {
      falling.splice(i, 1);
      if (f.room === G.current) censerLands(f);
      else {
        f.room.group.remove(f.pot);
        disposeTree(f.pot);
      }
    } // (its geometries are shared; its glow isn't)
  }
  for (let i = beams.length - 1; i >= 0; i--) {
    // the ray flares, then thins and fades
    const b = beams[i];
    b.t += dt;
    const k = Math.min(1, b.t / 0.35);
    b.mesh.scale.x = b.mesh.scale.z = 0.07 * (1 + 0.6 * (1 - k)) * (1 - k * 0.7);
    (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.95 * (1 - k);
    if (k >= 1) {
      b.room.group.remove(b.mesh);
      (b.mesh.material as THREE.Material).dispose();
      beams.splice(i, 1);
    }
  }
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.t += dt;
    const k = Math.min(1, w.t / 0.45);
    w.ring.scale.setScalar(0.3 + (w.to - 0.3) * k);
    (w.ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
    if (k >= 1) {
      w.room.group.remove(w.ring);
      (w.ring.material as THREE.Material).dispose();
      waves.splice(i, 1);
    }
  }
}

/** Shock ran through a pool (M4.2): the candle stands standing in it go out with a hiss. */
export function douseStandsIn(pool: Pool) {
  for (const box of G.current.props ?? []) {
    const p = box.prop;
    if (p.kind !== 'wetCandles' || !p.lit || !pool.tiles.some((t) => p.tiles.some((q) => q.c === t.c && q.r === t.r)))
      continue;
    p.lit = false;
    if (p.parts?.flames) p.parts.flames.visible = false;
    if (p.parts?.waterGlow) p.parts.waterGlow.visible = false;
    burst(box.x, 0.9, box.z, 0xd8e8f0, 10, 1.4, 0.04);
    Sfx.at(box.x, box.z).sizzle();
  }
}

/** A new floor: nothing left falling or ringing from the last one. */
export function clearMechanisms() {
  falling.length = 0;
  for (const w of waves) (w.ring.material as THREE.Material).dispose();
  waves.length = 0;
  sapping = null;
  for (const b of beams) (b.mesh.material as THREE.Material).dispose();
  beams.length = 0;
}

/** Dev menu and tests: fire, frost or shock at (x, z), as a spell landing there would; or (M4.2) holy light or darkness. */
export function elementDev(kind: StatusKind | 'sanct' | 'hex', x: number, z: number) {
  if (kind === 'burn') fireAt(x, z, 0.6);
  else if (kind === 'chill') frostAt(x, z, 0.6);
  else if (kind === 'sanct') hallowAt(x, z, 0.6);
  else if (kind === 'hex') umbralAt(x, z, 0.6);
  else elementAt(kind, x, z, 0.6); // (frost as a spell's lands: on the floor too)
  burst(
    x,
    0.4,
    z,
    kind === 'sanct' ? SCHOOL_LIGHT.hallow : kind === 'hex' ? SCHOOL_LIGHT.umbral : SCHOOL_COLOR[kind],
    8,
    1.6,
    0.05,
  );
}
