/* Game states (title, play, pause, dying, end), floor setup and moving between rooms. */
import type * as THREE from 'three';
import { CFG } from './config';
import type { Room } from './types';
import { G, clearTimers, player } from './state';
import { STR } from './strings';
import { Sfx } from './audio/sfx';
import { CAM_OFFSET_Z, camTarget, scene } from './render/renderer';
import { torchLights } from './render/lights';
import { disposeTree } from './render/materials';
import { FLOOR1, buildRoom, buildWallsAndDoors, doorsOf, roomAt, setDoors, toWorld } from './world/rooms';
import { HD, HW } from './world/dims';
import { clearEnemies, makeEnemy } from './actors/enemies';
import { heroReset } from './actors/hero';
import { clearProjectiles } from './combat/projectiles';
import { makePortal, spawnHeart } from './items/pickups';
import { banner, hideBossBar, renderHearts, renderItems, renderMinimap, resetHearts, showBossBar } from './ui/hud';
import { showScreen } from './ui/screens';
import { resetClock } from './loop';
import { $, rand } from './util';

function clearEntities() {
  clearProjectiles();
  for (const p of G.particles) { scene.remove(p.m); p.m.material.dispose(); } G.particles.length = 0;
  clearEnemies();
  for (const p of G.pickups) scene.remove(p.g); G.pickups.length = 0;
  for (const d of G.decals) { scene.remove(d); (d.material as THREE.Material).dispose(); } G.decals.length = 0;
  if (G.portal) { scene.remove(G.portal.g); disposeTree(G.portal.g); G.portal = null; }
}

export function buildFloor() {
  clearEntities(); clearTimers();
  for (const r of G.rooms) { scene.remove(r.group); disposeTree(r.group); }
  G.rooms = []; G.roomMap = new Map();
  for (const def of FLOOR1) buildRoom(def);
  for (const r of G.rooms) buildWallsAndDoors(r);
  const start = G.rooms.find(r => r.type === 'start')!;
  G.current = start; player.x = start.cx; player.z = start.cz + .6; player.vx = player.vz = 0;
  camTarget.set(start.cx, 0, start.cz + CAM_OFFSET_Z);
  enterRoom(start);
}

export function resetPlayer() {
  Object.assign(player, {
    hp: CFG.hero.hearts * 2, maxHp: CFG.hero.hearts * 2, invuln: 0, fireCd: 0, damage: CFG.hero.damage,
    boltScale: 1, boltColor: 0xffcf7a, items: [], yawA: 0,
  });
  heroReset();
  resetHearts(); renderHearts(); renderItems();
}

export function startGame() {
  Sfx.init(); resetPlayer(); buildFloor(); G.stats.time = 0; G.stats.kills = 0; G.trans = null;
  hideBossBar(); showScreen(null); G.state = 'play';
  banner(...STR.banner.floor);
}
export function pause() { G.state = 'pause'; showScreen('pause'); $('btnResume').focus(); }
export function resume() { G.state = 'play'; showScreen(null); resetClock(); }
export function endGame(won: boolean) {
  G.state = 'end'; hideBossBar();
  const t = G.stats.time, time = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  $('endTitle').textContent = won ? STR.end.won : STR.end.lost;
  $('endText').textContent = won ? STR.end.wonText(time, G.stats.kills) : STR.end.lostText(time, G.stats.kills);
  showScreen('end'); $('btnAgain').focus();
}
export function toggleSound() { const muted = Sfx.toggle(); $('btnSound').textContent = muted ? STR.pause.soundOff : STR.pause.soundOn; }

function showRooms(...list: Room[]) { for (const r of G.rooms) r.group.visible = list.includes(r); }

export function enterRoom(room: Room) {
  G.current = room; room.visited = true; room.known = true; showRooms(room);
  for (const d of doorsOf(room)) d.nb.known = true;
  room.torches.forEach((t, i) => torchLights[i].position.set(t.x, 1.3, t.z));
  if (!room.cleared) {
    for (const [type, c, r] of room.def.foes ?? []) { const p = toWorld(room, c, r); makeEnemy(type, p.x, p.z); }
    room.locked = true; setDoors(room, false);
    if (room.type === 'boss') {
      const boss = G.enemies.find(e => e.isBoss);
      if (boss) showBossBar(STR.bossName, boss);
      banner(...STR.banner.boss);
    }
  }
  renderMinimap();
}

export function onRoomCleared(room: Room) {
  room.cleared = true; room.locked = false; setDoors(room, true);
  if (room.type === 'normal' && Math.random() < CFG.heartDropChance) spawnHeart(room.cx + rand(-1, 1), room.cz + rand(-.5, .5), Math.random() < .35 ? 2 : 1);
}

export function onBossDead() {
  const cur = G.current;
  hideBossBar();
  spawnHeart(cur.cx - 1.6, cur.cz, 2);
  makePortal(cur.cx, cur.cz);
  banner(...STR.banner.bossDead);
}

/** Start the 0.42 s pan to the next room when the hero walks through a doorway. */
export function tryTransition() {
  const cur = G.current;
  const lx = player.x - cur.cx, lz = player.z - cur.cz; let side: 'n' | 's' | 'e' | 'w' | null = null;
  if (lz < -HD - .35) side = 'n'; else if (lz > HD + .35) side = 's'; else if (lx > HW + .35) side = 'e'; else if (lx < -HW - .35) side = 'w';
  const door = side && cur.doors[side]; if (!side || !door) return false;
  const nb = door.nb; const entry = { n: [0, HD - .6], s: [0, -HD + .6], e: [-HW + .6, 0], w: [HW - .6, 0] }[side];
  showRooms(cur, nb);
  G.trans = { t: 0, dur: .42, nb, fx: player.x, fz: player.z, tx: nb.cx + entry[0], tz: nb.cz + entry[1], cfx: camTarget.x, cfz: camTarget.z };
  clearProjectiles();
  return true;
}

/** Dev hook: jump straight into the room at grid (gx, gy). */
export function warp(gx: number, gy: number) {
  const r = roomAt(gx, gy); if (!r) throw new Error(`No room at ${gx},${gy}`);
  G.trans = null; clearProjectiles();
  player.x = r.cx; player.z = r.cz + HD - .6; camTarget.set(r.cx, 0, r.cz + CAM_OFFSET_Z); enterRoom(r);
}
