/* The bestiary's behaviours on floor 4 (bestiaryFoes.ts holds the helpers the floors share and merges the five maps).

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
     stood. Fire melts the ball; without one it is quick, and weak. */
import * as THREE from 'three';
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { disposeTree, markShared } from '../render/materials';
import { burst } from '../combat/fx';
import { spawnShot } from '../combat/projectiles';
import { freeSpotNear } from '../world/rooms';
import { fireAt, frostAt } from '../world/pools';
import { hearGround } from '../world/groundHooks';
import { ringFx, strikeFx } from '../magic/spellFx';
import { steamBetween } from '../magic/steam';
import { mantleShields } from '../magic/shapes';
import { hurtPlayer } from '../combat/damage';
import { lerp } from '../util';
import { lob, paleStrip } from './bestiaryGround';
import { paleFx } from '../world/paleFx';
import { layFire } from './foes';
import { brake, light, num, ramp, rush, span, type Behaviour, type Params } from './foeKit';
import { counter } from './counters';
import { steer, circle, lean, facing, againstWall, brazierNear } from './bestiaryFoes';

/** A line marked on the floor of the current room from (x0, z0) to (x1, z1), in `color` (where a griffin will swoop): one
    shared strip, stretched, and one material a colour. */
const lineGeo = markShared(new THREE.PlaneGeometry(0.5, 1).rotateX(-Math.PI / 2)),
  lineMats = new Map<number, THREE.Material>();

function floorLine(x0: number, z0: number, x1: number, z1: number, color: number) {
  const room = G.room.current,
    len = Math.hypot(x1 - x0, z1 - z0) || 0.01;
  if (paleFx()) {
    // on a pale floor drawn in the deepened light inside a dark edge (added, it burnt white on floor 4's ivory)
    const s = paleStrip(lineGeo.parameters.width, color, true);
    s.setLength(len);
    s.g.position.set(x0 - room.cx, 0.03, z0 - room.cz);
    s.g.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    room.group.add(s.g);
    return s.g;
  }
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
        ringFx(e.x, 0.5, e.z, light(e), 0.4, 1.8, 0.35, true, undefined, paleFx());
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
        ringFx(player.x, 0.04, player.z, light(e), 0.7, 0.45, num(P.delay), true, 0.8, paleFx());
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
        ringFx(e.x, 1, e.z, light(e), 0.3, num(P.screechRange), 0.5, true, undefined, paleFx());
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
            paleFx() ? 'coal' : undefined,
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
            ringFx(x, 0.1, z, SCHOOL_LIGHT.frost, 0.3, 1.8, 0.4, true, undefined, paleFx());
            burst(x, 0.4, z, 0xeaf6ff, 20, 2.6, 0.06);
            Sfx.at(x, z).iceShatter();
          },
          1.6,
          2 + size * 1.5,
          paleFx() ? 'snow' : undefined,
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

export const BESTIARY_FLOOR4: Record<string, Behaviour> = {
  griffin,
  eye,
  harpy,
  magnet,
  hearth,
  shade,
  roller,
};
