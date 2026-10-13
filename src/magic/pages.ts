/* Grimoire pages (GDD: Spells): torn pages that whisper in their spell's colour. A library's lecterns hold three
   of different schools, and its shelf sells back, for obols, the pages of spells given up earlier in the run; a
   boss leaves one beside its artifacts, and now and then a cleared room drops one. Walking into a page learns its
   spell into an empty slot. With both slots full the page asks which spell to give up (Q or E, LB or RB) while the
   mage stands at it, and stepping away keeps both. The given-up spell's page is left where the new one was, free
   to take back; in a library the other choices burn to ash as soon as one is taken. */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Page, Room } from '../types';
import { DEV, G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, basicMat, blob, disposeTree, glowShared, markShared, mergeStill } from '../render/materials';
import { bookcaseLook, lecternLook } from '../world/specialLooks';
import { hashString } from '../rng';
import { burst } from '../combat/fx';
import { banner, hidePrompt, line, renderMinimap, showPrompt, spellIcon, spellIconSvg, toast } from '../ui/hud';
import { giveResources } from '../items/pickups';
import { coinTag } from '../items/merchant';
import { LOOT } from '../items/loot';
import { pointInBoxes } from '../world/collision';
import { freeSpotNear } from '../world/rooms';
import { SIDE_DIR } from '../world/shapes';
import { riseMote } from './shapes';
import { learnSpell } from './spells';
import { castsOf, sawSpell, stage } from './memory';
import { spellSheet } from '../ui/spellPanel';
import { camera, canvas } from '../render/renderer';
import { inPool, pickPages, shelfPages, spell } from './spellData';
import { vigil } from '../vigil/save';
import { floorLean } from '../world/curve';
import { boonsChanged } from '../progression/boons';

const C = CFG.library;
const hex = (c: string) => parseInt(c.slice(1), 16);
const ASH = 0x2e2a26,
  EMBER = 0xff8a3a;

/* ---------- looks ---------- */

let parts: ReturnType<typeof makeParts> | null = null;
function makeParts() {
  const shared = <T extends THREE.BufferGeometry>(g: T) => markShared(g);
  return {
    leaf: shared(new THREE.PlaneGeometry(0.54, 0.7)),
    base: shared(new THREE.BoxGeometry(0.5, 0.06, 0.4)),
    post: shared(new THREE.CylinderGeometry(0.05, 0.06, 0.86, 6)),
    board: shared(new THREE.BoxGeometry(0.56, 0.04, 0.42)),
    candle: shared(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 6)),
    carcass: shared(new THREE.BoxGeometry(1.5, 1.25, 0.34)),
    spines: shared(new THREE.PlaneGeometry(1.38, 1.1)),
    wax: markShared(new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.8, emissive: 0x1a140a })),
    books: markShared(new THREE.MeshStandardMaterial({ map: spinesTexture(), roughness: 0.9 })),
  };
}

/** Rows of book spines in muted colours, with gilt bands (the library's shelves). */
function spinesTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 204;
  const g = c.getContext('2d')!;
  g.fillStyle = '#140e0a';
  g.fillRect(0, 0, 256, 204);
  const colours = ['#5a2a22', '#3a3a2a', '#2a3440', '#4a3a24', '#5e4a2e', '#2e2a36', '#3e2418', '#6a5a3a'];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 3; row++) {
    const y1 = 64 + row * 68;
    for (let x = 2; x < 252;) {
      const w = 8 + Math.floor(rnd() * 10),
        h = 42 + Math.floor(rnd() * 18);
      if (rnd() < 0.08) {
        x += w;
        continue;
      } // a gap where a book was taken
      g.fillStyle = colours[Math.floor(rnd() * colours.length)];
      g.fillRect(x, y1 - h, w - 1, h);
      g.fillStyle = 'rgba(210,170,90,.55)';
      g.fillRect(x, y1 - h + 6, w - 1, 2);
      g.fillRect(x, y1 - 10, w - 1, 2);
      x += w;
    }
    g.fillStyle = '#2a1c12';
    g.fillRect(0, y1, 256, 4); // the shelf board
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A torn page of parchment with its spell's icon drawn large in the spell's colour; `ash` scorches its edges
    (a page for sale on the shelf). One texture per spell and look, kept for the session. */
const leafMats = new Map<string, THREE.MeshBasicMaterial>();
function leafMat(id: string, ash: boolean) {
  const key = id + (ash ? ':ash' : '');
  let m = leafMats.get(key);
  if (m) return m;
  const def = spell(id),
    c = document.createElement('canvas');
  c.width = 192;
  c.height = 250;
  const g = c.getContext('2d')!;
  // a torn outline
  let seed = id.length * 97 + (ash ? 13 : 0);
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.beginPath();
  const edge = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      g.lineTo(x0 + (x1 - x0) * k + (rnd() - 0.5) * 8, y0 + (y1 - y0) * k + (rnd() - 0.5) * 8);
    }
  };
  g.moveTo(10, 10);
  edge(10, 10, 182, 8, 9);
  edge(182, 8, 184, 242, 11);
  edge(184, 242, 8, 244, 9);
  edge(8, 244, 10, 10, 11);
  g.closePath();
  const paper = g.createRadialGradient(96, 120, 20, 96, 125, 150);
  paper.addColorStop(0, '#e8d6ae');
  paper.addColorStop(0.7, '#cdb482');
  paper.addColorStop(1, ash ? '#3a2412' : '#9a7c4c');
  g.fillStyle = paper;
  g.fill();
  if (ash) {
    g.lineWidth = 7;
    g.strokeStyle = '#1a0e08';
    g.stroke();
  }
  // faded writing above and below the icon
  g.strokeStyle = 'rgba(70,48,28,.45)';
  g.lineWidth = 2;
  for (const y of [34, 46, 58, 198, 210, 222]) {
    g.beginPath();
    g.moveTo(28, y);
    for (let x = 28; x < 164; x += 8) g.lineTo(x + 8, y + (rnd() - 0.5) * 3);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    // in the spell's colour, edged in dark ink so pale colours still read on the parchment
    g.shadowColor = 'rgba(30,16,6,.95)';
    g.shadowBlur = 5;
    g.drawImage(img, 36, 68, 120, 120);
    g.drawImage(img, 36, 68, 120, 120);
    tex.needsUpdate = true;
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(spellIconSvg(def.id, def.color));
  m = markShared(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  leafMats.set(key, m);
  return m;
}

/** The leaf hovering over its stand (or the floor), with a glow in its spell's colour behind it. */
function makeHover(id: string, ash: boolean, loose: boolean) {
  const P = (parts ??= makeParts()),
    g = new THREE.Group();
  const leaf = new THREE.Mesh(P.leaf, leafMat(id, ash));
  leaf.rotation.x = -0.55; // tilted up towards the camera
  const light = glowShared(hex(spell(id).color), 1.1, 0.28);
  light.position.set(0, -0.12, -0.12); // a whisper of light behind it
  g.add(light, leaf);
  g.position.y = loose ? 0.55 : 1.22;
  return g;
}

/** A lectern of dark wood with a slanted board and a candle burning on its corner. */
function makeLectern() {
  const P = (parts ??= makeParts()),
    g = new THREE.Group();
  const base = new THREE.Mesh(P.base, M.frame.library);
  base.position.y = 0.03;
  const post = new THREE.Mesh(P.post, M.frame.library);
  post.position.y = 0.47;
  const board = new THREE.Mesh(P.board, M.frame.library);
  board.position.y = 0.92;
  board.rotation.x = -0.45;
  const candle = new THREE.Mesh(P.candle, P.wax);
  candle.position.set(0.22, 1.04, 0.1);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), basicMat(0xffd08a));
  flame.position.set(0.22, 1.14, 0.1);
  flame.scale.y = 1.6;
  const light = glowShared(0xffb050, 0.55, 0.8);
  light.position.copy(flame.position);
  g.add(base, post, board, candle, flame, light, blob(0.9));
  return g;
}

/* ---------- pages in rooms ---------- */

/** Put a page of `id` in `room` at (x, z): on a lectern, on the shelf at a price, or lying loose. */
function addPage(room: Room, id: string, x: number, z: number, kind: Page['kind'], price = 0): Page {
  const g = new THREE.Group();
  g.position.set(x - room.cx, 0, z - room.cz);
  if (kind !== 'loose') g.add(DEV.roomKit ? lecternLook(room.look) : makeLectern());
  else g.add(blob(0.8));
  const p: Page = { spell: id, x, z, kind, price, g, armed: true, gone: false };
  setLeaf(p, id);
  if (price) {
    p.tag = coinTag(price);
    p.tag.position.y = 2;
    g.add(p.tag);
  }
  room.group.add(g);
  (room.pages ??= []).push(p);
  return p;
}
/** Show the page of `id` over its stand (a page for sale is scorched at its edges). */
function setLeaf(p: Page, id: string) {
  if (p.hover) {
    p.g.remove(p.hover);
    disposeTree(p.hover);
  }
  p.spell = id;
  p.hover = makeHover(id, p.price > 0, p.kind === 'loose');
  p.g.add(p.hover);
}

/** The library's furniture, when the room is built: shelves of books along the north wall (not across a door
    there, nor on an urn), each stopping the mage like a rock. */
export function furnishLibrary(room: Room) {
  const P = (parts ??= makeParts()),
    { minX, maxX, minZ } = room.bounds;
  const northDoor = room.plan.doors.some((d) => d.side === 'n');
  const n = Math.floor((maxX - minX - 0.4) / 1.6),
    x0 = (minX + maxX) / 2 - (n - 1) * 0.8;
  const kit = DEV.roomKit ? new THREE.Group() : null; // (the room kit's bookcases: every one in one mesh)
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 1.6,
      z = minZ + 0.18;
    if (northDoor && Math.abs(x - room.cx) < 1.6) continue;
    if (pointInBoxes(x, z + 0.3, 0.5, room.rocks)) continue;
    room.rocks.push({ x, z, hx: 0.75, hz: 0.17, hp: Infinity, breakable: false });
    if (kit) {
      const b = bookcaseLook(hashString(`${G.run.seed}:${G.run.floor}:${room.gx},${room.gy}`) + i * 977);
      b.position.set(x - room.cx, 0, z - room.cz);
      kit.add(b);
      continue;
    } // (every library its own books, the same on a replay)
    const g = new THREE.Group();
    g.position.set(x - room.cx, 0, z - room.cz);
    const carcass = new THREE.Mesh(P.carcass, M.frame.library);
    carcass.position.y = 0.625;
    const spines = new THREE.Mesh(P.spines, P.books);
    spines.position.set(0, 0.64, 0.175);
    g.add(carcass, spines);
    room.group.add(g);
  }
  if (kit) {
    mergeStill(kit);
    room.group.add(kit);
  }
}

/** The library on the mage's first visit: three pages of different schools on lecterns in a row across the room,
    on the far side from the door, and on either side of them the shelf's pages of spells given up earlier in the
    run, at a price. */
function layLibrary(room: Room) {
  const door = room.doors.find((d) => !d.secret) ?? room.doors[0];
  const [dx, dz] = door ? SIDE_DIR[door.side] : [0, 1],
    ns = dx === 0; // into the room is (-dx, -dz)
  const along = ns ? { x: 1, z: 0 } : { x: 0, z: 1 },
    gap = ns ? C.spacing : C.spacingShort;
  const mid = { x: room.cx - dx * (ns ? 0 : C.rowInShort), z: room.cz - dz * (ns ? C.rowIn : 0) };
  const gr = LOOT.grimoire,
    lean = floorLean(),
    pledge = G.run.pledge,
    lectern = pickPages(G.run.pages, player.spells, gr.lecterns, [], inPool(vigil().freed), lean, pledge); // (M4.9: leaning to what the floor's foes are weak to; M6: a pledge's page first)
  if (pledge && lectern.some((id) => spell(id).school === pledge)) {
    G.run.pledge = null;
    line(STR.boons.pledgeKept(STR.schools[pledge]), CFG.afflict.lineShow);
  } // (the pledge kept, and spent)
  const leant =
    lean.length &&
    lectern.length &&
    lean.includes(spell(lectern[0]).school) &&
    !player.spells.some((id) => id && lean.includes(spell(id).school));
  if (leant && !G.run.hinted.has('lean')) {
    G.run.hinted.add('lean');
    line(STR.curve.leans, CFG.afflict.lineShow);
  } // (the first time in a run, a line says so)
  const set: Page[] = lectern.map((id, i) => {
    const k = i - (lectern.length - 1) / 2,
      p = freeSpotNear(room, mid.x + along.x * k * gap, mid.z + along.z * k * gap);
    return addPage(room, id, p.x, p.z, 'lectern');
  });
  for (const p of set) p.set = set;
  // the shelf: on a long side at both ends of the row, on a short side nearer the door
  shelfPages(G.run.forgotten, player.spells, lectern, gr.shelf).forEach((id, i) => {
    const s = i ? 1 : -1,
      at = ns ? { x: mid.x + s * 2 * gap, z: mid.z } : { x: room.cx, z: room.cz + s * 2.3 };
    const p = freeSpotNear(room, at.x, at.z);
    addPage(room, id, p.x, p.z, 'shelf', gr.rebuy);
  });
}

/** Entering the library: its pages are laid out the first time. */
export function enterLibrary(room: Room, firstVisit: boolean) {
  if (!firstVisit || room.pages) return;
  layLibrary(room);
  banner(...STR.banner.library);
  Sfx.pageWhisper();
}

/** A page lying loose at (x, z) in `room`: a boss's, or one a cleared room drops. `id` picks the spell, or one the
    mage doesn't know (none when there is none left to learn). */
export function dropPage(room: Room, x: number, z: number, id?: string) {
  const skip = (room.pages ?? []).filter((p) => !p.gone).map((p) => p.spell);
  const pick = id ?? pickPages(G.run.pages, player.spells, 1, skip, inPool(vigil().freed), floorLean())[0];
  if (!pick) return null;
  const p = freeSpotNear(room, x, z),
    page = addPage(room, pick, p.x, p.z, 'loose');
  burst(p.x, 0.6, p.z, hex(spell(pick).color), 12, 1.6, 0.04);
  Sfx.pageDrop();
  return page;
}

/** A cleared room now and then leaves a page (its own seeded stream, so drops and loot don't shift). */
export function maybeDropPage(room: Room) {
  if (!G.run.pages.chance(LOOT.grimoire.clearChance)) return;
  if (dropPage(room, room.cx - 1.5, room.cz)) banner(...STR.banner.pageFalls);
}

/* ---------- taking a page ---------- */

let asking: Page | null = null;
function ask(p: Page) {
  asking = p;
  const keys = STR.controls.spellsKeys.split(' and '),
    pad = STR.controls.spellsPad.split(' and ');
  const opts = player.spells.map(
    (id, i) => `<span class="opt"><b>${keys[i]} · ${pad[i]}</b>${spellIcon(id!)}${spell(id!).name}</span>`,
  );
  showPrompt(
    `<p>${STR.pages.ask(spell(p.spell).name)}</p><div class="opts">${opts.join(`<i>${STR.pages.or}</i>`)}</div><small>${STR.pages.keep}</small>`,
  );
  Sfx.pageAsk();
}
function stopAsking() {
  if (asking) {
    asking = null;
    hidePrompt();
  }
}

/** A spell key pressed: if a page is asking, give up that slot's spell for the page's and return true; otherwise
    false (the key casts as usual). */
export function answerPage(slot: number) {
  const p = asking;
  if (!p) return false;
  stopAsking();
  take(p, slot);
  return true;
}

/** Learn the page's spell into `slot`, paying for it on the shelf; the spell given up leaves its page here, and a
    library's other choices burn. */
function take(p: Page, slot: number) {
  if (p.price) {
    giveResources({ coins: -p.price });
    Sfx.purchase();
  }
  const color = hex(spell(p.spell).color);
  const replaced = learnSpell(p.spell, slot);
  G.run.forgotten = G.run.forgotten.filter((id) => id !== p.spell);
  burst(p.x, 1.1, p.z, color, 18, 2.2, 0.045);
  if (p.set) {
    // the other choices on the lecterns crumble to ash
    for (const o of p.set) if (o !== p && !o.gone) crumble(o);
    for (const o of p.set) o.set = undefined;
  }
  if (p.tag) {
    p.g.remove(p.tag);
    disposeTree(p.tag);
    p.tag = undefined;
  }
  p.price = 0;
  if (replaced) {
    // the given-up spell's page is left here, free to take back
    G.run.forgotten.push(replaced);
    setLeaf(p, replaced);
    p.armed = false;
    toast(STR.pages.left(spell(replaced).name, p.kind), 4);
  } else {
    p.gone = true;
    if (p.kind === 'loose') {
      p.g.parent?.remove(p.g);
      disposeTree(p.g);
    } else if (p.hover) {
      p.g.remove(p.hover);
      disposeTree(p.hover);
      p.hover = undefined;
    }
  }
  renderMinimap();
}

/** A page burns away to ash and embers. */
function crumble(p: Page) {
  p.gone = true;
  if (p.hover) {
    p.g.remove(p.hover);
    disposeTree(p.hover);
    p.hover = undefined;
  }
  burst(p.x, 1.2, p.z, ASH, 14, 1.2, 0.05);
  burst(p.x, 1.2, p.z, EMBER, 6, 1.6, 0.03);
  Sfx.ash();
}

/** Walking into a page takes it, or asks which spell to give up, or refuses (too few obols); stepping away
    stops the asking. Called every step while playing. */
export function checkPages() {
  const pages = G.current.pages ?? [];
  if (asking && !pages.includes(asking)) stopAsking();
  for (const p of pages) {
    if (p.gone) continue;
    const d = Math.hypot(player.x - p.x, player.z - p.z);
    if (d > player.r + C.reach + 0.8) {
      p.armed = true;
      if (asking === p) stopAsking();
      continue;
    }
    if (d > player.r + C.reach || !p.armed) continue;
    p.armed = false;
    if (player.spells.includes(p.spell)) {
      toast(STR.pages.known(spell(p.spell).name), 3);
      continue;
    } // a loose page learned since
    if (p.price > player.coins) {
      toast(STR.toast.tooPoor(p.price, player.coins), 3.2);
      Sfx.refuse();
      continue;
    }
    const free = player.spells.indexOf(null);
    if (free >= 0) take(p, free);
    else ask(p);
  }
}

/** Pages hover and sway over their stands and whisper motes of light. */
export function updatePages(dt: number, now: number) {
  for (const p of G.current.pages ?? []) {
    if (p.gone || !p.hover) continue;
    const base = p.kind === 'loose' ? 0.55 : 1.22;
    p.hover.position.y = base + Math.sin(now * 2 + p.x) * 0.05;
    p.hover.rotation.y = Math.sin(now * 0.8 + p.x) * 0.25;
    if (Math.random() < dt * 2.5)
      riseMote(
        p.x + (Math.random() - 0.5) * 0.4,
        base + 0.1,
        p.z + (Math.random() - 0.5) * 0.3,
        hex(spell(p.spell).color),
      );
  }
}

/** A new floor or run: nothing asking. */
export function clearPages() {
  stopAsking();
  hidePagePanel();
}

/* ---------- the panel over a page (M3.7) ---------- */

const panelAt = new THREE.Vector3();
let shown: { page: Page; stage: string; boons: number; run: object; w: number; h: number } | null = null,
  view: DOMRect | null = null;
if (typeof window !== 'undefined')
  window.addEventListener('resize', () => {
    view = null;
  });
/** The nearest page within reach gets a panel over it at the spell's stage; the first time a page is near, its spell
    is seen. Every step while playing (it follows the page on screen as the camera moves). */
export function updatePagePanel() {
  const el = document.getElementById('pagePanel');
  if (!el) return;
  let near: Page | null = null,
    best = CFG.knowledge.pageReach + player.r;
  for (const p of G.current.pages ?? []) {
    if (p.gone) continue;
    const d = Math.hypot(player.x - p.x, player.z - p.z);
    if (d < best) {
      best = d;
      near = p;
    }
  }
  if (!near) {
    hidePagePanel();
    return;
  }
  sawSpell(near.spell);
  const st = stage(near.spell),
    boons = boonsChanged; // (M6: a boon taken changes what the panel says)
  if (shown?.page !== near || shown.stage !== st || shown.boons !== boons || shown.run !== G.run) {
    // new content: measured once here, not every step
    el.innerHTML = spellSheet(spell(near.spell), st, '', castsOf(near.spell));
    el.classList.add('on');
    shown = { page: near, stage: st, boons, run: G.run, w: el.offsetWidth, h: el.offsetHeight };
  }
  // over the page if there is room above it on screen, otherwise beside it (the mage comes from below: never there)
  const r = (view ??= canvas.getBoundingClientRect()),
    { w, h } = shown;
  panelAt.set(near.x, near.kind === 'loose' ? 1.1 : 1.8, near.z).project(camera);
  const px = r.left + ((panelAt.x + 1) / 2) * r.width,
    py = r.top + ((1 - panelAt.y) / 2) * r.height;
  let x = Math.max(r.left + w / 2 + 8, Math.min(r.right - w / 2 - 8, px)),
    y = py - h - 6;
  if (y < r.top + 8) {
    // on its outer side (a row of pages across the room keeps its neighbours in sight), if that side has room
    const left = px - 56 - w >= r.left + 8,
      right = px + 56 + w <= r.right - 8,
      outerLeft = px < r.left + r.width / 2;
    x = (outerLeft ? left || !right : !right && left) ? px - 56 - w / 2 : px + 56 + w / 2;
    y = Math.max(r.top + 8, Math.min(r.bottom - h - 8, py - 24));
  }
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}
export function hidePagePanel() {
  shown = null;
  document.getElementById('pagePanel')?.classList.remove('on');
}
/** The spell whose panel shows, if any (tests). */
export const pagePanelSpell = () => shown?.page.spell ?? null;
