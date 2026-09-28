/* The merchant (GDD: The merchant): a bound shade who deals in the obols of the dead. His 3 or 4 wares float
   in ward circles that paying breaks: walking into one buys it, or he refuses (too few obols, a heart at
   full health, a resource at its cap). The first ware is an artifact while the floor's budget allows.
   His shop is warded, so there is no fighting or robbing him: bolts fizzle there and glyphs won't take
   (projectiles.ts, glyphs.ts). */
import * as THREE from 'three';
import { CFG } from '../config';
import type { Room, WareSpot } from '../types';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { M, basicMat, blob, disposeTree, glow, markShared } from '../render/materials';
import { glyphTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { renderHearts, renderMinimap, toast } from '../ui/hud';
import { WARD_COLOR as WARD } from '../world/rooms';
import { grantArtifact, makeArtifactVisual, offerGuaranteed } from './artifacts';
import { giveResources, itemVisual } from './pickups';
import { heroDrink } from '../actors/hero';
import { itemLore, type LoreItem } from '../ui/lore';
import { gainMana } from '../magic/spells';
import { LOOT, RESOURCES, dropValue, priceOf, rollWares, type Item } from './loot';

const C = CFG.merchant;

/* ---------- looks ---------- */

let parts: ReturnType<typeof makeParts> | null = null;
function makeParts() {
  const shared = <T extends THREE.BufferGeometry>(g: T) => { g.userData.shared = true; return g; };
  const rune = shared(new THREE.PlaneGeometry(1.15, 1.15)); rune.rotateX(-Math.PI / 2);
  const ring = shared(new THREE.TorusGeometry(.56, .025, 5, 32)); ring.rotateX(Math.PI / 2);
  const column = shared(new THREE.CylinderGeometry(.5, .56, 1.5, 24, 1, true));
  return {
    rune, ring, column,
    runeMat: markShared(new THREE.MeshBasicMaterial({ map: glyphTexture(), color: WARD, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })),
    columnMat: markShared(new THREE.MeshBasicMaterial({ color: WARD, transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })),
    robe: markShared(new THREE.MeshStandardMaterial({ color: 0x2a2834, roughness: .9, emissive: 0x10302a })),
    face: markShared(new THREE.MeshBasicMaterial({ color: 0x030204 })),
  };
}

/** The ward circle a ware floats in: a rune on the floor, a ring and a faint column of light. */
function wardCircle() {
  const P = parts ??= makeParts(), g = new THREE.Group();
  const rune = new THREE.Mesh(P.rune, P.runeMat); rune.position.y = .02;
  const ring = new THREE.Mesh(P.ring, M.ward); ring.position.y = .03;
  const column = new THREE.Mesh(P.column, P.columnMat); column.position.y = .75;
  g.add(rune, ring, column);
  return g;
}

/** What a ware costs now: the Pedlar's Scale takes 30% off (a focus left in a broken circle stays free). */
const priceNow = (w: WareSpot) => w.price && player.stats.effects.has('pedlar') ? Math.max(1, Math.round(w.price * CFG.artifacts.pedlar.priceMul)) : w.price;

/** A floating price: an obol and the number, pale green when the Pedlar's Scale has lowered it. One texture per
    price, kept for the whole session. */
const tagTex = new Map<string, THREE.CanvasTexture>();
export function coinTag(price: number, lowered = false) {
  const key = price + (lowered ? 'l' : '');
  let tex = tagTex.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(24, 28, 3, 28, 32, 22);
    grad.addColorStop(0, '#ffe7a0'); grad.addColorStop(1, '#a8762a');
    g.fillStyle = 'rgba(10,8,6,.75)'; g.beginPath(); g.arc(30, 32, 23, 0, 7); g.fill();
    g.fillStyle = grad; g.beginPath(); g.arc(30, 32, 19, 0, 7); g.fill();
    g.strokeStyle = '#6a4a18'; g.lineWidth = 2; g.beginPath(); g.arc(30, 32, 12, 0, 7); g.stroke();
    g.font = 'bold 40px "Alegreya Sans", sans-serif'; g.textBaseline = 'middle'; g.lineWidth = 6;
    g.strokeStyle = 'rgba(10,8,6,.85)'; g.strokeText(String(price), 60, 34);
    g.fillStyle = lowered ? '#c4ecae' : '#f0d9b4'; g.fillText(String(price), 60, 34);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tagTex.set(key, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(.9, .45, 1); return s;
}

/** The shade: a hooded, footless figure with pale eyes, a lantern in one hand and a ward ring binding it
    to the floor (placeholder shapes until a Tripo model). */
function makeShade() {
  const P = parts ??= makeParts(), g = new THREE.Group(), body = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.ConeGeometry(.44, 1.2, 12, 1, true), P.robe); robe.position.y = .72;
  const hood = new THREE.Mesh(new THREE.SphereGeometry(.25, 14, 10), P.robe); hood.position.y = 1.42; hood.scale.set(1, 1.15, 1);
  const face = new THREE.Mesh(new THREE.CircleGeometry(.15, 16), P.face); face.position.set(0, 1.4, .2);
  const eyes = [-.065, .065].map(x => { const e = glow(0xb8fff0, .32, 1); e.position.set(x, 1.43, .24); return e; });
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, .5, 8), P.robe); arm.position.set(.34, 1.02, .12); arm.rotation.z = -.5;
  const lamp = new THREE.Group(); lamp.position.set(.52, .72, .22);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.09, .08, 4), M.iron); cap.position.y = .12; cap.rotation.y = Math.PI / 4;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), basicMat(0xffc36a)); flame.scale.y = 1.5;
  lamp.add(cap, flame, glow(0xffb050, .9, .8));
  const aura = glow(0x6fe0c8, 2.8, .38); aura.position.y = .9;
  body.add(robe, hood, face, ...eyes, arm, lamp, aura);
  const bind = new THREE.Mesh(new THREE.TorusGeometry(.5, .025, 5, 28), M.ward); bind.rotation.x = Math.PI / 2; bind.position.y = .03;
  g.add(body, bind, blob(1.2)); g.scale.setScalar(1.15);
  g.userData = { body, eyes };
  return g;
}

/* ---------- the shop ---------- */

/** Stock a merchant's room: the shade at the back, the wares in a row in front of him. */
export function buildShop(room: Room) {
  const def = room.plan.artifact ? offerGuaranteed('merchant') : null;
  const wares = rollWares(G.run.loot, !!def);
  room.wares = wares.map((ware, i) => {
    const x = room.cx + (i - (wares.length - 1) / 2) * C.spacing, z = room.cz + C.waresAt;
    const g = new THREE.Group(); g.position.set(x - room.cx, 0, z - room.cz);
    const circle = wardCircle();
    const item = ware === 'artifact' ? makeArtifactVisual(def!) : itemVisual(ware);
    if (ware !== 'artifact') item.scale.multiplyScalar(1.35);
    const price = priceOf(ware), tag = coinTag(price); tag.position.y = 1.85;
    g.add(circle, item, tag); room.group.add(g);
    return { ware, def: ware === 'artifact' ? def! : undefined, price, x, z, g, item, circle, tag, tagPrice: price, sold: false, armed: true };
  });
  const shade = makeShade(); shade.position.set(0, 0, C.shadeAt); room.group.add(shade); room.shade = shade;
  room.rocks.push({ x: room.cx, z: room.cz + C.shadeAt, hx: .42, hz: .42, hp: Infinity, breakable: false });
}

function refuse(w: WareSpot, msg: string) {
  toast(msg, 3.2); Sfx.refuse();
  if (w.circle) burst(w.x, .2, w.z, WARD, 6, 1.2, .04);
}

/** Pay for a ware (or refuse), break its ward and hand it over. A focus bought leaves the old one in the
    empty circle, free to take back. */
function buy(w: WareSpot) {
  if (w.ware !== 'artifact') {
    const v = dropValue(w.ware);
    if (v.hearts && player.hp >= player.maxHp) return refuse(w, STR.toast.wareWhole);
    if (v.mana && player.mana >= player.stats.maxMana) return refuse(w, STR.toast.wareBrimming);
    const res = RESOURCES.find(k => v[k]);
    if (res && player[res] >= LOOT.cap) return refuse(w, STR.toast.wareFull);
  }
  const price = priceNow(w);
  if (player.coins < price) return refuse(w, STR.toast.tooPoor(price, player.coins));
  if (price) { giveResources({ coins: -price }); Sfx.purchase(); }
  for (const part of [w.circle, w.tag]) if (part) { w.g.remove(part); disposeTree(part); }
  if (w.circle) burst(w.x, .6, w.z, WARD, 16, 2.2, .045);
  w.circle = w.tag = undefined;
  if (w.def) {
    const replaced = grantArtifact(w.def);
    if (replaced) { // a focus: the old one floats where the new one was
      w.g.remove(w.item); disposeTree(w.item);
      w.def = replaced; w.price = 0; w.armed = false; w.item = makeArtifactVisual(replaced); w.g.add(w.item);
      toast(STR.toast.focusLeftShop(replaced.name), 3.5);
      return;
    }
  } else {
    const v = dropValue(w.ware as Item);
    if (v.hearts) { player.hp = Math.min(player.maxHp, player.hp + v.hearts); renderHearts(); heroDrink(); }
    else if (v.mana) { gainMana(v.mana); heroDrink(); } else giveResources(v);
    toast(STR.toast.bought(STR.wares[w.ware]), 2.5); itemLore(w.ware as LoreItem);
  }
  w.sold = true; w.g.remove(w.item); disposeTree(w.item);
  renderMinimap();
}

/** Walking into a ware buys it (called every step while playing). */
export function checkWares() {
  for (const w of G.current.wares ?? []) {
    if (w.sold) continue;
    const d = Math.hypot(player.x - w.x, player.z - w.z);
    if (d > player.r + C.reach + .8) { w.armed = true; continue; }
    if (d > player.r + C.reach || !w.armed) continue;
    w.armed = false; buy(w);
  }
}

/** The shade bobs and turns to watch the mage; wares turn over their circles. */
export function updateShop(now: number) {
  const room = G.current;
  if (!room.wares || !room.shade) return;
  const { body, eyes } = room.shade.userData as { body: THREE.Group; eyes: THREE.Sprite[] };
  body.position.y = .08 + Math.sin(now * 1.3) * .05;
  body.rotation.y = Math.atan2(player.x - room.cx, player.z - (room.cz + C.shadeAt));
  for (const e of eyes) e.material.opacity = .75 + Math.sin(now * 7 + e.position.x * 40) * .2;
  for (const w of room.wares) {
    if (w.sold) continue;
    w.item.position.y = (w.def ? 1.05 : .75) + Math.sin(now * 2 + w.x) * .07;
    w.item.rotation.y = w.def || w.ware === 'key' ? now * 1.2 : Math.sin(now * 1.6 + w.x) * .5;
    if (w.circle) w.circle.children[0].rotation.y = now * .4;
    const price = priceNow(w);
    if (w.tag && w.tagPrice !== price) { // the Pedlar's Scale came or went: the tag shows what the ware costs now
      w.g.remove(w.tag); disposeTree(w.tag);
      w.tag = coinTag(price, price < w.price); w.tag.position.y = 1.85; w.g.add(w.tag); w.tagPrice = price;
    }
  }
}
