/* The bestiary's foes (M4.5, docs/archive/M4.5-plan.md): the behaviours of the thirty-five, floor by floor, on the same footing as
   M4's (actors/foes.ts spreads them into its own; what each is lives in data/foes.json). What they leave on the ground
   and throw is in bestiaryGround.ts.

   Floor 1, the crypt:
   Dropper (the Crypt Spider) hangs out of reach on a thread, only its shadow on the floor, creeping after the mage; it
     drops on the spot it marks, skitters at the mage spitting web gobs that land as webs (they slow; fire burns them),
     and climbs back up.
   Splitter (the Ink Octopus) crawls at the mage leaving smears of ink that slow, and now and then squirts a cloud that
     dims the sight; struck to half its health it splits in two smaller ones, unless it is chilled, when it cracks instead.
   Tome (the Grimoire Mimic) lies shut on the floor as a book, turning half a blow, until the mage comes near, strikes it
     or nothing else in the room is awake; then it flies round the mage, riffles fans of cutting pages and lunges to bite.
     Now and then it leaves a grimoire page when it falls.
   Swarm (the Firefly Swarm) is several lantern beetles with one mind (`pack`): they weave round a point a few tiles off
     the mage, glow together, then stream at the mage one after another and come back. Each falls to a blow, in a flash;
     a chain of lightning leaps through them.
   Singer (the Choir Lark) flies to a perch by a wall or a pillar and sings: the foes round it are hastened (`sung`). It
     flies off when the mage comes near, falls silent while hexed, and dives at the mage once it sings to no one.
   Mantis (the Storm Mantis) stalks at arm's length, facing the mage, and parries the cantrip's bolts that come at its
     front, throwing sparks back; it rears and lunges, and after the lunge it stands open. Spells pass its guard, and
     chilled it can't parry.
   Crab (the Rubble Crab) sits as a heap of rubble until the mage comes near or strikes it, or nothing else in the room is
     awake; then it sidles round the mage, its shell turning half of every blow, throws sparks from its claws and darts in
     to pinch. A glyph's blast flips it on its back, open to harm, for a while.

   Floor 2, the drowned:
   Snail (the Rime Snail) crawls at the mage leaving a trail of rime: water it crosses freezes, and the mage slides on it
     (fire melts it). It spits cold. Struck often, it withdraws into its ice shell, which turns nearly every blow; fire
     cracks the shell, and cracked it takes more.
   Newt (the Glass Newt) swims in the room's water (or a pool it brings), clear as glass, only a ripple, to where the water
     comes nearest the mage; then it lunges out and bites, and the bite chills. On dry floor it scurries, seen, and makes
     for the water again. A shock through its pool, or the pool frozen over, shows and stuns it.
   Serpent (the Brine Serpent) lives in water, as the lurker does: it slides beneath it to the place nearest the mage (or,
     kept from it a while, the water nearest itself), rises in coils and spits fans of cold brine, and sinks again. Freezing its
     pool traps it above the ice.
   Wave (the Puddle Elemental, an elemental: Frost feeds it, Ember hurts it twice over) walks at the mage leaving water on
     the floor behind it, rears and crashes in a ring of brine. Chill feeds it but freezes it where it stands (the water
     under it, frost reaching that water, too), and frozen it is ice, still and harmless; a shock then shatters it for a
     heavy blow.
   Cloud (the Thunderhead, an elemental: Storm feeds it, Frost hurts it twice over) drifts after the mage, slower than the
     mage walks, gathers over it (darkening), and rains sparks on the floor beneath, which arm and sting; the thunder runs
     through water under it.
   Darter (the Storm Darter) hovers, then shoots in a straight line at the mage to the wall, leaving a line of sparks, and
     hovers again at the turn. Chilled, it hangs in the air.
   Mine (the Puffcap) shambles up on its root legs, swells when the mage comes near, and bursts in stinging spores and a
     ring of shots. Fire bursts it early, where it stands, and burns the spores away.

   Floor 3, the burning crypt:
   Nest (the Ember Wasps') is set in the nearest stone wall and lets out a wasp now and then while it stands, a few at a
     time (`owner`); paper, it takes fire whole and barely anything else.
   Wasp (the Ember Wasp) weaves round the mage, hangs with its sting curled, and dashes; the sting sets the ground under
     the mage burning.
   Djinn (the Cinder Djinn, an elemental: Ember feeds it, Frost hurts it twice over) flits from brazier to brazier lighting
     them and the oil it crosses, hurls arcs of fire that land burning, and, hurt, mends in a lit brazier. Frost snuffs it
     to a cinder for a while.
   Ooze (the Magma Ooze, an elemental) slides at the mage leaving burning ground, and splits in two at half health.
     Chilled, it hardens to rock, and the next blow shatters it for more.
   Phoenix (the elite) wheels round the mage shedding fans of fire feathers, rears and dives through where the mage stood
     in a burning line. Felled the first time, it falls to ashes that blows don't touch, and rises again at half its
     health, unless frost or a glyph's blast puts the ashes out first.
   Basilisk keeps its distance; its crest flares and its stare sweeps across, and the mage in it, in its sight, is heavy
     as stone (`player.stone`). Walls, rocks and anything tall block the stare; holy light blinds it.
   Bodyguard (the Salt Golem) stands between the mage and the foe nearest them, taking the bolts, and slams salt about
     when the mage comes close. Burning, the wax in its joints melts and it slows.
   Breaker (the Rubble Golem) slams the floor and stones fall from the roof on marked spots round the mage. A glyph's blast
     breaks it into rolling stones (`stone`) that roll back together into it, unless they are all put down first.

   Floor 4, the Gilded Reliquary:
   Griffin (the elite) circles high out of reach, only its shadow on the floor, marks a line through where the mage stands
     and swoops down it; landed, it claws and buffets the mage away with its wings, then takes wing again. A hex grounds it.
   Eye (the Radiant Eye) drifts round the mage; shut, its lids turn half of every blow. Open, it follows the mage, then a ray
     of light strikes where they stood. A hex shuts it.
   Harpy perches high on a wall, out of a touch's reach, and screeches: glyphs chalked near it are blown away and the
     mage's bolts flying near it knocked aside. Then it dives along a line, talons out, and flies to another perch.
   Magnet (the Lodestone Golem, an elemental: Storm feeds it, Frost hurts it twice over) draws the mage a little and bends
     the mage's bolts towards itself; its orbiting stones turn some of them aside. Frozen, it does neither.
   Hearth (the Hearth Golem, an elite elemental) while its fire burns turns most of every blow, and throws coals that land
     burning. Frost puts the fire out for a while; it makes for a brazier to stoke itself again.
   Shade (the Shadow Fox) sinks into a shadow and rises from another near the mage to bite. Lit braziers, candle stands and
     wall lights deny it their ground (finding none near the mage for a while, it rises in the light); in an unlit dark
     room the whole floor is its. Holy light holds it in the open.
   Roller (the Rime Scarab) pushes a snowball that grows as it rolls, and throws it to burst in a ring of cold where the mage
     stood. Fire melts the ball; without one it is quick, and weak.

   Floor 5, the Ferryman's Shore:
   Glacier (the Glacier Golem, an elite elemental: Frost feeds it, Ember hurts it twice over) turns most of a blow from
     ahead, and stomps a line of ice spikes at the mage. The cold it drinks freezes it stiff; a shock then shatters it.
   Hydra (the elite) keeps near the mage, its heads by turns biting or spitting hexing venom; a blow falls on the head that
     last struck, and enough cuts it off. A stump grows back as two heads (five at most), unless fire sears it first.
   Raven (the Gloom Raven) wheels round the mage in a gloom that darkens the mage's sight, caws hexing shots and dives to
     peck. Lit braziers, candle stands and wall lights drive it off.
   Wolf (the Rime Wolf) comes as a pack (`pack`) circling the mage in a ring; by turns one lunges, and now and then one howls
     and the pack is hastened (`sung`, as a lark's song). Fire near them, or burning ground, scatters them.
   Pangolin (the Dust Pangolin) curls into a ball and rolls at the mage; the cantrip glances off it. Into a wall, it lies
     dazed in a cloud of dust that dims the sight, open to twice the harm.
   Kiter (the Frost Jackalope) keeps its distance, bounding away when the mage comes near, stamps out ice shards and rime,
     and slides quick on rime and ice. Burning ground under it stops its leaps.
   Manticore stalks round the mage; its tail rises and looses volleys of hexing spikes, and it crouches and pounces where the
     mage stood. Holy light stills the tail. */
import * as THREE from 'three';
import type { Enemy, Pack, Room } from '../types';
import { G, after, player } from '../state';
import { CFG } from '../config';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { disposeTree, glow, markShared } from '../render/materials';
import { glowTex } from '../render/textures';
import { burst } from '../combat/fx';
import { spawnShot } from '../combat/projectiles';
import { addSpores } from '../world/props';
import { freeSpotNear, isFreeAt } from '../world/rooms';
import { addPool, fireAt, frostAt, poolAt, shockAt } from '../world/pools';
import { boxAt } from '../world/collision';
import { hearGround } from '../world/groundHooks';
import { ringFx, strikeFx } from '../magic/spellFx';
import { steamBetween } from '../magic/steam';
import { mantleShields } from '../magic/shapes';
import { crumble, damageEnemy, hurtPlayer } from '../combat/damage';
import { dropPage } from '../magic/pages';
import { lerp } from '../util';
import { makeEnemy } from './enemies';
import { fallOn, layGround, lob, slipAt, spikeAt } from './bestiaryGround';
import { burningNear, drivenUp, layFire, laySpark } from './foes';
import { brake, light, num, ramp, rush, span, type Aim, type Behaviour, type Params } from './foeKit';
import { counter } from './counters';

export { clearGround, updateGround } from './bestiaryGround';

/** Steer `e` towards (x, z) at `speed`, easing in over `ease` seconds (a flier's swoop rather than a turn on the spot). */
function steer(e: Enemy, x: number, z: number, speed: number, dt: number, ease = 0.25) {
  const dx = x - e.x,
    dz = z - e.z,
    d = Math.hypot(dx, dz) || 1,
    sp = speed * Math.min(1, d / 0.6);
  const k = Math.min(1, dt / ease);
  e.vx = lerp(e.vx, (dx / d) * sp, k);
  e.vz = lerp(e.vz, (dz / d) * sp, k);
}
/** Keep `e` between `near` and `far` of the mage, circling it (`turn` +1 or -1): closer when far, back when near. */
function circle(e: Enemy, a: Aim, near: number, far: number, speed: number, turn: number) {
  const rad = a.dist > far ? 1 : a.dist < near ? -1 : 0,
    side = 0.8;
  const vx = a.ux * rad - a.uz * side * turn,
    vz = a.uz * rad + a.ux * side * turn,
    n = Math.hypot(vx, vz) || 1;
  e.vx = (vx / n) * speed;
  e.vz = (vz / n) * speed;
}
/** Set part `o`'s tilt (rotation.x) to its rest, the look's own (kept the first time), plus `by`: for a part its look's idle
    leaves still, so a pose's offset doesn't pile up step on step. */
function lean(o: THREE.Object3D, by: number) {
  o.userData.rx ??= o.rotation.x;
  o.rotation.x = (o.userData.rx as number) + by;
}
/** The same for how far forward a part reaches (position.z). */
function thrust(o: THREE.Object3D, by: number) {
  o.userData.pz ??= o.position.z;
  o.position.z = (o.userData.pz as number) + by;
}
/** The way `e` faces (body.rotation.y) as a direction on the floor. */
const facing = (e: Enemy) => ({ x: Math.sin(e.face), z: Math.cos(e.face) });
/** A shot from `e` at the mage, a little ahead of it. */
const shoot = (
  e: Enemy,
  ux: number,
  uz: number,
  speed: number,
  size = 0.7,
  o: Parameters<typeof spawnShot>[8] = {},
  color: number = light(e),
) => spawnShot(e.x + ux * 0.35, e.z + uz * 0.35, ux, uz, speed, color, 0.55, size, o);
/** Foes in the current room still standing (and not hidden away), other than `e`. */
const othersAwake = (e: Enemy) =>
  G.room.enemies.some((o) => o !== e && !o.dead && o.state !== 'hidden' && o.state !== 'shut' && o.type !== e.type);

/* ---------- floor 1 ---------- */

/** A crypt spider's thread (one look for all). */
let threadLook: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;
const dropper: Behaviour = {
  init(e, P) {
    e.state = 'hang';
    e.st = span(P.hang) * 0.6;
    e.hidden = true;
    e.contact = 0;
    e.height = num(P.height);
    threadLook ??= {
      geo: markShared(new THREE.CylinderGeometry(0.008, 0.008, 1, 4).translate(0, 0.5, 0)),
      mat: markShared(new THREE.MeshBasicMaterial({ color: 0xe8e4f0, transparent: true, opacity: 0.55 })),
    };
    const thread = new THREE.Mesh(threadLook.geo, threadLook.mat);
    thread.scale.y = 6;
    e.body.add(thread);
    e.extra = thread;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'hang') {
      // up out of reach, creeping after the mage; only its shadow and thread show where
      steer(e, player.x, player.z, num(P.creep) * e.speedMul, dt, 0.4);
      if ((e.st <= 0 && a.dist < num(P.over)) || e.st < -num(P.wait)) {
        e.state = 'tell';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).spiderTell();
      }
    } else if (e.state === 'tell') {
      // it stops above the spot, the shadow darkening
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'drop';
        e.st = num(P.drop);
        e.tele = 0;
      }
    } else if (e.state === 'drop') {
      e.height = num(P.height) * Math.max(0, e.st / num(P.drop)) ** 2;
      if (e.st <= 0) {
        e.height = 0;
        e.hidden = false;
        e.contact = e.foe!.contact;
        e.state = 'ground';
        e.st = span(P.ground);
        e.fireT = span(P.spitEvery) * 0.5;
        burst(e.x, 0.2, e.z, 0x3a3048, 10, 1.6, 0.05);
        G.fx.shake = Math.max(G.fx.shake, 0.08);
        Sfx.at(e.x, e.z).spiderLand();
      }
    } else if (e.state === 'ground') {
      // it skitters at the mage, side to side, and spits webs where the mage stands
      const wob = Math.sin(e.t * 5) * 0.9,
        sp = e.foe!.speed * e.speedMul;
      e.vx = (a.ux - a.uz * wob) * sp;
      e.vz = (a.uz + a.ux * wob) * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.spitRange)) {
        e.state = 'spit';
        e.cycle = num(P.spitTell);
        e.tele = 0;
      }
      if (e.st <= 0) {
        e.state = 'climb';
        e.st = num(P.climb);
        e.contact = 0;
        Sfx.at(e.x, e.z).spiderClimb();
      }
    } else if (e.state === 'spit') {
      e.vx = e.vz = 0;
      e.cycle! -= dt;
      e.tele = ramp(e.cycle!, num(P.spitTell));
      if (e.cycle! <= 0) {
        const tx = player.x + player.vx * 0.4,
          tz = player.z + player.vz * 0.4,
          at = freeSpotNear(room, tx, tz);
        lob(
          room,
          e.x,
          e.z,
          at.x,
          at.z,
          0xd8d0e8,
          0.55,
          (x, z) => {
            layGround(room, 'web', x, z, num(P.webSize), num(P.webTime), e.foe!.id);
            burst(x, 0.1, z, 0xd8d0e8, 6, 1.2, 0.03);
            Sfx.at(x, z).webLand();
          },
          1,
          0.8,
        );
        Sfx.at(e.x, e.z).webSpit();
        e.state = 'ground';
        e.tele = 0;
        e.fireT = span(P.spitEvery);
      }
    } else if (e.state === 'climb') {
      e.vx = e.vz = 0;
      e.height = num(P.height) * (1 - Math.max(0, e.st / num(P.climb)));
      if (e.st < num(P.climb) * 0.5) e.hidden = true;
      if (e.st <= 0) {
        e.state = 'hang';
        e.st = span(P.hang);
      }
    }
  },
  pose(e) {
    e.model!.position.y = e.height ?? 0;
    if (e.extra) {
      e.extra.position.y = (e.height ?? 0) + 0.45;
      e.extra.visible = e.state !== 'ground' && e.state !== 'spit';
    }
  },
};

const splitter: Behaviour = {
  init(e, P) {
    e.state = 'crawl';
    e.fireT = span(P.cloudEvery);
    e.tick = 0;
    e.gen ??= 0;
  },
  step(e, dt, a, P, room) {
    if ((e.tick! -= dt) <= 0) {
      e.tick = num(P.smearEvery);
      layGround(room, 'ink', e.x - a.ux * 0.2, e.z - a.uz * 0.2, num(P.smearSize) * e.scale, num(P.smearTime));
    }
    if (e.state === 'crawl') {
      const surge = 0.55 + 0.45 * Math.max(0, Math.sin(e.t * 3)),
        sp = e.foe!.speed * e.speedMul * surge; // (in surges, as its arms pull)
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.cloudRange)) {
        e.state = 'squirt';
        e.st = num(P.cloudTell);
        Sfx.at(e.x, e.z).inkSwell();
      }
    } else if (e.state === 'squirt') {
      e.vx = e.vz = 0;
      e.st -= dt;
      e.tele = ramp(e.st, num(P.cloudTell));
      if (e.st <= 0) {
        addSpores(room, e.x, e.z, { color: 0x3a1f66, sting: num(P.dim) });
        burst(e.x, 0.4, e.z, 0x2a1848, 14, 2, 0.06);
        Sfx.at(e.x, e.z).inkSquirt();
        e.state = 'crawl';
        e.tele = 0;
        e.fireT = span(P.cloudEvery);
      }
    }
  },
  struck(e, dmg, _by, P, dx, dz) {
    if (!splitsNow(e, dmg, P)) return dmg;
    if ((e.status?.chill ?? 0) > 0) {
      burst(e.x, 0.4, e.z, SCHOOL_LIGHT.frost, 12, 2, 0.05);
      Sfx.at(e.x, e.z).inkCrack();
      counter(e, 'cracked');
      return dmg * num(P.crack);
    } // (chilled, it cracks instead of splitting)
    halve(e, P, dx, dz, 0x2a1848);
    Sfx.at(e.x, e.z).inkSplit(); // (it becomes the one half, and the other slides away across the floor)
    return 0;
  },
};

const tome: Behaviour = {
  init(e) {
    e.state = 'shut';
    e.contact = 0;
    e.flying = false;
    e.animRate = 0;
    e.st = 0;
    e.open = 0;
    e.fireT = 0;
    e.spawn = 0.01;
  },
  step(e, dt, a, P) {
    e.st -= dt;
    if (e.state === 'shut') {
      // a book on the floor
      e.vx = e.vz = 0;
      e.guard = num(P.guard);
      e.animRate = 0;
      const still = !othersAwake(e);
      e.fireT = still ? e.fireT! + dt : 0;
      if (a.dist < num(P.wake) || e.hp < e.maxHp || e.fireT > num(P.lonely)) {
        e.state = 'wake';
        e.st = num(P.rise);
        Sfx.at(e.x, e.z).bookWake();
        burst(e.x, 0.3, e.z, 0xe6d8b8, 8, 1.4, 0.04);
        if (e.hp < e.maxHp) counter(e, 'unmasked');
      }
      return e.face;
    }
    if (e.state === 'wake') {
      e.vx = e.vz = 0;
      e.open = 1 - Math.max(0, e.st / num(P.rise));
      if (e.st <= 0) {
        e.state = 'fly';
        e.flying = true;
        e.contact = e.foe!.contact;
        e.guard = 1;
        e.animRate = 1;
        e.fireT = span(P.riffleEvery);
        e.cycle = span(P.biteEvery);
      }
      return;
    }
    if (e.state === 'fly') {
      const keep = P.keep as number[];
      circle(e, a, keep[0], keep[1], e.foe!.speed * e.speedMul, Math.sin(e.t * 0.4) > 0 ? 1 : -1);
      if ((e.fireT! -= dt) <= 0) {
        e.state = 'riffle';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).pageRiffle();
      } else if ((e.cycle! -= dt) <= 0 && a.dist < num(P.biteRange)) {
        e.state = 'bite';
        e.st = num(P.biteTime);
        e.dir = { x: a.ux, z: a.uz };
        Sfx.at(e.x, e.z).bookSnap();
      }
    } else if (e.state === 'riffle') {
      // it hangs open, pages fluttering, then throws them
      brake(e, 6, dt);
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        const n = num(P.pages),
          base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) {
          const t = base + (i - (n - 1) / 2) * num(P.spread);
          shoot(e, Math.cos(t), Math.sin(t), num(P.pageSpeed), 0.6, {}, 0xe8dcff);
        }
        burst(e.x, 0.8, e.z, 0xe6d8b8, 10, 1.8, 0.04);
        e.state = 'fly';
        e.tele = 0;
        e.fireT = span(P.riffleEvery);
      }
    } else if (e.state === 'bite') {
      rush(e, num(P.bite));
      if (e.st <= 0) {
        e.state = 'fly';
        e.cycle = span(P.biteEvery);
      }
    }
  },
  pose(e) {
    const p = e.parts!,
      o = e.state === 'shut' ? 0 : e.state === 'wake' ? (e.open ?? 0) : 1;
    if (o < 1) {
      p.upper.rotation.x *= o;
      p.lower.rotation.x *= o;
    }
    e.model!.position.y = (o - 1) * 0.72;
  },
  die(e, P) {
    if (G.run.pages.chance(num(P.pageChance))) {
      const at = freeSpotNear(G.room.current, e.x, e.z);
      dropPage(G.room.current, at.x, at.z);
    }
  },
};

/** A swarm's one mind, worked out once a step by whichever of it moves first. */
function think(p: Pack, dt: number, P: Params) {
  if (p.stamp === G.flow.clock) return;
  p.stamp = G.flow.clock;
  const alive = p.members.filter((m) => !m.dead);
  if (!alive.length) return;
  p.st -= dt;
  if (p.state === 'drift') {
    // its centre wanders round the mage, a few tiles off
    p.a += dt * num(P.wheel);
    const [k0, k1] = P.keep as number[],
      keep = (k0 + k1) / 2,
      tx = player.x + Math.cos(p.a) * keep,
      tz = player.z + Math.sin(p.a) * keep * 0.8;
    const d = Math.hypot(tx - p.cx, tz - p.cz) || 1,
      sp = Math.min(d, num(P.drift) * dt);
    p.cx += ((tx - p.cx) / d) * sp;
    p.cz += ((tz - p.cz) / d) * sp;
    if (p.st <= 0) {
      p.state = 'tell';
      p.st = num(P.tell);
      Sfx.at(p.cx, p.cz).swarmGlow();
    }
  } else if (p.state === 'tell') {
    if (p.st <= 0) {
      p.state = 'stream';
      p.st = num(P.dashTime) + alive.length * num(P.gap) + 0.6;
      p.tx = player.x;
      p.tz = player.z;
      alive.forEach((m, i) => {
        m.st = i * num(P.gap);
        m.dir = undefined;
      });
      Sfx.at(p.cx, p.cz).swarmStream();
    }
  } else if (p.state === 'stream' && p.st <= 0) {
    p.state = 'drift';
    p.st = span(P.streamEvery);
  }
}
const swarm: Behaviour = {
  init(e, P) {
    e.state = 'drift';
    e.cycle = Math.random() * Math.PI * 2;
    e.pack ??= {
      members: [e],
      cx: e.x,
      cz: e.z,
      state: 'drift',
      st: span(P.streamEvery),
      stamp: -1,
      tx: 0,
      tz: 0,
      a: Math.random() * 6,
    };
  },
  step(e, dt, _a, P) {
    const p = e.pack!;
    think(p, dt, P);
    e.state = p.state;
    const sp = e.foe!.speed * e.speedMul;
    if (p.state === 'stream') {
      e.st -= dt;
      if (e.st > 0 && !e.dir) {
        steer(e, p.cx, p.cz, sp, dt);
        return;
      }
      if (!e.dir) {
        const dx = p.tx - e.x,
          dz = p.tz - e.z,
          d = Math.hypot(dx, dz) || 1;
        e.dir = { x: dx / d, z: dz / d };
        e.tick = num(P.dashTime);
      }
      if ((e.tick! -= dt) > 0) return rush(e, num(P.dash));
    }
    e.tele = p.state === 'tell' ? Math.min(1, 1 - p.st / num(P.tell)) : 0;
    const i = p.members.indexOf(e),
      n = p.members.length,
      ang = (e.cycle ?? 0) + G.flow.clock * num(P.spin) + (i / n) * Math.PI * 2;
    const R = num(P.orbit) * (0.6 + 0.4 * Math.sin(G.flow.clock * 1.3 + i));
    steer(e, p.cx + Math.cos(ang) * R, p.cz + Math.sin(ang) * R * 0.8, sp, dt, 0.35);
  },
  die(e, P) {
    // a flash of light as it goes out
    burst(e.x, 0.7, e.z, 0xfff4c8, 12, 2.4, 0.05);
    ringFx(e.x, 0.7, e.z, SCHOOL_LIGHT.hallow, 0.1, num(P.flash), 0.3, false, 0.9);
    Sfx.at(e.x, e.z).fireflyPop();
  },
};

/** Where a lark may perch: by a pillar, or close to a wall, away from the mage. */
function perchSpot(room: Room, e: Enemy) {
  const b = room.bounds,
    pillars = room.rocks.filter((r) => r.pillar).map((r) => ({ x: r.x, z: r.z + r.hz + 0.5 }));
  const walls = Array.from({ length: 8 }, () => {
    const side = Math.floor(Math.random() * 4),
      t = Math.random();
    return side === 0
      ? { x: lerp(b.minX + 1, b.maxX - 1, t), z: b.minZ + 0.7 }
      : side === 1
        ? { x: lerp(b.minX + 1, b.maxX - 1, t), z: b.maxZ - 0.7 }
        : side === 2
          ? { x: b.minX + 0.7, z: lerp(b.minZ + 1, b.maxZ - 1, t) }
          : { x: b.maxX - 0.7, z: lerp(b.minZ + 1, b.maxZ - 1, t) };
  });
  const all = [...pillars, ...walls]
    .map((q) => freeSpotNear(room, q.x, q.z))
    .filter((q) => Math.hypot(q.x - player.x, q.z - player.z) > 3.5 && Math.hypot(q.x - e.x, q.z - e.z) > 1.5); // (on the floor, in a carved room too)
  return all[Math.floor(Math.random() * all.length)] ?? freeSpotNear(room, room.cx, room.cz);
}
const singer: Behaviour = {
  init(e) {
    e.state = 'fly';
    e.target = undefined;
    e.fireT = 0;
    e.cycle = 0;
  },
  step(e, dt, a, P, room) {
    const alone = !othersAwake(e);
    if (alone && e.state !== 'dive' && e.state !== 'rise') {
      e.state = 'rise';
      e.st = num(P.diveTell);
      Sfx.at(e.x, e.z).larkCry();
    }
    if (e.state === 'fly') {
      if (!e.target || (e.tick = (e.tick ?? 0) - dt) <= 0) {
        e.target = perchSpot(room, e);
        e.tick = num(P.giveUp);
      } // (a perch it can't reach, it gives up on)
      steer(e, e.target.x, e.target.z, num(P.fly) * e.speedMul, dt, 0.3);
      if (Math.hypot(e.target.x - e.x, e.target.z - e.z) < 0.3) {
        e.state = 'perch';
        e.st = span(P.perch);
        e.fireT = 0.3;
      }
      return Math.atan2(e.vx, e.vz);
    }
    if (e.state === 'perch') {
      // it sings: rings of song, and the foes round it are hastened, unless a hex has silenced it
      brake(e, 8, dt);
      e.st -= dt;
      const hushed = (e.status?.hex ?? 0) > 0;
      if ((e.fireT! -= dt) <= 0 && hushed) {
        e.fireT = num(P.songEvery);
        counter(e, 'hushed');
      } // (it opens its beak, and nothing comes)
      if (e.fireT! <= 0 && !hushed) {
        e.fireT = num(P.songEvery);
        ringFx(e.x, 0.9, e.z, light(e), 0.3, num(P.songRange), 0.8, true, 0.7);
        Sfx.at(e.x, e.z).larkSong();
        for (const o of G.room.enemies)
          if (o !== e && !o.dead && !o.isBoss && Math.hypot(o.x - e.x, o.z - e.z) < num(P.songRange)) {
            o.sung = G.flow.clock + num(P.hasteTime);
            burst(o.x, 0.8, o.z, light(e), 2, 1, 0.03);
          }
      }
      if (a.dist < num(P.flee) || e.st <= 0) {
        e.state = 'fly';
        e.target = perchSpot(room, e);
        Sfx.at(e.x, e.z).wingBeat();
      }
      return;
    }
    if (e.state === 'rise') {
      brake(e, 6, dt);
      e.st -= dt;
      e.tele = ramp(e.st, num(P.diveTell));
      if (e.st <= 0) {
        e.state = 'dive';
        e.st = num(P.diveTime);
        e.dir = { x: a.ux, z: a.uz };
        e.tele = 0;
      }
      return;
    }
    if (e.state === 'dive') {
      const face = rush(e, num(P.dive));
      e.st -= dt;
      if (e.st <= 0) {
        e.state = alone ? 'rise' : 'fly';
        e.st = num(P.diveTell) * 1.5;
        e.target = perchSpot(room, e);
      }
      return face;
    }
  },
  bump(e, hit) {
    if (hit && e.state === 'dive') e.st = 0;
  },
};

const mantis: Behaviour = {
  init(e, P) {
    e.state = 'stalk';
    e.st = span(P.stalk);
    e.count = 0;
  },
  step(e, dt, a, P) {
    e.st -= dt;
    if (e.state === 'stalk') {
      // at arm's length, facing the mage, blades up
      const rad = a.dist > num(P.keep) + 0.4 ? 1 : a.dist < num(P.keep) - 0.4 ? -0.6 : 0,
        side = Math.sin(e.t * 0.7) * 0.5,
        sp = e.foe!.speed * e.speedMul;
      e.vx = (a.ux * rad - a.uz * side) * sp;
      e.vz = (a.uz * rad + a.ux * side) * sp;
      if (e.st <= 0 && a.dist < num(P.keep) + 1.4) {
        e.state = 'rear';
        e.st = num(P.tell);
        e.dir = { x: a.ux, z: a.uz };
        Sfx.at(e.x, e.z).mantisRear();
      }
    } else if (e.state === 'rear') {
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      e.dir = { x: a.ux, z: a.uz };
      if (e.st <= 0) {
        e.state = 'lunge';
        e.st = num(P.lungeTime);
        e.tele = 0;
        Sfx.at(e.x, e.z).mantisSlash();
      }
      return Math.atan2(e.dir.x, e.dir.z);
    } else if (e.state === 'lunge') {
      const face = rush(e, num(P.lunge));
      if (e.st <= 0) {
        e.state = 'open';
        e.st = num(P.open);
        burst(e.x + e.dir!.x * 0.5, 0.6, e.z + e.dir!.z * 0.5, light(e), 8, 2, 0.04);
      }
      return face;
    } else if (e.state === 'open') {
      // overreached: it stands, blades low, its back to whoever comes round
      brake(e, 5, dt);
      if (e.st <= 0) {
        e.state = 'stalk';
        e.st = span(P.stalk);
      }
      return e.face;
    }
  },
  struck(e, dmg, by, P, dx, dz) {
    if (by !== 'cantrip' || (e.state !== 'stalk' && e.state !== 'rear')) return dmg;
    const f = facing(e);
    if (dx * f.x + dz * f.z > -num(P.parryArc)) {
      counter(e, 'flanked');
      return dmg;
    } // (from the side or behind, it lands)
    if ((e.status?.chill ?? 0) > 0 || (e.status?.shock ?? 0) > 0) {
      counter(e, 'numbed');
      return dmg;
    } // (chilled or shocked, it can't parry)
    e.count = (e.count ?? 0) + 1;
    e.face += (Math.random() - 0.5) * 0.3;
    const ux = player.x - e.x,
      uz = player.z - e.z,
      d = Math.hypot(ux, uz) || 1;
    shoot(e, ux / d, uz / d, num(P.parrySpeed), 0.55);
    burst(e.x + f.x * 0.4, 0.8, e.z + f.z * 0.4, light(e), 8, 2.2, 0.035);
    Sfx.at(e.x, e.z).mantisParry();
    return 0;
  },
  pose(e) {
    const p = e.parts!;
    if (e.state === 'rear') p.chest.rotation.x -= (e.tele ?? 0) * 0.35;
    else if (e.state === 'open') p.chest.rotation.x += 0.3;
  },
};

const crab: Behaviour = {
  init(e) {
    e.state = 'hidden';
    e.contact = 0;
    e.animRate = 0;
    e.st = 0;
    e.cycle = 1;
    e.fireT = 0;
    e.spawn = 0.01;
  },
  step(e, dt, a, P) {
    e.st -= dt;
    if (e.state === 'hidden') {
      // a heap of rubble
      e.vx = e.vz = 0;
      e.guard = num(P.hideGuard);
      const still = !othersAwake(e);
      e.fireT = still ? e.fireT! + dt : 0; // (nothing else awake in the room but crabs: it doesn't wait for ever)
      if (a.dist < num(P.wake) || e.hp < e.maxHp || e.fireT > num(P.lonely)) {
        e.state = 'rise';
        e.st = num(P.rise);
        Sfx.at(e.x, e.z).crabWake();
        burst(e.x, 0.2, e.z, 0x7a746c, 10, 1.6, 0.05);
      }
      return e.face;
    }
    if (e.state === 'rise') {
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        e.state = 'sidle';
        e.contact = e.foe!.contact;
        e.animRate = 1;
        e.st = span(P.turn);
        e.fireT = span(P.sparkEvery);
        e.tick = span(P.pinchEvery);
      }
      return;
    }
    if (e.state === 'flipped') {
      // on its back, legs in the air
      e.vx = e.vz = 0;
      e.guard = num(P.flipGuard);
      if (e.st <= 0) {
        e.state = 'sidle';
        e.guard = num(P.guard);
        e.st = span(P.turn);
        Sfx.at(e.x, e.z).crabWake();
      }
      return e.face;
    }
    e.guard = num(P.guard);
    if (e.state === 'sidle') {
      // sideways round the mage, keeping off
      if (e.st <= 0) {
        e.cycle = -(e.cycle ?? 1);
        e.st = span(P.turn);
      }
      circle(e, a, (P.keep as number[])[0], (P.keep as number[])[1], e.foe!.speed * e.speedMul, e.cycle!);
      if ((e.fireT! -= dt) <= 0) {
        e.state = 'spark';
        e.st = num(P.tell);
      } else if ((e.tick! -= dt) <= 0) {
        e.state = 'pinch';
        e.st = num(P.pinchTime);
        e.dir = { x: a.ux, z: a.uz };
        Sfx.at(e.x, e.z).crabSnap();
      }
    } else if (e.state === 'spark') {
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        shoot(e, a.ux, a.uz, num(P.sparkSpeed), 0.6);
        Sfx.at(e.x, e.z).spark();
        burst(e.x, 0.4, e.z, light(e), 6, 1.6, 0.03);
        e.state = 'sidle';
        e.tele = 0;
        e.fireT = span(P.sparkEvery);
      }
    } else if (e.state === 'pinch') {
      rush(e, num(P.pinch));
      if (e.st <= 0) {
        e.state = 'sidle';
        e.tick = span(P.pinchEvery);
      }
    }
  },
  blasted(e, P) {
    if (e.state === 'hidden' || e.state === 'rise') return;
    e.state = 'flipped';
    e.st = num(P.flipped);
    e.vx = e.vz = 0;
    burst(e.x, 0.4, e.z, 0x8e877c, 12, 2.2, 0.05);
    Sfx.at(e.x, e.z).crabFlip();
    counter(e, 'flipped');
  },
  pose(e, P) {
    const flipped = e.state === 'flipped',
      hid = e.state === 'hidden' ? 1 : e.state === 'rise' ? Math.max(0, e.st / num(P.rise)) : 0;
    e.model!.rotation.z = flipped ? Math.PI : 0;
    e.model!.position.y = flipped ? 0.62 : -hid * 0.3; // (hidden, sunk to its shell in the rubble)
    e.parts!.big.visible = e.parts!.small.visible = hid < 0.5;
  },
};

/** M4.5's behaviours, by name (data/foes.json's `behaviour`). */
/* ---------- floor 2 ---------- */

/** The water tile in `room` nearest (x, z) (with `still`, only water not frozen over), if any. */
function nearestWaterTo(room: Room, x: number, z: number, still = false) {
  let best: { x: number; z: number } | undefined,
    d0 = Infinity;
  for (const p of room.pools ?? []) {
    if (p.kind !== 'water' || (still ? p.state !== 'still' : p.state === 'spent')) continue;
    for (const t of p.tiles) {
      const d = Math.hypot(t.x - x, t.z - z);
      if (d < d0) {
        d0 = d;
        best = t;
      }
    }
  }
  return best;
}
/** A pool poured round (x, z): the floor tiles within `n` steps of it (a newt or a serpent brings its own; a walking wave
    leaves one a tile at a time). */
function pour(room: Room, x: number, z: number, n: number) {
  const c = Math.floor(x - room.bounds.minX),
    r = Math.floor(z - room.bounds.minZ),
    tiles: { c: number; r: number }[] = [];
  for (let dr = -n; dr <= n; dr++)
    for (let dc = -n; dc <= n; dc++)
      if (Math.abs(dr) + Math.abs(dc) <= n && room.template.tiles[r + dr]?.[c + dc] === 'floor')
        tiles.push({ c: c + dc, r: r + dr });
  return addPool(room, 'water', tiles);
}
/** Under water: out of reach, not hurting, gliding over what walkers walk round (as the lurker). Up: there to strike. */
function submerge(e: Enemy, under: boolean) {
  e.hidden = under;
  e.flying = under;
  e.contact = under ? 0 : e.foe!.contact;
}

const snail: Behaviour = {
  init(e, P) {
    e.state = 'crawl';
    e.tick = 0;
    e.fireT = span(P.spitEvery);
    e.cycle = 0;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'crawl') {
      // slow, leaving rime: water it crosses freezes, and the mage slides on it
      const sp = e.foe!.speed * e.speedMul;
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if ((e.tick! -= dt) <= 0) {
        e.tick = num(P.trailEvery);
        frostAt(e.x, e.z, 0.2);
        layGround(room, 'rime', e.x - a.ux * 0.35, e.z - a.uz * 0.35, num(P.rimeSize), num(P.rimeTime));
      }
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.spitRange)) {
        shoot(e, a.ux, a.uz, num(P.shotSpeed), 0.75, { chill: num(P.chill) });
        Sfx.at(e.x, e.z).snailSpit();
        e.fireT = span(P.spitEvery);
      }
      if (e.cycle! >= num(P.shellAt)) {
        e.state = 'shell';
        e.st = num(P.shellTime);
        e.cycle = 0;
        e.guard = num(P.shellGuard);
        Sfx.at(e.x, e.z).snailHide();
      }
    } else if (e.state === 'shell') {
      // withdrawn: blows glance off the ice; fire cracks it
      e.vx = e.vz = 0;
      if ((e.status?.burn ?? 0) > 0) {
        e.state = 'cracked';
        e.st = num(P.crackTime);
        e.guard = num(P.crackGuard);
        burst(e.x, 0.6, e.z, SCHOOL_LIGHT.frost, 16, 2.4, 0.06);
        Sfx.at(e.x, e.z).snailCrack();
        counter(e, 'cracked');
      } else if (e.st <= 0) {
        e.state = 'crawl';
        e.guard = 1;
      }
    } else if (e.state === 'cracked') {
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        e.state = 'crawl';
        e.guard = 1;
      }
    }
  },
  struck(e, dmg) {
    if (e.state === 'crawl') e.cycle = (e.cycle ?? 0) + dmg;
    return dmg;
  },
  pose(e) {
    const p = e.parts!,
      hid = e.state !== 'crawl';
    p.head.scale.setScalar(hid ? 0.3 : 1);
    if (hid) p.head.position.z *= 0.25;
  },
};

const newt: Behaviour = {
  init(e, P) {
    const room = G.room.current,
      near = nearestWaterTo(room, e.x, e.z, true); // (the room's water, if it lies near; else a pool of its own)
    if (!near || Math.hypot(near.x - e.x, near.z - e.z) > num(P.roam)) pour(room, e.x, e.z, num(P.poolSize));
    const t = nearestWaterTo(room, e.x, e.z, true);
    if (t) {
      e.x = t.x;
      e.z = t.z;
    }
    e.state = 'swim';
    e.st = span(P.under);
    submerge(e, true);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const pool = poolAt(e.x, e.z);
    if (e.state === 'swim') {
      // a ripple under the water, edging to where its pool comes nearest the mage
      e.kx = e.kz = 0;
      if (pool && (pool.state !== 'still' || pool.charged > 0)) {
        // shocked or frozen over: shown, and dazed
        e.state = 'stunned';
        e.st = num(P.stun);
        submerge(e, false);
        e.contact = 0;
        e.vx = e.vz = 0;
        Sfx.at(e.x, e.z).newtStun();
        burst(e.x, 0.3, e.z, SCHOOL_LIGHT.frost, 10, 1.8, 0.04);
        counter(e, 'flushed');
        return;
      }
      let t = nearestWaterTo(room, e.x, e.z, true) ?? { x: e.x, z: e.z }; // (slipped past its pool's edge: back into it)
      if (pool) {
        let d0 = Infinity;
        for (const w of pool.tiles) {
          const d = Math.hypot(w.x - player.x, w.z - player.z);
          if (d < d0) {
            d0 = d;
            t = w;
          }
        }
      } // (it keeps to its own pool)
      steer(e, t.x, t.z, e.foe!.speed * e.speedMul, dt);
      if (Math.random() < dt * 5) burst(e.x, 0.04, e.z, 0xbfe8ff, 1, 0.5, 0.03);
      if (e.st <= 0 && a.dist < num(P.reach)) {
        e.state = 'lunge';
        e.st = num(P.lungeTime);
        e.dir = { x: a.ux, z: a.uz };
        submerge(e, false);
        e.contact = 0;
        Sfx.at(e.x, e.z).newtLunge();
        burst(e.x, 0.2, e.z, 0xbfe8ff, 10, 2, 0.04);
      } else if (e.st < -num(P.patience)) {
        e.state = 'hunt';
        e.st = num(P.hunt);
        submerge(e, false);
        burst(e.x, 0.2, e.z, 0xbfe8ff, 10, 2, 0.04);
      } // (the mage keeps off the water: it comes out after it)
    } else if (e.state === 'hunt') {
      // out on dry floor, seen, scurrying at the mage until it can lunge
      const wob = Math.sin(e.t * 7) * 0.7,
        sp = e.foe!.speed * e.speedMul;
      e.vx = (a.ux - a.uz * wob) * sp;
      e.vz = (a.uz + a.ux * wob) * sp;
      if (a.dist < num(P.reach) * 0.8) {
        e.state = 'lunge';
        e.st = num(P.lungeTime);
        e.dir = { x: a.ux, z: a.uz };
        e.contact = 0;
        Sfx.at(e.x, e.z).newtLunge();
      } else if (e.st <= 0) e.state = 'back';
    } else if (e.state === 'lunge') {
      // out of the water at the mage: a cold bite
      const face = rush(e, num(P.lunge));
      if (a.dist < e.r + player.r + 0.05 && !mantleShields(e)) {
        if (hurtPlayer(e.foe!.contact, e.x, e.z)) player.chill = Math.max(player.chill, num(P.chill));
        e.st = 0;
      }
      if (e.st <= 0) {
        e.state = 'land';
        e.st = span(P.land);
        e.contact = e.foe!.contact;
      }
      return face;
    } else if (e.state === 'land' || e.state === 'stunned') {
      // on dry floor, quick and seen; or dazed
      if (e.state === 'stunned') {
        e.vx = e.vz = 0;
      } else {
        const wob = Math.sin(e.t * 6) * 0.8,
          sp = e.foe!.speed * e.speedMul;
        e.vx = (-a.uz * wob - a.ux * 0.3) * sp;
        e.vz = (a.ux * wob - a.uz * 0.3) * sp;
      }
      if (e.st <= 0) {
        e.state = 'back';
        e.contact = e.foe!.contact;
      }
    } else if (e.state === 'back') {
      // back to the water, if any is still open
      const t = nearestWaterTo(room, e.x, e.z, true);
      if (!t) {
        e.state = 'land';
        e.st = 1;
        return;
      }
      steer(e, t.x, t.z, e.foe!.speed * e.speedMul * 1.3, dt);
      if (Math.hypot(t.x - e.x, t.z - e.z) < 0.3 && pool?.state === 'still' && !(pool.charged > 0)) {
        e.state = 'swim';
        e.st = span(P.under);
        submerge(e, true);
      }
    }
  },
  /** Blasted or scalded out of its water: shown, and dazed, as a shocked pool leaves it. */
  driven(e, P, why) {
    if (e.state !== 'swim') return;
    e.state = 'stunned';
    e.st = num(P.stun);
    submerge(e, false);
    e.contact = 0;
    e.vx = e.vz = 0;
    drivenUp(e, why);
    counter(e, why === 'shock' ? 'flushed' : 'driven');
  },
  pose(e) {
    e.model!.visible = !e.hidden;
  },
};

const serpent: Behaviour = {
  init(e, P) {
    const room = G.room.current;
    if (!nearestWaterTo(room, e.x, e.z)) pour(room, e.x, e.z, num(P.poolSize));
    const t = nearestWaterTo(room, e.x, e.z);
    if (t) {
      e.x = t.x;
      e.z = t.z;
    }
    e.state = 'under';
    e.st = span(P.under) * 0.5;
    submerge(e, true);
    e.open = 0;
    e.target = { x: e.x, z: e.z };
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    e.kx = e.kz = 0; // (anchored in its pool)
    const frozen = poolAt(e.x, e.z)?.state === 'frozen';
    if (e.state === 'under' && (poolAt(e.x, e.z)?.charged ?? 0) > 0) {
      this.driven!(e, P, 'shock');
      return;
    } // (a shock through its water)
    if (e.state === 'under') {
      // beneath the water, sliding to the place in it nearest the mage
      const t = e.target!;
      steer(e, t.x, t.z, e.foe!.speed * e.speedMul, dt, 0.2);
      if (Math.random() < dt * 6) burst(e.x, 0.05, e.z, 0x9fe4ff, 1, 0.5, 0.03);
      if (frozen) {
        e.state = 'trapped';
        e.st = num(P.trapped);
        submerge(e, false);
        e.open = 1;
        e.cycle = 1;
        e.fireT = 0.4;
        e.vx = e.vz = 0;
        Sfx.at(e.x, e.z).freeze();
        counter(e, 'iced');
        return;
      }
      if (e.st < -num(P.lost) && !e.count) {
        // kept from that place a while: the water nearest itself instead (and kept from that too, it rises where it is)
        const w = nearestWaterTo(room, e.x, e.z);
        e.target = w ? { x: w.x, z: w.z } : { x: e.x, z: e.z };
        e.st = 0;
        e.count = 1;
      } else if ((e.st <= 0 && Math.hypot(t.x - e.x, t.z - e.z) < 0.3) || e.st < -num(P.lost)) {
        e.state = 'rise';
        e.st = num(P.rise);
        e.vx = e.vz = 0;
        Sfx.at(e.x, e.z).serpentRise();
      }
    } else if (e.state === 'rise') {
      e.vx = e.vz = 0;
      e.open = ramp(e.st, num(P.rise));
      e.tele = e.open;
      if (e.open > 0.5 && e.hidden) submerge(e, false);
      if (e.st <= 0) {
        e.state = 'up';
        e.st = num(P.up);
        e.fireT = 0.25;
        e.cycle = num(P.volleys);
        e.tele = 0;
      }
    } else if (e.state === 'up' || e.state === 'trapped') {
      // coiled up out of the water, spitting fans of brine; held in ice, it can't sink
      e.vx = e.vz = 0;
      e.open = 1;
      if (frozen && e.state === 'up') {
        e.state = 'trapped';
        e.st = Math.max(e.st, num(P.trapped));
      }
      if (e.cycle! > 0 && (e.fireT! -= dt) <= 0) {
        const n = num(P.shots),
          base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) {
          const t = base + (i - (n - 1) / 2) * num(P.spread);
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.7);
        } // (brine: it doesn't freeze its own pool)
        burst(e.x, 1, e.z, light(e), 6, 1.4, 0.04);
        Sfx.at(e.x, e.z).serpentSpit();
        e.cycle! -= 1;
        e.fireT = num(P.volleyGap);
      }
      if (e.st <= 0 && !frozen) {
        e.state = 'sink';
        e.st = num(P.rise) * 0.7;
        Sfx.at(e.x, e.z).lurkerDive();
      } else if (e.state === 'trapped' && e.st <= 0) {
        e.st = num(P.trapped);
        e.cycle = 1;
      } // (it spits now and then while it waits for the thaw)
    } else if (e.state === 'sink') {
      e.vx = e.vz = 0;
      e.open = Math.max(0, e.st / (num(P.rise) * 0.7));
      if (e.open < 0.5 && !e.hidden) submerge(e, true);
      if (e.st <= 0) {
        e.state = 'under';
        e.st = span(P.under);
        e.count = 0;
        const t = nearestWaterTo(room, player.x, player.z);
        e.target = t ? { x: t.x, z: t.z } : { x: e.x, z: e.z };
      }
    }
  },
  /** Blasted, scalded or shocked up out of its water: coiled in the open a while (it still spits), then it sinks. */
  driven(e, P, why) {
    if (e.state !== 'under' && e.state !== 'sink') return;
    e.state = 'trapped';
    e.st = num(P.stranded);
    submerge(e, false);
    e.open = 1;
    e.cycle = 1;
    e.fireT = 0.7;
    e.vx = e.vz = 0;
    e.tele = 0;
    drivenUp(e, why);
    counter(e, 'driven');
  },
  pose(e) {
    const o = e.open ?? 0,
      p = e.parts!;
    p.body.position.y = (o - 1) * 1.4;
    p.body.visible = o > 0.02; // (beneath the floor, it can't be seen)
    p.pool.visible = poolAt(e.x, e.z)?.state !== 'frozen'; // (its dark water shows the ice when its pool freezes)
  },
};

/** A walking wave's ice, while the water under it is frozen: one shared block of ice. */
let iceBlock: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;
function encase(e: Enemy, on: boolean, scale = 1) {
  if (!on) {
    if (e.extra) {
      e.body.remove(e.extra);
      e.extra = undefined;
    }
    return;
  }
  iceBlock ??= {
    geo: markShared(new THREE.IcosahedronGeometry(0.62, 0).scale(1, 1.6, 1).translate(0, 0.75, 0)),
    mat: markShared(
      new THREE.MeshStandardMaterial({
        color: 0xcfeaf8,
        emissive: 0x1a3a50,
        roughness: 0.08,
        metalness: 0.3,
        transparent: true,
        opacity: 0.55,
        flatShading: true,
      }),
    ),
  };
  const m = new THREE.Mesh(iceBlock.geo, iceBlock.mat);
  m.scale.setScalar(scale);
  e.body.add(m);
  e.extra = m;
}

const wave: Behaviour = {
  init(e, P) {
    e.state = 'walk';
    e.tick = num(P.pourEvery);
    e.fireT = span(P.slamEvery);
    e.cycle = 0;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state !== 'ice' && poolAt(e.x, e.z)?.state === 'frozen') {
      // the water under it froze, and it with it
      e.state = 'ice';
      e.st = num(P.ice);
      e.vx = e.vz = 0;
      e.contact = 0;
      e.tele = 0;
      encase(e, true);
      Sfx.at(e.x, e.z).freeze();
      return;
    }
    if (e.state === 'walk') {
      // it walks, and the floor it leaves is wet
      const sp = e.foe!.speed * e.speedMul;
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if ((e.tick! -= dt) <= 0) {
        e.tick = num(P.pourEvery);
        if (e.cycle! < num(P.pourMax) && !poolAt(e.x, e.z) && pour(room, e.x, e.z, 0)) e.cycle! += 1;
      }
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.slamRange)) {
        e.state = 'rear';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).waveRear();
      }
    } else if (e.state === 'rear') {
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        // it crashes down: a ring of brine
        const n = num(P.ring),
          a0 = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) {
          const t = a0 + (i / n) * Math.PI * 2;
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.7);
        } // (brine, not cold: its puddles stay water)
        ringFx(e.x, 0.1, e.z, light(e), 0.3, 2.2, 0.5, true);
        burst(e.x, 0.4, e.z, 0xbfe8ff, 16, 2.6, 0.05);
        Sfx.at(e.x, e.z).waveCrash();
        e.state = 'walk';
        e.tele = 0;
        e.fireT = span(P.slamEvery);
      }
    } else if (e.state === 'ice') {
      // ice, still and harmless (a shock shatters it: `afflicted`)
      e.vx = e.vz = 0;
      if (e.st <= 0 || poolAt(e.x, e.z)?.state !== 'frozen') {
        encase(e, false);
        e.state = 'walk';
        e.contact = e.foe!.contact;
        e.fireT = span(P.slamEvery);
      }
    }
  },
  pose(e) {
    if (e.state === 'rear') e.parts!.body.scale.y *= 1 + (e.tele ?? 0) * 0.35;
    e.animRate = e.state === 'ice' ? 0 : 1;
  }, // (frozen, its swirl stops)
  afflicted(e, kind, P) {
    if (kind === 'chill' && e.state !== 'ice') {
      if (!poolAt(e.x, e.z)) pour(G.room.current, e.x, e.z, 0);
      frostAt(e.x, e.z);
      return;
    } // (it drinks the cold, but the water it stands in stiffens, and it with it)
    if (kind !== 'shock' || e.state !== 'ice') return;
    encase(e, false);
    e.state = 'walk';
    e.contact = e.foe!.contact;
    e.fireT = span(P.slamEvery);
    burst(e.x, 0.8, e.z, 0xcfeaf8, 24, 3, 0.07);
    Sfx.at(e.x, e.z).iceShatter();
    counter(e, 'shattered');
    damageEnemy(e, e.maxHp * num(P.shatter), 0, 0, 0, 'spell', 'storm');
  },
  die(e) {
    encase(e, false);
  },
};

const cloud: Behaviour = {
  init(e, P) {
    e.state = 'drift';
    e.st = span(P.rest);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'drift') {
      // it drifts after the mage, slower than the mage walks
      steer(e, player.x, player.z, e.foe!.speed * e.speedMul, dt, 0.8);
      if (e.st <= 0 && a.dist < num(P.over)) {
        e.state = 'gather';
        e.st = num(P.gather);
        Sfx.at(e.x, e.z).thunderGather();
      }
    } else if (e.state === 'gather') {
      // it darkens over the mage
      brake(e, 4, dt);
      e.tele = ramp(e.st, num(P.gather));
      if (e.st <= 0) {
        e.state = 'rain';
        e.st = num(P.rain);
        e.cycle = num(P.sparks);
        e.tele = 0;
        shockAt(e.x, e.z);
        Sfx.at(e.x, e.z).thunder();
      }
    } else if (e.state === 'rain') {
      // sparks rain on the floor under it; they arm, and water carries them
      e.vx = e.vz = 0;
      if (e.cycle! > 0 && e.st < ((e.cycle! - 1) * num(P.rain)) / num(P.sparks) + 0.01) {
        const ang = Math.random() * Math.PI * 2,
          r = Math.sqrt(Math.random()) * num(P.reach),
          x = e.x + Math.cos(ang) * r,
          z = e.z + Math.sin(ang) * r;
        laySpark(room, x, z, num(P.sparkTime));
        strikeFx({ x, y: 1.2, z }, { x, y: 0.05, z }, light(e), 0.22, true);
        e.cycle! -= 1;
      }
      if (e.st <= 0) {
        e.state = 'drift';
        e.st = span(P.rest);
      }
    }
  },
  pose(e) {
    const p = e.parts!;
    if (e.state === 'gather') p.cloud.scale.setScalar(1 + (e.tele ?? 0) * 0.25);
    else p.cloud.scale.setScalar(1);
  },
};

const darter: Behaviour = {
  init(e, P) {
    e.state = 'hover';
    e.st = span(P.hover);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'hover') {
      // hanging in the air at the turn; chilled, it hangs on
      brake(e, 6, dt);
      if (e.st <= 0 && (e.status?.chill ?? 0) > 0) counter(e, 'numbed');
      if (e.st <= 0 && !((e.status?.chill ?? 0) > 0)) {
        const t = Math.atan2(a.uz, a.ux) + (Math.random() - 0.5) * 2 * num(P.aim);
        e.dir = { x: Math.cos(t), z: Math.sin(t) };
        e.state = 'dash';
        e.st = num(P.dashMax);
        e.tick = 0;
        Sfx.at(e.x, e.z).darterZip();
      }
    } else if (e.state === 'dash') {
      // straight as a bolt to the wall, a line of sparks behind it
      const face = rush(e, num(P.dash));
      if ((e.tick! -= dt) <= 0) {
        e.tick = num(P.sparkEvery);
        laySpark(room, e.x, e.z, num(P.sparkTime));
      }
      if (e.st <= 0) {
        e.state = 'hover';
        e.st = span(P.hover);
      }
      return face;
    }
  },
  bump(e, hit, P) {
    if (hit && e.state === 'dash' && e.st < num(P.dashMax) - 0.15) {
      e.state = 'hover';
      e.st = span(P.hover);
      e.vx = e.vz = 0;
      burst(e.x, 0.8, e.z, light(e), 6, 1.6, 0.03);
    }
  },
};

const mine: Behaviour = {
  init(e) {
    e.state = 'shamble';
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if ((e.status?.burn ?? 0) > 0 && e.state !== 'pop' && e.state !== 'gone') {
      e.state = 'pop';
      e.st = 0.15;
      e.tele = 1;
      e.vx = e.vz = 0;
      counter(e, 'popped');
    } // (fire bursts it where it stands, and burns its spores)
    if (e.state === 'shamble') {
      const wob = Math.sin(e.t * 2.2) * 0.6,
        sp = e.foe!.speed * e.speedMul;
      e.vx = (a.ux - a.uz * wob) * sp;
      e.vz = (a.uz + a.ux * wob) * sp;
      if (a.dist < num(P.trigger)) {
        e.state = 'swell';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).sporeSwell();
      }
    } else if (e.state === 'swell') {
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        addSpores(room, e.x + a.ux * 0.5, e.z + a.uz * 0.5, { color: SCHOOL_LIGHT.umbral, sting: num(P.dim) }); // (it bursts towards the mage)
        const n = num(P.ring);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.6);
        }
        burst(e.x, 0.7, e.z, SCHOOL_LIGHT.umbral, 18, 2.6, 0.06);
        Sfx.at(e.x, e.z).sporePuff();
        e.state = 'gone';
        damageEnemy(e, e.maxHp * 9, 0, 0);
      }
    } else if (e.state === 'pop' && e.st <= 0) {
      burst(e.x, 0.7, e.z, 0xff9a3a, 14, 2.2, 0.05);
      Sfx.at(e.x, e.z).webBurn();
      e.state = 'gone';
      damageEnemy(e, e.maxHp * 9, 0, 0);
    }
  },
  pose(e) {
    if (e.state === 'swell' || e.state === 'pop') e.parts!.ball.scale.multiplyScalar(1 + (e.tele ?? 0) * 0.45);
  },
};

/* ---------- floor 3 ---------- */

/** A spot against the stone wall nearest (x, z) in `room` (not the low south wall), and the way out from it: on floor with
    the wall behind, clear of the north wall's pilasters and niches, open to the room `wallOpen` units in front (no pillar or
    tomb hiding it from the mage's bolts) and `wallApart` from `others` (another nest). Along the nearest wall first, then
    the others; the nearest free spot if no wall has one. */
function againstWall(room: Room, x: number, z: number, others: readonly { x: number; z: number }[] = []) {
  const b = room.bounds,
    C = CFG.bestiary,
    sides = [
      { d: x - b.minX, x: b.minX + 0.55, z, ox: 1, oz: 0 },
      { d: b.maxX - x, x: b.maxX - 0.55, z, ox: -1, oz: 0 },
      { d: z - b.minZ, x, z: b.minZ + 0.55, ox: 0, oz: 1 },
    ].sort((p, q) => p.d - q.d);
  const solid = (px: number, pz: number) =>
    room.rocks.some((r) => Math.abs(px - r.x) < r.hx + 0.25 && Math.abs(pz - r.z) < r.hz + 0.25);
  const inside = (px: number, pz: number) =>
    px > b.minX &&
    px < b.maxX &&
    pz > b.minZ &&
    pz < b.maxZ &&
    room.template.tiles[Math.floor(pz - b.minZ)]?.[Math.floor(px - b.minX)] !== 'void';
  for (const s of sides) {
    const dressed = s.oz === 1 ? (room.dressed ?? []).filter((w) => Math.abs(w.z - s.z) < 1.5) : [];
    for (const o of [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1, 2.8, -2.8, 3.5, -3.5, 4.2, -4.2, 4.9, -4.9]) {
      const px = s.x + (s.oz ? o : 0),
        pz = s.z + (s.ox ? o : 0);
      if (!isFreeAt(room, px, pz) || inside(px - s.ox * 0.9, pz - s.oz * 0.9)) continue; // (on floor, the wall behind it)
      if (
        dressed.some((w) => Math.abs(w.x - px) < 0.75) ||
        others.some((n) => Math.hypot(n.x - px, n.z - pz) < C.wallApart)
      )
        continue;
      let open = true;
      for (let t = 0.5; t <= C.wallOpen && open; t += 0.3) {
        const qx = px + s.ox * t,
          qz = pz + s.oz * t;
        if (!inside(qx, qz) || solid(qx, qz)) open = false;
      }
      if (open) return { x: px, z: pz, ox: s.ox, oz: s.oz };
    }
  }
  const s = sides[0],
    at = freeSpotNear(room, s.x, s.z);
  return { x: at.x, z: at.z, ox: s.ox, oz: s.oz };
}
/** The live foes `e` made (a nest's wasps, a golem's stones). */
const broodOf = (e: Enemy) => G.room.enemies.filter((o) => o.owner === e && !o.dead);

const nest: Behaviour = {
  // the Ember Wasps' nest
  init(e, P) {
    const w = againstWall(
      G.room.current,
      e.x,
      e.z,
      G.room.enemies.filter((o) => o !== e && !o.dead && o.foe?.behaviour === 'nest'),
    );
    e.x = w.x;
    e.z = w.z;
    e.dir = { x: w.ox, z: w.oz };
    e.fireT = num(P.first);
    e.contact = 0;
  },
  step(e, dt, _a, P) {
    e.vx = e.vz = e.kx = e.kz = 0; // (set in the wall)
    if ((e.fireT! -= dt) <= 0) {
      e.fireT = span(P.every);
      if (broodOf(e).length < num(P.brood)) {
        const w = makeEnemy('emberWasp', e.x + e.dir!.x * 0.7, e.z + e.dir!.z * 0.7, e.maxHp / e.foe!.hp);
        w.owner = e;
        w.spawn = 0.25;
        burst(e.x + e.dir!.x * 0.4, 0.6, e.z + e.dir!.z * 0.4, light(e), 8, 1.6, 0.04);
        Sfx.at(e.x, e.z).waspOut();
      }
    }
    return Math.atan2(e.dir!.x, e.dir!.z);
  },
  struck(e, dmg, _by, P, _dx, _dz, school) {
    if (school === 'ember') counter(e, 'burnt');
    return school === 'ember' ? dmg : dmg * num(P.guard);
  }, // (paper: fire burns it, little else harms it)
};

const wasp: Behaviour = {
  // the Ember Wasp
  init(e, P) {
    e.state = 'hover';
    e.st = span(P.hover);
    e.cycle = Math.random() < 0.5 ? 1 : -1;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'hover') {
      // weaving round the mage
      circle(e, a, num(P.keep) - 0.6, num(P.keep) + 0.6, e.foe!.speed * e.speedMul, e.cycle!);
      if (e.st <= 0) {
        e.state = 'tell';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).waspTell();
      }
    } else if (e.state === 'tell') {
      // it hangs, its sting curled
      brake(e, 8, dt);
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'dash';
        e.st = num(P.dashTime);
        e.dir = { x: a.ux, z: a.uz };
        e.tele = 0;
      }
    } else if (e.state === 'dash') {
      // straight at the mage: the sting burns the ground where it lands
      const face = rush(e, num(P.dash));
      if (a.dist < e.r + player.r + 0.05 && !mantleShields(e)) {
        if (hurtPlayer(e.foe!.contact, e.x, e.z)) layFire(room, player.x, player.z, num(P.burn));
        e.st = 0;
      }
      if (e.st <= 0) {
        e.state = 'hover';
        e.st = span(P.hover);
        e.cycle = -e.cycle!;
      }
      return face;
    }
  },
  bump(e, hit, P) {
    if (hit && e.state === 'dash' && e.st < num(P.dashTime) - 0.15) {
      e.state = 'hover';
      e.st = span(P.hover);
    }
  },
  pose(e) {
    if (e.state === 'tell') e.parts!.tail.rotation.x += (e.tele ?? 0) * 0.9;
  },
};

/** The braziers in `room`, and the one nearest (x, z) that is (or isn't) lit. */
function brazierNear(room: Room, x: number, z: number, lit: boolean) {
  let best: { x: number; z: number } | undefined,
    d0 = Infinity;
  for (const b of room.props ?? [])
    if (b.prop.kind === 'brazier' && !!b.prop.lit === lit) {
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < d0) {
        d0 = d;
        best = b;
      }
    }
  return best;
}
const djinn: Behaviour = {
  // the Cinder Djinn (an elemental: Ember feeds it, Frost hurts it twice over)
  init(e, P) {
    e.state = 'flit';
    e.fireT = span(P.hurlEvery);
    e.tick = 0;
    e.cycle = 1;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'cinder') {
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        e.state = 'flit';
        e.flying = true;
        e.contact = e.foe!.contact;
        burst(e.x, 0.4, e.z, light(e), 12, 2, 0.05);
        Sfx.at(e.x, e.z).djinnLight();
      }
      return;
    }
    const sp = e.foe!.speed * e.speedMul,
      cold = brazierNear(room, e.x, e.z, false),
      warm = brazierNear(room, e.x, e.z, true);
    if (cold) {
      // brazier to brazier, lighting them
      steer(e, cold.x, cold.z, sp, dt, 0.3);
      if (Math.hypot(cold.x - e.x, cold.z - e.z) < 0.8) {
        fireAt(cold.x, cold.z, 0.3);
        burst(cold.x, 0.9, cold.z, light(e), 10, 2, 0.05);
        Sfx.at(cold.x, cold.z).djinnLight();
      }
    } else if (warm && e.hp < e.maxHp * num(P.rest)) {
      // hurt, it sits in a lit brazier's fire and mends
      steer(e, warm.x, warm.z, sp, dt, 0.3);
      if (Math.hypot(warm.x - e.x, warm.z - e.z) < 0.8) {
        e.hp = Math.min(e.maxHp, e.hp + num(P.heal) * dt);
        if (Math.random() < dt * 6) burst(e.x, 0.9, e.z, light(e), 2, 1.2, 0.03);
      }
    } else circle(e, a, num(P.keep) - 0.6, num(P.keep) + 0.6, sp, e.cycle!);
    if ((e.tick! -= dt) <= 0) {
      e.tick = 0.25;
      fireAt(e.x, e.z, 0.2);
    } // (the oil it crosses catches)
    if ((e.fireT! -= dt) <= 0 && a.dist < num(P.hurlRange)) {
      // an arc of fire, landing burning where the mage stood
      e.fireT = span(P.hurlEvery);
      Sfx.at(e.x, e.z).djinnHurl();
      lob(
        room,
        e.x,
        e.z,
        player.x,
        player.z,
        0xff7a2a,
        num(P.hurlTime),
        (x, z) => {
          layFire(room, x, z, num(P.fireTime), e.foe!.id);
          burst(x, 0.2, z, 0xff7a2a, 10, 2, 0.05);
          Sfx.at(x, z).flare();
        },
        1.6,
        1.4,
      );
    }
  },
  afflicted(e, kind, P) {
    // frost snuffs it to a cinder for a while
    if (kind !== 'chill' || e.state === 'cinder') return;
    e.state = 'cinder';
    e.st = num(P.snuff);
    e.flying = false;
    e.contact = 0;
    e.vx = e.vz = 0;
    burst(e.x, 0.4, e.z, 0x5a5048, 12, 1.6, 0.05);
    Sfx.at(e.x, e.z).djinnSnuff();
    counter(e, 'snuffed');
  },
  pose(e) {
    if (e.state === 'cinder') {
      e.parts!.body.scale.setScalar(0.55);
      e.parts!.body.position.y = 0.12;
    }
  },
};

/** `e` splits in two (an ink octopus, a magma ooze): it becomes the one half, smaller, and the other slides away. */
function halve(e: Enemy, P: Params, dx: number, dz: number, color: number) {
  const k = num(P.splitScale),
    hp = e.maxHp * num(P.splitHp);
  e.gen = 1;
  e.hp = hp;
  e.scale *= k;
  e.r *= k;
  e.kx += -dz * 3;
  e.kz += dx * 3;
  const at = freeSpotNear(G.room.current, e.x + dz * 0.6, e.z - dx * 0.6),
    twin = makeEnemy(e.type, at.x, at.z);
  twin.gen = 1;
  twin.maxHp = e.maxHp;
  twin.hp = hp;
  twin.scale = e.scale;
  twin.r = e.r;
  twin.spawn = 0.15;
  twin.kx = dz * 3;
  twin.kz = -dx * 3;
  e.purse = twin.purse = (e.purse ?? 0) / 2; // (M6: the two halves share one purse)
  burst(e.x, 0.4, e.z, color, 18, 2.4, 0.06);
}
const splitsNow = (e: Enemy, dmg: number, P: Params) =>
  !((e.gen ?? 0) > 0 || e.hp - dmg > e.maxHp * num(P.splitAt) || e.hp - dmg <= 0);

const ooze: Behaviour = {
  // the Magma Ooze (an elemental: Ember feeds it, Frost hurts it twice over)
  init(e) {
    e.state = 'slide';
    e.tick = 0;
    e.gen ??= 0;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'rock') {
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        e.state = 'slide';
        e.contact = e.foe!.contact;
      }
      return;
    }
    const surge = 0.6 + 0.4 * Math.max(0, Math.sin(e.t * 2.4)),
      sp = e.foe!.speed * e.speedMul * surge;
    e.vx = a.ux * sp;
    e.vz = a.uz * sp;
    if ((e.tick! -= dt) <= 0) {
      e.tick = num(P.trailEvery);
      layFire(room, e.x - a.ux * 0.3 * e.scale, e.z - a.uz * 0.3 * e.scale, num(P.trailTime));
    }
  },
  struck(e, dmg, _by, P, dx, dz) {
    if (e.state === 'rock') {
      e.state = 'slide';
      e.contact = e.foe!.contact;
      burst(e.x, 0.4, e.z, 0x5a524a, 22, 2.8, 0.07);
      Sfx.at(e.x, e.z).rockShatter();
      return dmg * num(P.shatter);
    } // (hard as rock, a blow shatters it)
    if (!splitsNow(e, dmg, P)) return dmg;
    halve(e, P, dx, dz, 0xff6a20);
    Sfx.at(e.x, e.z).magmaSplit();
    return 0;
  },
  afflicted(e, kind, P) {
    if (kind === 'chill' && e.state !== 'rock') {
      counter(e, 'cooled');
      e.state = 'rock';
      e.st = num(P.rock);
      e.contact = 0;
      e.vx = e.vz = 0;
      burst(e.x, 0.4, e.z, 0x8a8478, 10, 1.4, 0.05);
      Sfx.at(e.x, e.z).freeze();
    }
  },
  pose(e) {
    e.animRate = e.state === 'rock' ? 0 : 1;
  }, // (hard, it stops churning)
};

/** A fallen phoenix's ashes: a low grey heap, embers glowing in it (one heap's geometry and material for all). */
let ash: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;
function ashes(e: Enemy, on: boolean) {
  if (e.extra) {
    e.body.remove(e.extra);
    disposeTree(e.extra);
    e.extra = undefined;
  }
  if (!on) return;
  ash ??= {
    geo: markShared(new THREE.ConeGeometry(0.5, 0.28, 9).translate(0, 0.14, 0)),
    mat: markShared(
      new THREE.MeshStandardMaterial({ color: 0xa8a098, emissive: 0x3a1408, roughness: 1, flatShading: true }),
    ),
  };
  const g = new THREE.Group(),
    embers = glow(0xff6a20, 1.4, 0.85);
  embers.position.y = 0.22; // (pale ash, embers glowing in it: it reads on a dark floor)
  g.add(new THREE.Mesh(ash.geo, ash.mat), embers);
  e.body.add(g);
  e.extra = g;
}
/** Its ashes put out (frozen, or scattered by a blast): it can't rise again, and falls for good. */
function snuffAshes(e: Enemy) {
  if (e.state !== 'ashes' || e.dead) return;
  e.gen = 2;
  ashes(e, false);
  burst(e.x, 0.3, e.z, 0x8a8478, 16, 2, 0.05);
  Sfx.at(e.x, e.z).djinnSnuff();
  counter(e, 'quenched');
  damageEnemy(e, e.hp + 1, 0, 0);
}
// frost reaching a phoenix's ashes puts them out
hearGround((kind, x, z, r) => {
  if (kind !== 'frost') return;
  for (const e of G.room.enemies)
    if (e.state === 'ashes' && e.foe?.behaviour === 'phoenix' && Math.hypot(e.x - x, e.z - z) < r + 0.6) snuffAshes(e);
});
const phoenix: Behaviour = {
  init(e, P) {
    e.state = 'circle';
    e.st = span(P.circleTime);
    e.fireT = span(P.featherEvery);
    e.gen = 0;
    e.cycle = Math.random() < 0.5 ? 1 : -1;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const feathers = (dirA: number) => {
      const n = num(P.feathers);
      for (let i = 0; i < n; i++) {
        const t = dirA + (i - (n - 1) / 2) * num(P.spread);
        shoot(e, Math.cos(t), Math.sin(t), num(P.featherSpeed), 0.7, { fire: true });
      }
      Sfx.at(e.x, e.z).flare();
    };
    if (e.state === 'circle') {
      // wheeling round the mage, now and then shedding a fan of fire feathers
      circle(e, a, num(P.orbit) - 0.6, num(P.orbit) + 0.6, e.foe!.speed * e.speedMul, e.cycle!);
      if ((e.fireT! -= dt) <= 0) {
        e.fireT = span(P.featherEvery);
        feathers(Math.atan2(a.uz, a.ux));
      }
      if (e.st <= 0) {
        e.state = 'rise';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).phoenixCry();
      }
    } else if (e.state === 'rise') {
      // it rears up, blazing
      brake(e, 6, dt);
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'dive';
        e.st = num(P.diveTime);
        e.dir = { x: a.ux, z: a.uz };
        e.tick = 0;
        e.tele = 0;
        Sfx.at(e.x, e.z).phoenixDive();
      }
    } else if (e.state === 'dive') {
      // through where the mage stood, a burning line behind it
      const face = rush(e, num(P.dive));
      if ((e.tick! -= dt) <= 0) {
        e.tick = num(P.fireEvery);
        layFire(room, e.x, e.z, num(P.fireTime));
      }
      if (e.st <= 0) {
        e.state = 'circle';
        e.st = span(P.circleTime);
        e.cycle = -e.cycle!;
        feathers(Math.atan2(a.uz, a.ux));
      }
      return face;
    } else if (e.state === 'ashes') {
      // a heap of ashes, glowing; unless they are put out, it rises again
      e.vx = e.vz = e.kx = e.kz = 0;
      if (Math.random() < dt * 4) burst(e.x, 0.3, e.z, 0xff6a20, 1, 0.8, 0.03);
      if (e.st <= 0) {
        e.gen = 1;
        e.state = 'circle';
        e.st = span(P.circleTime);
        e.hp = e.maxHp * num(P.reborn);
        e.flying = true;
        e.contact = e.foe!.contact;
        ashes(e, false);
        const n = num(P.ring);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          shoot(e, Math.cos(t), Math.sin(t), num(P.featherSpeed), 0.8, { fire: true });
        }
        ringFx(e.x, 0.2, e.z, light(e), 0.3, 2.6, 0.6, true);
        burst(e.x, 0.8, e.z, light(e), 30, 3.4, 0.08);
        Sfx.at(e.x, e.z).phoenixRise();
      }
    }
  },
  struck(e, dmg, _by, P) {
    if (e.state === 'ashes') return e.gen === 2 ? dmg : 0; // (blows scatter nothing: frost or a blast puts the ashes out)
    if (e.gen === 0 && dmg >= e.hp) {
      // it falls to ashes, the first time
      e.state = 'ashes';
      e.st = num(P.rebirth);
      e.flying = false;
      e.contact = 0;
      e.vx = e.vz = 0;
      e.tele = 0;
      ashes(e, true);
      burst(e.x, 0.8, e.z, light(e), 24, 3, 0.07);
      Sfx.at(e.x, e.z).phoenixFall();
      e.hp = Math.max(e.hp, 1);
      return 0;
    }
    return dmg;
  },
  afflicted(e, kind) {
    if (kind === 'chill') snuffAshes(e);
  },
  blasted(e) {
    snuffAshes(e);
  },
  bump(e, hit, P) {
    if (hit && e.state === 'dive' && e.st < num(P.diveTime) - 0.2) {
      e.state = 'circle';
      e.st = span(P.circleTime);
    }
  }, // (not as it sets off from beside a wall)
  pose(e) {
    e.model!.visible = e.state !== 'ashes';
    if (e.state === 'rise') e.parts!.body.position.y += (e.tele ?? 0) * 0.5;
  },
  die(e) {
    ashes(e, false);
  },
};

/** Nothing tall between (x0, z0) and (x1, z1) in `room`: walls, rocks, pillars, a spell's ice, nor steam hanging there. */
function clearSight(room: Room, x0: number, z0: number, x1: number, z1: number) {
  if (steamBetween(x0, z0, x1, z1)) return false;
  const dx = x1 - x0,
    dz = z1 - z0,
    n = Math.ceil(Math.hypot(dx, dz) / 0.2);
  for (let i = 1; i < n; i++) {
    const x = x0 + (dx * i) / n,
      z = z0 + (dz * i) / n;
    if (boxAt(x, z, room.walls) || boxAt(x, z, room.rocks) || boxAt(x, z, room.barriers ?? [])) return false;
  }
  return true;
}
/** A basilisk's stare: a fan on the floor in its school's light, pointing where it looks. */
const fanGeos = new Map<string, THREE.BufferGeometry>();
function stareFan(e: Enemy, P: Params) {
  if (e.extra) return e.extra;
  const c = num(P.cone),
    r = num(P.range),
    key = `${r}:${c}`; // (the shape is shared; each stare's material its own, for its opacity)
  let geo = fanGeos.get(key);
  if (!geo)
    fanGeos.set(
      key,
      (geo = markShared(new THREE.CircleGeometry(r, 18, -Math.PI / 2 - c, c * 2).rotateX(-Math.PI / 2))),
    );
  const fan = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color: light(e),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  fan.position.y = 0.04;
  fan.renderOrder = 2;
  e.body.add(fan);
  return (e.extra = fan);
}
const basilisk: Behaviour = {
  init(e, P) {
    e.state = 'stalk';
    e.st = span(P.gazeEvery);
    e.cycle = 0;
    stareFan(e, P);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const blind = (e.status?.sanct ?? 0) > 0; // (holy light: it can't see to stare)
    if (e.state === 'stalk') {
      // keeping its distance, side-on
      const sp = e.foe!.speed * e.speedMul,
        rad = a.dist > num(P.keep) ? 1 : a.dist < num(P.keep) - 1.2 ? -0.7 : 0;
      e.vx = (a.ux * rad - a.uz * 0.4) * sp;
      e.vz = (a.uz * rad + a.ux * 0.4) * sp;
      if (e.st <= 0 && !blind && a.dist < num(P.range)) {
        e.state = 'flare';
        e.st = num(P.tell);
        e.cycle = Math.atan2(a.ux, a.uz);
        e.dir = { x: Math.random() < 0.5 ? 1 : -1, z: 0 };
        Sfx.at(e.x, e.z).basiliskCrest();
      }
    } else if (e.state === 'flare') {
      // its crest flares; then it stares
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (blind) {
        e.state = 'stalk';
        e.st = span(P.gazeEvery);
        e.tele = 0;
      } else if (e.st <= 0) {
        e.state = 'gaze';
        e.st = num(P.gaze);
        e.tele = 0;
        Sfx.at(e.x, e.z).basiliskGaze();
      }
      return e.cycle! - e.dir!.x * num(P.sweep);
    } else if (e.state === 'gaze') {
      // the stare sweeps across; the mage in it, in its sight, is heavy as stone
      e.vx = e.vz = 0;
      const k = 1 - e.st / num(P.gaze),
        look = e.cycle! + (k * 2 - 1) * num(P.sweep) * e.dir!.x;
      let off = Math.atan2(player.x - e.x, player.z - e.z) - look;
      off = Math.atan2(Math.sin(off), Math.cos(off));
      if (Math.abs(off) < num(P.cone) && a.dist < num(P.range) && clearSight(room, e.x, e.z, player.x, player.z))
        player.stone = Math.max(player.stone, num(P.hold));
      if (blind || e.st <= 0) {
        e.state = 'stalk';
        e.st = span(P.gazeEvery);
      }
      return look;
    }
  },
  afflicted(e, kind, P) {
    if (kind === 'sanct' && e.state !== 'stalk') {
      counter(e, 'blinded');
      e.state = 'stalk';
      e.st = span(P.gazeEvery);
      e.tele = 0;
      burst(e.x, 1, e.z, SCHOOL_LIGHT.hallow, 10, 1.8, 0.04);
      Sfx.at(e.x, e.z).basiliskBlind();
    }
  },
  pose(e, P) {
    const fan = stareFan(e, P) as THREE.Mesh,
      m = fan.material as THREE.MeshBasicMaterial;
    m.opacity = e.state === 'gaze' ? 0.32 + Math.sin(e.t * 18) * 0.06 : e.state === 'flare' ? 0.08 * (e.tele ?? 0) : 0;
    fan.visible = m.opacity > 0;
    lean(e.parts!.head, e.state === 'flare' ? -(e.tele ?? 0) * 0.25 : 0);
  },
};

const bodyguard: Behaviour = {
  // the Salt Golem
  init(e, P) {
    e.state = 'guard';
    e.fireT = span(P.slamEvery);
  },
  afflicted(e, kind) {
    if (kind === 'burn') counter(e, 'melting');
  }, // (its wax joints run: it slows)
  step(e, dt, a, P) {
    e.st -= dt;
    const melt = (e.status?.burn ?? 0) > 0 ? num(P.melt) : 1,
      sp = e.foe!.speed * e.speedMul * melt; // (fire melts the wax in its joints)
    if (melt < 1 && Math.random() < dt * 5) burst(e.x, 1, e.z, 0xf0e4c8, 1, 0.6, 0.03);
    if (e.state === 'guard') {
      // it stands between the mage and the foe nearest them, taking the bolts
      let ward: Enemy | undefined,
        d0 = Infinity;
      for (const o of G.room.enemies)
        if (o !== e && !o.dead && !o.hidden && o.spawn <= 0 && o.type !== e.type) {
          const d = Math.hypot(o.x - player.x, o.z - player.z);
          if (d < d0) {
            d0 = d;
            ward = o;
          }
        }
      if (ward) {
        const dx = player.x - ward.x,
          dz = player.z - ward.z,
          l = Math.hypot(dx, dz) || 1,
          k = Math.min(num(P.gap), l * 0.5);
        steer(e, ward.x + (dx / l) * k, ward.z + (dz / l) * k, sp, dt, 0.3);
      } else {
        e.vx = a.ux * sp;
        e.vz = a.uz * sp;
      }
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.slamRange)) {
        e.state = 'slam';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).saltRaise();
      }
    } else if (e.state === 'slam') {
      // it raises its fists and slams: salt flies
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        const n = num(P.ring),
          a0 = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) {
          const t = a0 + (i / n) * Math.PI * 2;
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.55, {}, 0xf0ead8);
        }
        ringFx(e.x, 0.1, e.z, 0xf0ead8, 0.3, 1.8, 0.4, true);
        burst(e.x, 0.3, e.z, 0xf0ead8, 16, 2.4, 0.05);
        Sfx.at(e.x, e.z).saltSlam();
        e.state = 'guard';
        e.tele = 0;
        e.fireT = span(P.slamEvery);
      }
    }
  },
  pose(e) {
    lean(e.parts!.torso, e.state === 'slam' ? -(e.tele ?? 0) * 0.3 : 0);
  },
};

const breaker: Behaviour = {
  // the Rubble Golem
  init(e, P) {
    e.state = 'walk';
    e.fireT = span(P.slamEvery);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'broken') {
      // in pieces; unless they are put down, they roll back and it stands again
      e.vx = e.vz = e.kx = e.kz = 0;
      const stones = broodOf(e);
      if (!stones.length) {
        e.hidden = false;
        e.gen = 2;
        damageEnemy(e, e.hp + 1, 0, 0);
        return;
      }
      if (e.st <= 0) {
        for (const s of stones) s.state = 'return';
        if (stones.every((s) => Math.hypot(s.x - e.x, s.z - e.z) < 1.2) || e.st < -num(P.gather)) {
          // (close enough, crowding each other; or long enough)
          e.hp = Math.min(
            e.maxHp,
            stones.reduce((h, s) => h + s.hp, 0),
          );
          for (const s of stones) crumble(s);
          e.state = 'walk';
          e.hidden = false;
          e.contact = e.foe!.contact;
          e.fireT = span(P.slamEvery);
          burst(e.x, 0.6, e.z, 0x7a746a, 20, 2.4, 0.06);
          Sfx.at(e.x, e.z).golemReform();
        }
      }
      return;
    }
    if (e.state === 'walk') {
      const sp = e.foe!.speed * e.speedMul;
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.slamRange)) {
        e.state = 'slam';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).saltRaise();
      }
    } else if (e.state === 'slam') {
      // it pounds the floor, and stones fall from the roof on spots round the mage
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        const n = num(P.rocks);
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2,
            r = i === 0 ? 0 : 0.8 + Math.random() * num(P.spread),
            at = freeSpotNear(room, player.x + Math.cos(ang) * r, player.z + Math.sin(ang) * r);
          ringFx(at.x, 0.04, at.z, light(e), 0.55, 0.4, num(P.fall), true, 0.7); // (where it will land)
          fallOn(room, at.x, at.z, num(P.fall), (x, z) => {
            burst(x, 0.2, z, 0x7a746a, 10, 2, 0.05);
            Sfx.at(x, z).rockFall();
            if (Math.hypot(player.x - x, player.z - z) < num(P.hit)) hurtPlayer(1, x, z);
          });
        }
        ringFx(e.x, 0.1, e.z, light(e), 0.4, 2, 0.45, true);
        burst(e.x, 0.2, e.z, 0x7a746a, 14, 2.4, 0.05);
        Sfx.at(e.x, e.z).rubbleSlam();
        e.state = 'walk';
        e.tele = 0;
        e.fireT = span(P.slamEvery);
      }
    }
  },
  blasted(e, P) {
    // a glyph's blast breaks it into rolling stones
    if (e.state === 'broken' || e.dead) return;
    const n = num(P.stones),
      hp = e.hp / n;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2,
        at = freeSpotNear(G.room.current, e.x + Math.cos(t) * 0.7, e.z + Math.sin(t) * 0.7),
        s = makeEnemy('rubbleStone', at.x, at.z, e.maxHp / e.foe!.hp);
      s.owner = e;
      s.hp = s.maxHp = hp;
      s.spawn = 0.1;
      s.kx = Math.cos(t) * 4;
      s.kz = Math.sin(t) * 4;
    }
    e.state = 'broken';
    e.st = num(P.reform);
    e.hidden = true;
    e.contact = 0;
    e.tele = 0;
    counter(e, 'broken');
    burst(e.x, 0.6, e.z, 0x7a746a, 26, 3, 0.07);
    Sfx.at(e.x, e.z).golemBreak();
  },
  pose(e) {
    e.model!.visible = e.state !== 'broken';
    if (e.state === 'slam') e.parts!.torso.rotation.x -= (e.tele ?? 0) * 0.35;
  },
};

const stone: Behaviour = {
  // a rubble golem's rolling stone
  init(e) {
    e.state = 'roll';
  },
  step(e, dt) {
    const home = e.state === 'return' && e.owner && !e.owner.dead ? e.owner : undefined;
    if (home) steer(e, home.x, home.z, e.foe!.speed * e.speedMul * 1.3, dt, 0.4);
    else steer(e, player.x, player.z, e.foe!.speed * e.speedMul, dt, 0.6);
  },
  pose(e) {
    e.parts!.body.rotation.x = e.t * 7;
  }, // (it rolls)
};

/* ---------- floor 4 ---------- */

/** A line marked on the floor of the current room from (x0, z0) to (x1, z1), in `color` (where a griffin will swoop): one
    shared strip, stretched, and one material a colour. */
const lineGeo = markShared(new THREE.PlaneGeometry(0.5, 1).rotateX(-Math.PI / 2)),
  lineMats = new Map<number, THREE.Material>();
function floorLine(x0: number, z0: number, x1: number, z1: number, color: number) {
  const room = G.room.current,
    len = Math.hypot(x1 - x0, z1 - z0) || 0.01;
  let mat = lineMats.get(color);
  if (!mat)
    lineMats.set(
      color,
      (mat = markShared(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )),
    );
  const m = new THREE.Mesh(lineGeo, mat);
  m.scale.z = len;
  m.position.set((x0 + x1) / 2 - room.cx, 0.03, (z0 + z1) / 2 - room.cz);
  m.rotation.y = Math.atan2(x1 - x0, z1 - z0);
  m.renderOrder = 2;
  room.group.add(m);
  return m;
}
function clearLine(e: Enemy) {
  if (e.extra) {
    e.extra.parent?.remove(e.extra);
    disposeTree(e.extra);
    e.extra = undefined;
  }
}

/** High out of reach (only its shadow shows), or down where blows reach it. */
function aloft(e: Enemy, up: boolean) {
  e.hidden = up;
  e.contact = up ? 0 : e.foe!.contact;
}
const griffin: Behaviour = {
  init(e, P) {
    e.state = 'soar';
    e.st = span(P.soar);
    e.height = num(P.high);
    aloft(e, true);
    e.cycle = Math.random() < 0.5 ? 1 : -1;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul;
    if (e.state === 'soar') {
      // circling high over the mage
      circle(e, a, num(P.near), num(P.far), sp, e.cycle!);
      e.height = lerp(e.height ?? 0, num(P.high), Math.min(1, dt * 2));
      if (e.st <= 0) {
        // it marks a line through where the mage stands
        const l = Math.max(a.dist, 0.5),
          ux = (player.x - e.x) / l,
          uz = (player.z - e.z) / l,
          end = freeSpotNear(room, player.x + ux * num(P.past), player.z + uz * num(P.past));
        e.state = 'mark';
        e.st = num(P.tell);
        e.dir = { x: ux, z: uz };
        e.target = { x: end.x, z: end.z };
        clearLine(e);
        e.extra = floorLine(e.x, e.z, end.x, end.z, light(e));
        Sfx.at(e.x, e.z).griffinCry();
      }
    } else if (e.state === 'mark') {
      // it hangs, then stoops
      brake(e, 6, dt);
      e.tele = ramp(e.st, num(P.tell));
      e.height = lerp(e.height ?? 0, 0.6, Math.min(1, dt * 3));
      if (e.st <= 0) {
        e.state = 'swoop';
        e.st = num(P.swoopTime);
        e.tele = 0;
        aloft(e, false);
        Sfx.at(e.x, e.z).phoenixDive();
      }
    } else if (e.state === 'swoop') {
      // down the line, talons first
      const face = rush(e, num(P.swoop));
      e.height = lerp(e.height ?? 0, 0.3, Math.min(1, dt * 6));
      const t = e.target!;
      if (e.st <= 0 || (t.x - e.x) * e.dir!.x + (t.z - e.z) * e.dir!.z < 0.2) {
        clearLine(e);
        e.state = 'claw';
        e.st = span(P.claw);
        e.tick = 0;
        e.fireT = 0;
        burst(e.x, 0.3, e.z, light(e), 12, 2, 0.05);
      }
      return face;
    } else if (e.state === 'claw') {
      // landed: it claws, and buffets the mage with its wings
      e.height = lerp(e.height ?? 0, 0, Math.min(1, dt * 6));
      e.vx = a.ux * sp * 0.5;
      e.vz = a.uz * sp * 0.5;
      if ((e.tick! -= dt) <= 0 && a.dist < num(P.buffetReach)) {
        e.tick = num(P.buffetEvery);
        e.fireT = num(P.buffetTime);
        ringFx(e.x, 0.5, e.z, light(e), 0.4, 1.8, 0.35, true);
        Sfx.at(e.x, e.z).wingBeat();
      }
      if (e.fireT! > 0) {
        e.fireT! -= dt;
        player.pull.x += a.ux * num(P.buffet);
        player.pull.z += a.uz * num(P.buffet);
      } // (the wind of its wings)
      if (e.st <= 0 && !((e.status?.hex ?? 0) > 0)) {
        e.state = 'rise';
        e.st = num(P.rise);
        Sfx.at(e.x, e.z).wingBeat();
      } // (hexed, it can't take wing)
    } else if (e.state === 'rise') {
      brake(e, 3, dt);
      e.height = lerp(e.height ?? 0, num(P.high), Math.min(1, dt * 2));
      if (e.st <= 0) {
        e.state = 'soar';
        e.st = span(P.soar);
        aloft(e, true);
        e.cycle = -e.cycle!;
      }
    }
  },
  afflicted(e, kind, P) {
    // a hex grounds it
    if (kind !== 'hex' || e.state === 'claw') return;
    clearLine(e);
    aloft(e, false);
    e.state = 'claw';
    e.st = span(P.claw);
    e.tick = 0.6;
    e.fireT = 0;
    e.tele = 0;
    burst(e.x, 1, e.z, SCHOOL_LIGHT.umbral, 14, 2, 0.05);
    Sfx.at(e.x, e.z).griffinCry();
    counter(e, 'grounded');
  },
  bump(e, hit, P) {
    if (hit && e.state === 'swoop' && e.st < num(P.swoopTime) - 0.2) {
      clearLine(e);
      e.state = 'claw';
      e.st = span(P.claw);
      e.tick = 0;
      e.fireT = 0;
    }
  },
  pose(e) {
    e.model!.position.y = e.height ?? 0;
    if (e.state === 'mark') e.parts!.head.rotation.x += (e.tele ?? 0) * 0.4;
  },
  die(e) {
    clearLine(e);
  },
};

const eye: Behaviour = {
  // the Radiant Eye
  init(e, P) {
    e.state = 'shut';
    e.st = span(P.shut);
    e.guard = num(P.guard);
    e.cycle = Math.random() < 0.5 ? 1 : -1;
  },
  step(e, dt, a, P) {
    e.st -= dt;
    circle(
      e,
      a,
      num(P.keep) - 0.8,
      num(P.keep) + 0.8,
      e.foe!.speed * e.speedMul * (e.state === 'shut' ? 1 : 0.3),
      e.cycle!,
    ); // (it drifts; open, it slows to look)
    if (e.state === 'shut') {
      // shut, its lids turn half of every blow
      e.guard = num(P.guard);
      if (e.st <= 0 && !((e.status?.hex ?? 0) > 0)) {
        e.state = 'track';
        e.st = num(P.track);
        e.guard = 1;
        Sfx.at(e.x, e.z).eyeOpen();
      }
    } else if (e.state === 'track') {
      // open, it follows the mage (not into steam: there it loses them, and strikes where they last showed)
      if (!e.target || !steamBetween(e.x, e.z, player.x, player.z)) e.target = { x: player.x, z: player.z };
      e.tele = ramp(e.st, num(P.track));
      if (e.st <= 0) {
        e.state = 'aim';
        e.st = num(P.delay);
        e.tele = 0;
        ringFx(player.x, 0.04, player.z, light(e), 0.7, 0.45, num(P.delay), true, 0.8);
        Sfx.at(e.x, e.z).eyeCharge();
      } // (where the mage stood: the ray comes there)
    } else if (e.state === 'aim') {
      if (e.st <= 0) {
        const t = e.target!;
        strikeFx({ x: e.x, y: 1.05, z: e.z }, { x: t.x, y: 0.05, z: t.z }, light(e), 0.3);
        burst(t.x, 0.2, t.z, light(e), 14, 2.4, 0.05);
        Sfx.at(t.x, t.z).eyeRay();
        if (Math.hypot(player.x - t.x, player.z - t.z) < num(P.hit)) hurtPlayer(1, t.x, t.z);
        e.state = 'shut';
        e.st = span(P.shut);
        e.guard = num(P.guard);
      }
    }
  },
  afflicted(e, kind, P) {
    if (kind === 'hex' && e.state !== 'shut') {
      counter(e, 'shut');
      e.state = 'shut';
      e.st = span(P.shut);
      e.guard = num(P.guard);
      e.tele = 0;
      Sfx.at(e.x, e.z).bookSnap();
    }
  }, // (a hex closes it)
  pose(e) {
    const shut = e.state === 'shut' ? 1 : 0,
      p = e.parts!;
    p.lidTop.rotation.x = 0.9 * shut;
    p.lidBottom.rotation.x = -0.9 * shut;
  },
};

/** A harpy's screech: glyphs chalked near it are scattered, and the mage's bolts flying near it knocked aside. */
function screech(e: Enemy, P: Params) {
  const R = num(P.screechRange),
    room = G.room.current;
  for (const gl of G.room.glyphs) {
    const dx = gl.x - e.x,
      dz = gl.z - e.z,
      d = Math.hypot(dx, dz);
    if (gl.spent || d > R) continue;
    const at = freeSpotNear(room, gl.x + (dx / (d || 1)) * num(P.push), gl.z + (dz / (d || 1)) * num(P.push));
    gl.x = at.x;
    gl.z = at.z;
    gl.g.position.set(at.x, 0, at.z);
  }
  for (const b of G.room.bolts) {
    const dx = b.x - e.x,
      dz = b.z - e.z,
      d = Math.hypot(dx, dz);
    if (d > R || d < 0.05) continue;
    const s = Math.hypot(b.vx, b.vz),
      nx = b.vx / s + (dx / d) * 1.5,
      nz = b.vz / s + (dz / d) * 1.5,
      n = Math.hypot(nx, nz) || 1;
    b.vx = (nx / n) * s;
    b.vz = (nz / n) * s;
  }
}
const harpy: Behaviour = {
  init(e) {
    const w = againstWall(G.room.current, e.x, e.z);
    e.target = { x: w.x, z: w.z };
    e.state = 'fly';
    e.height = 0;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    e.contact = (e.height ?? 0) < 0.6 ? e.foe!.contact : 0; // (up on its perch, out of reach of a touch)
    if (e.state === 'fly') {
      // to a perch high on a wall
      const t = e.target!;
      steer(e, t.x, t.z, e.foe!.speed * e.speedMul * 1.4, dt, 0.3);
      e.height = lerp(e.height ?? 0, num(P.perchH), Math.min(1, dt * 2));
      if (Math.hypot(t.x - e.x, t.z - e.z) < 0.35) {
        e.state = 'perch';
        e.st = span(P.perch);
        e.fireT = num(P.screechAt);
      }
    } else if (e.state === 'perch' || e.state === 'screech') {
      // perched; now and then it screeches
      e.vx = e.vz = e.kx = e.kz = 0;
      if (e.state === 'perch' && (e.fireT! -= dt) <= 0) {
        e.state = 'screech';
        e.tick = num(P.screech);
        e.fireT = 99;
        ringFx(e.x, 1, e.z, light(e), 0.3, num(P.screechRange), 0.5, true);
        Sfx.at(e.x, e.z).harpyScreech();
      }
      if (e.state === 'screech') {
        screech(e, P);
        if ((e.tick! -= dt) <= 0) e.state = 'perch';
      }
      if (e.st <= 0 && e.state === 'perch') {
        e.state = 'tell';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).larkCry();
      }
    } else if (e.state === 'tell') {
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'dive';
        e.st = num(P.diveTime);
        e.dir = { x: a.ux, z: a.uz };
        e.tele = 0;
        Sfx.at(e.x, e.z).phoenixDive();
      }
    } else if (e.state === 'dive') {
      // down along a line, talons out
      const face = rush(e, num(P.dive));
      e.height = lerp(e.height ?? 0, 0.1, Math.min(1, dt * 8));
      if (e.st <= 0) {
        const w = againstWall(room, e.x + (Math.random() - 0.5) * 8, e.z + (Math.random() - 0.5) * 6);
        e.target = { x: w.x, z: w.z };
        e.state = 'fly';
      }
      return face;
    }
  },
  bump(e, hit, P) {
    if (hit && e.state === 'dive' && e.st < num(P.diveTime) - 0.15) {
      const w = againstWall(G.room.current, e.x, e.z);
      e.target = { x: w.x, z: w.z };
      e.state = 'fly';
    }
  },
  pose(e) {
    e.model!.position.y = e.height ?? 0;
    lean(e.parts!.head, e.state === 'screech' ? -0.4 : 0);
  },
};

/** Bolts that have met a lodestone golem's orbiting stones (each is turned or let through once). */
const metStones = new WeakSet<object>();
const magnet: Behaviour = {
  // the Lodestone Golem (an elemental: Storm feeds it, Frost hurts it twice over)
  init(e) {
    e.state = 'walk';
  },
  step(e, dt, a, P) {
    const sp = e.foe!.speed * e.speedMul;
    e.vx = a.ux * sp;
    e.vz = a.uz * sp;
    if ((e.status?.frozen ?? 0) > 0) return; // (frozen, its pull stops)
    if (a.dist < num(P.pullRange)) {
      player.pull.x -= a.ux * num(P.pull);
      player.pull.z -= a.uz * num(P.pull);
    } // it draws the mage a little
    for (const b of G.room.bolts) {
      // and bends the mage's bolts towards itself
      const dx = e.x - b.x,
        dz = e.z - b.z,
        d = Math.hypot(dx, dz);
      if (d > num(P.bendRange) || d < 0.05) continue;
      const s = Math.hypot(b.vx, b.vz);
      let ang = Math.atan2(b.vz, b.vx),
        off = Math.atan2(dz, dx) - ang;
      off = Math.atan2(Math.sin(off), Math.cos(off));
      ang += Math.max(-num(P.bend) * dt, Math.min(num(P.bend) * dt, off));
      b.vx = Math.cos(ang) * s;
      b.vz = Math.sin(ang) * s;
      if (d < num(P.ring) && !metStones.has(b)) {
        // its orbiting stones turn some of what comes in
        metStones.add(b);
        if (Math.random() < num(P.turn)) {
          const t = Math.atan2(-dz, -dx) + (Math.random() < 0.5 ? 1 : -1) * 1.4;
          b.vx = Math.cos(t) * s;
          b.vz = Math.sin(t) * s;
          burst(b.x, b.y, b.z, light(e), 5, 1.6, 0.03);
          Sfx.at(b.x, b.z).mantisParry();
        }
      }
    }
  },
};

const hearth: Behaviour = {
  // the Hearth Golem (an elemental: Ember feeds it, Frost hurts it twice over)
  init(e, P) {
    e.state = 'lit';
    e.fireT = span(P.throwEvery);
    e.guard = num(P.guard);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul;
    if (e.state === 'lit') {
      // its fire burning, blows barely hurt it; it throws coals that land burning
      e.guard = num(P.guard);
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.throwRange)) {
        e.fireT = span(P.throwEvery);
        Sfx.at(e.x, e.z).djinnHurl();
        for (let i = 0; i < num(P.coals); i++) {
          const ang = Math.random() * Math.PI * 2,
            r = i === 0 ? 0 : Math.random() * num(P.spread),
            tx = player.x + Math.cos(ang) * r,
            tz = player.z + Math.sin(ang) * r;
          lob(
            room,
            e.x,
            e.z,
            tx,
            tz,
            0xff5a10,
            num(P.flight) + i * 0.08,
            (x, z) => {
              layFire(room, x, z, num(P.fireTime), e.foe!.id);
              burst(x, 0.2, z, 0xff7a2a, 8, 1.8, 0.05);
            },
            1.8,
            1.1,
          );
        }
      }
    } else if (e.state === 'out') {
      // put out: it makes for a brazier to stoke itself again
      e.guard = 1;
      const bz = brazierNear(room, e.x, e.z, true) ?? brazierNear(room, e.x, e.z, false);
      if (bz) {
        steer(e, bz.x, bz.z, sp, dt, 0.3);
        if (Math.hypot(bz.x - e.x, bz.z - e.z) < 1) {
          fireAt(bz.x, bz.z, 0.3);
          e.st = 0;
        }
      } else {
        e.vx = a.ux * sp * 0.6;
        e.vz = a.uz * sp * 0.6;
      }
      if (e.st <= 0) {
        e.state = 'lit';
        e.guard = num(P.guard);
        e.fireT = span(P.throwEvery);
        burst(e.x, 1.2, e.z, 0xff7a2a, 18, 2.4, 0.06);
        Sfx.at(e.x, e.z).djinnLight();
      }
    }
  },
  afflicted(e, kind, P) {
    // frost puts its fire out for a while
    if (kind !== 'chill' || e.state !== 'lit') return;
    e.state = 'out';
    e.st = num(P.out);
    e.guard = 1;
    burst(e.x, 1.2, e.z, 0xd8dce0, 18, 2, 0.06);
    Sfx.at(e.x, e.z).djinnSnuff();
    counter(e, 'doused');
  },
  pose(e) {
    const lit = e.state !== 'out',
      p = e.parts!;
    p.flames.visible = p.fireIn.visible = p.heat.visible = p.crown.visible = lit;
  },
};

/** Whether (x, z) in `room` is in shadow: away from every lit brazier, candle stand and wall light (the whole floor, in an
    unlit dark room). */
function inShadow(room: Room, x: number, z: number, P: Params) {
  if (room.plan.variant === 'dark' && !room.candlesLit) return true;
  const r = num(P.light);
  for (const b of room.props ?? []) if (b.prop.lit && Math.hypot(b.x - x, b.z - z) < r) return false;
  for (const t of room.torches) if (t.lit && Math.hypot(t.x - x, t.z - z) < r) return false;
  return true;
}
/** A spot in shadow round the mage, between `near` and `far` from them, if any (with `open`, any spot there: it has waited
    long enough for a shadow). */
function shadowNear(room: Room, P: Params, open = false) {
  for (let i = 0; i < 12; i++) {
    const ang = Math.random() * Math.PI * 2,
      r = num(P.near) + Math.random() * (num(P.far) - num(P.near)),
      at = freeSpotNear(room, player.x + Math.cos(ang) * r, player.z + Math.sin(ang) * r);
    const d = Math.hypot(at.x - player.x, at.z - player.z); // (a free spot can lie further than the one asked for, past a pillar)
    if ((open || inShadow(room, at.x, at.z, P)) && d > num(P.near) * 0.8 && d < num(P.far) + 0.2) return at;
  }
  return undefined;
}
const shade: Behaviour = {
  // the Shadow Fox
  init(e, P) {
    e.state = 'prowl';
    e.st = span(P.prowl);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const held = (e.status?.sanct ?? 0) > 0; // (holy light holds it in the open)
    if (e.state === 'prowl') {
      const sp = e.foe!.speed * e.speedMul,
        rad = a.dist > num(P.far) ? 1 : a.dist < num(P.near) ? -0.6 : 0;
      e.vx = (a.ux * rad - a.uz * 0.6) * sp;
      e.vz = (a.uz * rad + a.ux * 0.6) * sp;
      if (e.st <= 0 && !held && inShadow(room, e.x, e.z, P)) {
        e.state = 'sink';
        e.st = num(P.sink);
        Sfx.at(e.x, e.z).foxSink();
      }
    } else if (e.state === 'sink') {
      // into its shadow
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.sink));
      if (held) {
        e.state = 'prowl';
        e.st = span(P.prowl);
        e.tele = 0;
        counter(e, 'held');
      } else if (e.st <= 0) {
        e.state = 'gone';
        e.st = num(P.gone) * (room.plan.variant === 'dark' ? 0.5 : 1);
        e.cycle = 0;
        e.hidden = true;
        e.contact = 0;
        e.tele = 0;
        burst(e.x, 0.3, e.z, SCHOOL_LIGHT.umbral, 10, 1.4, 0.04);
      }
    } else if (e.state === 'gone') {
      // and out of another, near the mage
      e.vx = e.vz = e.kx = e.kz = 0;
      if (e.st <= 0) {
        const at = shadowNear(room, P, e.cycle! > num(P.lurk)); // (no shadow near the mage: it waits, and in the end rises in the light)
        if (at) {
          e.x = at.x;
          e.z = at.z;
          e.state = 'emerge';
          e.st = num(P.emerge);
          burst(e.x, 0.3, e.z, SCHOOL_LIGHT.umbral, 12, 1.6, 0.04);
          Sfx.at(e.x, e.z).foxRise();
        } else {
          e.st = 0.3;
          e.cycle! += 0.3;
        }
      }
    } else if (e.state === 'emerge') {
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.emerge));
      if (e.st <= 0) {
        e.hidden = false;
        e.contact = 0;
        e.tele = 0;
        e.state = 'bite';
        e.st = num(P.biteTime);
        e.dir = { x: a.ux, z: a.uz };
        Sfx.at(e.x, e.z).crabSnap();
      }
    } else if (e.state === 'bite') {
      // a lunge and a bite
      const face = rush(e, num(P.bite));
      if (a.dist < e.r + player.r + 0.05 && !mantleShields(e)) {
        hurtPlayer(e.foe!.contact, e.x, e.z);
        e.st = 0;
      }
      if (e.st <= 0) {
        e.state = 'prowl';
        e.st = span(P.prowl);
        e.contact = e.foe!.contact;
      }
      return face;
    }
  },
  pose(e) {
    const k =
      e.state === 'sink' ? (e.tele ?? 0) : e.state === 'emerge' ? 1 - (e.tele ?? 0) : e.state === 'gone' ? 1 : 0;
    e.model!.position.y = -k * 0.7;
    e.model!.visible = e.state !== 'gone';
  },
};

/** A rime scarab's snowball melts (fire on it or near it): it is left without one, quick and weak. */
function meltBall(e: Enemy, P: Params) {
  if (e.state === 'bare' || e.dead) return;
  e.state = 'bare';
  e.st = num(P.bare);
  e.cycle = 0;
  e.tele = 0;
  burst(e.x, 0.4, e.z, 0xd8eef8, 14, 1.8, 0.05);
  Sfx.at(e.x, e.z).thaw();
  counter(e, 'melted');
}
const roller: Behaviour = {
  // the Rime Scarab
  init(e, P) {
    e.state = 'push';
    e.cycle = num(P.ball0);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul;
    if (e.state === 'push') {
      // rolling its snowball at the mage; it grows as it rolls
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      e.cycle = Math.min(1, e.cycle! + sp * dt * num(P.grow));
      if (e.cycle >= num(P.launchAt) && a.dist < num(P.range)) {
        e.state = 'heave';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).saltRaise();
      }
    } else if (e.state === 'heave') {
      // it rears and throws the ball, to burst where the mage stood
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        const size = e.cycle!,
          n = Math.round(num(P.ring) * (0.5 + size * 0.5)),
          f = facing(e);
        lob(
          room,
          e.x + f.x * 0.6,
          e.z + f.z * 0.6,
          player.x,
          player.z,
          0xeaf6ff,
          num(P.flight),
          (x, z) => {
            for (let i = 0; i < n; i++) {
              const t = (i / n) * Math.PI * 2;
              spawnShot(
                x + Math.cos(t) * 0.3,
                z + Math.sin(t) * 0.3,
                Math.cos(t),
                Math.sin(t),
                num(P.shotSpeed),
                SCHOOL_LIGHT.frost,
                0.55,
                0.7,
                { chill: num(P.chill) },
              );
            }
            frostAt(x, z, 0.8);
            ringFx(x, 0.1, z, SCHOOL_LIGHT.frost, 0.3, 1.8, 0.4, true);
            burst(x, 0.4, z, 0xeaf6ff, 20, 2.6, 0.06);
            Sfx.at(x, z).iceShatter();
          },
          1.6,
          2 + size * 1.5,
        );
        e.state = 'bare';
        e.st = num(P.bare);
        e.cycle = 0;
        e.tele = 0;
      }
    } else if (e.state === 'bare') {
      // without a ball: quick, and weak; it scurries round the mage until it has made another
      const wob = Math.sin(e.t * 5) * 0.9;
      e.vx = (-a.uz * wob - a.ux * 0.4) * sp * num(P.quick);
      e.vz = (a.ux * wob - a.uz * 0.4) * sp * num(P.quick);
      if (e.st <= 0) {
        e.state = 'push';
        e.cycle = num(P.ball0);
      }
    }
  },
  struck(e, dmg, _by, P) {
    return e.state === 'bare' ? dmg * num(P.weak) : dmg;
  },
  afflicted(e, kind, P) {
    if (kind === 'burn') meltBall(e, P);
  },
  pose(e) {
    const p = e.parts!;
    p.ball.visible = e.state !== 'bare';
    if (p.ball.visible) p.ball.scale.setScalar(0.45 + e.cycle! * 0.9);
  },
};
// fire near a rime scarab's snowball melts it
hearGround((kind, x, z, r) => {
  if (kind !== 'fire') return;
  for (const e of G.room.enemies)
    if (!e.dead && e.foe?.behaviour === 'roller' && e.state !== 'bare' && Math.hypot(e.x - x, e.z - z) < r + 0.8)
      meltBall(e, e.foe.params);
});

/* ---------- floor 5 ---------- */

const glacier: Behaviour = {
  // the Glacier Golem (an elemental: Frost feeds it, Ember hurts it twice over)
  init(e, P) {
    e.state = 'walk';
    e.fireT = span(P.stompEvery);
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'frozen') {
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        e.state = 'walk';
        e.contact = e.foe!.contact;
        encase(e, false);
      }
      return;
    }
    if (e.state === 'walk') {
      const sp = e.foe!.speed * e.speedMul;
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.stompRange)) {
        e.state = 'stomp';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).saltRaise();
      }
    } else if (e.state === 'stomp') {
      // it stamps, and a line of ice spikes runs at the mage
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        const ux = a.ux,
          uz = a.uz,
          x0 = e.x,
          z0 = e.z;
        for (let i = 1; i <= num(P.spikes); i++)
          after(i * num(P.spikeEvery), () => {
            if (G.room.current !== room || e.dead) return;
            const x = x0 + ux * (e.r + i * num(P.gap)),
              z = z0 + uz * (e.r + i * num(P.gap));
            spikeAt(room, x, z);
            frostAt(x, z, 0.2);
            if (Math.hypot(player.x - x, player.z - z) < num(P.hit)) hurtPlayer(1, x, z);
          });
        ringFx(e.x, 0.1, e.z, light(e), 0.4, 2, 0.45, true);
        Sfx.at(e.x, e.z).glacierStomp();
        e.state = 'walk';
        e.tele = 0;
        e.fireT = span(P.stompEvery);
      }
    }
  },
  struck(e, dmg, _by, P, dx, dz) {
    // its front is a wall of ice: blows from ahead barely tell
    if (e.state === 'frozen') return dmg;
    const f = facing(e),
      l = Math.hypot(dx, dz);
    if (l > 0 && -(dx * f.x + dz * f.z) / l > Math.cos(num(P.arc))) {
      burst(e.x + f.x * e.r, 0.9, e.z + f.z * e.r, 0xcfeaf8, 5, 1.6, 0.03);
      Sfx.at(e.x, e.z).mantisParry();
      return dmg * num(P.front);
    }
    return dmg;
  },
  afflicted(e, kind, P) {
    // the cold it drinks freezes it stiff; a shock then shatters it for a heavy blow
    if (kind === 'chill' && e.state !== 'frozen') {
      e.state = 'frozen';
      e.st = num(P.frozen);
      e.contact = 0;
      e.vx = e.vz = 0;
      e.tele = 0;
      encase(e, true, 1.5);
      Sfx.at(e.x, e.z).freeze();
    } else if (kind === 'shock' && e.state === 'frozen') {
      encase(e, false);
      e.state = 'walk';
      e.contact = e.foe!.contact;
      e.fireT = span(P.stompEvery);
      burst(e.x, 1, e.z, 0xcfeaf8, 30, 3.4, 0.08);
      Sfx.at(e.x, e.z).iceShatter();
      counter(e, 'shattered');
      damageEnemy(e, e.maxHp * num(P.shatter), 0, 0, 0, 'spell', 'storm');
    }
  },
  pose(e) {
    e.animRate = e.state === 'frozen' ? 0 : 1;
    lean(e.parts!.torso, e.state === 'stomp' ? -(e.tele ?? 0) * 0.3 : 0);
  },
  die(e) {
    encase(e, false);
  },
};

/** A hydra's heads: each's health, whether it is up, a stump's seconds until it grows back, and whether fire seared it. */
interface Head {
  hp: number;
  up: boolean;
  cut: number;
  seared: boolean;
}
const hydraHeads = new WeakMap<Enemy, Head[]>();
const headsOf = (e: Enemy) => hydraHeads.get(e)!;
/** Fire on a hydra sears its fresh stumps: they won't grow back. */
function sear(e: Enemy) {
  for (const h of headsOf(e))
    if (!h.up && h.cut > 0 && !h.seared) {
      h.seared = true;
      burst(e.x, 1, e.z, 0xff7a2a, 10, 1.8, 0.05);
      Sfx.at(e.x, e.z).webBurn();
      counter(e, 'seared');
    }
}
const hydra: Behaviour = {
  init(e, P) {
    const hp = (num(P.headHp) * e.maxHp) / e.foe!.hp;
    hydraHeads.set(
      e,
      [0, 1, 2, 3, 4].map((i) => ({ hp, up: i < 3, cut: 0, seared: false })),
    );
    e.state = 'walk';
    e.fireT = num(P.attackEvery);
    e.cycle = 0;
    e.count = 0;
  },
  step(e, dt, a, P) {
    const H = headsOf(e),
      full = (num(P.headHp) * e.maxHp) / e.foe!.hp,
      sp = e.foe!.speed * e.speedMul;
    e.vx = a.dist > num(P.keep) ? a.ux * sp : 0;
    e.vz = a.dist > num(P.keep) ? a.uz * sp : 0;
    if ((e.status?.burn ?? 0) > 0) sear(e);
    for (const h of H)
      if (!h.up && h.cut > 0 && !h.seared && (h.cut -= dt) <= 0) {
        // an unseared stump grows back as two heads
        h.cut = 0;
        h.up = true;
        h.hp = full;
        const spare = H.find((o) => !o.up && o.cut <= 0 && !o.seared && o !== h);
        if (spare) {
          spare.up = true;
          spare.hp = full;
        }
        burst(e.x, 1.2, e.z, light(e), 16, 2.2, 0.05);
        Sfx.at(e.x, e.z).hydraRegrow();
      }
    const live = H.filter((h) => h.up);
    if (!live.length) return;
    if ((e.fireT! -= dt) <= 0) {
      // by turns, a head bites, or spits hexing venom
      e.fireT = num(P.attackEvery) / live.length;
      e.cycle = (e.cycle! + 1) % live.length;
      e.count = H.indexOf(live[e.cycle]);
      if (a.dist < num(P.biteReach)) {
        e.tele = 1;
        Sfx.at(e.x, e.z).crabSnap();
        if (!mantleShields(e)) hurtPlayer(1, e.x, e.z);
      } else {
        shoot(e, a.ux, a.uz, num(P.shotSpeed), 0.8, { hex: num(P.hex) }, 0xc58aff);
        Sfx.at(e.x, e.z).hydraSpit();
      }
    }
    e.tele = Math.max(0, (e.tele ?? 0) - dt * 4);
  },
  struck(e, dmg, _by, P) {
    // the blow falls on the head that last struck: enough, and it is cut off
    const H = headsOf(e),
      h = H[e.count ?? 0]?.up ? H[e.count!] : H.find((o) => o.up);
    if (!h) return dmg;
    h.hp -= dmg;
    if (h.hp <= 0) {
      h.up = false;
      h.cut = num(P.regrow);
      h.seared = (e.status?.burn ?? 0) > 0;
      burst(e.x, 1.2, e.z, 0x2a3a2e, 18, 2.4, 0.06);
      Sfx.at(e.x, e.z).hydraCut();
    }
    return dmg;
  },
  afflicted(e, kind) {
    if (kind === 'burn') sear(e);
  },
  pose(e) {
    const p = e.parts!;
    headsOf(e).forEach((h, i) => {
      p[`neck${i}`].visible = h.up;
      p[`stump${i}`].visible = !h.up && (h.cut > 0 || h.seared);
    });
    for (let i = 0; i < 5; i++) thrust(p[`head${i}`], i === (e.count ?? 0) ? (e.tele ?? 0) * 0.25 : 0); // (the head that strikes, thrust out)
  },
};

/** The lit brazier, candle stand or wall light nearest (x, z) within `r` in `room`, if any. */
function lightNear(room: Room, x: number, z: number, r: number) {
  let best: { x: number; z: number } | undefined,
    d0 = r;
  for (const b of room.props ?? [])
    if (b.prop.lit) {
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < d0) {
        d0 = d;
        best = b;
      }
    }
  for (const t of room.torches)
    if (t.lit) {
      const d = Math.hypot(t.x - x, t.z - z);
      if (d < d0) {
        d0 = d;
        best = t;
      }
    }
  return best;
}
/** A gloom raven's darkness: a soft black disc on the floor round it (one shared look for all). */
let gloomLook: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;
const raven: Behaviour = {
  // the Gloom Raven
  init(e, P) {
    e.state = 'wheel';
    e.st = span(P.wheel);
    e.fireT = span(P.cawEvery);
    e.cycle = Math.random() < 0.5 ? 1 : -1;
    gloomLook ??= {
      geo: markShared(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)),
      mat: markShared(
        new THREE.MeshBasicMaterial({
          map: glowTex,
          color: 0x000000,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        }),
      ),
    };
    const m = new THREE.Mesh(gloomLook.geo, gloomLook.mat);
    m.position.y = 0.035;
    m.scale.setScalar(num(P.gloom) * 1.3);
    m.renderOrder = 2;
    e.body.add(m);
    e.extra = m;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul,
      lamp = lightNear(room, e.x, e.z, num(P.light));
    if (a.dist < num(P.gloom)) player.dim = Math.max(player.dim, num(P.dim)); // (in its gloom the mage's sight darkens)
    if (e.state === 'wheel') {
      if (lamp) {
        const dx = e.x - lamp.x,
          dz = e.z - lamp.z,
          d = Math.hypot(dx, dz) || 1;
        e.vx = (dx / d) * sp;
        e.vz = (dz / d) * sp;
        if (!e.shunned) counter(e, 'drivenOff');
      } // (lights drive it off)
      else circle(e, a, num(P.keep) - 0.6, num(P.keep) + 0.6, sp, e.cycle!);
      e.shunned = !!lamp;
      if ((e.fireT! -= dt) <= 0 && !lamp) {
        // it caws: hexing shots
        e.fireT = span(P.cawEvery);
        const n = num(P.shots),
          base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) {
          const t = base + (i - (n - 1) / 2) * num(P.spread);
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.7, { hex: num(P.hex) });
        }
        Sfx.at(e.x, e.z).ravenCaw();
      }
      if (e.st <= 0 && !lamp) {
        e.state = 'tell';
        e.st = num(P.tell);
      }
    } else if (e.state === 'tell') {
      brake(e, 6, dt);
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'dive';
        e.st = num(P.diveTime);
        e.dir = { x: a.ux, z: a.uz };
        e.tele = 0;
        Sfx.at(e.x, e.z).wingBeat();
      }
    } else if (e.state === 'dive') {
      // down to peck
      const face = rush(e, num(P.dive));
      if (e.st <= 0) {
        e.state = 'wheel';
        e.st = span(P.wheel);
        e.cycle = -e.cycle!;
      }
      return face;
    }
  },
  bump(e, hit, P) {
    if (hit && e.state === 'dive' && e.st < num(P.diveTime) - 0.15) {
      e.state = 'wheel';
      e.st = span(P.wheel);
    }
  },
};

/** A wolf pack's mind, once a step: their ring round the mage turns; by turns one lunges; now and then one howls and the
    pack is hastened (as a lark's song hastens). */
function wolfMind(p: Pack, dt: number, P: Params) {
  if (p.stamp === G.flow.clock) return;
  p.stamp = G.flow.clock;
  const live = p.members.filter((m) => !m.dead);
  if (!live.length) return;
  if (p.state !== 'wolves') {
    p.state = 'wolves';
    p.st = span(P.lungeEvery) * 0.5;
    p.tz = span(P.howlEvery) * 0.5;
  } // (its first step)
  p.a += dt * num(P.spin);
  p.st -= dt;
  p.tz -= dt;
  if (p.st <= 0) {
    p.st = span(P.lungeEvery);
    const ready = live.filter((m) => m.state === 'circle');
    const w = ready[Math.floor(Math.random() * ready.length)];
    if (w) {
      w.state = 'tell';
      w.st = num(P.tell);
    }
  }
  if (p.tz <= 0) {
    p.tz = span(P.howlEvery);
    const w = live[Math.floor(Math.random() * live.length)];
    for (const m of live) m.sung = G.flow.clock + num(P.haste);
    w.tele = 1;
    Sfx.at(w.x, w.z).wolfHowl();
    burst(w.x, 1, w.z, light(w), 10, 1.8, 0.04);
  }
}
/** Fire under (x, z): burning ground (a foe's trail, thrown coals) or burning oil. */
const fireUnder = (x: number, z: number, r: number) => burningNear(x, z, r) || poolAt(x, z)?.state === 'burning';
/** A rime wolf scattered by fire: it runs from the mage for a while. */
function scatter(e: Enemy) {
  if (e.state === 'flee' || e.dead) return;
  e.state = 'flee';
  e.st = num(e.foe!.params.scatter);
  Sfx.at(e.x, e.z).wolfWhimper();
  counter(e, 'scattered');
}
// fire landing near a rime wolf scatters it
hearGround((kind, x, z, r) => {
  if (kind !== 'fire') return;
  for (const e of G.room.enemies)
    if (e.foe?.behaviour === 'wolf' && Math.hypot(e.x - x, e.z - z) < r + num(e.foe.params.fear)) scatter(e);
});
const wolf: Behaviour = {
  // the Rime Wolf
  init(e, P) {
    e.state = 'circle';
    e.st = span(P.lungeEvery);
  },
  step(e, dt, a, P) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul;
    if (e.pack) wolfMind(e.pack, dt, P);
    else if (e.state === 'circle' && e.st <= 0) {
      e.state = 'tell';
      e.st = num(P.tell);
    } // (a lone wolf lunges on its own time)
    if (fireUnder(e.x, e.z, num(P.fear))) scatter(e); // burning ground scatters them
    if (e.state === 'circle') {
      // in the ring round the mage
      const live = e.pack ? e.pack.members.filter((m) => !m.dead) : [e],
        i = Math.max(0, live.indexOf(e)),
        ang = (e.pack?.a ?? e.t * num(P.spin)) + (i * Math.PI * 2) / live.length;
      steer(e, player.x + Math.cos(ang) * num(P.keep), player.z + Math.sin(ang) * num(P.keep), sp, dt, 0.3);
    } else if (e.state === 'tell') {
      brake(e, 8, dt);
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'lunge';
        e.st = num(P.lungeTime);
        e.dir = { x: a.ux, z: a.uz };
        e.tele = 0;
        Sfx.at(e.x, e.z).crabSnap();
      }
    } else if (e.state === 'lunge') {
      const face = rush(e, num(P.lunge));
      if (a.dist < e.r + player.r + 0.05 && !mantleShields(e)) {
        hurtPlayer(e.foe!.contact, e.x, e.z);
        e.st = 0;
      }
      if (e.st <= 0) {
        e.state = 'circle';
        e.st = span(P.lungeEvery);
      }
      return face;
    } else if (e.state === 'flee') {
      // away from the mage, tail down
      e.vx = -a.ux * sp * 1.3;
      e.vz = -a.uz * sp * 1.3;
      if (e.st <= 0) {
        e.state = 'circle';
        e.st = span(P.lungeEvery);
      }
      return Math.atan2(-a.ux, -a.uz);
    }
  },
  pose(e) {
    if (e.state === 'tell') e.parts!.head.rotation.x -= (e.tele ?? 0) * 0.3;
    lean(e.parts!.tail, (e.sung ?? 0) > G.flow.clock ? -0.4 : 0);
  }, // (the head's tilt its idle sets; the tail up while hastened)
};

const pangolin: Behaviour = {
  // the Dust Pangolin
  init(e, P) {
    e.state = 'walk';
    e.st = span(P.walk);
  },
  step(e, dt, a, P) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul;
    if (e.state === 'walk') {
      e.vx = a.ux * sp;
      e.vz = a.uz * sp;
      if (e.st <= 0 && a.dist < num(P.range)) {
        e.state = 'curl';
        e.st = num(P.tell);
        Sfx.at(e.x, e.z).saltRaise();
      }
    } else if (e.state === 'curl') {
      // it curls into a ball of scales
      e.vx = e.vz = 0;
      e.tele = ramp(e.st, num(P.tell));
      if (e.st <= 0) {
        e.state = 'roll';
        e.st = num(P.rollMax);
        e.dir = { x: a.ux, z: a.uz };
        e.tele = 0;
        Sfx.at(e.x, e.z).pangolinRoll();
      }
    } else if (e.state === 'roll') {
      // and rolls at the mage, straight on until something stops it
      const face = rush(e, num(P.roll));
      if (e.st <= 0) {
        e.state = 'walk';
        e.st = span(P.walk);
      }
      return face;
    } else if (e.state === 'dazed') {
      e.vx = e.vz = 0;
      if (e.st <= 0) {
        e.state = 'walk';
        e.st = span(P.walk);
      }
    }
  },
  bump(e, hit, P) {
    // a wall: dazed in a cloud of dust that dims the sight, open to harm
    if (!hit || e.state !== 'roll' || e.st > num(P.rollMax) - 0.15) return;
    e.state = 'dazed';
    e.st = num(P.daze);
    e.vx = e.vz = 0;
    burst(e.x, 0.4, e.z, 0x9a8a72, 30, 3, 0.08);
    Sfx.at(e.x, e.z).rubbleSlam();
    counter(e, 'dazed');
    if (Math.hypot(player.x - e.x, player.z - e.z) < num(P.dust)) player.dim = Math.max(player.dim, num(P.dim));
  },
  struck(e, dmg, by, P) {
    if (e.state === 'roll') {
      burst(e.x, 0.5, e.z, 0xd8c8a0, 4, 1.4, 0.03);
      return by === 'cantrip' ? 0 : dmg * num(P.glance);
    } // (bolts glance off its scales)
    return e.state === 'dazed' ? dmg * num(P.open) : dmg;
  },
  pose(e) {
    const p = e.parts!,
      ball = e.state === 'roll' || e.state === 'curl';
    p.head.visible = !ball;
    if (ball) {
      p.body.scale.set(0.85, 0.85, 0.7);
      p.body.position.y += 0.08;
      if (e.state === 'roll') p.body.rotation.x = e.t * 14;
    } else {
      p.body.scale.setScalar(1);
      p.body.rotation.x = 0;
    }
  },
};

const kiter: Behaviour = {
  // the Frost Jackalope
  init(e, P) {
    e.state = 'watch';
    e.st = span(P.watch);
    e.fireT = span(P.stampEvery);
    e.height = 0;
    e.cycle = Math.random() < 0.5 ? 1 : -1;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul;
    const pinned = fireUnder(e.x, e.z, num(P.fear)),
      slick = slipAt(e.x, e.z) || poolAt(e.x, e.z)?.state === 'frozen' ? num(P.slide) : 1; // (burning ground stops its leaps; on rime or ice it slides quick)
    if (e.state === 'watch') {
      // side to side at its distance
      e.vx = -a.uz * e.cycle! * sp * 0.6 * slick;
      e.vz = a.ux * e.cycle! * sp * 0.6 * slick;
      if (a.dist < num(P.keep) && e.st <= 0 && pinned) counter(e, 'pinned'); // (it would bound away, but the fire holds it)
      if (a.dist < num(P.keep) && e.st <= 0 && !pinned) {
        // it bounds away
        const t = Math.atan2(-a.uz, -a.ux) + (Math.random() - 0.5) * 1.2;
        e.dir = { x: Math.cos(t), z: Math.sin(t) };
        e.state = 'leap';
        e.st = num(P.leapTime);
        Sfx.at(e.x, e.z).wingBeat();
      }
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.range)) {
        // it stamps: ice shards, and rime under it
        e.fireT = span(P.stampEvery);
        const n = num(P.shards),
          base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) {
          const t = base + (i - (n - 1) / 2) * num(P.spread);
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.6, { chill: num(P.chill) });
        }
        layGround(room, 'rime', e.x, e.z, num(P.rime), num(P.rimeTime));
        ringFx(e.x, 0.1, e.z, light(e), 0.2, 1.2, 0.3, true);
        Sfx.at(e.x, e.z).hareStamp();
        e.cycle = -e.cycle!;
      }
      if (e.st <= 0 && a.dist >= num(P.keep)) e.st = span(P.watch);
    } else if (e.state === 'leap') {
      const k = 1 - e.st / num(P.leapTime),
        face = rush(e, num(P.leap));
      e.height = Math.sin(k * Math.PI) * 0.6;
      if (e.st <= 0) {
        e.state = 'watch';
        e.st = span(P.watch);
        e.height = 0;
      }
      return face;
    }
  },
  pose(e) {
    e.model!.position.y = e.height ?? 0;
  },
};

const manticore: Behaviour = {
  init(e, P) {
    e.state = 'stalk';
    e.fireT = span(P.volleyEvery);
    e.st = span(P.pounceEvery);
    e.cycle = Math.random() < 0.5 ? 1 : -1;
    e.height = 0;
  },
  step(e, dt, a, P) {
    e.st -= dt;
    const sp = e.foe!.speed * e.speedMul,
      still = (e.status?.sanct ?? 0) > 0; // (holy light stills the tail)
    if (e.state === 'stalk') {
      circle(e, a, num(P.keep) - 0.6, num(P.keep) + 0.6, sp, e.cycle!);
      if (!still && (e.fireT! -= dt) <= 0) {
        e.state = 'aim';
        e.tick = num(P.tailTell);
        Sfx.at(e.x, e.z).manticoreTail();
      } else if (e.st <= 0 && a.dist < num(P.pounceRange)) {
        e.state = 'crouch';
        e.tick = num(P.crouch);
        e.target = { x: player.x, z: player.z };
      }
    } else if (e.state === 'aim') {
      // its tail rises, and looses a volley of hexing spikes
      e.vx = e.vz = 0;
      e.tick! -= dt;
      e.tele = ramp(e.tick!, num(P.tailTell));
      if (still) {
        e.state = 'stalk';
        e.tele = 0;
        e.fireT = span(P.volleyEvery);
      } else if (e.tick! <= 0) {
        const n = num(P.spikes),
          base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) {
          const t = base + (i - (n - 1) / 2) * num(P.spread);
          shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), 0.6, { hex: num(P.hex) });
        }
        burst(e.x, 1.2, e.z, light(e), 8, 1.6, 0.04);
        e.state = 'stalk';
        e.tele = 0;
        e.fireT = span(P.volleyEvery);
      }
    } else if (e.state === 'crouch') {
      // it crouches, then pounces where the mage stood
      e.vx = e.vz = 0;
      e.tick! -= dt;
      e.tele = ramp(e.tick!, num(P.crouch));
      if (e.tick! <= 0) {
        const t = e.target!,
          d = Math.hypot(t.x - e.x, t.z - e.z) || 1;
        e.dir = { x: (t.x - e.x) / d, z: (t.z - e.z) / d };
        e.cycle = d;
        e.state = 'pounce';
        e.tick = num(P.pounceTime);
        e.tele = 0;
        Sfx.at(e.x, e.z).manticorePounce();
      }
    } else if (e.state === 'pounce') {
      const T = num(P.pounceTime),
        k = 1 - e.tick! / T,
        v = Math.min(e.cycle!, num(P.pounceMax)) / T;
      e.tick! -= dt;
      e.vx = e.dir!.x * v;
      e.vz = e.dir!.z * v;
      e.height = Math.sin(k * Math.PI) * 0.8;
      if (e.tick! <= 0) {
        e.height = 0;
        ringFx(e.x, 0.1, e.z, light(e), 0.3, 1.6, 0.35, true);
        burst(e.x, 0.3, e.z, 0x8a7a5a, 14, 2.2, 0.05);
        Sfx.at(e.x, e.z).rubbleSlam();
        if (Math.hypot(player.x - e.x, player.z - e.z) < num(P.landHit)) hurtPlayer(1, e.x, e.z);
        e.state = 'stalk';
        e.st = span(P.pounceEvery);
        e.cycle = Math.random() < 0.5 ? 1 : -1;
      }
      return Math.atan2(e.dir!.x, e.dir!.z);
    }
  },
  afflicted(e, kind, P) {
    if (kind === 'sanct' && e.state === 'aim') {
      counter(e, 'stilled');
      e.state = 'stalk';
      e.tele = 0;
      e.fireT = span(P.volleyEvery);
      burst(e.x, 1.2, e.z, SCHOOL_LIGHT.hallow, 10, 1.8, 0.04);
    }
  },
  pose(e) {
    const p = e.parts!;
    e.model!.position.y = e.height ?? 0;
    if (e.state === 'aim') {
      p.tail.rotation.x -= (e.tele ?? 0) * 0.5;
      p.tip.rotation.x -= (e.tele ?? 0) * 0.6;
    }
  },
};

export const BESTIARY_BEHAVIOURS: Record<string, Behaviour> = {
  dropper,
  splitter,
  tome,
  swarm,
  singer,
  mantis,
  crab,
  snail,
  newt,
  serpent,
  wave,
  cloud,
  darter,
  mine,
  nest,
  wasp,
  djinn,
  ooze,
  phoenix,
  basilisk,
  bodyguard,
  breaker,
  stone,
  griffin,
  eye,
  harpy,
  magnet,
  hearth,
  shade,
  roller,
  glacier,
  hydra,
  raven,
  wolf,
  pangolin,
  kiter,
  manticore,
};
/** How fast a foe a lark has sung to moves (1: not sung to). */
export const songHaste = (e: Enemy) => ((e.sung ?? 0) > G.flow.clock ? CFG.bestiary.songHaste : 1);
/** Make a pack of `n` foes of one kind round (x, z), sharing one mind (the firefly swarm): each made by `make`. */
export function packOf(n: number, x: number, z: number, make: (x: number, z: number) => Enemy) {
  const first = make(x, z),
    pack = (first.pack ??= {
      members: [first],
      cx: x,
      cz: z,
      state: '',
      st: 0,
      stamp: -1,
      tx: 0,
      tz: 0,
      a: Math.random() * 6,
    }); // (a swarm makes its own as it begins; others, here)
  for (let i = 1; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      at = freeSpotNear(G.room.current, x + Math.cos(a) * 0.7, z + Math.sin(a) * 0.7);
    const m = make(at.x, at.z);
    pack.members.push(m);
    m.pack = pack;
    m.cycle = a;
  }
  return first;
}
