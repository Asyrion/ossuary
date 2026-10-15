/* The bestiary's behaviours on floor 5 (bestiaryFoes.ts holds the helpers the floors share and merges the five maps).

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
import { Sfx } from '../audio/sfx';
import { SCHOOL_LIGHT } from '../render/arcane';
import { markShared } from '../render/materials';
import { glowTex } from '../render/textures';
import { burst } from '../combat/fx';
import { frostAt, poolAt } from '../world/pools';
import { hearGround } from '../world/groundHooks';
import { ringFx } from '../magic/spellFx';
import { mantleShields } from '../magic/shapes';
import { damageEnemy, hurtPlayer } from '../combat/damage';
import { layGround, slipAt, spikeAt } from './bestiaryGround';
import { burningNear } from './foes';
import { brake, light, num, ramp, rush, span, type Behaviour, type Params } from './foeKit';
import { counter } from './counters';
import { steer, circle, lean, thrust, facing, shoot, encase } from './bestiaryFoes';

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

export const BESTIARY_FLOOR5: Record<string, Behaviour> = {
  glacier,
  hydra,
  raven,
  wolf,
  pangolin,
  kiter,
  manticore,
};
