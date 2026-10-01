/* The bestiary's foes (M4.5, docs/M4.5-plan.md): the behaviours of the thirty-five, floor by floor, on the same footing as
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
   Crab (the Rubble Crab) sits as a heap of rubble until the mage comes near or strikes it; then it sidles round the mage,
     its shell turning half of every blow, throws sparks from its claws and darts in to pinch. A glyph's blast flips it
     on its back, open to harm, for a while.

   Floor 2, the drowned:
   Snail (the Rime Snail) crawls at the mage leaving a trail of rime: water it crosses freezes, and the mage slides on it
     (fire melts it). It spits cold. Struck often, it withdraws into its ice shell, which turns nearly every blow; fire
     cracks the shell, and cracked it takes more.
   Newt (the Glass Newt) swims in the room's water (or a pool it brings), clear as glass, only a ripple, to where the water
     comes nearest the mage; then it lunges out and bites, and the bite chills. On dry floor it scurries, seen, and makes
     for the water again. A shock through its pool, or the pool frozen over, shows and stuns it.
   Serpent (the Brine Serpent) lives in water, as the lurker does: it slides beneath it to the place nearest the mage,
     rises in coils and spits fans of cold brine, and sinks again. Freezing its pool traps it above the ice.
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
     ring of shots. Fire bursts it early, where it stands, and burns the spores away. */
import * as THREE from 'three';
import type { Enemy, Pack, Room } from '../types';
import { G, player } from '../state';
import { CFG } from '../config';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { spawnShot } from '../combat/projectiles';
import { addSpores } from '../world/props';
import { freeSpotNear } from '../world/rooms';
import { addPool, frostAt, poolAt, shockAt } from '../world/pools';
import { ringFx, strikeFx } from '../magic/spellFx';
import { mantleShields } from '../magic/shapes';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { dropPage } from '../magic/pages';
import { lerp } from '../util';
import { makeEnemy } from './enemies';
import { layGround, lob } from './bestiaryGround';
import { laySpark } from './foes';
import { light, num, span, type Aim, type Behaviour, type Params } from './foeKit';

export { clearGround, updateGround } from './bestiaryGround';

/** Steer `e` towards (x, z) at `speed`, easing in over `ease` seconds (a flier's swoop rather than a turn on the spot). */
function steer(e: Enemy, x: number, z: number, speed: number, dt: number, ease = .25) {
  const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz) || 1, sp = speed * Math.min(1, d / .6);
  const k = Math.min(1, dt / ease); e.vx = lerp(e.vx, dx / d * sp, k); e.vz = lerp(e.vz, dz / d * sp, k);
}
/** Keep `e` between `near` and `far` of the mage, circling it (`turn` +1 or -1): closer when far, back when near. */
function circle(e: Enemy, a: Aim, near: number, far: number, speed: number, turn: number) {
  const rad = a.dist > far ? 1 : a.dist < near ? -1 : 0, side = .8;
  const vx = a.ux * rad - a.uz * side * turn, vz = a.uz * rad + a.ux * side * turn, n = Math.hypot(vx, vz) || 1;
  e.vx = vx / n * speed; e.vz = vz / n * speed;
}
/** The way `e` faces (body.rotation.y) as a direction on the floor. */
const facing = (e: Enemy) => ({ x: Math.sin(e.face), z: Math.cos(e.face) });
/** A shot from `e` at the mage, a little ahead of it. */
const shoot = (e: Enemy, ux: number, uz: number, speed: number, size = .7, o: Parameters<typeof spawnShot>[8] = {}, color: number = light(e)) =>
  spawnShot(e.x + ux * .35, e.z + uz * .35, ux, uz, speed, color, .55, size, o);
/** Foes in the current room still standing (and not hidden away), other than `e`. */
const othersAwake = (e: Enemy) => G.enemies.some(o => o !== e && !o.dead && o.state !== 'hidden' && o.state !== 'shut' && o.type !== e.type);

/* ---------- floor 1 ---------- */

const dropper: Behaviour = {
  init(e, P) {
    e.state = 'hang'; e.st = span(P.hang) * .6; e.hidden = true; e.contact = 0; e.height = num(P.height);
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, 1, 4), new THREE.MeshBasicMaterial({ color: 0xe8e4f0, transparent: true, opacity: .55 }));
    thread.geometry.translate(0, .5, 0); thread.scale.y = 6; e.body.add(thread); e.extra = thread;
  },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'hang') { // up out of reach, creeping after the mage; only its shadow and thread show where
      steer(e, player.x, player.z, num(P.creep) * e.speedMul, dt, .4);
      if (e.st <= 0 && a.dist < 1.2 || e.st < -2) { e.state = 'tell'; e.st = num(P.tell); Sfx.at(e.x, e.z).spiderTell(); }
    } else if (e.state === 'tell') { // it stops above the spot, the shadow darkening
      e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.tell));
      if (e.st <= 0) { e.state = 'drop'; e.st = num(P.drop); e.tele = 0; }
    } else if (e.state === 'drop') {
      e.height = num(P.height) * Math.max(0, e.st / num(P.drop)) ** 2;
      if (e.st <= 0) {
        e.height = 0; e.hidden = false; e.contact = e.foe!.contact; e.state = 'ground'; e.st = span(P.ground); e.fireT = span(P.spitEvery) * .5;
        burst(e.x, .2, e.z, 0x3a3048, 10, 1.6, .05); G.shake = Math.max(G.shake, .08); Sfx.at(e.x, e.z).spiderLand();
      }
    } else if (e.state === 'ground') { // it skitters at the mage, side to side, and spits webs where the mage stands
      const wob = Math.sin(e.t * 5) * .9, sp = e.foe!.speed * e.speedMul;
      e.vx = (a.ux - a.uz * wob) * sp; e.vz = (a.uz + a.ux * wob) * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.spitRange)) { e.state = 'spit'; e.cycle = num(P.spitTell); e.tele = 0; }
      if (e.st <= 0) { e.state = 'climb'; e.st = num(P.climb); e.contact = 0; Sfx.at(e.x, e.z).spiderClimb(); }
    } else if (e.state === 'spit') {
      e.vx = e.vz = 0; e.cycle! -= dt; e.tele = Math.min(1, 1 - e.cycle! / num(P.spitTell));
      if (e.cycle! <= 0) {
        const tx = player.x + player.vx * .4, tz = player.z + player.vz * .4, at = freeSpotNear(room, tx, tz);
        lob(room, e.x, e.z, at.x, at.z, 0xd8d0e8, .55, (x, z) => { layGround(room, 'web', x, z, num(P.webSize), num(P.webTime)); burst(x, .1, z, 0xd8d0e8, 6, 1.2, .03); Sfx.at(x, z).webLand(); }, 1, .8);
        Sfx.at(e.x, e.z).webSpit(); e.state = 'ground'; e.tele = 0; e.fireT = span(P.spitEvery);
      }
    } else if (e.state === 'climb') {
      e.vx = e.vz = 0; e.height = num(P.height) * (1 - Math.max(0, e.st / num(P.climb)));
      if (e.st < num(P.climb) * .5) e.hidden = true;
      if (e.st <= 0) { e.state = 'hang'; e.st = span(P.hang); }
    }
  },
  pose(e) {
    e.model!.position.y = e.height ?? 0;
    if (e.extra) { e.extra.position.y = (e.height ?? 0) + .45; e.extra.visible = e.state !== 'ground' && e.state !== 'spit'; }
  },
};

const splitter: Behaviour = {
  init(e, P) { e.state = 'crawl'; e.fireT = span(P.cloudEvery); e.tick = 0; e.gen ??= 0; },
  step(e, dt, a, P, room) {
    if ((e.tick! -= dt) <= 0) { e.tick = num(P.smearEvery); layGround(room, 'ink', e.x - a.ux * .2, e.z - a.uz * .2, num(P.smearSize) * e.scale, num(P.smearTime)); }
    if (e.state === 'crawl') {
      const surge = .55 + .45 * Math.max(0, Math.sin(e.t * 3)), sp = e.foe!.speed * e.speedMul * surge; // (in surges, as its arms pull)
      e.vx = a.ux * sp; e.vz = a.uz * sp;
      if ((e.fireT! -= dt) <= 0 && a.dist < 4.5) { e.state = 'squirt'; e.st = num(P.cloudTell); Sfx.at(e.x, e.z).inkSwell(); }
    } else if (e.state === 'squirt') {
      e.vx = e.vz = 0; e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.cloudTell));
      if (e.st <= 0) {
        addSpores(room, e.x, e.z, { color: 0x3a1f66, sting: num(P.dim) }); burst(e.x, .4, e.z, 0x2a1848, 14, 2, .06); Sfx.at(e.x, e.z).inkSquirt();
        e.state = 'crawl'; e.tele = 0; e.fireT = span(P.cloudEvery);
      }
    }
  },
  struck(e, dmg, _by, P, dx, dz) {
    if ((e.gen ?? 0) > 0 || e.hp - dmg > e.maxHp * num(P.splitAt) || e.hp - dmg <= 0) return dmg;
    if ((e.status?.chill ?? 0) > 0) { burst(e.x, .4, e.z, SCHOOL_LIGHT.frost, 12, 2, .05); Sfx.at(e.x, e.z).inkCrack(); return dmg * num(P.crack); } // (chilled, it cracks instead of splitting)
    // it splits: it becomes the one half, and the other slides away across the floor
    const k = num(P.splitScale), hp = e.maxHp * num(P.splitHp);
    e.gen = 1; e.hp = hp; e.scale *= k; e.r *= k; e.kx += -dz * 3; e.kz += dx * 3;
    const at = freeSpotNear(G.current, e.x + dz * .6, e.z - dx * .6), twin = makeEnemy(e.type, at.x, at.z);
    twin.gen = 1; twin.maxHp = e.maxHp; twin.hp = hp; twin.scale = e.scale; twin.r = e.r; twin.spawn = .15; twin.kx = dz * 3; twin.kz = -dx * 3;
    burst(e.x, .4, e.z, 0x2a1848, 18, 2.4, .06); Sfx.at(e.x, e.z).inkSplit();
    return 0;
  },
};

const tome: Behaviour = {
  init(e) { e.state = 'shut'; e.contact = 0; e.flying = false; e.animRate = 0; e.st = 0; e.open = 0; e.fireT = 0; e.spawn = .01; },
  step(e, dt, a, P) {
    e.st -= dt;
    if (e.state === 'shut') { // a book on the floor
      e.vx = e.vz = 0; e.guard = num(P.guard); e.animRate = 0;
      const still = !othersAwake(e); e.fireT = still ? e.fireT! + dt : 0;
      if (a.dist < num(P.wake) || e.hp < e.maxHp || e.fireT > num(P.lonely)) { e.state = 'wake'; e.st = num(P.rise); Sfx.at(e.x, e.z).bookWake(); burst(e.x, .3, e.z, 0xe6d8b8, 8, 1.4, .04); }
      return e.face;
    }
    if (e.state === 'wake') { e.vx = e.vz = 0; e.open = 1 - Math.max(0, e.st / num(P.rise)); if (e.st <= 0) { e.state = 'fly'; e.flying = true; e.contact = e.foe!.contact; e.guard = 1; e.animRate = 1; e.fireT = span(P.riffleEvery); e.cycle = span(P.biteEvery); } return; }
    if (e.state === 'fly') {
      const keep = P.keep as number[]; circle(e, a, keep[0], keep[1], e.foe!.speed * e.speedMul, Math.sin(e.t * .4) > 0 ? 1 : -1);
      if ((e.fireT! -= dt) <= 0) { e.state = 'riffle'; e.st = num(P.tell); Sfx.at(e.x, e.z).pageRiffle(); }
      else if ((e.cycle! -= dt) <= 0 && a.dist < 4) { e.state = 'bite'; e.st = num(P.biteTime); e.dir = { x: a.ux, z: a.uz }; Sfx.at(e.x, e.z).bookSnap(); }
    } else if (e.state === 'riffle') { // it hangs open, pages fluttering, then throws them
      e.vx *= Math.exp(-6 * dt); e.vz *= Math.exp(-6 * dt); e.tele = Math.min(1, 1 - e.st / num(P.tell));
      if (e.st <= 0) {
        const n = num(P.pages), base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) { const t = base + (i - (n - 1) / 2) * num(P.spread); shoot(e, Math.cos(t), Math.sin(t), num(P.pageSpeed), .6, {}, 0xe8dcff); }
        burst(e.x, .8, e.z, 0xe6d8b8, 10, 1.8, .04); e.state = 'fly'; e.tele = 0; e.fireT = span(P.riffleEvery);
      }
    } else if (e.state === 'bite') {
      e.vx = e.dir!.x * num(P.bite) * e.speedMul; e.vz = e.dir!.z * num(P.bite) * e.speedMul;
      if (e.st <= 0) { e.state = 'fly'; e.cycle = span(P.biteEvery); }
    }
  },
  pose(e) {
    const p = e.parts!, o = e.state === 'shut' ? 0 : e.state === 'wake' ? e.open ?? 0 : 1;
    if (o < 1) { p.upper.rotation.x *= o; p.lower.rotation.x *= o; }
    e.model!.position.y = (o - 1) * .72;
  },
  die(e, P) { if (G.run.pages.chance(num(P.pageChance))) { const at = freeSpotNear(G.current, e.x, e.z); dropPage(G.current, at.x, at.z); } },
};

/** A swarm's one mind, worked out once a step by whichever of it moves first. */
function think(p: Pack, dt: number, P: Params) {
  if (p.stamp === G.simClock) return; p.stamp = G.simClock;
  const alive = p.members.filter(m => !m.dead); if (!alive.length) return;
  p.st -= dt;
  if (p.state === 'drift') { // its centre wanders round the mage, a few tiles off
    p.a += dt * num(P.wheel);
    const [k0, k1] = P.keep as number[], keep = (k0 + k1) / 2, tx = player.x + Math.cos(p.a) * keep, tz = player.z + Math.sin(p.a) * keep * .8;
    const d = Math.hypot(tx - p.cx, tz - p.cz) || 1, sp = Math.min(d, num(P.drift) * dt);
    p.cx += (tx - p.cx) / d * sp; p.cz += (tz - p.cz) / d * sp;
    if (p.st <= 0) { p.state = 'tell'; p.st = num(P.tell); Sfx.at(p.cx, p.cz).swarmGlow(); }
  } else if (p.state === 'tell') {
    if (p.st <= 0) { p.state = 'stream'; p.st = num(P.dashTime) + alive.length * num(P.gap) + .6; p.tx = player.x; p.tz = player.z; alive.forEach((m, i) => { m.st = i * num(P.gap); m.dir = undefined; }); Sfx.at(p.cx, p.cz).swarmStream(); }
  } else if (p.state === 'stream' && p.st <= 0) { p.state = 'drift'; p.st = span(P.streamEvery); }
}
const swarm: Behaviour = {
  init(e, P) {
    e.state = 'drift'; e.cycle = Math.random() * Math.PI * 2;
    e.pack ??= { members: [e], cx: e.x, cz: e.z, state: 'drift', st: span(P.streamEvery), stamp: -1, tx: 0, tz: 0, a: Math.random() * 6 };
  },
  step(e, dt, _a, P) {
    const p = e.pack!; think(p, dt, P); e.state = p.state;
    const sp = e.foe!.speed * e.speedMul;
    if (p.state === 'stream') {
      e.st -= dt;
      if (e.st > 0 && !e.dir) { steer(e, p.cx, p.cz, sp, dt); return; }
      if (!e.dir) { const dx = p.tx - e.x, dz = p.tz - e.z, d = Math.hypot(dx, dz) || 1; e.dir = { x: dx / d, z: dz / d }; e.tick = num(P.dashTime); }
      if ((e.tick! -= dt) > 0) { e.vx = e.dir.x * num(P.dash) * e.speedMul; e.vz = e.dir.z * num(P.dash) * e.speedMul; return Math.atan2(e.dir.x, e.dir.z); }
    }
    e.tele = p.state === 'tell' ? Math.min(1, 1 - p.st / num(P.tell)) : 0;
    const i = p.members.indexOf(e), n = p.members.length, ang = (e.cycle ?? 0) + G.simClock * num(P.spin) + i / n * Math.PI * 2;
    const R = num(P.orbit) * (.6 + .4 * Math.sin(G.simClock * 1.3 + i));
    steer(e, p.cx + Math.cos(ang) * R, p.cz + Math.sin(ang) * R * .8, sp, dt, .35);
  },
  die(e, P) { // a flash of light as it goes out
    burst(e.x, .7, e.z, 0xfff4c8, 12, 2.4, .05); ringFx(e.x, .7, e.z, SCHOOL_LIGHT.hallow, .1, num(P.flash), .3, false, .9); Sfx.at(e.x, e.z).fireflyPop();
  },
};

/** Where a lark may perch: by a pillar, or close to a wall, away from the mage. */
function perchSpot(room: Room, e: Enemy) {
  const b = room.bounds, pillars = room.rocks.filter(r => r.pillar).map(r => ({ x: r.x, z: r.z + r.hz + .5 }));
  const walls = Array.from({ length: 8 }, () => { const side = Math.floor(Math.random() * 4), t = Math.random(); return side === 0 ? { x: lerp(b.minX + 1, b.maxX - 1, t), z: b.minZ + .7 } : side === 1 ? { x: lerp(b.minX + 1, b.maxX - 1, t), z: b.maxZ - .7 } : side === 2 ? { x: b.minX + .7, z: lerp(b.minZ + 1, b.maxZ - 1, t) } : { x: b.maxX - .7, z: lerp(b.minZ + 1, b.maxZ - 1, t) }; });
  const all = [...pillars, ...walls].filter(q => Math.hypot(q.x - player.x, q.z - player.z) > 3.5 && Math.hypot(q.x - e.x, q.z - e.z) > 1.5);
  return all[Math.floor(Math.random() * all.length)] ?? { x: room.cx, z: room.cz };
}
const singer: Behaviour = {
  init(e) { e.state = 'fly'; e.target = undefined; e.fireT = 0; e.cycle = 0; },
  step(e, dt, a, P, room) {
    const alone = !othersAwake(e);
    if (alone && e.state !== 'dive' && e.state !== 'rise') { e.state = 'rise'; e.st = num(P.diveTell); Sfx.at(e.x, e.z).larkCry(); }
    if (e.state === 'fly') {
      e.target ??= perchSpot(room, e);
      steer(e, e.target.x, e.target.z, num(P.fly) * e.speedMul, dt, .3);
      if (Math.hypot(e.target.x - e.x, e.target.z - e.z) < .3) { e.state = 'perch'; e.st = span(P.perch); e.fireT = .3; }
      return Math.atan2(e.vx, e.vz);
    }
    if (e.state === 'perch') { // it sings: rings of song, and the foes round it are hastened, unless a hex has silenced it
      e.vx *= Math.exp(-8 * dt); e.vz *= Math.exp(-8 * dt); e.st -= dt;
      const hushed = (e.status?.hex ?? 0) > 0;
      if ((e.fireT! -= dt) <= 0 && !hushed) {
        e.fireT = num(P.songEvery); ringFx(e.x, .9, e.z, light(e), .3, num(P.songRange), .8, true, .7); Sfx.at(e.x, e.z).larkSong();
        for (const o of G.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.z - e.z) < num(P.songRange)) { o.sung = G.simClock + num(P.hasteTime); burst(o.x, .8, o.z, light(e), 2, 1, .03); }
      }
      if (a.dist < num(P.flee) || e.st <= 0) { e.state = 'fly'; e.target = perchSpot(room, e); Sfx.at(e.x, e.z).wingBeat(); }
      return;
    }
    if (e.state === 'rise') { e.vx *= Math.exp(-6 * dt); e.vz *= Math.exp(-6 * dt); e.st -= dt; e.tele = Math.min(1, 1 - e.st / num(P.diveTell)); if (e.st <= 0) { e.state = 'dive'; e.st = num(P.diveTime); e.dir = { x: a.ux, z: a.uz }; e.tele = 0; } return; }
    if (e.state === 'dive') {
      e.vx = e.dir!.x * num(P.dive) * e.speedMul; e.vz = e.dir!.z * num(P.dive) * e.speedMul; e.st -= dt;
      if (e.st <= 0) { e.state = alone ? 'rise' : 'fly'; e.st = num(P.diveTell) * 1.5; e.target = perchSpot(room, e); }
      return Math.atan2(e.dir!.x, e.dir!.z);
    }
  },
  bump(e, hit) { if (hit && e.state === 'dive') e.st = 0; },
};

const mantis: Behaviour = {
  init(e, P) { e.state = 'stalk'; e.st = span(P.stalk); e.count = 0; },
  step(e, dt, a, P) {
    e.st -= dt;
    if (e.state === 'stalk') { // at arm's length, facing the mage, blades up
      const rad = a.dist > num(P.keep) + .4 ? 1 : a.dist < num(P.keep) - .4 ? -.6 : 0, side = Math.sin(e.t * .7) * .5, sp = e.foe!.speed * e.speedMul;
      e.vx = (a.ux * rad - a.uz * side) * sp; e.vz = (a.uz * rad + a.ux * side) * sp;
      if (e.st <= 0 && a.dist < num(P.keep) + 1.4) { e.state = 'rear'; e.st = num(P.tell); e.dir = { x: a.ux, z: a.uz }; Sfx.at(e.x, e.z).mantisRear(); }
    } else if (e.state === 'rear') {
      e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.tell)); e.dir = { x: a.ux, z: a.uz };
      if (e.st <= 0) { e.state = 'lunge'; e.st = num(P.lungeTime); e.tele = 0; Sfx.at(e.x, e.z).mantisSlash(); }
      return Math.atan2(e.dir.x, e.dir.z);
    } else if (e.state === 'lunge') {
      e.vx = e.dir!.x * num(P.lunge) * e.speedMul; e.vz = e.dir!.z * num(P.lunge) * e.speedMul;
      if (e.st <= 0) { e.state = 'open'; e.st = num(P.open); burst(e.x + e.dir!.x * .5, .6, e.z + e.dir!.z * .5, light(e), 8, 2, .04); }
      return Math.atan2(e.dir!.x, e.dir!.z);
    } else if (e.state === 'open') { // overreached: it stands, blades low, its back to whoever comes round
      e.vx *= Math.exp(-5 * dt); e.vz *= Math.exp(-5 * dt);
      if (e.st <= 0) { e.state = 'stalk'; e.st = span(P.stalk); }
      return e.face;
    }
  },
  struck(e, dmg, by, P, dx, dz) {
    if (by !== 'cantrip' || (e.state !== 'stalk' && e.state !== 'rear') || (e.status?.chill ?? 0) > 0 || (e.status?.shock ?? 0) > 0) return dmg;
    const f = facing(e); if (dx * f.x + dz * f.z > -num(P.parryArc)) return dmg; // (from the side or behind, it lands)
    e.count = (e.count ?? 0) + 1; e.face += (Math.random() - .5) * .3;
    const ux = player.x - e.x, uz = player.z - e.z, d = Math.hypot(ux, uz) || 1;
    shoot(e, ux / d, uz / d, num(P.parrySpeed), .55); burst(e.x + f.x * .4, .8, e.z + f.z * .4, light(e), 8, 2.2, .035); Sfx.at(e.x, e.z).mantisParry();
    return 0;
  },
  pose(e) { const p = e.parts!; if (e.state === 'rear') p.chest.rotation.x -= (e.tele ?? 0) * .35; else if (e.state === 'open') p.chest.rotation.x += .3; },
};

const crab: Behaviour = {
  init(e) { e.state = 'hidden'; e.contact = 0; e.animRate = 0; e.st = 0; e.cycle = 1; e.spawn = .01; },
  step(e, dt, a, P) {
    e.st -= dt;
    if (e.state === 'hidden') { // a heap of rubble
      e.vx = e.vz = 0; e.guard = num(P.hideGuard);
      if (a.dist < num(P.wake) || e.hp < e.maxHp) { e.state = 'rise'; e.st = num(P.rise); Sfx.at(e.x, e.z).crabWake(); burst(e.x, .2, e.z, 0x7a746c, 10, 1.6, .05); }
      return e.face;
    }
    if (e.state === 'rise') { e.vx = e.vz = 0; if (e.st <= 0) { e.state = 'sidle'; e.contact = e.foe!.contact; e.animRate = 1; e.st = span(P.turn); e.fireT = span(P.sparkEvery); e.tick = span(P.pinchEvery); } return; }
    if (e.state === 'flipped') { // on its back, legs in the air
      e.vx = e.vz = 0; e.guard = num(P.flipGuard);
      if (e.st <= 0) { e.state = 'sidle'; e.guard = num(P.guard); e.st = span(P.turn); Sfx.at(e.x, e.z).crabWake(); }
      return e.face;
    }
    e.guard = num(P.guard);
    if (e.state === 'sidle') { // sideways round the mage, keeping off
      if (e.st <= 0) { e.cycle = -(e.cycle ?? 1); e.st = span(P.turn); }
      circle(e, a, (P.keep as number[])[0], (P.keep as number[])[1], e.foe!.speed * e.speedMul, e.cycle!);
      if ((e.fireT! -= dt) <= 0) { e.state = 'spark'; e.st = num(P.tell); }
      else if ((e.tick! -= dt) <= 0) { e.state = 'pinch'; e.st = num(P.pinchTime); e.dir = { x: a.ux, z: a.uz }; Sfx.at(e.x, e.z).crabSnap(); }
    } else if (e.state === 'spark') {
      e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.tell));
      if (e.st <= 0) { shoot(e, a.ux, a.uz, num(P.sparkSpeed), .6); Sfx.at(e.x, e.z).spark(); burst(e.x, .4, e.z, light(e), 6, 1.6, .03); e.state = 'sidle'; e.tele = 0; e.fireT = span(P.sparkEvery); }
    } else if (e.state === 'pinch') {
      e.vx = e.dir!.x * num(P.pinch) * e.speedMul; e.vz = e.dir!.z * num(P.pinch) * e.speedMul;
      if (e.st <= 0) { e.state = 'sidle'; e.tick = span(P.pinchEvery); }
    }
  },
  blasted(e, P) {
    if (e.state === 'hidden' || e.state === 'rise') return;
    e.state = 'flipped'; e.st = num(P.flipped); e.vx = e.vz = 0; burst(e.x, .4, e.z, 0x8e877c, 12, 2.2, .05); Sfx.at(e.x, e.z).crabFlip();
  },
  pose(e) {
    const flipped = e.state === 'flipped', hid = e.state === 'hidden' ? 1 : e.state === 'rise' ? Math.max(0, e.st / .4) : 0;
    e.model!.rotation.z = flipped ? Math.PI : 0; e.model!.position.y = flipped ? .62 : -hid * .3; // (hidden, sunk to its shell in the rubble)
    e.parts!.big.visible = e.parts!.small.visible = hid < .5;
  },
};

/** M4.5's behaviours, by name (data/foes.json's `behaviour`). */
/* ---------- floor 2 ---------- */

/** The water tiles in `room` (with `still`, only those not frozen over), and the one nearest (x, z). */
const waterIn = (room: Room, still = false) => (room.pools ?? []).filter(p => p.kind === 'water' && (still ? p.state === 'still' : p.state !== 'spent')).flatMap(p => p.tiles);
function nearestWaterTo(room: Room, x: number, z: number, still = false) {
  let best: { x: number; z: number } | undefined, d0 = Infinity;
  for (const t of waterIn(room, still)) { const d = Math.hypot(t.x - x, t.z - z); if (d < d0) { d0 = d; best = t; } }
  return best;
}
/** A pool poured round (x, z): the floor tiles within `n` steps of it (a newt or a serpent brings its own; a walking wave
    leaves one a tile at a time). */
function pour(room: Room, x: number, z: number, n: number) {
  const c = Math.floor(x - room.bounds.minX), r = Math.floor(z - room.bounds.minZ), tiles: { c: number; r: number }[] = [];
  for (let dr = -n; dr <= n; dr++) for (let dc = -n; dc <= n; dc++) if (Math.abs(dr) + Math.abs(dc) <= n && room.template.tiles[r + dr]?.[c + dc] === 'floor') tiles.push({ c: c + dc, r: r + dr });
  return addPool(room, 'water', tiles);
}
/** Under water: out of reach, not hurting, gliding over what walkers walk round (as the lurker). Up: there to strike. */
function submerge(e: Enemy, under: boolean) { e.hidden = under; e.flying = under; e.contact = under ? 0 : e.foe!.contact; }

const snail: Behaviour = {
  init(e, P) { e.state = 'crawl'; e.tick = 0; e.fireT = span(P.spitEvery); e.cycle = 0; },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'crawl') { // slow, leaving rime: water it crosses freezes, and the mage slides on it
      const sp = e.foe!.speed * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp;
      if ((e.tick! -= dt) <= 0) { e.tick = num(P.trailEvery); frostAt(e.x, e.z, .2); layGround(room, 'rime', e.x - a.ux * .35, e.z - a.uz * .35, num(P.rimeSize), num(P.rimeTime)); }
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.spitRange)) { shoot(e, a.ux, a.uz, num(P.shotSpeed), .75, { chill: num(P.chill) }); Sfx.at(e.x, e.z).snailSpit(); e.fireT = span(P.spitEvery); }
      if (e.cycle! >= num(P.shellAt)) { e.state = 'shell'; e.st = num(P.shellTime); e.cycle = 0; e.guard = num(P.shellGuard); Sfx.at(e.x, e.z).snailHide(); }
    } else if (e.state === 'shell') { // withdrawn: blows glance off the ice; fire cracks it
      e.vx = e.vz = 0;
      if ((e.status?.burn ?? 0) > 0) { e.state = 'cracked'; e.st = num(P.crackTime); e.guard = num(P.crackGuard); burst(e.x, .6, e.z, SCHOOL_LIGHT.frost, 16, 2.4, .06); Sfx.at(e.x, e.z).snailCrack(); }
      else if (e.st <= 0) { e.state = 'crawl'; e.guard = 1; }
    } else if (e.state === 'cracked') { e.vx = e.vz = 0; if (e.st <= 0) { e.state = 'crawl'; e.guard = 1; } }
  },
  struck(e, dmg) { if (e.state === 'crawl') e.cycle = (e.cycle ?? 0) + dmg; return dmg; },
  pose(e) { const p = e.parts!, hid = e.state !== 'crawl'; p.head.scale.setScalar(hid ? .3 : 1); if (hid) p.head.position.z *= .25; },
};

const newt: Behaviour = {
  init(e, P) {
    const room = G.current, near = nearestWaterTo(room, e.x, e.z, true); // (the room's water, if it lies near; else a pool of its own)
    if (!near || Math.hypot(near.x - e.x, near.z - e.z) > num(P.roam)) pour(room, e.x, e.z, num(P.poolSize));
    const t = nearestWaterTo(room, e.x, e.z, true); if (t) { e.x = t.x; e.z = t.z; }
    e.state = 'swim'; e.st = span(P.under); submerge(e, true);
  },
  step(e, dt, a, P, room) {
    e.st -= dt; const pool = poolAt(e.x, e.z);
    if (e.state === 'swim') { // a ripple under the water, edging to where the water comes nearest the mage
      e.kx = e.kz = 0;
      const t = nearestWaterTo(room, player.x, player.z, true) ?? { x: e.x, z: e.z }; steer(e, t.x, t.z, e.foe!.speed * e.speedMul, dt);
      if (Math.random() < dt * 5) burst(e.x, .04, e.z, 0xbfe8ff, 1, .5, .03);
      if (!pool || pool.state !== 'still' || pool.charged > 0) { // shocked or frozen over: shown, and dazed
        e.state = 'stunned'; e.st = num(P.stun); submerge(e, false); e.contact = 0; e.vx = e.vz = 0; Sfx.at(e.x, e.z).newtStun(); burst(e.x, .3, e.z, SCHOOL_LIGHT.frost, 10, 1.8, .04); return;
      }
      if (e.st <= 0 && a.dist < num(P.reach)) { e.state = 'lunge'; e.st = num(P.lungeTime); e.dir = { x: a.ux, z: a.uz }; submerge(e, false); e.contact = 0; Sfx.at(e.x, e.z).newtLunge(); burst(e.x, .2, e.z, 0xbfe8ff, 10, 2, .04); }
      else if (e.st < -num(P.patience)) { e.state = 'hunt'; e.st = num(P.hunt); submerge(e, false); burst(e.x, .2, e.z, 0xbfe8ff, 10, 2, .04); } // (the mage keeps off the water: it comes out after it)
    } else if (e.state === 'hunt') { // out on dry floor, seen, scurrying at the mage until it can lunge
      const wob = Math.sin(e.t * 7) * .7, sp = e.foe!.speed * e.speedMul; e.vx = (a.ux - a.uz * wob) * sp; e.vz = (a.uz + a.ux * wob) * sp;
      if (a.dist < num(P.reach) * .8) { e.state = 'lunge'; e.st = num(P.lungeTime); e.dir = { x: a.ux, z: a.uz }; e.contact = 0; Sfx.at(e.x, e.z).newtLunge(); }
      else if (e.st <= 0) e.state = 'back';
    } else if (e.state === 'lunge') { // out of the water at the mage: a cold bite
      e.vx = e.dir!.x * num(P.lunge) * e.speedMul; e.vz = e.dir!.z * num(P.lunge) * e.speedMul;
      if (a.dist < e.r + player.r + .05 && !mantleShields(e)) { if (hurtPlayer(e.foe!.contact, e.x, e.z)) player.chill = Math.max(player.chill, num(P.chill)); e.st = 0; }
      if (e.st <= 0) { e.state = 'land'; e.st = span(P.land); e.contact = e.foe!.contact; }
      return Math.atan2(e.dir!.x, e.dir!.z);
    } else if (e.state === 'land' || e.state === 'stunned') { // on dry floor, quick and seen; or dazed
      if (e.state === 'stunned') { e.vx = e.vz = 0; } else { const wob = Math.sin(e.t * 6) * .8, sp = e.foe!.speed * e.speedMul; e.vx = (-a.uz * wob - a.ux * .3) * sp; e.vz = (a.ux * wob - a.uz * .3) * sp; }
      if (e.st <= 0) { e.state = 'back'; e.contact = e.foe!.contact; }
    } else if (e.state === 'back') { // back to the water, if any is still open
      const t = nearestWaterTo(room, e.x, e.z, true); if (!t) { e.state = 'land'; e.st = 1; return; }
      steer(e, t.x, t.z, e.foe!.speed * e.speedMul * 1.3, dt);
      if (Math.hypot(t.x - e.x, t.z - e.z) < .3 && pool?.state === 'still' && !(pool.charged > 0)) { e.state = 'swim'; e.st = span(P.under); submerge(e, true); }
    }
  },
  pose(e) { e.model!.visible = !e.hidden; },
};

const serpent: Behaviour = {
  init(e, P) {
    const room = G.current; if (!waterIn(room).length) pour(room, e.x, e.z, num(P.poolSize));
    const t = nearestWaterTo(room, e.x, e.z); if (t) { e.x = t.x; e.z = t.z; }
    e.state = 'under'; e.st = span(P.under) * .5; submerge(e, true); e.open = 0; e.target = { x: e.x, z: e.z };
  },
  step(e, dt, a, P, room) {
    e.st -= dt; e.kx = e.kz = 0; // (anchored in its pool)
    const frozen = poolAt(e.x, e.z)?.state === 'frozen';
    if (e.state === 'under') { // beneath the water, sliding to the place in it nearest the mage
      const t = e.target!; steer(e, t.x, t.z, e.foe!.speed * e.speedMul, dt, .2);
      if (Math.random() < dt * 6) burst(e.x, .05, e.z, 0x9fe4ff, 1, .5, .03);
      if (frozen) { e.state = 'trapped'; e.st = num(P.trapped); submerge(e, false); e.open = 1; e.cycle = 1; e.fireT = .4; e.vx = e.vz = 0; Sfx.at(e.x, e.z).freeze(); return; }
      if (e.st <= 0 && Math.hypot(t.x - e.x, t.z - e.z) < .3) { e.state = 'rise'; e.st = num(P.rise); e.vx = e.vz = 0; Sfx.at(e.x, e.z).serpentRise(); }
    } else if (e.state === 'rise') {
      e.vx = e.vz = 0; e.open = Math.min(1, 1 - e.st / num(P.rise)); e.tele = e.open;
      if (e.open > .5 && e.hidden) submerge(e, false);
      if (e.st <= 0) { e.state = 'up'; e.st = num(P.up); e.fireT = .25; e.cycle = num(P.volleys); e.tele = 0; }
    } else if (e.state === 'up' || e.state === 'trapped') { // coiled up out of the water, spitting fans of brine; held in ice, it can't sink
      e.vx = e.vz = 0; e.open = 1;
      if (frozen && e.state === 'up') { e.state = 'trapped'; e.st = Math.max(e.st, num(P.trapped)); }
      if (e.cycle! > 0 && (e.fireT! -= dt) <= 0) {
        const n = num(P.shots), base = Math.atan2(a.uz, a.ux);
        for (let i = 0; i < n; i++) { const t = base + (i - (n - 1) / 2) * num(P.spread); shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), .7); } // (brine: it doesn't freeze its own pool)
        burst(e.x, 1, e.z, light(e), 6, 1.4, .04); Sfx.at(e.x, e.z).serpentSpit(); e.cycle! -= 1; e.fireT = num(P.volleyGap);
      }
      if (e.st <= 0 && !frozen) { e.state = 'sink'; e.st = num(P.rise) * .7; Sfx.at(e.x, e.z).lurkerDive(); }
      else if (e.state === 'trapped' && e.st <= 0) { e.st = num(P.trapped); e.cycle = 1; } // (it spits now and then while it waits for the thaw)
    } else if (e.state === 'sink') {
      e.vx = e.vz = 0; e.open = Math.max(0, e.st / (num(P.rise) * .7));
      if (e.open < .5 && !e.hidden) submerge(e, true);
      if (e.st <= 0) { e.state = 'under'; e.st = span(P.under); const t = nearestWaterTo(room, player.x, player.z); e.target = t ? { x: t.x, z: t.z } : { x: e.x, z: e.z }; }
    }
  },
  pose(e) {
    const o = e.open ?? 0, p = e.parts!;
    p.body.position.y = (o - 1) * 1.4; p.body.visible = o > .02; // (beneath the floor, it can't be seen)
    p.pool.visible = poolAt(e.x, e.z)?.state !== 'frozen'; // (its dark water shows the ice when its pool freezes)
  },
};

/** A walking wave's ice, while the water under it is frozen: one shared block of ice. */
let iceBlock: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;
function encase(e: Enemy, on: boolean) {
  if (!on) { if (e.extra) { e.body.remove(e.extra); e.extra = undefined; } return; }
  iceBlock ??= { geo: markShared(new THREE.IcosahedronGeometry(.62, 0).scale(1, 1.6, 1).translate(0, .75, 0)), mat: markShared(new THREE.MeshStandardMaterial({ color: 0xcfeaf8, emissive: 0x1a3a50, roughness: .08, metalness: .3, transparent: true, opacity: .55, flatShading: true })) };
  const m = new THREE.Mesh(iceBlock.geo, iceBlock.mat); e.body.add(m); e.extra = m;
}

const wave: Behaviour = {
  init(e, P) { e.state = 'walk'; e.tick = num(P.pourEvery); e.fireT = span(P.slamEvery); e.cycle = 0; },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state !== 'ice' && poolAt(e.x, e.z)?.state === 'frozen') { // the water under it froze, and it with it
      e.state = 'ice'; e.st = num(P.ice); e.vx = e.vz = 0; e.contact = 0; e.tele = 0; encase(e, true); Sfx.at(e.x, e.z).freeze(); return;
    }
    if (e.state === 'walk') { // it walks, and the floor it leaves is wet
      const sp = e.foe!.speed * e.speedMul; e.vx = a.ux * sp; e.vz = a.uz * sp;
      if ((e.tick! -= dt) <= 0) { e.tick = num(P.pourEvery); if (e.cycle! < num(P.pourMax) && !poolAt(e.x, e.z) && pour(room, e.x, e.z, 0)) e.cycle! += 1; }
      if ((e.fireT! -= dt) <= 0 && a.dist < num(P.slamRange)) { e.state = 'rear'; e.st = num(P.tell); Sfx.at(e.x, e.z).waveRear(); }
    } else if (e.state === 'rear') {
      e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.tell));
      if (e.st <= 0) { // it crashes down: a ring of brine
        const n = num(P.ring), a0 = Math.random() * Math.PI;
        for (let i = 0; i < n; i++) { const t = a0 + i / n * Math.PI * 2; shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), .7); } // (brine, not cold: its puddles stay water)
        ringFx(e.x, .1, e.z, light(e), .3, 2.2, .5, true); burst(e.x, .4, e.z, 0xbfe8ff, 16, 2.6, .05); Sfx.at(e.x, e.z).waveCrash();
        e.state = 'walk'; e.tele = 0; e.fireT = span(P.slamEvery);
      }
    } else if (e.state === 'ice') { // ice, still and harmless (a shock shatters it: `afflicted`)
      e.vx = e.vz = 0;
      if (e.st <= 0 || poolAt(e.x, e.z)?.state !== 'frozen') { encase(e, false); e.state = 'walk'; e.contact = e.foe!.contact; e.fireT = span(P.slamEvery); }
    }
  },
  pose(e) { if (e.state === 'rear') e.parts!.body.scale.y *= 1 + (e.tele ?? 0) * .35; e.animRate = e.state === 'ice' ? 0 : 1; }, // (frozen, its swirl stops)
  afflicted(e, kind, P) {
    if (kind === 'chill' && e.state !== 'ice') { if (!poolAt(e.x, e.z)) pour(G.current, e.x, e.z, 0); frostAt(e.x, e.z); return; } // (it drinks the cold, but the water it stands in stiffens, and it with it)
    if (kind !== 'shock' || e.state !== 'ice') return;
    encase(e, false); e.state = 'walk'; e.contact = e.foe!.contact; e.fireT = span(P.slamEvery);
    burst(e.x, .8, e.z, 0xcfeaf8, 24, 3, .07); Sfx.at(e.x, e.z).iceShatter();
    damageEnemy(e, e.maxHp * num(P.shatter), 0, 0, 0, 'spell', 'storm');
  },
  die(e) { encase(e, false); },
};

const cloud: Behaviour = {
  init(e, P) { e.state = 'drift'; e.st = span(P.rest); },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'drift') { // it drifts after the mage, slower than the mage walks
      steer(e, player.x, player.z, e.foe!.speed * e.speedMul, dt, .8);
      if (e.st <= 0 && a.dist < num(P.over)) { e.state = 'gather'; e.st = num(P.gather); Sfx.at(e.x, e.z).thunderGather(); }
    } else if (e.state === 'gather') { // it darkens over the mage
      e.vx *= Math.exp(-4 * dt); e.vz *= Math.exp(-4 * dt); e.tele = Math.min(1, 1 - e.st / num(P.gather));
      if (e.st <= 0) { e.state = 'rain'; e.st = num(P.rain); e.cycle = num(P.sparks); e.tele = 0; shockAt(e.x, e.z); Sfx.at(e.x, e.z).thunder(); }
    } else if (e.state === 'rain') { // sparks rain on the floor under it; they arm, and water carries them
      e.vx = e.vz = 0;
      if (e.cycle! > 0 && e.st < (e.cycle! - 1) * num(P.rain) / num(P.sparks) + .01) {
        const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * num(P.reach), x = e.x + Math.cos(ang) * r, z = e.z + Math.sin(ang) * r;
        laySpark(room, x, z, num(P.sparkTime)); strikeFx({ x, y: 1.2, z }, { x, y: .05, z }, light(e), .22, true); e.cycle! -= 1;
      }
      if (e.st <= 0) { e.state = 'drift'; e.st = span(P.rest); }
    }
  },
  pose(e) { const p = e.parts!; if (e.state === 'gather') p.cloud.scale.setScalar(1 + (e.tele ?? 0) * .25); else p.cloud.scale.setScalar(1); },
};

const darter: Behaviour = {
  init(e, P) { e.state = 'hover'; e.st = span(P.hover); },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if (e.state === 'hover') { // hanging in the air at the turn; chilled, it hangs on
      e.vx *= Math.exp(-6 * dt); e.vz *= Math.exp(-6 * dt);
      if (e.st <= 0 && !((e.status?.chill ?? 0) > 0)) {
        const t = Math.atan2(a.uz, a.ux) + (Math.random() - .5) * 2 * num(P.aim); e.dir = { x: Math.cos(t), z: Math.sin(t) };
        e.state = 'dash'; e.st = num(P.dashMax); e.tick = 0; Sfx.at(e.x, e.z).darterZip();
      }
    } else if (e.state === 'dash') { // straight as a bolt to the wall, a line of sparks behind it
      e.vx = e.dir!.x * num(P.dash) * e.speedMul; e.vz = e.dir!.z * num(P.dash) * e.speedMul;
      if ((e.tick! -= dt) <= 0) { e.tick = num(P.sparkEvery); laySpark(room, e.x, e.z, num(P.sparkTime)); }
      if (e.st <= 0) { e.state = 'hover'; e.st = span(P.hover); }
      return Math.atan2(e.dir!.x, e.dir!.z);
    }
  },
  bump(e, hit, P) { if (hit && e.state === 'dash') { e.state = 'hover'; e.st = span(P.hover); e.vx = e.vz = 0; burst(e.x, .8, e.z, light(e), 6, 1.6, .03); } },
};

const mine: Behaviour = {
  init(e) { e.state = 'shamble'; },
  step(e, dt, a, P, room) {
    e.st -= dt;
    if ((e.status?.burn ?? 0) > 0 && e.state !== 'pop') { e.state = 'pop'; e.st = .15; e.tele = 1; e.vx = e.vz = 0; } // (fire bursts it where it stands, and burns its spores)
    if (e.state === 'shamble') {
      const wob = Math.sin(e.t * 2.2) * .6, sp = e.foe!.speed * e.speedMul; e.vx = (a.ux - a.uz * wob) * sp; e.vz = (a.uz + a.ux * wob) * sp;
      if (a.dist < num(P.trigger)) { e.state = 'swell'; e.st = num(P.tell); Sfx.at(e.x, e.z).sporeSwell(); }
    } else if (e.state === 'swell') {
      e.vx = e.vz = 0; e.tele = Math.min(1, 1 - e.st / num(P.tell));
      if (e.st <= 0) {
        addSpores(room, e.x + a.ux * .5, e.z + a.uz * .5, { color: SCHOOL_LIGHT.umbral, sting: num(P.dim) }); // (it bursts towards the mage)
        const n = num(P.ring); for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; shoot(e, Math.cos(t), Math.sin(t), num(P.shotSpeed), .6); }
        burst(e.x, .7, e.z, SCHOOL_LIGHT.umbral, 18, 2.6, .06); Sfx.at(e.x, e.z).sporePuff(); e.state = 'gone'; damageEnemy(e, e.maxHp * 9, 0, 0);
      }
    } else if (e.state === 'pop' && e.st <= 0) { burst(e.x, .7, e.z, 0xff9a3a, 14, 2.2, .05); Sfx.at(e.x, e.z).webBurn(); e.state = 'gone'; damageEnemy(e, e.maxHp * 9, 0, 0); }
  },
  pose(e) { if (e.state === 'swell' || e.state === 'pop') e.parts!.ball.scale.multiplyScalar(1 + (e.tele ?? 0) * .45); },
};

export const BESTIARY_BEHAVIOURS: Record<string, Behaviour> = { dropper, splitter, tome, swarm, singer, mantis, crab, snail, newt, serpent, wave, cloud, darter, mine };
/** How fast a foe a lark has sung to moves (1: not sung to). */
export const songHaste = (e: Enemy) => (e.sung ?? 0) > G.simClock ? CFG.bestiary.songHaste : 1;
/** Make a pack of `n` foes of one kind round (x, z), sharing one mind (the firefly swarm): each made by `make`. */
export function packOf(n: number, x: number, z: number, make: (x: number, z: number) => Enemy) {
  const first = make(x, z), pack = first.pack!;
  for (let i = 1; i < n; i++) {
    const a = i / n * Math.PI * 2, at = freeSpotNear(G.current, x + Math.cos(a) * .7, z + Math.sin(a) * .7);
    const m = make(at.x, at.z); pack.members.push(m); m.pack = pack; m.cycle = a;
  }
  return first;
}
