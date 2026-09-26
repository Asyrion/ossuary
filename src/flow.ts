/* Game states (title, play, pause, dying, end), runs and floors, and moving between rooms. */
import type * as THREE from 'three';
import { CFG } from './config';
import type { Room } from './types';
import { G, after, clearTimers, player } from './state';
import { STR } from './strings';
import { Rng, newSeed } from './rng';
import { Sfx } from './audio/sfx';
import { camTarget, cameraTargetFor, scene } from './render/renderer';
import { applyFloorLook, resetTorchLights, setDarkness } from './render/lights';
import { disposeTree } from './render/materials';
import { clearFloorTextures } from './render/textures';
import { buildRoom, buildWallsAndDoors, doorsOf, entryPoint, freeSpotNear, linkDoors, roomAt, setDoors } from './world/rooms';
import { FLOORS, generateFloor, testPlan, type RoomVariant } from './world/generate';
import { DH } from './world/dims';
import { SIDE_DIR } from './world/shapes';
import { clearEnemies, makeEnemy } from './actors/enemies';
import { heroReset } from './actors/hero';
import { clearProjectiles } from './combat/projectiles';
import { makeTrapdoor, spawnHeart } from './items/pickups';
import { giveById, offerGuaranteed, offerOptional, offerSecondChoice, placeArtifact, resetArtifacts, resetBudget } from './items/artifacts';
import { banner, fadeFromBlack, hideBossBar, renderMinimap, resetHearts, showBossBar } from './ui/hud';
import { showScreen } from './ui/screens';
import { resetClock } from './loop';
import { $, mulberry } from './util';
import { burst } from './combat/fx';

/** How the next run starts. Set from the URL at boot (?seed, ?floor, ?room, ?variant, ?give); used once. */
export interface RunOptions { seed?: string; floor?: number; testTemplate?: string; testVariant?: RoomVariant; give?: string[] }
let nextRun: RunOptions = {};
let testTemplate: string | undefined, testVariant: RoomVariant | undefined;
export function setNextRun(opts: RunOptions) { nextRun = opts; }

const floorCfg = () => FLOORS[Math.min(G.run.floor, FLOORS.length - 1)];

function clearEntities() {
  clearProjectiles();
  for (const p of G.particles) { scene.remove(p.m); p.m.material.dispose(); } G.particles.length = 0;
  clearEnemies();
  for (const p of G.pickups) scene.remove(p.g); G.pickups.length = 0;
  for (const d of G.decals) { scene.remove(d); (d.material as THREE.Material).dispose(); } G.decals.length = 0;
  if (G.trapdoor) { scene.remove(G.trapdoor.g); disposeTree(G.trapdoor.g); G.trapdoor = null; }
}

/** Tear down the current floor and generate floor `index` (0-based) of this run. */
export function buildFloor(index: number) {
  clearEntities(); clearTimers();
  for (const r of G.rooms) { scene.remove(r.group); disposeTree(r.group); }
  clearFloorTextures();
  G.rooms = []; G.roomMap = new Map();
  G.run.floor = index;
  const plan = testTemplate ? testPlan(testTemplate, testVariant) : generateFloor(Rng.from(G.run.seed, 'floor' + index), FLOORS[index], index);
  G.run.plan = plan;
  resetBudget(3); // guaranteed artifacts on every floor: the treasure room, the ordeal and the boss
  applyFloorLook(FLOORS[index].look);
  for (const p of plan.rooms) buildRoom(p, index);
  for (const r of G.rooms) buildWallsAndDoors(r);
  linkDoors(G.rooms);
  const start = G.rooms[plan.startId];
  G.current = start; player.x = start.cx; player.z = start.cz + .6; player.vx = player.vz = 0;
  aimCamera(start); setDarkness(0, true);
  G.trans = null; hideBossBar();
  enterRoom(start);
  if (G.state === 'play') banner(...STR.floors[Math.min(index, STR.floors.length - 1)]);
}

export function resetPlayer() {
  Object.assign(player, { invuln: 0, fireCd: 0, yawA: 0 });
  heroReset();
  resetHearts(); resetArtifacts();
}

/** Start a new run: a fresh seed unless one was requested. */
export function startGame(opts?: RunOptions) {
  const o = opts ?? nextRun; nextRun = {};
  const seed = o.seed || newSeed();
  testTemplate = o.testTemplate; testVariant = o.testVariant;
  G.run = { seed, floor: 0, loot: Rng.from(seed, 'loot'), seen: new Set(), plan: null, budget: { used: 0, reserved: 0 } };
  Sfx.init(); resetPlayer(); G.stats.time = 0; G.stats.kills = 0;
  if (o.give?.length) giveById(o.give);
  showScreen(null); G.state = 'play';
  buildFloor(Math.max(0, Math.min(FLOORS.length - 1, o.floor ?? 0)));
}

/** Build the first floor of the upcoming run as the title screen's backdrop; startGame keeps its seed. */
export function prepareTitle() {
  const seed = nextRun.seed || newSeed(); nextRun = { ...nextRun, seed };
  testTemplate = nextRun.testTemplate; testVariant = nextRun.testVariant;
  G.run = { seed, floor: 0, loot: Rng.from(seed, 'loot'), seen: new Set(), plan: null, budget: { used: 0, reserved: 0 } };
  buildFloor(Math.max(0, Math.min(FLOORS.length - 1, nextRun.floor ?? 0)));
}

/** Take the trapdoor: the next floor, or the end of the run after the last one. */
export function descend() {
  if (testTemplate || G.run.floor >= FLOORS.length - 1) { Sfx.relic(); endGame(true); return; }
  Sfx.door(true);
  fadeFromBlack();
  buildFloor(G.run.floor + 1);
}

export function pause() {
  G.state = 'pause'; showScreen('pause');
  $('runInfo').textContent = STR.runInfo(G.run.floor + 1, FLOORS.length, G.run.seed);
  $('btnResume').focus();
}
export function resume() { G.state = 'play'; showScreen(null); resetClock(); }
export function endGame(won: boolean) {
  G.state = 'end'; hideBossBar();
  const t = G.stats.time, time = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  $('endTitle').textContent = won ? STR.end.won : STR.end.lost;
  $('endText').textContent = won ? STR.end.wonText(time, G.stats.kills) : STR.end.lostText(G.run.floor + 1, time, G.stats.kills);
  showScreen('end'); $('btnAgain').focus();
}
export function toggleSound() { const muted = Sfx.toggle(); $('btnSound').textContent = muted ? STR.pause.soundOff : STR.pause.soundOn; }

function showRooms(...list: Room[]) { for (const r of G.rooms) r.group.visible = list.includes(r); }

export function enterRoom(room: Room) {
  const firstVisit = !room.visited;
  G.current = room; room.visited = true; room.known = true; showRooms(room);
  for (const d of doorsOf(room)) d.nb.known = true;
  resetTorchLights(room.torches, player.x, player.z);
  setDarkness(room.plan.variant === 'dark' ? 1 : 0);
  if (!room.cleared && room.plan.variant === 'ambush' && room.ambush !== 'sprung') room.ambush = 'armed'; // looks empty, for now
  else if (!room.cleared) {
    room.wave = 0; room.wavePending = false; spawnWave(room);
    room.locked = true; setDoors(room, false);
    if (room.type === 'boss') {
      const boss = G.enemies.find(e => e.isBoss);
      const name = STR.bossNames[Math.min(G.run.floor, STR.bossNames.length - 1)];
      if (boss) showBossBar(name, boss);
      banner(name, STR.banner.bossSub);
    }
    if (room.type === 'ordeal') banner(...STR.banner.ordeal(room.waves.length));
  }
  if (firstVisit && room.type === 'altar' && room.spots.length) banner(...STR.banner.altar);
  if (firstVisit && room.quietHeart) { const p = freeSpotNear(room, room.cx, room.cz); spawnHeart(p.x, p.z, 2); }
  // a treasure room with nothing left to find offers a full heart instead
  if (firstVisit && room.type === 'treasure' && !room.spots.length) spawnHeart(room.cx, room.cz, 2);
  renderMinimap();
}

/** Bring in the room's current wave. In a champion room one enemy of the first wave (chosen by the room's
    seed) is the champion; in a sprung ambush enemies rise out of the floor, never on top of the mage. */
function spawnWave(room: Room, ambush = false) {
  const cfg = floorCfg(), foes = room.waves[room.wave] ?? [];
  const mortal = foes.filter(f => f.kind !== 'boss');
  const champion = room.plan.variant === 'champion' && room.wave === 0 && mortal.length ? mortal[Math.floor(mulberry(room.plan.seed)() * mortal.length)] : null;
  for (const f of foes) {
    let { x, z } = f;
    if (ambush) {
      const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz);
      if (d < 2.2) { const p = freeSpotNear(room, player.x + (d ? dx / d : 1) * 3, player.z + (d ? dz / d : 0) * 3); x = p.x; z = p.z; }
      burst(x, .1, z, 0x5a4a3a, 14, 2.2, .08);
    }
    if (f.kind === 'boss') makeEnemy(cfg.boss.type, x, z, 1, cfg.boss);
    else makeEnemy(f.kind, x, z, cfg.enemyHp, undefined, { champion: f === champion });
  }
}

/** Ambush rooms spring once the mage is committed: near the middle, or well away from every door. */
export function checkAmbush() {
  const room = G.current;
  if (room.ambush !== 'armed' || G.trans) return;
  const fromDoors = Math.min(...room.doors.map(d => Math.hypot(player.x - d.x, player.z - d.z)));
  const middle = Math.hypot(player.x - room.cx, player.z - room.cz);
  if (middle > CFG.ambush.middle && fromDoors < CFG.ambush.fromDoors) return;
  room.ambush = 'sprung'; room.wave = 0; room.wavePending = false;
  room.locked = true; setDoors(room, false);
  spawnWave(room, true);
  G.shake = Math.max(G.shake, .3); Sfx.rubble(); Sfx.boom();
}

/** The last enemy in a locked room fell: bring the next wave after a breath, or clear the room. */
export function onWaveCleared(room: Room) {
  if (room.wavePending) return;
  if (room.wave < room.waves.length - 1) {
    room.wavePending = true;
    after(.9, () => {
      if (G.current !== room || !room.wavePending) return; // left (dev warp) or restarted meanwhile
      room.wavePending = false; room.wave++;
      banner(...STR.banner.wave(room.wave + 1, room.waves.length), 1.6);
      spawnWave(room);
    });
    return;
  }
  onRoomCleared(room);
}

export function onRoomCleared(room: Room) {
  room.cleared = true; room.locked = false; setDoors(room, true);
  const loot = G.run.loot;
  if (room.type === 'ordeal') { // the reward rises in the middle of the room
    const def = offerGuaranteed('ordeal');
    if (def) placeArtifact(room, def, room.cx, room.cz); else spawnHeart(room.cx, room.cz, 2);
    banner(...STR.banner.ordealPassed); Sfx.relic();
    return;
  }
  if (room.type !== 'normal') return;
  if (loot.chance(CFG.heartDropChance)) {
    const p = freeSpotNear(room, room.cx + loot.range(-1, 1), room.cz + loot.range(-.5, .5));
    spawnHeart(p.x, p.z, loot.chance(.35) ? 2 : 1);
  }
  // now and then an artifact rises where the fight was, while the floor's budget allows
  const def = loot.chance(CFG.artifacts.dropChance) ? offerOptional('drop') : null;
  if (def) { const p = freeSpotNear(room, room.cx, room.cz + 1); placeArtifact(room, def, p.x, p.z); banner(...STR.banner.artifactRises); }
}

export function onBossDead() {
  const cur = G.current;
  hideBossBar();
  const h = freeSpotNear(cur, cur.cx, cur.cz + 2);
  spawnHeart(h.x, h.z, 2);
  makeTrapdoor(cur.cx, cur.cz);
  // the boss leaves a choice of two artifacts: taking one makes the other vanish
  const choice = [offerGuaranteed('boss')];
  if (choice[0]) choice.push(offerSecondChoice('boss'));
  const spots = choice.filter(d => d !== null).map((d, i) => {
    const p = freeSpotNear(cur, cur.cx + (i ? 2.6 : -2.6), cur.cz);
    return placeArtifact(cur, d, p.x, p.z);
  });
  if (spots.length === 2) { spots[0].pair = spots[1]; spots[1].pair = spots[0]; }
  banner(...(G.run.floor >= FLOORS.length - 1 ? STR.banner.lastBossDead : STR.banner.bossDead));
}

/** Point the camera straight at where it belongs in `room` (no pan). */
function aimCamera(room: Room) { const t = cameraTargetFor(room, player.x, player.z); camTarget.set(t.x, 0, t.z); }

/** Start the 0.42 s pan to the next room when the hero walks out through a doorway. */
export function tryTransition() {
  const cur = G.current;
  for (const door of cur.doors) {
    const [dx, dz] = SIDE_DIR[door.side], ns = dx === 0;
    const out = (player.x - door.x) * dx + (player.z - door.z) * dz;   // how far past the inside edge
    const along = ns ? player.x - door.x : player.z - door.z;
    if (out <= .35 || Math.abs(along) > DH + .3 || !door.link) continue;
    const nb = door.nb, to = entryPoint(door.link), cam = cameraTargetFor(nb, to.x, to.z);
    showRooms(cur, nb);
    G.trans = { t: 0, dur: .42, nb, fx: player.x, fz: player.z, tx: to.x, tz: to.z, cfx: camTarget.x, cfz: camTarget.z, ctx: cam.x, ctz: cam.z };
    clearProjectiles();
    return true;
  }
  return false;
}

/** Dev hook: finish the current room's fight at once (every wave), as if the last enemy had fallen. */
export function clearRoom() {
  const hadBoss = G.enemies.some(e => e.isBoss);
  clearEnemies();
  const room = G.current;
  if (room.ambush === 'armed') { room.ambush = 'sprung'; onRoomCleared(room); return; }
  if (room.locked) { room.wave = Math.max(0, room.waves.length - 1); room.wavePending = false; onWaveCleared(room); }
  if (hadBoss) onBossDead();
}

/** Dev hook: jump straight into a room, by grid cell or by room id, as if walking in through its first
    door (the south one if it has one). */
export function warp(gx: number, gy?: number) {
  const r = gy === undefined ? G.rooms.find(x => x.plan.id === gx) : roomAt(gx, gy);
  if (!r) throw new Error(`No room at ${gy === undefined ? 'id ' + gx : gx + ',' + gy}`);
  G.trans = null; clearProjectiles();
  const door = r.doors.find(d => d.side === 's') ?? r.doors[0];
  const p = door ? entryPoint(door) : freeSpotNear(r, r.cx, r.cz);
  player.x = p.x; player.z = p.z; player.vx = player.vz = 0;
  aimCamera(r); enterRoom(r);
}
