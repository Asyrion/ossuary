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
import { M, disposeTree, markShared } from '../render/materials';
import { crowWareLook, shadeLook } from '../world/specialLooks';
import { glyphTexture } from '../render/textures';
import { burst } from '../combat/fx';
import { renderMinimap, toast, itemLore } from '../notify';
import { WARD_COLOR as WARD } from '../world/rooms';
import { grantArtifact, makeArtifactVisual, offerGuaranteed } from './artifacts';
import { cantUse, giveResources, itemVisual, useItem } from './pickups';
import { COMMON_REAGENTS, REAGENTS, pickPotion, type PotionId, type ReagentId } from './alchemyData';
import { addPotion, addReagent, potionName } from './potions';
import { soulsHere } from './souls';
import type { LoreItem } from '../types';
import { LOOT, priceOf, rollWares, type Item, type Ware } from './loot';
import type { ArtifactDef } from './artifactData';
import { crowRefuses, crowTells } from './wanderer';
import { addRune, dealRune, runeHere } from '../magic/runes';
import { rune, type RuneId } from '../magic/runeData';

const C = CFG.merchant;

/* ---------- looks ---------- */

let parts: ReturnType<typeof makeParts> | null = null;
function makeParts() {
  const shared = <T extends THREE.BufferGeometry>(g: T) => {
    g.userData.shared = true;
    return g;
  };
  const rune = shared(new THREE.PlaneGeometry(1.15, 1.15));
  rune.rotateX(-Math.PI / 2);
  const ring = shared(new THREE.TorusGeometry(0.56, 0.025, 5, 32));
  ring.rotateX(Math.PI / 2);
  const column = shared(new THREE.CylinderGeometry(0.5, 0.56, 1.5, 24, 1, true));
  return {
    rune,
    ring,
    column,
    runeMat: markShared(
      new THREE.MeshBasicMaterial({
        map: glyphTexture(),
        color: WARD,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
    columnMat: markShared(
      new THREE.MeshBasicMaterial({
        color: WARD,
        transparent: true,
        opacity: 0.09,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    ),
  };
}

/** The ward circle a ware floats in: a rune on the floor, a ring and a faint column of light. */
function wardCircle() {
  const P = (parts ??= makeParts()),
    g = new THREE.Group();
  const rune = new THREE.Mesh(P.rune, P.runeMat);
  rune.position.y = 0.02;
  const ring = new THREE.Mesh(P.ring, M.ward);
  ring.position.y = 0.03;
  const column = new THREE.Mesh(P.column, P.columnMat);
  column.position.y = 0.75;
  g.add(rune, ring, column);
  return g;
}

/** What a ware costs now: the Pedlar's Scale takes 30% off (a focus left in a broken circle stays free). */
export const priceNow = (w: WareSpot) => {
  const dear =
    (w.ware === 'heart' || w.ware === 'halfHeart') && player.stats.effects.has('dearHearts')
      ? CFG.artifacts.gravemonger.heartPriceMul
      : 1; // (the Gravemonger's price)
  const p = w.price * dear;
  return p && player.stats.effects.has('pedlar') ? Math.max(1, Math.round(p * CFG.artifacts.pedlar.priceMul)) : p;
};

/** A floating price: an obol and the number, pale green when the Pedlar's Scale has lowered it. One texture per
    price, kept for the whole session. */
const tagTex = new Map<string, THREE.CanvasTexture>();
export function coinTag(price: number, lowered = false) {
  const key = price + (lowered ? 'l' : '');
  let tex = tagTex.get(key);
  if (!tex) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(24, 28, 3, 28, 32, 22);
    grad.addColorStop(0, '#ffe7a0');
    grad.addColorStop(1, '#a8762a');
    g.fillStyle = 'rgba(10,8,6,.75)';
    g.beginPath();
    g.arc(30, 32, 23, 0, 7);
    g.fill();
    g.fillStyle = grad;
    g.beginPath();
    g.arc(30, 32, 19, 0, 7);
    g.fill();
    g.strokeStyle = '#6a4a18';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(30, 32, 12, 0, 7);
    g.stroke();
    g.font = 'bold 40px "Alegreya Sans", sans-serif';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(10,8,6,.85)';
    g.strokeText(String(price), 60, 34);
    g.fillStyle = lowered ? '#c4ecae' : '#f0d9b4';
    g.fillText(String(price), 60, 34);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tagTex.set(key, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(0.9, 0.45, 1);
  return s;
}

/* ---------- the shop ---------- */

/** Stock a merchant's room: the shade at the back, the wares in a row in front of him. */
export function buildShop(room: Room) {
  const def = room.plan.artifact ? offerGuaranteed('merchant') : null;
  const wares = rollWares(G.run.loot, !!def, LOOT, soulsHere());
  if (runeHere('merchant')) wares.push('rune'); // (M6 step 8: half the shops lay a rune beside the rest, on the runes' own stream)
  room.wares = wares.map((ware, i) =>
    layWare(
      room,
      ware,
      ware === 'artifact' ? def! : undefined,
      room.cx + (i - (wares.length - 1) / 2) * C.spacing,
      room.cz + C.waresAt,
      priceOf(ware),
    ),
  );
  const shade = shadeLook(WARD); // (the hooded, footless shade bound to its ward ring: specialLooks.ts)
  shade.position.set(0, 0, C.shadeAt);
  room.group.add(shade);
  room.shade = shade;
  room.rocks.push({ x: room.cx, z: room.cz + C.shadeAt, hx: 0.42, hz: 0.42, hp: Infinity, breakable: false });
}

/** A ware in its ward circle at (x, z), priced `price` (the shade's, and M4.2's Wandering Merchant's). */
export function layWare(
  room: Room,
  ware: Ware,
  def: ArtifactDef | undefined,
  x: number,
  z: number,
  price: number,
): WareSpot {
  const rune = ware === 'rune' ? dealRune() : undefined; // (M6 step 8: which rune, from the run's runes stream)
  const g = new THREE.Group();
  g.position.set(x - room.cx, 0, z - room.cz);
  const circle = wardCircle();
  // (M5: which potion or reagent it is, dealt from the shop's stream)
  const potion = ware === 'potion' ? pickPotion(G.run.loot) : undefined,
    reagent = ware === 'reagent' ? COMMON_REAGENTS[G.run.loot.int(0, COMMON_REAGENTS.length - 1)] : undefined;
  const item =
    ware === 'artifact'
      ? makeArtifactVisual(def!)
      : ware === 'map' || ware === 'secret'
        ? crowWareLook(ware)
        : itemVisual(ware, potion ?? reagent ?? rune);
  if (ware !== 'artifact') item.scale.multiplyScalar(1.35);
  const tag = coinTag(price);
  tag.position.y = 1.85;
  g.add(circle, item, tag);
  room.group.add(g);
  return {
    ware,
    def,
    price,
    x,
    z,
    g,
    item,
    circle,
    tag,
    tagPrice: price,
    sold: false,
    armed: true,
    potion,
    reagent,
    rune,
  };
}

/** What he says when the mage couldn't use a ware now. */
const REFUSE = {
  whole: () => STR.toast.wareWhole,
  brimming: () => STR.toast.wareBrimming,
  full: () => STR.toast.wareFull,
  souls: () => STR.toast.wareSouls,
  idle: () => STR.toast.wareIdle,
  belt: () => STR.alchemy.full,
};
function refuse(w: WareSpot, msg: string) {
  toast(msg, 3.2);
  Sfx.refuse();
  if (w.circle) burst(w.x, 0.2, w.z, WARD, 6, 1.2, 0.04);
}

/** Why he would refuse ware `w` now, as he says it (null: he would sell it): the crow has nothing to tell (the Wandering
    Merchant's, M4.2), the mage couldn't use it now, or hasn't the obols. The ware's panel says it before the mage walks in. */
export function refusal(w: WareSpot): string | null {
  if (w.ware === 'map' || w.ware === 'secret') return crowRefuses(w.ware);
  if (w.ware !== 'artifact') {
    const why = cantUse(w.ware);
    if (why) return REFUSE[why]();
  }
  const price = priceNow(w);
  return player.coins < price ? STR.toast.tooPoor(price, player.coins) : null;
}

/** Pay for a ware (or refuse), break its ward and hand it over. A focus bought leaves the old one in the
    empty circle, free to take back. */
function buy(w: WareSpot) {
  const no = refusal(w);
  if (no) return refuse(w, no);
  const price = priceNow(w);
  if (price) {
    giveResources({ coins: -price });
    Sfx.purchase();
  }
  for (const part of [w.circle, w.tag])
    if (part) {
      w.g.remove(part);
      disposeTree(part);
    }
  if (w.circle) burst(w.x, 0.6, w.z, WARD, 16, 2.2, 0.045);
  w.circle = w.tag = undefined;
  if (w.def) {
    const replaced = grantArtifact(w.def);
    if (replaced) {
      // a focus: the old one floats where the new one was
      w.g.remove(w.item);
      disposeTree(w.item);
      w.def = replaced;
      w.price = 0;
      w.armed = false;
      w.item = makeArtifactVisual(replaced);
      w.g.add(w.item);
      toast(STR.toast.focusLeftShop(replaced.name), 3.5);
      return;
    }
  } else if (w.ware === 'map' || w.ware === 'secret') crowTells(w.ware);
  else if (w.potion) {
    addPotion(w.potion as PotionId);
    toast(STR.toast.bought(potionName(w.potion as PotionId)), 2.5);
  } // (M5: into the belt; its card the first time)
  else if (w.reagent) {
    addReagent(w.reagent as ReagentId);
    toast(STR.toast.bought(REAGENTS[w.reagent as ReagentId].name), 2.5);
  } else if (w.rune) {
    addRune(w.rune as RuneId);
    toast(STR.toast.bought(rune(w.rune as RuneId).name), 2.5);
  } // (M6 step 8: into the pouch; its card the first time)
  else {
    useItem(w.ware as Item);
    toast(STR.toast.bought(STR.wares[w.ware]), 2.5);
    itemLore(w.ware as LoreItem);
  }
  w.sold = true;
  w.g.remove(w.item);
  disposeTree(w.item);
  renderMinimap();
}

/** Walking into a ware buys it (called every step while playing). */
export function checkWares() {
  for (const w of G.room.current.wares ?? []) {
    if (w.sold) continue;
    const d = Math.hypot(player.x - w.x, player.z - w.z);
    if (d > player.r + C.reach + 0.8) {
      w.armed = true;
      continue;
    }
    if (d > player.r + C.reach || !w.armed) continue;
    w.armed = false;
    buy(w);
  }
}

/** The shade bobs and turns to watch the mage; wares turn over their circles. */
export function updateShop(now: number) {
  const room = G.room.current;
  if (!room.wares) return;
  if (room.shade) {
    // (the Wandering Merchant's wares have no shade over them, M4.2)
    const { body, eyes } = room.shade.userData as { body: THREE.Group; eyes: THREE.Sprite[] };
    body.position.y = 0.08 + Math.sin(now * 1.3) * 0.05;
    body.rotation.y = Math.atan2(player.x - room.cx, player.z - (room.cz + C.shadeAt));
    for (const e of eyes) e.material.opacity = 0.75 + Math.sin(now * 7 + e.position.x * 40) * 0.2;
  }
  for (const w of room.wares) {
    if (w.sold) continue;
    w.item.position.y = (w.def ? 1.05 : 0.75) + Math.sin(now * 2 + w.x) * 0.07;
    w.item.rotation.y = w.def || w.ware === 'key' ? now * 1.2 : Math.sin(now * 1.6 + w.x) * 0.5;
    if (w.circle) w.circle.children[0].rotation.y = now * 0.4;
    const price = priceNow(w);
    if (w.tag && w.tagPrice !== price) {
      // the Pedlar's Scale came or went: the tag shows what the ware costs now
      w.g.remove(w.tag);
      disposeTree(w.tag);
      w.tag = coinTag(price, price < w.price);
      w.tag.position.y = 1.85;
      w.g.add(w.tag);
      w.tagPrice = price;
    }
  }
}
