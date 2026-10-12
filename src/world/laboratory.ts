/* Dr. Jelly's laboratory (M5 step 6, docs/archive/M5-plan.md; GDD: Potions and alchemy): a special room on floors 1 and 3. The
   alchemy table stands in the middle, facing the way in, and Dr. Jelly behind it; the vat window is on the north wall,
   the jelly serpent coiled behind its glass (M5 step 7 lets it out). Walking up to the table opens it (ui/alchemyTable.ts:
   brewing, items/brewing.ts), walking up to Dr. Jelly opens it at the recipes he sells; it opens again only after the
   mage has stepped away. The jelly globes on their stands (`globe`, the template's `J`) burst to a bolt or a blast and
   let out a jelly, or a reagent. Looks in labLooks.ts; tuning `CFG.alchemy.lab`.
   M5 step 7: the jelly serpent breaks out of its vat once a run at most: when bolts crack its window three times, or by
   itself after the first brew in a run whose serpent is restless (`G.run.restless`). The glass bursts, jelly floods the
   room (actors/jellySerpent.ts: `pourJelly`), the doors lock and Dr. Jelly ducks behind his table; fallen, it leaves
   Warden's Ash (as every boss does), a rare potion and Dr. Jelly's thanks (a recipe for nothing), and no trapdoor. A
   laboratory on a floor after the serpent came out keeps an empty vat. Tuning `CFG.alchemy.vat`. */
import * as THREE from 'three';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { burst } from '../combat/fx';
import { banner, clearLines, hideBossBar, line, showBossBar } from '../ui/hud';
import { makeEnemy, spawnFoe } from '../actors/enemies';
import { nearestJelly, pourJelly } from '../actors/jellySerpent';
import { spawnPickup } from '../items/pickups';
import { COMMON_REAGENTS, POTIONS, POTION_IDS, REAGENTS, pickPotion } from '../items/alchemyData';
import { learnRecipe } from '../items/alchemyMemory';
import { RECIPE_POTIONS, recipeKnown, recipeOf } from '../items/brewing';
import { potionName } from '../items/potions';
import { closeLab, labOpen, openLab } from '../ui/alchemyTable';
import { after } from '../state';
import { mulberry } from '../util';
import { SIDE_DIR } from './shapes';
import { PX } from './dims';
import { glowTone, stoneOf } from './kitParts';
import { freeSpotNear, setDoors } from './rooms';
import { FLOORS } from './generate';
import { JELLY, VAT_EMPTY, tableLook, vatWindowLook } from './labLooks';
import { drJellyLook, type JellyParts } from './jellyLooks';
import { jellyGives, updateGives } from './jellyGives';
import type { Enemy, Room } from '../types';

const L = () => CFG.alchemy.lab;

/** Furnish a laboratory: the table in the middle (turned to face the room's one door), Dr. Jelly behind it, the vat window
    on the north wall beside the middle, away from any door there (the wall's torches keep clear of it: rooms.ts). */
export function furnishLab(room: Room) {
  const door = room.plan.doors[0], [dx, dz] = door ? SIDE_DIR[door.side] : [0, 1], R = mulberry(room.plan.seed ^ 0x1ab);
  const along = dx === 0; // (a door north or south: the table lies east to west)
  const table = tableLook(); table.position.set(0, 0, 0); if (!along) table.rotation.y = Math.PI / 2; room.group.add(table);
  const tb = { x: room.cx, z: room.cz, hx: along ? .78 : .4, hz: along ? .4 : .78 };
  room.rocks.push({ x: tb.x, z: tb.z, hx: tb.hx, hz: tb.hz, hp: Infinity, breakable: false });
  const jx = room.cx - dx * L().jellyAt, jz = room.cz - dz * L().jellyAt, jelly = drJellyLook();
  jelly.position.set(jx - room.cx, 0, jz - room.cz); jelly.rotation.y = Math.atan2(dx, dz); room.group.add(jelly);
  room.rocks.push({ x: jx, z: jz, hx: .3, hz: .3, hp: Infinity, breakable: false });
  // the vat window: in the middle of the north wall, or beside a door there, `windowClear` from it on its far side; empty
  // when the serpent came out on a floor before
  const { minZ } = room.bounds, north = room.plan.doors.find(d => d.side === 'n'), clear = L().windowClear;
  const doorX = north ? north.gx * PX + (north.shift ?? 0) - room.cx : null;
  const wx = doorX === null || Math.abs(doorX) >= clear ? 0 : doorX + (doorX > 0 || (doorX === 0 && R() < .5) ? -clear : clear);
  const broken = G.run.serpent !== 'caged', vat = vatWindowLook(stoneOf(room.look, 1.3), 2, broken); vat.position.set(wx, 0, minZ - room.cz + .04); room.group.add(vat);
  room.lab = { table: tb, jelly: { x: jx, z: jz, g: jelly }, vat, tableLook: table, identified: false, armedTable: true, armedJelly: true, cracks: 0, crackAt: -Infinity, broken, stirred: false };
}

/** The mage comes into a laboratory: Dr. Jelly will look at one potion again this visit; the first time, the banner and
    his greeting. */
export function enterLab(room: Room, firstVisit: boolean) {
  if (!room.lab) return;
  room.lab.identified = false; room.lab.armedTable = room.lab.armedJelly = true;
  if (!firstVisit) return;
  banner(...STR.banner.laboratory); line(room.lab.broken ? STR.lab.emptyVat : STR.lab.greet, 5); Sfx.at(room.lab.jelly.x, room.lab.jelly.z).brew();
}

/** Every step in a laboratory: walking up to the table opens it; to Dr. Jelly, at his recipes (each only after stepping
    away from it). */
export function checkLab() {
  const lab = G.current.lab; if (!lab || G.current.locked) return; // (not while the serpent is loose)
  const t = lab.table, reach = L().reach + player.r;
  const atTable = Math.abs(player.x - t.x) < t.hx + reach && Math.abs(player.z - t.z) < t.hz + reach;
  const atJelly = Math.hypot(player.x - lab.jelly.x, player.z - lab.jelly.z) < .3 + reach;
  if (!atTable) lab.armedTable = true; if (!atJelly) lab.armedJelly = true;
  if (atJelly && lab.armedJelly) { lab.armedJelly = lab.armedTable = false; openLab('recipes'); }
  else if (atTable && lab.armedTable) { lab.armedTable = false; openLab('brew'); }
}

/** Every frame: Dr. Jelly bobs and turns to watch the mage, the jelly in its jar wobbles (and while the serpent is loose he
    crouches low, trembling), and he hands over what he gives (jellyGives.ts); the serpent behind the glass turns in its
    coil and lifts its head. */
export function updateLab(now: number) {
  const lab = G.current.lab;
  updateGives(G.current, lab?.jelly.g.userData.parts as JellyParts | undefined, now, labOpen() || G.current.locked || G.state !== 'play');
  if (!lab) return;
  const body = lab.jelly.g.userData.body as THREE.Object3D, jelly = lab.jelly.g.userData.jelly as THREE.Object3D, duck = G.current.locked;
  body.position.y = duck ? Math.sin(now * 40) * .01 : Math.sin(now * 2.1) * .02;
  body.scale.y += ((duck ? CFG.alchemy.lab.duck : 1) - body.scale.y) * .15; // (low enough that the table hides him from the camera)
  const want = Math.atan2(player.x - lab.jelly.x, player.z - lab.jelly.z) - lab.jelly.g.rotation.y;
  body.rotation.y += (Math.atan2(Math.sin(want), Math.cos(want)) - body.rotation.y) * .06;
  jelly.scale.set(1 + Math.sin(now * 5) * .08, 1 - Math.sin(now * 5) * .08, 1 + Math.sin(now * 5) * .08);
  const serpent = lab.vat.userData.serpent as THREE.Object3D, head = lab.vat.userData.head as THREE.Object3D | undefined;
  serpent.rotation.y = Math.sin(now * .35) * .5; serpent.position.y = .2 + Math.sin(now * .8) * .04;
  if (head) { head.position.y = head.userData.y + Math.sin(now * 1.3) * .04; head.rotation.z = Math.sin(now * .9) * .2; }
}

/* ---------- the jelly serpent's vat (M5 step 7) ---------- */

const V = () => CFG.alchemy.vat;
/** Where the vat window stands in the world: the middle of its foot, at the wall's face. */
const windowAt = (room: Room) => ({ x: room.cx + room.lab!.vat.position.x, z: room.bounds.minZ });

/** A bolt struck the wall at (x, z): on the vat window, a crack (three, and the serpent breaks out). True if it was. */
export function vatStruck(room: Room, x: number, z: number) {
  const lab = room.lab; if (!lab || lab.broken || G.run.serpent !== 'caged') return false;
  const w = windowAt(room);
  if (z > w.z + .35 || Math.abs(x - w.x) > 1.05) return false;
  if (G.simClock - lab.crackAt < V().crackGap) return true; // (a fan of shards is one crack)
  lab.crackAt = G.simClock; lab.cracks++;
  const cracks = lab.vat.userData.cracks as THREE.Object3D[]; cracks[Math.min(cracks.length, lab.cracks) - 1].visible = true;
  burst(x, .6, w.z + .3, 0xe8fff0, 8, 1.6, .035); Sfx.at(x, w.z).glassCrack();
  if (lab.cracks >= V().cracks) breakOut(room);
  else line(STR.lab.cracks[Math.min(STR.lab.cracks.length, lab.cracks) - 1], 3.5);
  return true;
}

/** Dev menu and tests: crack the vat window as a bolt striking its middle does. */
export function crackVat() {
  const room = G.current; if (!room.lab) return false;
  room.lab.crackAt = -Infinity; const w = windowAt(room); return vatStruck(room, w.x, w.z);
}

/** After a brew at the table: a restless serpent stirs, and soon after the mage steps back from the table, breaks out. */
export function stirAfterBrew() {
  const room = G.current, lab = room.lab;
  if (!lab || lab.stirred || lab.broken || !G.run.restless || G.run.serpent !== 'caged') return;
  lab.stirred = true;
  after(V().restlessAfter, () => { // (sim time: it waits while the table is open)
    if (G.current !== room || lab.broken) return;
    line(STR.lab.stirs, 3.5); Sfx.at(windowAt(room).x, windowAt(room).z).serpentHiss();
    const cracks = lab.vat.userData.cracks as THREE.Object3D[];
    cracks.forEach((c, i) => after(.3 + i * .35, () => { if (lab.broken) return; c.visible = true; Sfx.at(windowAt(room).x, windowAt(room).z).glassCrack(); G.shake = Math.max(G.shake, .08); }));
    after(1.6, () => { if (G.current === room) breakOut(room); });
  });
}

/** The serpent breaks out: the glass bursts, jelly floods the room, the doors lock, Dr. Jelly ducks behind his table, and
    the serpent comes out of the window. Returns it (null if it can't: no laboratory here, or it came out already). */
export function breakOut(room: Room = G.current): Enemy | null {
  const lab = room.lab; if (!lab || lab.broken || G.run.serpent !== 'caged') return null;
  if (labOpen()) closeLab();
  lab.broken = true; G.run.serpent = 'out';
  const u = lab.vat.userData, w = windowAt(room);
  (u.glass as THREE.Object3D).visible = (u.serpent as THREE.Object3D).visible = (u.bars as THREE.Object3D).visible = false; (u.shards as THREE.Object3D).visible = true;
  for (const c of u.cracks as THREE.Object3D[]) c.visible = false;
  (u.back as THREE.Mesh).material = glowTone(VAT_EMPTY); (u.glow as THREE.Sprite).material.opacity = .15;
  burst(w.x, .6, w.z + .3, 0xe8fff0, 30, 3.5, .06); burst(w.x, .4, w.z + .5, JELLY, 36, 3.2, .08); Sfx.at(w.x, w.z).vatBurst(); G.shake = Math.max(G.shake, .45);
  pourJelly(room, w.x, w.z + .6, V().flood, mulberry(room.plan.seed ^ 0x5e1));
  const at = nearestJelly(w.x, w.z + .6) ?? { x: w.x, z: w.z + .6 }; // (out onto the jelly by the window, not onto Dr. Jelly)
  const e = makeEnemy('serpent', at.x, at.z, FLOORS[Math.min(G.run.floor, FLOORS.length - 1)].enemyHp);
  e.labBoss = true;
  room.locked = true; setDoors(room, false);
  clearLines(); // (the cracks' pleas, and his greeting, are past)
  showBossBar(STR.bosses.serpent.name, e); banner(STR.bosses.serpent.name, STR.bosses.serpent.sub); line(`${STR.lab.out} ${STR.lab.duck}`, 4);
  return e;
}

/** The serpent out of its vat has fallen: a rare potion and Dr. Jelly's thanks, a recipe for nothing (Warden's Ash it
    leaves as every boss does); the doors open as the room is cleared. */
export function serpentFell(e: Enemy) {
  const room = G.current; G.run.serpent = 'slain'; hideBossBar();
  banner(STR.bosses.serpent.dead, '');
  const p = freeSpotNear(room, e.x - .8, e.z), rare = pickPotion(G.run.alchemy, POTION_IDS.filter(id => POTIONS[id].rare));
  spawnPickup('potion', p.x, p.z, { potion: rare, rise: true });
  const id = RECIPE_POTIONS.find(r => !recipeKnown(r)), lab = room.lab;
  after(1.2, () => {
    if (id) { const r = recipeOf(id); learnRecipe(r.of[0], r.of[1], id); line(STR.lab.thanks(REAGENTS[r.of[0]].name, REAGENTS[r.of[1]].name, potionName(id)), 5.5); jellyGives({ kind: 'recipe' }); }
    else { line(STR.lab.thanksAll, 4.5); jellyGives({ kind: 'coins' }); for (let i = 0; i < 3; i++) { const q = freeSpotNear(room, (lab?.jelly.x ?? room.cx) + (i - 1) * .7, (lab?.jelly.z ?? room.cz) + .9); spawnPickup('coin', q.x, q.z, { rise: true }); } }
    if (lab) Sfx.at(lab.jelly.x, lab.jelly.z).brew();
  });
}

/** A jelly globe bursts at (x, z): now and then a jelly drifts out of it, else a reagent drops. A jelly let out shuts the
    laboratory's doors until it is put to rest, as any fight does (and Dr. Jelly ducks behind the table). */
export function globeBurst(room: Room, x: number, z: number) {
  if (G.run.reagents.chance(L().globeJelly)) {
    spawnFoe('lanternJelly', x, z, 1); burst(x, .6, z, JELLY, 10, 1.4, .05);
    if (room === G.current && !room.locked) { room.locked = true; setDoors(room, false); }
    return;
  }
  const p = freeSpotNear(room, x, z), r = COMMON_REAGENTS[G.run.reagents.int(0, COMMON_REAGENTS.length - 1)];
  spawnPickup('reagent', p.x, p.z, { reagent: r, rise: true });
}
