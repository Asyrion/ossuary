/* The bestiary's behaviours on floor 1 (bestiaryFoes.ts holds the helpers the floors share and merges the five maps).

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
     to pinch. A glyph's blast flips it on its back, open to harm, for a while. */
import * as THREE from 'three';
import type { Enemy, Pack, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { addSpores } from '../world/props';
import { freeSpotNear } from '../world/rooms';
import { ringFx } from '../magic/spellFx';
import { dropPage } from '../magic/pages';
import { lerp } from '../util';
import { layGround, lob } from './bestiaryGround';
import { brake, light, num, ramp, rush, span, type Behaviour, type Params } from './foeKit';
import { counter } from './counters';
import { steer, circle, facing, shoot, othersAwake, halve, splitsNow } from './bestiaryFoes';

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

/** These behaviours, by name (data/foes.json's `behaviour`). */

export const BESTIARY_FLOOR1: Record<string, Behaviour> = {
  dropper,
  splitter,
  tome,
  swarm,
  singer,
  mantis,
  crab,
};
