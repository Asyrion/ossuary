/* The bestiary's behaviours on floor 3 (bestiaryFoes.ts holds the helpers the floors share and merges the five maps).

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
     breaks it into rolling stones (`stone`) that roll back together into it, unless they are all put down first. */
import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { disposeTree, markShared } from '../render/materials';
import { seeded } from '../render/pixelFire';
import { CFG } from '../config';
import { burst } from '../combat/fx';
import { freeSpotNear } from '../world/rooms';
import { fireAt } from '../world/pools';
import { boxAt } from '../world/collision';
import { hearGround } from '../world/groundHooks';
import { ringFx } from '../magic/spellFx';
import { steamBetween } from '../magic/steam';
import { mantleShields } from '../magic/shapes';
import { crumble, damageEnemy, hurtPlayer } from '../combat/damage';
import { makeEnemy } from './enemies';
import { fallOn, lob } from './bestiaryGround';
import { layFire } from './foes';
import { brake, light, num, ramp, rush, span, type Behaviour, type Params } from './foeKit';
import { counter } from './counters';
import { steer, circle, lean, shoot, againstWall, brazierNear, halve, splitsNow } from './bestiaryFoes';

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

/** A fallen phoenix's ashes: a low heap of grey lumps, flat-shaded so its facets step from a pale top to a dark foot, with
    specks of ember in it, hot orange and brimstone (CFG.foeLook.ashes; one set of geometries and materials for all): a
    pale cone in a soft halo read as an untextured blob. */
let ash: {
  lump: THREE.BufferGeometry;
  speck: THREE.BufferGeometry;
  mats: THREE.Material[];
  embers: THREE.Material[];
} | null = null;

function ashes(e: Enemy, on: boolean) {
  if (e.extra) {
    e.body.remove(e.extra);
    disposeTree(e.extra);
    e.extra = undefined;
  }
  if (!on) return;
  const A = CFG.foeLook.ashes;
  ash ??= {
    lump: markShared(new THREE.DodecahedronGeometry(1, 0)),
    speck: markShared(new THREE.BoxGeometry(A.speck, A.speck, A.speck)),
    mats: A.ash.map((c) => markShared(new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }))),
    embers: A.embers.map((c) => markShared(new THREE.MeshBasicMaterial({ color: c }))),
  };
  const g = new THREE.Group(),
    R = seeded(7);
  A.lumps.forEach(([x, z, r], i) => {
    const m = new THREE.Mesh(ash!.lump, ash!.mats[i % ash!.mats.length]);
    m.position.set(x, r * 0.35, z);
    m.scale.set(r, r * 0.55, r);
    m.rotation.y = R() * 6;
    g.add(m);
  });
  for (let i = 0; i < A.specks; i++) {
    // (embers in the heap: it can rise again while they glow)
    const a = R() * Math.PI * 2,
      d = Math.sqrt(R()) * 0.32,
      s = new THREE.Mesh(ash.speck, ash.embers[i % ash.embers.length]);
    s.position.set(Math.cos(a) * d, 0.12 + (0.32 - d) * 0.75, Math.sin(a) * d); // (on the heap's face, not inside it)
    g.add(s);
  }
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
    if (melt < 1 && Math.random() < dt * CFG.foeLook.wax.drips) {
      // its wax runs: a drip off its body falls and lies a moment on the floor beside it
      const W = CFG.foeLook.wax.colors,
        a = Math.random() * Math.PI * 2;
      burst(
        e.x + Math.cos(a) * e.r * 0.7,
        0.5 + Math.random() * 0.6,
        e.z + Math.sin(a) * e.r * 0.5,
        W[Math.floor(Math.random() * W.length)],
        1,
        0.25,
        CFG.foeLook.wax.size,
      );
    }
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
          // (where it will land: a warm ring on the floor filling as the stone comes down, fallOn's warning)
          fallOn(
            room,
            at.x,
            at.z,
            num(P.fall),
            (x, z) => {
              burst(x, 0.2, z, 0x7a746a, 10, 2, 0.05);
              Sfx.at(x, z).rockFall();
              if (Math.hypot(player.x - x, player.z - z) < num(P.hit)) hurtPlayer(1, x, z);
            },
            4,
            num(P.hit),
          );
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

export const BESTIARY_FLOOR3: Record<string, Behaviour> = {
  nest,
  wasp,
  djinn,
  ooze,
  phoenix,
  basilisk,
  bodyguard,
  breaker,
  stone,
};
