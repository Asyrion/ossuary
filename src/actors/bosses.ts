/* Bosses, all built in code (bossLooks.ts; the Hollow Warden in one of three looks for the owner to choose, M4; the abbess
   and the knight remade in code 2026-10-01). A floor draws its boss from the pool
   in data/floors.json, never one the run has already met; the floor's boss block scales its health,
   speed and shot speed, how many foes it calls and how often it repeats its aimed attack.

   A boss's helpers fall with it, so no fight drags on while its rewards rise.

   Hollow Warden: walks at the mage; a ring of 12 shots (a second ring below 60%); aimed 3-shot volleys;
     calls the floor's walkers below half health.
   Drowned Abbess (Frost; a great pale cave olm): drifts; opens its jaw and spreads its gills, then wails fans of aimed
     shots; sinks into the floor and follows the mage as a ripple that can't be hurt, then a widening ring warns where it
     surfaces with a ring of shots; calls the floor's flyers below half health, and surfaces with a second ring.
   Pyre Knight (Ember; a hollow suit of plate full of fire): stalks; crouches and leaps at where the mage stood (the
     landing spot glows) and lands blade first with a shockwave ring; levels its sword and charges in a line until a wall
     or rock stuns it; raises its sword and sweeps cones of embers; calls the floor's heavies below half health, and its
     landings send a second ring. Both have a weakness and a resistance (CFG.enemy), as the bosses below them do.
   Hallowed Hart (floor 4, M4.1, built in code): walks at the mage; lowers its antlers while the way it will run lights up
     on the floor, then charges along it (a wall stuns it); turns in place firing spokes of light (six below half health);
     rears and stamps a ring of motes (a second ring below half); calls the floor's flyers, its fawns, below half health.
   Deep Angler (floor 5, M4.1, built in code): floats a few tiles off, circling; its lure brightens, then draws the mage in
     towards its opening jaws until it bites (striking it hard enough meanwhile makes it flinch and let go); spits volleys
     of shadow that hex; puffs up and breathes a ring of dark motes (a second ring below half); calls the floor's flyers
     below half health. Both have a weakness and a resistance (CFG.enemy).
   War-Tiger (M4.2, from the Eda lore, built in code): stands as a statue in its hall until the mage comes near or strikes
     it; prowls at the mage, circling it at claw reach; crouches, the spot it will land on marked, and pounces there (a
     wall stuns it), throwing frost shards as it lands; swipes a fan of claws when the mage is close; roars a ring (a
     second below half health); calls the floor's walkers below half health. Its four plates let only part of a blow through; a glyph's blast, a Shatter (a
     shock on its rimed plates) or enough blows turned knock one off, and each lost leaves it faster and more open. */
import * as THREE from 'three';
import { CFG, type BossType } from '../config';
import { callFoe, type Role } from './foeData';
import type { Enemy } from '../types';
import { G, after, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { FLOORS } from '../world/generate';
import { freeSpotNear, isFreeAt } from '../world/rooms';
import { spawnShot } from '../combat/projectiles';
import { hurtPlayer } from '../combat/damage';
import { burst } from '../combat/fx';
import { banner } from '../ui/hud';
import { floatText } from '../magic/statusFx';
import { makeEnemy } from './enemies';
import { abbessLook, anglerLook, bossLook, buildBossLook, hartLook, pyreKnightLook, tigerLook } from './bossLooks';
import { mergeRig } from '../render/rig';
import { buildDragon, dragonMoved, updateDragon } from './pillarDragon';
import { buildTwin, updateTwin } from './twinGuardians';
import { SCHOOL_LIGHT } from '../render/arcane';
import { ease, lerp } from '../util';

/** A boss's shots: in its school's light. */
const shotColor = (e: Enemy) => SCHOOL_LIGHT[e.bossSchool ?? 'ember'];
/** Who each boss calls below half health. */
const SUMMONS: Record<BossType, Role> = { warden: 'R', abbess: 'W', pyre: 'H', hart: 'W', angler: 'W', tiger: 'R', dragon: 'W', twins: 'H' };

/** A flat ring lying on the floor (the abbess's ripple, the knight's landing mark), hidden at first. */
function floorRing(e: Enemy, color: number, radius: number) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, .05, 6, 36), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .03; ring.visible = false; e.group.add(ring);
  return ring;
}

/** Build a boss's body and set its first state. */
export function buildBoss(e: Enemy) {
  e.contact = 2; e.isBoss = true; e.cycle = 0; e.summoned = false;
  if (e.type === 'warden') { // built in code (M4): the look chosen in the dev menu (bossLooks.ts), its still parts merged
    const id = bossLook(), L = buildBossLook(id);
    e.mats = mergeRig(L.group, L.idle, 'boss:' + id, [L.parts.eye, L.parts.ring]);
    for (const m of e.mats) m.userData.base = m.emissive.clone();
    e.model = L.group; e.idle = L.idle; e.shadow = L.shadow; e.bossSchool = L.school; e.body.add(L.group);
    e.eye = L.parts.eye; e.ring = L.parts.ring; e.halo = L.parts.halo;
    e.state = 'walk'; e.st = 2.2;
  } else if (e.type === 'hart' || e.type === 'angler') { // built in code (M4.1): the bosses of floors 4 and 5
    const L = e.type === 'hart' ? hartLook() : anglerLook(), P = L.parts, C = CFG.enemy[e.type];
    const keep = e.type === 'hart' ? [P.eye, P.ring, P.head, ...P.legs.children] : [P.eye, P.ring, P.lure];
    e.mats = mergeRig(L.group, L.idle, 'boss:' + e.type, keep);
    for (const m of e.mats) m.userData.base = m.emissive.clone();
    e.model = L.group; e.idle = L.idle; e.shadow = L.shadow; e.bossSchool = L.school; e.body.add(L.group);
    e.eye = P.eye; e.ring = P.ring; e.halo = P.halo; e.parts = P; e.bossAff = { weak: C.weak, resist: C.resist };
    if (e.type === 'hart') { e.parts.lane = lane(e); e.dir = { x: 0, z: 1 }; e.state = 'walk'; e.st = 2; }
    else { e.flying = true; e.state = 'drift'; e.st = 2.2; }
  } else if (e.type === 'tiger') { // built in code (M4.2): a statue in its hall until the mage comes near
    const L = tigerLook(), P = L.parts, C = CFG.enemy.tiger;
    e.mats = mergeRig(L.group, L.idle, 'boss:tiger', [P.eye, P.ring, P.head, P.jaw, P.tail, P.rime, ...P.legs.children, P.plate0, P.plate1, P.plate2, P.plate3]);
    for (const m of e.mats) m.userData.base = m.emissive.clone();
    e.model = L.group; e.idle = L.idle; e.shadow = L.shadow; e.bossSchool = L.school; e.body.add(L.group);
    e.eye = P.eye; e.ring = P.ring; e.halo = P.halo; e.parts = P; e.bossAff = { weak: C.weak, resist: C.resist };
    e.plates = C.plates; e.worn = 0; e.guard = C.guard; e.marker = floorRing(e, SCHOOL_LIGHT.frost, .8);
    e.contact = 0; e.state = 'statue'; e.st = Infinity; P.ring.visible = P.rime.visible = false; P.halo.material.opacity = 0; P.eye.scale.set(1, .15, 1);
  } else if (e.type === 'dragon') buildDragon(e); // built in code (M4.2): its fight is pillarDragon.ts
  else if (e.type === 'twins') buildTwin(e); // built in code (M4.2): the pair's fight is twinGuardians.ts
  else if (e.type === 'abbess' || e.type === 'pyre') { // remade in code (2026-10-01): the bosses of floors 2 and 3
    const abbess = e.type === 'abbess', L = abbess ? abbessLook() : pyreKnightLook(), P = L.parts, C = CFG.enemy[e.type];
    const keep = abbess ? [P.eye, ...P.eye.children, P.ring, P.jaw, P.gillL, P.gillR] : [P.eye, P.ring, P.arms, P.legL, P.legR];
    e.mats = mergeRig(L.group, L.idle, 'boss:' + e.type, keep);
    for (const m of e.mats) m.userData.base = m.emissive.clone();
    e.model = L.group; e.idle = L.idle; e.shadow = L.shadow; e.bossSchool = L.school; e.body.add(L.group);
    e.eye = P.eye; e.ring = P.ring; e.halo = P.halo; e.parts = P; e.bossAff = { weak: C.weak, resist: C.resist };
    e.marker = floorRing(e, SCHOOL_LIGHT[L.school], abbess ? .75 : .85);
    if (abbess) { e.state = 'drift'; e.st = 2; } else { e.dir = { x: 0, z: 1 }; e.state = 'stalk'; e.st = 1.8; }
  }
}

/** The hart's lane: a strip of its light on the floor, pointing where it will charge, hidden at first (in the boss's
    group, which only moves; `rotation.y` turns it and `scale.z` sets its length). */
function lane(e: Enemy) {
  const g = new THREE.Group(), strip = new THREE.Mesh(new THREE.PlaneGeometry(.8, 1).translate(0, .5, 0), new THREE.MeshBasicMaterial({ color: SCHOOL_LIGHT.hallow, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  strip.rotation.x = Math.PI / 2; g.position.y = .03; g.add(strip); g.visible = false; e.group.add(g);
  return g;
}

/** Below half health a boss calls its helpers, once; they have the floor's enemy health. */
function callHelp(e: Enemy) {
  e.summoned = true; if (e.twin) e.twin.summoned = true; // (the twins call once for the pair)
  Sfx.at(e.x, e.z).boom(); G.shake = .25; banner(STR.bosses[e.type as BossType].summon, '');
  const n = e.bossCfg?.summons ?? 2, cur = G.current, floor = FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];
  for (let i = 0; i < n; i++) {
    const p = freeSpotNear(cur, cur.cx + (n > 1 ? -4 + 8 * i / (n - 1) : 0), cur.cz + 1.5);
    makeEnemy(callFoe(floor.foes, SUMMONS[e.type as BossType], Math.random), p.x, p.z, floor.enemyHp).servant = true;
  }
}

function ringOfShots(e: Enemy, n: number, speed: number, offset: number, size = 1.25) {
  for (let i = 0; i < n; i++) { const a = offset + i / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), speed, shotColor(e), .9, size); }
}
/** `count` shots spread over `spread` radians around the direction to the mage; `o`, what they carry (the angler's hex). */
function fan(e: Enemy, count: number, spread: number, speed: number, turn: number, from = .8, o: { hex?: number } = {}) {
  const base = Math.atan2(player.z - e.z, player.x - e.x) + turn, ux = Math.cos(base), uz = Math.sin(base);
  for (let i = 0; i < count; i++) {
    const a = base + (count > 1 ? (i / (count - 1) - .5) * spread : 0);
    spawnShot(e.x + ux * from, e.z + uz * from, Math.cos(a), Math.sin(a), speed, shotColor(e), 1, 1.1, o);
  }
}
/** A second ring a moment later, if the boss is still alive and the fight still on. */
function laterRing(e: Enemy, delay: number, n: number, speed: number, offset: number) {
  after(delay, () => { if (!e.dead && G.state === 'play' && G.enemies.includes(e)) ringOfShots(e, n, speed, offset); });
}

/** One step of a boss's behaviour. Returns the way it should face, when that isn't towards the mage. */
export function updateBoss(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  e.st -= dt;
  if (!e.summoned && e.hp / e.maxHp < .5 && !e.hidden) callHelp(e);
  if (e.type === 'warden') updateWarden(e, dt, ux, uz);
  else if (e.type === 'abbess') updateAbbess(e, dt, ux, uz);
  else if (e.type === 'pyre') return updateKnight(e, dt, ux, uz);
  else if (e.type === 'hart') return updateHart(e, dt, ux, uz);
  else if (e.type === 'angler') return updateAngler(e, dt, ux, uz);
  else if (e.type === 'tiger') return updateTiger(e, dt, ux, uz);
  else if (e.type === 'dragon') return updateDragon(e, dt);
  else if (e.type === 'twins') return updateTwin(e, dt, ux, uz);
  return undefined;
}

/** After a boss has moved: the knight's landing mark stays put on the floor, and a charging knight that
    ran into something (a wall, rock, pit or closed door) is stunned. */
export function afterBossMove(e: Enemy, hit: boolean) {
  if (e.type === 'hart' && hit && e.state === 'charge') { // the hart ran its antlers into the wall
    e.state = 'stun'; e.st = 1.2; e.vx = e.vz = 0; G.shake = Math.max(G.shake, .35); Sfx.at(e.x, e.z).boom(); Sfx.at(e.x, e.z).rubble();
    burst(e.x + e.dir!.x * .8, 1.6, e.z + e.dir!.z * .8, SCHOOL_LIGHT.hallow, 18, 3, .06);
  }
  if (e.type === 'dragon') { dragonMoved(e); return; } // (its body, laid in the world, stays where it lies)
  if (e.type === 'tiger') { // the spot it pounces at stays put on the floor; a pounce into a wall or rock stuns it
    if (e.marker!.visible && e.target) e.marker!.position.set(e.target.x - e.x, .03, e.target.z - e.z);
    if (!hit || e.state !== 'pounce') return;
    e.state = 'stun'; e.st = 1.3; e.vx = e.vz = 0; e.marker!.visible = false; e.parts!.body.position.y = 0;
    G.shake = Math.max(G.shake, .35); Sfx.at(e.x, e.z).boom(); Sfx.at(e.x, e.z).rubble();
    burst(e.x, .8, e.z, SCHOOL_LIGHT.frost, 16, 3, .06);
    return;
  }
  if (e.type !== 'pyre') return;
  const mark = e.marker!;
  if (mark.visible && e.target) mark.position.set(e.target.x - e.x, .03, e.target.z - e.z);
  if (!hit || e.state !== 'charge') return;
  e.state = 'stun'; e.st = 1.1; e.vx = e.vz = 0; e.body.rotation.x = 0;
  G.shake = Math.max(G.shake, .35); Sfx.at(e.x, e.z).boom(); Sfx.at(e.x, e.z).rubble();
  burst(e.x + e.dir!.x * .7, .8, e.z + e.dir!.z * .7, SCHOOL_LIGHT.ember, 18, 3, .07);
}

function updateWarden(e: Enemy, dt: number, ux: number, uz: number) {
  const C = CFG.enemy.warden, B = e.bossCfg;
  const speed = C.speed * (B?.speedMul ?? 1), shotMul = B?.shotSpeedMul ?? 1;
  const hpFrac = e.hp / e.maxHp;
  const ring = e.ring!, eye = e.eye!, halo = e.halo!;
  e.idle?.(e.t); // (a look built in code lives: it blinks, sways, sheds its motes)
  ring.rotation.z += dt * (e.state.startsWith('wind') ? 6 : 1.2);
  if (e.state === 'walk') {
    e.vx = ux * speed * (hpFrac < .5 ? 1.25 : 1); e.vz = uz * speed * (hpFrac < .5 ? 1.25 : 1);
    e.body.position.y = Math.abs(Math.sin(e.t * 4)) * .05; eye.scale.set(1, 1, 1); halo.material.opacity = .35;
    if (e.st <= 0) { e.cycle = e.cycle! + 1; e.state = e.cycle % 2 ? 'windBurst' : 'windAim'; e.st = e.state === 'windBurst' ? .75 : .5; }
  } else if (e.state === 'windBurst' || e.state === 'windAim') {
    e.vx = e.vz = 0; const k = 1 - e.st / .75; halo.material.opacity = .35 + k * .6;
    eye.scale.setScalar(1 + k * .6); // (its great eyes widen)
    e.body.position.y = 0; e.body.position.x = Math.sin(e.t * 50) * .02;
    if (e.st <= 0) {
      e.body.position.x = 0;
      if (e.state === 'windBurst') {
        const off = Math.random() * Math.PI;
        ringOfShots(e, 12, 3.4 * shotMul, off);
        if (hpFrac < .6) laterRing(e, .32, 12, 3 * shotMul, off + Math.PI / 12);
        Sfx.at(e.x, e.z).boom(); G.shake = .18; e.state = 'walk'; e.st = 2.1;
      } else { e.state = 'volley'; e.volleys = B?.volleys ?? 3; e.st = 0; }
    }
  } else if (e.state === 'volley') {
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      fan(e, 3, .56, 4.4 * shotMul, 0);
      Sfx.at(e.x, e.z).enemyShot(); e.volleys = e.volleys! - 1; e.st = .3; if (e.volleys <= 0) { e.state = 'walk'; e.st = 2.4; }
    }
  }
}

function updateAbbess(e: Enemy, dt: number, ux: number, uz: number) {
  const C = CFG.enemy.abbess, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, ripple = e.marker!, mat = ripple.material as THREE.MeshBasicMaterial, P = e.parts!;
  e.idle?.(e.t); e.ring!.rotation.z += dt * 1.5; e.halo!.material.opacity = .35;
  // its jaw, gills and eyes: open and spread as it wails, shut again as it drifts
  const settle = 1 - Math.exp(-dt * 6), pose = (jaw: number, gills: number, eyes: number) => {
    P.jaw.rotation.x = lerp(P.jaw.rotation.x, jaw, settle); P.gillL.rotation.z = lerp(P.gillL.rotation.z, -gills, settle); P.gillR.rotation.z = -P.gillL.rotation.z;
    for (const c of e.eye!.children) c.scale.setScalar(lerp(c.scale.x, eyes, settle));
  };
  if (e.state === 'drift') {
    e.vx = ux * C.speed * speedMul; e.vz = uz * C.speed * speedMul;
    e.body.position.y = .08 + Math.sin(e.t * 2.2) * .06; pose(0, 0, 1);
    if (e.st <= 0) { e.cycle = e.cycle! + 1; if (e.cycle % 2) { e.state = 'wail'; e.st = .6; Sfx.at(e.x, e.z).wail(); } else { e.state = 'sink'; e.st = .7; Sfx.at(e.x, e.z).dive(); } }
  } else if (e.state === 'wail') { // telegraph: its jaw opens, its gills spread, its eyes flare and it trembles
    e.vx = e.vz = 0; const k = 1 - e.st / .6;
    pose(.5 * k, .6 * k, 1 + k * 1.4); e.halo!.material.opacity = .35 + k * .6; e.body.position.x = Math.sin(e.t * 45) * .03;
    if (e.st <= 0) { e.body.position.x = 0; e.state = 'fans'; e.volleys = B?.volleys ?? 3; e.st = 0; }
  } else if (e.state === 'fans') {
    e.vx = e.vz = 0; pose(.4, .5, 1.8);
    if (e.st <= 0) {
      fan(e, 5, 1, 3.5 * shotMul, e.volleys! % 2 ? .1 : -.1, .6); Sfx.at(e.x, e.z).enemyShot(); P.jaw.rotation.x = .6;
      e.volleys = e.volleys! - 1; e.st = .42; if (e.volleys <= 0) { e.state = 'drift'; e.st = 2; }
    }
  } else if (e.state === 'sink') { // down into the water under the floor
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .7; pose(0, -.3, 1);
    e.body.position.y = -2.4 * k * k; ripple.visible = true; mat.opacity = k * .8; ripple.scale.setScalar(.8 + k * .3);
    if (k > .5 && !e.hidden) { e.hidden = true; burst(e.x, .1, e.z, SCHOOL_LIGHT.frost, 16, 2.4, .06); }
    if (e.st <= 0) { e.state = 'under'; e.st = C.under; e.flying = true; }
  } else if (e.state === 'under') { // a ripple gliding after the mage, under rocks and pits alike
    const d = Math.hypot(player.x - e.x, player.z - e.z);
    e.vx = ux * C.dive * speedMul; e.vz = uz * C.dive * speedMul;
    mat.opacity = .55 + Math.sin(e.t * 8) * .15; ripple.scale.setScalar(1.1 + Math.sin(e.t * 6) * .08);
    if (Math.random() < dt * 10) burst(e.x + (Math.random() - .5), .05, e.z + (Math.random() - .5), SCHOOL_LIGHT.frost, 1, .6, .04);
    if (e.st <= 0 || d < .4) { e.state = 'rise'; e.st = .75; Sfx.at(e.x, e.z).charge(); }
  } else if (e.state === 'rise') { // the ring widens where it will come up: the mage's cue to step away
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .75;
    ripple.scale.setScalar(1.1 + k * 1.1); mat.opacity = .5 + Math.abs(Math.sin(e.t * 18)) * .5;
    if (e.st <= 0) {
      if (!isFreeAt(G.current, e.x, e.z)) { const p = freeSpotNear(G.current, e.x, e.z); e.x = p.x; e.z = p.z; }
      e.hidden = false; e.flying = false; e.body.position.y = 0; ripple.visible = false;
      const off = Math.random() * Math.PI;
      ringOfShots(e, 12, 3.2 * shotMul, off);
      if (hurt) laterRing(e, .3, 12, 2.8 * shotMul, off + Math.PI / 12);
      burst(e.x, .3, e.z, SCHOOL_LIGHT.frost, 30, 4, .08); Sfx.at(e.x, e.z).surface(); G.shake = .3;
      P.jaw.rotation.x = .6; P.gillL.rotation.z = -.7; P.gillR.rotation.z = .7; // (it bursts up with its jaw wide and its gills flung out)
      e.state = 'recover'; e.st = .7;
    }
  } else if (e.state === 'recover') { // a moment to strike back
    e.vx = e.vz = 0; e.body.position.y = .08; pose(0, 0, 1);
    if (e.st <= 0) { e.state = 'drift'; e.st = hurt ? 1.4 : 2; }
  }
}

function updateKnight(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const C = CFG.enemy.pyre, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, mark = e.marker!, mat = mark.material as THREE.MeshBasicMaterial, P = e.parts!;
  e.idle?.(e.t); e.ring!.rotation.z += dt * 1.2; e.halo!.material.opacity = .35;
  // its arms carry the sword: low before it as it stalks, levelled as it aims and charges, overhead as it winds up, swung
  // down as it sprays; its legs stride as it stalks and tuck as it leaps
  const settle = (to: number, rate = 10) => { P.arms.rotation.x = lerp(P.arms.rotation.x, to, 1 - Math.exp(-dt * rate)); };
  const stride = (amp: number, tuck = 0) => { const a = Math.sin(e.t * 5) * amp; P.legL.rotation.x = a - tuck; P.legR.rotation.x = -a + tuck * .6; };
  if (e.state === 'stalk') {
    const sp = C.speed * speedMul * (hurt ? 1.25 : 1);
    e.vx = ux * sp; e.vz = uz * sp; e.body.position.y = Math.abs(Math.sin(e.t * 5)) * .05; e.body.scale.y = 1; e.eye!.scale.setScalar(1);
    settle(0, 6); stride(.4);
    if (e.st <= 0) {
      e.cycle = e.cycle! + 1;
      const next = ['leap', 'spray', 'charge', 'spray'][e.cycle % 4];
      if (next === 'leap') {
        const p = freeSpotNear(G.current, player.x, player.z);
        e.target = { x: p.x, z: p.z }; e.state = 'crouch'; e.st = .55; mark.visible = true; Sfx.at(e.x, e.z).charge();
      } else if (next === 'charge') { e.state = 'aim'; e.st = .6; Sfx.at(e.x, e.z).charge(); }
      else { e.state = 'windSpray'; e.st = .45; }
    }
  } else if (e.state === 'crouch') {
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .55;
    e.body.scale.y = 1 - .22 * k; mat.opacity = .3 + k * .5; settle(-.3); stride(0);
    if (e.st <= 0) { e.state = 'air'; e.st = .85; e.from = { x: e.x, z: e.z }; e.hidden = true; e.flying = true; e.body.scale.y = 1; Sfx.at(e.x, e.z).leap(); }
  } else if (e.state === 'air') { // an arc over everything onto the mark
    const k = 1 - Math.max(0, e.st) / .85, t = e.target!, f = e.from!;
    e.vx = e.vz = 0; e.kx = e.kz = 0;
    e.x = lerp(f.x, t.x, ease(k)); e.z = lerp(f.z, t.z, ease(k));
    e.body.position.y = 4 * 2.6 * k * (1 - k); settle(-1.4, 6); stride(0, .5);
    mat.opacity = .5 + Math.abs(Math.sin(e.t * 16)) * .5; mark.scale.setScalar(1 + (1 - k) * .4);
    if (e.st <= 0) {
      e.x = t.x; e.z = t.z; e.body.position.y = 0; e.hidden = false; e.flying = false; mark.visible = false; mark.scale.setScalar(1);
      const off = Math.random() * Math.PI;
      ringOfShots(e, 14, 3.4 * shotMul, off);
      if (hurt) laterRing(e, .3, 14, 2.9 * shotMul, off + Math.PI / 14);
      burst(e.x, .2, e.z, 0x5a4a40, 30, 4.5, .09); burst(e.x, .4, e.z, SCHOOL_LIGHT.ember, 14, 3, .06);
      Sfx.at(e.x, e.z).boom(); Sfx.at(e.x, e.z).rubble(); G.shake = .45; P.arms.rotation.x = .3; stride(0); // (it lands blade first)
      e.state = 'recover'; e.st = .7;
    }
  } else if (e.state === 'aim') { // turns on the mage, shaking, visor flaring; the line is set at the end
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .6;
    e.eye!.scale.set(1 + k, 1 + k * 2, 1); e.halo!.material.opacity = .35 + k * .6; e.body.position.x = Math.sin(e.t * 50) * .03;
    e.dir = { x: ux, z: uz }; settle(-.4); stride(0);
    if (e.st <= 0) { e.body.position.x = 0; e.state = 'charge'; e.st = 2.2; }
  } else if (e.state === 'charge') {
    const d = e.dir!; e.vx = d.x * C.charge * speedMul; e.vz = d.z * C.charge * speedMul; e.body.rotation.x = .2; settle(-.4); stride(.7);
    if (Math.random() < dt * 30) burst(e.x, .15, e.z, SCHOOL_LIGHT.ember, 1, 1, .05);
    if (e.st <= 0) { e.state = 'stalk'; e.st = 1.6; e.body.rotation.x = 0; }
    return Math.atan2(d.x, d.z);
  } else if (e.state === 'stun') { // ran into a wall: dazed and open to bolts
    e.vx = e.vz = 0; e.body.rotation.z = Math.sin(e.t * 20) * .08; settle(.35); stride(0);
    if (e.st <= 0) { e.body.rotation.z = 0; e.state = 'stalk'; e.st = 1.6; }
    return e.face;
  } else if (e.state === 'windSpray') {
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .45;
    e.eye!.scale.set(1 + k, 1 + k, 1); e.halo!.material.opacity = .35 + k * .6; settle(-1.7, 12); stride(0);
    if (e.st <= 0) { e.state = 'spray'; e.volleys = B?.volleys ?? 3; e.st = 0; }
  } else if (e.state === 'spray') {
    e.vx = e.vz = 0; settle(-1.2, 9);
    if (e.st <= 0) {
      fan(e, 5, .9, 4.2 * shotMul, e.volleys! % 2 ? .09 : -.09); Sfx.at(e.x, e.z).ember(); P.arms.rotation.x = .2; // (each sweep of the blade throws its embers)
      e.volleys = e.volleys! - 1; e.st = .34; if (e.volleys <= 0) { e.state = 'stalk'; e.st = 2; }
    }
  } else if (e.state === 'recover') {
    e.vx = e.vz = 0; e.body.scale.y = 1 - .15 * Math.max(0, e.st) / .7; settle(0, 3);
    if (e.st <= 0) { e.body.scale.y = 1; e.state = 'stalk'; e.st = 1.6; }
  }
  return undefined;
}

function updateHart(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const C = CFG.enemy.hart, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, P = e.parts!, laneG = P.lane, laneMat = (laneG.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
  const halo = e.halo!, eye = e.eye!, winding = e.state.startsWith('wind') || e.state === 'aim';
  e.idle?.(e.t); e.ring!.rotation.z += dt * (winding ? 5 : 1.2);
  const trot = (rate: number, amp: number) => P.legs.children.forEach((l, i) => { l.rotation.x = Math.sin(e.t * rate + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; });
  if (e.state === 'walk') {
    const sp = C.speed * speedMul * (hurt ? 1.2 : 1); e.vx = ux * sp; e.vz = uz * sp; trot(9, .45);
    P.head.rotation.x = lerp(P.head.rotation.x, 0, .15); eye.scale.setScalar(1); halo.material.opacity = .35;
    if (e.st <= 0) {
      e.cycle = e.cycle! + 1; e.state = ['aim', 'windSpokes', 'windStamp'][e.cycle % 3];
      e.st = e.state === 'aim' ? .8 : e.state === 'windSpokes' ? .6 : .55;
      if (e.state === 'aim') { laneG.visible = true; Sfx.at(e.x, e.z).hartBellow(); }
    }
  } else if (e.state === 'aim') { // it lowers its antlers, and the way it will run lights up on the floor
    e.vx = e.vz = 0; trot(0, 0); const k = 1 - Math.max(0, e.st) / .8;
    P.head.rotation.x = .55 * k; eye.scale.setScalar(1 + k * .5); halo.material.opacity = .35 + k * .5;
    e.dir = { x: ux, z: uz }; laneG.rotation.y = Math.atan2(ux, uz); laneMat.opacity = .12 + k * .4;
    let len = .5; while (len < 9 && isFreeAt(G.current, e.x + ux * len, e.z + uz * len)) len += .25; laneG.scale.z = len; // (up to the wall or rock it will meet)
    if (e.st <= 0) { e.state = 'charge'; e.st = 2.4; laneG.visible = false; Sfx.at(e.x, e.z).hartCharge(); }
    return Math.atan2(ux, uz);
  } else if (e.state === 'charge') {
    const d = e.dir!; e.vx = d.x * C.charge * speedMul; e.vz = d.z * C.charge * speedMul; trot(20, .75);
    if (Math.random() < dt * 25) burst(e.x, .1, e.z, SCHOOL_LIGHT.hallow, 1, 1, .04);
    if (e.st <= 0) { e.state = 'walk'; e.st = 1.6; }
    return Math.atan2(d.x, d.z);
  } else if (e.state === 'stun') { // its antlers in the wall: dazed, and open to bolts
    e.vx = e.vz = 0; trot(0, 0); P.head.rotation.x = .55 + Math.sin(e.t * 20) * .08;
    if (e.st <= 0) { e.state = 'walk'; e.st = 1.6; }
    return e.face;
  } else if (e.state === 'windSpokes') { // its candles flare
    e.vx = e.vz = 0; trot(0, 0); const k = 1 - Math.max(0, e.st) / .6;
    halo.material.opacity = .35 + k * .6; eye.scale.setScalar(1 + k * .5);
    if (e.st <= 0) { e.state = 'spokes'; e.st = 2.6; e.fireT = 0; e.spin = Math.random() * Math.PI; Sfx.at(e.x, e.z).hartSpokes(); }
  } else if (e.state === 'spokes') { // it turns, and light streams out along its spokes
    e.vx = e.vz = 0; e.spin = e.spin! + dt * 1.3; e.fireT = e.fireT! - dt;
    if (e.fireT <= 0) {
      const S = C.spokes; e.fireT = S.every; const n = hurt ? S.hurtCount : S.count;
      for (let i = 0; i < n; i++) { const a = e.spin + i / n * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), S.speed * shotMul, shotColor(e), 1, 1.05); }
    }
    if (e.st <= 0) { e.state = 'walk'; e.st = 1.8; }
    return e.face + dt * 1.3;
  } else if (e.state === 'windStamp') { // it rears
    e.vx = e.vz = 0; trot(0, 0); const k = 1 - Math.max(0, e.st) / .55;
    P.body.rotation.x = -.3 * k; P.body.position.z = -.25 * k; halo.material.opacity = .35 + k * .6;
    if (e.st <= 0) {
      P.body.rotation.x = 0; P.body.position.z = 0;
      const off = Math.random() * Math.PI;
      const S = C.stamp; ringOfShots(e, S.count, S.speed * shotMul, off, 1.1);
      if (hurt) laterRing(e, .3, S.count, S.later * shotMul, off + Math.PI / S.count);
      burst(e.x, .2, e.z, SCHOOL_LIGHT.hallow, 26, 4, .07); Sfx.at(e.x, e.z).boom(); G.shake = .3;
      e.state = 'recover'; e.st = .6;
    }
  } else if (e.state === 'recover') {
    e.vx = e.vz = 0;
    if (e.st <= 0) { e.state = 'walk'; e.st = 1.8; }
  }
  return undefined;
}

function updateAngler(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const C = CFG.enemy.angler, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, P = e.parts!, lureGlow = P.lureGlow as THREE.Sprite, eye = e.eye!;
  const d = Math.hypot(player.x - e.x, player.z - e.z), winding = e.state.startsWith('wind') || e.state === 'lure' || e.state === 'pull';
  e.idle?.(e.t); e.ring!.rotation.z += dt * (winding ? 5 : 1);
  if (e.state === 'drift') { // it keeps a few tiles off, circling
    const want = d > 3.6 ? 1 : d < 2.4 ? -1 : 0, sp = C.speed * speedMul;
    e.vx = (ux * want - uz * .6) * sp; e.vz = (uz * want + ux * .6) * sp;
    P.lure.scale.setScalar(1); lureGlow.material.opacity = .6; lureGlow.scale.setScalar(1.7); eye.scale.setScalar(1); e.halo!.material.opacity = .35; P.body.scale.setScalar(1);
    if (e.st <= 0) {
      e.cycle = e.cycle! + 1; e.state = ['lure', 'windSpit', 'lure', 'windRing'][e.cycle % 4];
      e.st = e.state === 'lure' ? .8 : e.state === 'windSpit' ? .5 : .6;
      if (e.state === 'lure') Sfx.at(e.x, e.z).anglerHum();
    }
  } else if (e.state === 'lure') { // its lure brightens: the cue to get clear
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .8;
    P.lure.scale.setScalar(1 + k * .8); lureGlow.material.opacity = .6 + k * .4; lureGlow.scale.setScalar(1.7 + k * 1.8); eye.scale.setScalar(1 + k * .4);
    if (e.st <= 0) { e.state = 'pull'; e.st = C.pullTime; e.fireT = e.hp; }
  } else if (e.state === 'pull') { // it draws the mage in towards its opening jaws
    e.vx = e.vz = 0; player.pull.x -= ux * C.pull; player.pull.z -= uz * C.pull;
    P.jaw.rotation.x = .55; lureGlow.material.opacity = .85 + Math.sin(e.t * 20) * .15;
    if (Math.random() < dt * 30) { const k = Math.random(); burst(lerp(player.x, e.x, k), .9, lerp(player.z, e.z, k), SCHOOL_LIGHT.umbral, 1, .5, .04); } // (the dark streams in)
    if (e.fireT! - e.hp >= e.maxHp * C.flinch) { e.state = 'flinch'; e.st = .8; Sfx.at(e.x, e.z).hit(); } // struck hard enough, it lets go
    else if (d < C.reach || e.st <= 0) { e.state = 'bite'; e.st = .3; }
  } else if (e.state === 'bite') { // the jaws snap shut on what is in front of them
    e.vx = e.vz = 0; P.jaw.rotation.x = .55 * Math.max(0, e.st) / .3;
    if (e.st <= 0) {
      Sfx.at(e.x, e.z).bite(); burst(e.x + ux * .9, .9, e.z + uz * .9, 0xece6f4, 10, 2, .04);
      if (d < C.reach + .3) hurtPlayer(C.bite, e.x, e.z);
      e.state = 'recover'; e.st = .7;
    }
  } else if (e.state === 'flinch') { // its lure dims and it shakes off the blow
    e.vx = e.vz = 0; lureGlow.material.opacity = .2; P.lure.scale.setScalar(.8); P.body.position.x = Math.sin(e.t * 40) * .05;
    if (e.st <= 0) { P.body.position.x = 0; e.state = 'drift'; e.st = 1.6; }
  } else if (e.state === 'windSpit') { // it gathers the dark in its mouth
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .5; P.jaw.rotation.x = .3 * k; e.halo!.material.opacity = .35 + k * .5;
    if (e.st <= 0) { e.state = 'spit'; e.volleys = B?.volleys ?? 3; e.st = 0; }
  } else if (e.state === 'spit') { // volleys of shadow that hex
    e.vx = e.vz = 0;
    if (e.st <= 0) {
      const S = C.spit; fan(e, S.count, S.spread, S.speed * shotMul, e.volleys! % 2 ? .12 : -.12, .9, { hex: S.hex }); Sfx.at(e.x, e.z).spit();
      e.volleys = e.volleys! - 1; e.st = .45; if (e.volleys <= 0) { e.state = 'drift'; e.st = 2; }
    }
  } else if (e.state === 'windRing') { // it puffs itself up
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .6; P.body.scale.setScalar(1 + k * .18); e.halo!.material.opacity = .35 + k * .6;
    if (e.st <= 0) {
      P.body.scale.setScalar(1);
      const off = Math.random() * Math.PI;
      const S = C.ring; ringOfShots(e, S.count, S.speed * shotMul, off, 1.2);
      if (hurt) laterRing(e, .35, S.count, S.later * shotMul, off + Math.PI / S.count);
      burst(e.x, 1.2, e.z, SCHOOL_LIGHT.umbral, 24, 3.5, .07); Sfx.at(e.x, e.z).boom(); G.shake = .25;
      e.state = 'recover'; e.st = .6;
    }
  } else if (e.state === 'recover') {
    e.vx = e.vz = 0;
    if (e.st <= 0) { e.state = 'drift'; e.st = 2; }
  }
  return undefined;
}

const PLATE_COLOR = [0xae783c, 0xae783c, 0x9c968a, 0xae783c]; // (bronze pauldrons, the stone slab, the bronze brow)
/** A plate knocked off the War-Tiger (a glyph's blast, a Shatter on its rimed plates, or enough blows turned): one fewer
    to turn a blow, and it is faster for it. */
export function breakPlate(e: Enemy) {
  if (!e.plates || e.dead) return;
  const C = CFG.enemy.tiger, i = C.plates - e.plates, p = e.parts![`plate${i}`], at = p.getWorldPosition(new THREE.Vector3());
  e.plates--; e.worn = 0; e.guard = C.guard + (1 - C.guard) * (1 - e.plates / C.plates); p.visible = false;
  burst(at.x, at.y, at.z, PLATE_COLOR[i], 18, 3.2, .08); burst(at.x, at.y, at.z, SCHOOL_LIGHT.frost, 8, 2, .04);
  floatText(e.x, 2.1, e.z, STR.bosses.tiger.plate, 0xe0b070); Sfx.at(e.x, e.z).plateBreak(); G.shake = Math.max(G.shake, .2);
  if (e.state === 'statue') e.st = -1; // (it wakes, if it stood as stone: its clock is endless until then)
}
/** A blow its plates turned (`turned`, the share they kept out): enough of them and a plate gives. */
export function wearPlates(e: Enemy, turned: number) {
  if (!e.plates) return;
  e.worn = (e.worn ?? 0) + turned;
  if (e.worn >= CFG.enemy.tiger.wear) breakPlate(e);
}

function updateTiger(e: Enemy, dt: number, ux: number, uz: number): number | undefined {
  const C = CFG.enemy.tiger, B = e.bossCfg, shotMul = B?.shotSpeedMul ?? 1, speedMul = B?.speedMul ?? 1;
  const hurt = e.hp / e.maxHp < .5, P = e.parts!, halo = e.halo!, eye = e.eye!, mark = e.marker!, markMat = mark.material as THREE.MeshBasicMaterial;
  const d = Math.hypot(player.x - e.x, player.z - e.z), quick = 1 + C.plateSpeed * (C.plates - e.plates!); // (each plate lost, faster)
  const stride = (rate: number, amp: number) => P.legs.children.forEach((l, i) => { l.rotation.x = Math.sin(e.t * rate + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; });
  const relax = () => { P.head.rotation.x = lerp(P.head.rotation.x, 0, .15); P.jaw.rotation.x = lerp(P.jaw.rotation.x, 0, .2); P.body.position.y = lerp(P.body.position.y, 0, .2); };
  if (e.state === 'statue') { // still as stone: its eyes shut, no light about it, until the mage comes near or strikes it
    e.vx = e.vz = e.kx = e.kz = 0;
    if (d < C.wake || e.hp < e.maxHp || e.st < 0) {
      e.state = 'wake'; e.st = .9; e.contact = 2; P.ring.visible = P.rime.visible = true; eye.scale.setScalar(1);
      Sfx.at(e.x, e.z).tigerRoar(); Sfx.at(e.x, e.z).rubble(); G.shake = .3; burst(e.x, 1, e.z, 0x9c968a, 26, 2.6, .07);
    }
    return e.face;
  }
  const winding = e.state === 'crouch' || e.state.startsWith('wind');
  e.idle?.(e.t); e.ring!.rotation.z += dt * (winding ? 5 : 1.2);
  if (e.state === 'wake') { // the stone gives: it shakes itself and roars
    e.vx = e.vz = 0; const k = 1 - Math.max(0, e.st) / .9;
    P.body.position.x = Math.sin(e.t * 40) * .03 * (1 - k); P.head.rotation.x = -.4 * Math.sin(k * Math.PI); P.jaw.rotation.x = .6 * Math.sin(k * Math.PI);
    halo.material.opacity = .35 * k;
    if (e.st <= 0) { P.body.position.x = 0; e.state = 'prowl'; e.st = 1.2; }
  } else if (e.state === 'prowl') {
    const sp = C.speed * speedMul * quick * (hurt ? C.hurtSpeed : 1), side = e.cycle! % 2 ? .5 : -.5;
    if (d > C.swipe.reach * .75) { e.vx = ux * sp; e.vz = uz * sp; } else { e.vx = -uz * sp * side; e.vz = ux * sp * side; } // (in reach of its claws, it circles the mage rather than walking into them)
    stride(8 * quick, .5);
    relax(); eye.scale.setScalar(1); halo.material.opacity = .35;
    if (d < C.swipe.reach && e.st > .8) e.st = .8; // (close enough to swipe: it doesn't wait long)
    if (e.st <= 0) { // every third a roar; else a swipe when the mage is close, a pounce when not
      e.cycle = e.cycle! + 1;
      if (!(e.cycle % 3)) { e.state = 'windRoar'; e.st = C.roar.tell; Sfx.at(e.x, e.z).tigerRoar(); }
      else if (d < C.swipe.reach + .4) { e.state = 'windSwipe'; e.st = C.swipe.tell; }
      else { const p = freeSpotNear(G.current, player.x, player.z); e.target = { x: p.x, z: p.z }; e.state = 'crouch'; e.st = C.pounce.tell; mark.visible = true; Sfx.at(e.x, e.z).charge(); }
    }
  } else if (e.state === 'crouch') { // it sinks low, tail lashing, the spot it will land on marked on the floor
    e.vx = e.vz = 0; stride(0, 0); const k = 1 - Math.max(0, e.st) / C.pounce.tell;
    P.body.position.y = -.14 * k; P.head.rotation.x = .2 * k; P.tail.rotation.y = Math.sin(e.t * 22) * .7;
    eye.scale.setScalar(1 + k * .4); halo.material.opacity = .35 + k * .5; markMat.opacity = .3 + k * .5;
    const t = e.target!;
    if (e.st <= 0) { e.state = 'pounce'; e.st = C.pounce.time; e.from = { x: e.x, z: e.z }; Sfx.at(e.x, e.z).leap(); }
    return Math.atan2(t.x - e.x, t.z - e.z);
  } else if (e.state === 'pounce') { // a bound onto the mark, forelegs out
    const t = e.target!, f = e.from!, dx = t.x - e.x, dz = t.z - e.z, left = Math.hypot(dx, dz), all = Math.hypot(t.x - f.x, t.z - f.z) || 1;
    const k = Math.min(1, 1 - left / all), sp = C.pounce.speed * speedMul;
    P.body.position.y = 4 * .45 * k * (1 - k); P.legs.children.forEach((l, i) => { l.rotation.x = i < 2 ? -.9 : .8; });
    markMat.opacity = .5 + Math.abs(Math.sin(e.t * 16)) * .5;
    if (left < .3 || e.st <= 0) { // it lands, and frost flies from its plates
      e.vx = e.vz = 0; P.body.position.y = 0; mark.visible = false; stride(0, 0);
      const S = C.pounce, off = Math.random() * Math.PI;
      for (let i = 0; i < S.shards; i++) { const a = off + i / S.shards * Math.PI * 2; spawnShot(e.x, e.z, Math.cos(a), Math.sin(a), S.shardSpeed * shotMul, shotColor(e), .5, 1, { chill: S.chill }); }
      burst(e.x, .2, e.z, SCHOOL_LIGHT.frost, 22, 3.5, .06); Sfx.at(e.x, e.z).drakeLand(); G.shake = .3;
      e.state = 'recover'; e.st = .6;
    } else { e.vx = dx / left * sp; e.vz = dz / left * sp; }
    return Math.atan2(dx, dz);
  } else if (e.state === 'windSwipe') { // it rears a forepaw, claws out
    e.vx = e.vz = 0; stride(0, 0); const k = 1 - Math.max(0, e.st) / C.swipe.tell;
    P.legs.children[1].rotation.x = -1.3 * k; P.head.rotation.x = .15 * k; eye.scale.setScalar(1 + k * .5); halo.material.opacity = .35 + k * .5;
    if (e.st <= 0) {
      const S = C.swipe; fan(e, S.count, S.spread, S.speed * shotMul, 0, .9); Sfx.at(e.x, e.z).claw();
      burst(e.x + ux * 1.1, .7, e.z + uz * 1.1, 0xf4f0e8, 10, 2.4, .04);
      e.state = 'recover'; e.st = .5;
    }
  } else if (e.state === 'windRoar') { // head up, jaws wide
    e.vx = e.vz = 0; stride(0, 0); const k = 1 - Math.max(0, e.st) / C.roar.tell;
    P.head.rotation.x = -.45 * k; P.jaw.rotation.x = .6 * k; halo.material.opacity = .35 + k * .6; P.body.position.x = Math.sin(e.t * 45) * .02 * k;
    if (e.st <= 0) {
      P.body.position.x = 0;
      const S = C.roar, off = Math.random() * Math.PI; ringOfShots(e, S.count, S.speed * shotMul, off, 1.15);
      if (hurt) laterRing(e, .3, S.count, S.later * shotMul, off + Math.PI / S.count);
      burst(e.x, 1.2, e.z, SCHOOL_LIGHT.frost, 24, 3.5, .07); Sfx.at(e.x, e.z).boom(); G.shake = .3;
      e.state = 'recover'; e.st = .6;
    }
  } else if (e.state === 'stun') { // it ran into the wall: dazed, and open
    e.vx = e.vz = 0; stride(0, 0); P.head.rotation.z = Math.sin(e.t * 20) * .12;
    if (e.st <= 0) { P.head.rotation.z = 0; e.state = 'prowl'; e.st = 1.6 / quick; }
    return e.face;
  } else if (e.state === 'recover') {
    e.vx = e.vz = 0; stride(0, 0); relax();
    if (e.st <= 0) { e.state = 'prowl'; e.st = 1.8 / quick; }
  }
  return undefined;
}
