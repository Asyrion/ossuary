/* The bestiary's behaviours on floor 2 (bestiaryFoes.ts holds the helpers the floors share and merges the five maps).

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
     ring of shots. Fire bursts it early, where it stands, and burns the spores away. */
import type { Enemy, Room } from '../types';
import { G, player } from '../state';
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { burst } from '../combat/fx';
import { addSpores } from '../world/props';
import { addPool, frostAt, poolAt, shockAt } from '../world/pools';
import { ringFx, strikeFx } from '../magic/spellFx';
import { mantleShields } from '../magic/shapes';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { layGround } from './bestiaryGround';
import { drivenUp, laySpark } from './foes';
import { brake, light, num, ramp, rush, span, type Behaviour } from './foeKit';
import { counter } from './counters';
import { steer, shoot, encase } from './bestiaryFoes';

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

export const BESTIARY_FLOOR2: Record<string, Behaviour> = {
  snail,
  newt,
  serpent,
  wave,
  cloud,
  darter,
  mine,
};
