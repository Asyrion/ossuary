/* The unfolding (M7 step 9; docs/M7-plan.md, decision 9; GDD: Between runs, the Vigil unfolds; More of the Vigil's magic,
   1): what fills the six rooms behind the Vigil's barred ways (vigil/place.ts opens the ways), each built every waking
   whether its way is open or not (its doorway is walled until it is).
   - **The Cave Mouth** (Ember): its north wall open onto the valleys at morning (daylightLooks.ts's vista, without the
     terrace and the cave's rock); each shade freed raises a house, a terrace, a garden bed or a fall of water on its floor,
     in the order they were freed, and the valleys' light reaches further in with each.
   - **The candle chapel** (Hallow): an altar, and a place for each townsperson's candle; walking up to a freed one's lights
     it for the next descent (its blessing, data/townsfolk.json's `blessing`; one at a time, walked up to again it goes
     out); it burns down with that descent (gifts.ts's `giftsAtStart`).
   - **The garden of the dead** (Verdant): a bed of each reagent; once the embalmer is freed they grow, and walking up to
     one chooses the reagent every descent begins with.
   - **The scrying pool** (Storm), **the practice crypt** (Frost) and **the echoes' gallery** (Umbral) stand ready: a line
     says what each will be (steps 11 and 12 fill them).
   Nothing silent: each room's line the first time it is entered in a waking, a line for each candle and bed. */
import * as THREE from 'three';
import type { Room } from '../types';
import { CFG } from '../config';
import { G, player } from '../state';
import { STR } from '../strings';
import { Sfx } from '../audio/sfx';
import { line } from '../ui/hud';
import { burst } from '../combat/fx';
import { glow } from '../render/materials';
import { mulberry } from '../rng';
import { candleStandLook } from '../world/fireLooks';
import { buildVista, type Vista } from '../world/daylightLooks';
import { REAGENTS, type ReagentId } from '../items/alchemyData';
import { SHADE_IDS, shade } from './shadeData';
import { VIGIL, roomIndex } from './vigilMap';
import { setBlessing, setGarden, vigil } from './save';
import { block, keep, middle } from './tiles';
import { altarLook, caveLook, coldHolderLook, gardenBedLook } from './unfoldLooks';
import { blessingWords } from './gifts';

const C = () => CFG.vigil.unfold;
const U = VIGIL.unfold;
const nameOf = (id: string) => STR.shades.names[id] ?? id;
interface Candle {
  id: string;
  x: number;
  z: number;
  freed: boolean;
  flames: THREE.Object3D | null;
  armed: boolean;
  said: boolean;
}
interface Bed {
  id: ReagentId;
  x: number;
  z: number;
  mark: THREE.Sprite;
  armed: boolean;
}
interface Here {
  cave: { room: Room; vista: Vista | null; falls: THREE.Texture[]; built: number; deep: number };
  chapel: { room: Room; candles: Candle[] };
  garden: { room: Room; beds: Bed[]; tended: boolean; said: boolean };
  said: Set<Room>;
  t: number;
}
let here: Here | null = null;
const roomOf = (name: string) => G.rooms[roomIndex(VIGIL, name)];

/** Furnish the rooms behind the barred ways (from vigil/place.ts's `furnishVigil`, before the walls). */
export function furnishUnfold() {
  const v = vigil();
  // the Cave Mouth: its north wall kept bare (it opens onto the valleys), and what the freed have built
  const cr = roomOf(U.cave.room);
  keep(cr, 'n', { at: [0, 0], size: [cr.template.w, 1] });
  const built = Math.min(v.freed.length, U.cave.spots.length),
    falls: THREE.Texture[] = [];
  U.cave.spots.slice(0, built).forEach(([c, r, kind], k) => {
    const g = caveLook(kind, cr.look, k),
      m = middle(cr, { at: [c, r] });
    g.position.set(m.x - cr.cx, 0, m.z - cr.cz);
    cr.group.add(g);
    block(cr, { at: [c, r] });
    const tex = g.userData.parts?.tex as THREE.Texture | undefined;
    if (tex && !falls.includes(tex)) falls.push(tex);
  });
  // the valleys' light laid on the floor from the open edge, reaching further in with each one freed (in steps, as the
  // pixel look's light is; added to what is there)
  const L = C().caveLight,
    deep = Math.min(cr.template.h, L.depth + L.deeper * v.freed.length),
    bands = 4;
  const geo = new THREE.PlaneGeometry(cr.template.w, deep, 1, bands).rotateX(-Math.PI / 2),
    pos = geo.attributes.position,
    col: number[] = [],
    warm = new THREE.Color(0xffd8a0);
  for (let i = 0; i < pos.count; i++) {
    const f = Math.round((1 - (pos.getZ(i) + deep / 2) / deep) * bands) / bands;
    col.push(warm.r * f * L.strength, warm.g * f * L.strength, warm.b * f * L.strength);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const light = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  light.position.set(0, 0.02, cr.bounds.minZ + deep / 2 - cr.cz);
  cr.group.add(light);
  // the candle chapel: the altar, and a place for each townsperson's candle
  const ch = roomOf(U.chapel.room),
    alt = altarLook(ch.look),
    am = middle(ch, { at: U.chapel.altar, size: U.chapel.size });
  alt.position.set(am.x - ch.cx, 0, ch.bounds.minZ - ch.cz);
  ch.group.add(alt);
  block(ch, { at: U.chapel.altar, size: U.chapel.size });
  keep(ch, 'n', { at: U.chapel.altar, size: U.chapel.size });
  const candles: Candle[] = SHADE_IDS.map((id, k) => {
    const [c, r] = U.chapel.candles[id],
      m = middle(ch, { at: [c, r] }),
      freed = v.freed.includes(id);
    let flames: THREE.Object3D | null = null,
      g: THREE.Object3D;
    if (freed) {
      const s = candleStandLook(mulberry(k + 3), ch.look.torch);
      g = s.group;
      flames = s.parts.flames;
      flames.visible = v.blessing === id;
    } else g = coldHolderLook(ch.look);
    g.position.set(m.x - ch.cx, 0, m.z - ch.cz);
    ch.group.add(g);
    block(ch, { at: [c, r] });
    if (freed) {
      const n = glow(new THREE.Color(shade(id).light).getHex(), 0.5, 0.45);
      n.position.set(m.x - ch.cx, 0.12, m.z - ch.cz + 0.35);
      ch.group.add(n);
    } // (its light at its foot: whose candle it is)
    return { id, x: m.x, z: m.z, freed, flames, armed: true, said: false };
  });
  // the garden of the dead: a bed of each reagent, growing once the embalmer tends it
  const gr = roomOf(U.garden.room),
    tended = v.freed.includes('embalmer');
  const beds: Bed[] = (Object.entries(U.garden.beds) as [ReagentId, [number, number]][]).map(([id, [c, r]], k) => {
    const g = gardenBedLook(REAGENTS[id].color, tended, k * 31 + 7),
      m = middle(gr, { at: [c, r] });
    g.position.set(m.x - gr.cx, 0, m.z - gr.cz);
    gr.group.add(g);
    block(gr, { at: [c, r] });
    const mark = g.userData.parts.mark as THREE.Sprite;
    mark.material.opacity = tended && v.garden === id ? 0.75 : tended ? 0.2 : 0;
    return { id, x: m.x, z: m.z, mark, armed: true };
  });
  here = {
    cave: { room: cr, vista: null, falls, built, deep },
    chapel: { room: ch, candles },
    garden: { room: gr, beds, tended, said: false },
    said: new Set(),
    t: 0,
  };
}

/** Every room's walls are up (flow.ts's `buildVigil`): the Cave Mouth's north wall is taken down to the valleys. */
export function vigilWalled() {
  if (!here) return;
  const r = here.cave.room;
  r.group.updateMatrixWorld(true);
  for (const o of r.group.children) {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.position.y < 0.2) continue;
    const box = new THREE.Box3().setFromObject(m),
      z0 = box.min.z + r.cz - r.group.position.z,
      z1 = box.max.z + r.cz - r.group.position.z;
    if (z1 < r.bounds.minZ + 0.05)
      o.visible = false; // (the north wall's boxes: their colliders stay)
    else if (z0 < r.bounds.minZ - 0.05) {
      const cut = r.bounds.minZ - z0;
      o.scale.z = (z1 - z0 - cut) / (z1 - z0);
      o.position.z += cut / 2;
    } // (the side walls end at the floor's edge, not out in the sky)
  }
  const vista = buildVista({ terrace: false, cave: false });
  vista.root.position.set(0, 0, r.bounds.minZ - 1 - r.cz);
  r.group.add(vista.root);
  here.cave.vista = vista;
}

/** Each step at the Vigil (vigil/place.ts's `updateVigil`): the valleys' mist and water, each room's line the first time
    it is entered, and what the mage walks up to in the chapel and the garden. */
export function updateUnfold(dt: number) {
  if (!here) return;
  const h = here;
  h.t += dt;
  const vista = h.cave.vista;
  if (vista) {
    for (const m of vista.mists) {
      m.x += m.speed * CFG.daylight.mist * dt;
      m.m.position.x = Math.sin(m.x) * 1.4;
    }
    vista.fall.offset.y += dt * CFG.daylight.fall;
  }
  for (const t of h.cave.falls) t.offset.y += dt * C().fall;
  if (G.state !== 'play' || G.trans) return;
  const room = G.current;
  if (!h.said.has(room)) {
    const l = roomLine(room);
    if (l !== null) {
      h.said.add(room);
      if (l) line(l, 5);
    }
  }
  const reach = C().reach,
    rearm = reach + CFG.vigil.place.rearm;
  if (room === h.chapel.room)
    for (const c of h.chapel.candles) {
      const d = Math.hypot(player.x - c.x, player.z - c.z);
      if (d > rearm) c.armed = true;
      if (d < reach && c.armed) {
        c.armed = false;
        touchCandle(c);
      }
    }
  if (room === h.garden.room)
    for (const b of h.garden.beds) {
      const d = Math.hypot(player.x - b.x, player.z - b.z);
      if (d > rearm) b.armed = true;
      if (d < reach && b.armed) {
        b.armed = false;
        touchBed(b);
      }
    }
}
/** What a room behind a barred way says the first time it is entered in a waking ('' for nothing; null: not one of them). */
function roomLine(room: Room): string | null {
  const h = here!,
    S = STR.vigil.unfold,
    name = VIGIL.rooms[G.rooms.indexOf(room)]?.name;
  if (room === h.cave.room) return S.cave(h.cave.built);
  if (room === h.chapel.room) return h.chapel.candles.some((c) => c.freed) ? '' : S.chapelEmpty;
  if (room === h.garden.room) return h.garden.tended ? '' : S.gardenFallow;
  return name === 'pool' ? S.pool : name === 'practice' ? S.practice : name === 'gallery' ? S.gallery : null;
}

/** A candle walked up to: a freed one's lit for the next descent (the others put out), or put out again. */
function touchCandle(c: Candle) {
  const S = STR.vigil.unfold;
  if (!c.freed) {
    if (!c.said) {
      c.said = true;
      line(S.notFreed, 4);
    }
    return;
  }
  if (vigil().blessing === c.id) {
    lightBlessing(null);
    return;
  }
  lightBlessing(c.id);
}
/** Light `id`'s candle in the chapel (its blessing goes with the next descent), or put out the one lit (null). */
export function lightBlessing(id: string | null) {
  const was = vigil().blessing;
  setBlessing(id);
  for (const c of here?.chapel.candles ?? []) if (c.flames) c.flames.visible = c.id === id;
  const c = here?.chapel.candles.find((k) => k.id === (id ?? was));
  if (id) {
    line(STR.vigil.unfold.light(nameOf(id), blessingWords(id)), 6);
    if (c) {
      Sfx.at(c.x, c.z).kindle();
      burst(c.x, 1, c.z, 0xffd070, 8, 1, 0.03);
    }
  } else if (was) {
    line(STR.vigil.unfold.snuff(nameOf(was)), 3);
    if (c) Sfx.at(c.x, c.z).snuff();
  }
}
/** A bed walked up to: its reagent chosen for every descent, while the embalmer tends the garden. */
function touchBed(b: Bed) {
  const h = here!;
  if (!h.garden.tended) {
    if (!h.garden.said) {
      h.garden.said = true;
      line(STR.vigil.unfold.gardenFallow, 4);
    }
    return;
  }
  chooseGarden(b.id);
}
/** The garden's reagent chosen (or none). */
export function chooseGarden(id: ReagentId | null) {
  setGarden(id);
  for (const b of here?.garden.beds ?? [])
    b.mark.material.opacity = here!.garden.tended ? (b.id === id ? 0.75 : 0.2) : 0;
  const b = here?.garden.beds.find((k) => k.id === id);
  if (id) {
    line(STR.vigil.unfold.garden(REAGENTS[id].name), 5);
    if (b) {
      Sfx.at(b.x, b.z).reagent();
      burst(b.x, 0.5, b.z, new THREE.Color(REAGENTS[id].color).getHex(), 10, 1.2, 0.03);
    }
  }
}

/** Leave the Vigil: forget it. */
export function clearUnfold() {
  here = null;
}

/** For the dev menu and the tests: what the Cave Mouth holds, the candles and the garden. */
export function unfoldInfo() {
  const v = vigil();
  if (!here) return { here: false as const, parts: [...v.parts], blessing: v.blessing, garden: v.garden };
  const h = here;
  return {
    here: true as const,
    parts: [...v.parts],
    blessing: v.blessing,
    garden: v.garden,
    cave: { built: h.cave.built, open: !!h.cave.vista, light: +h.cave.deep.toFixed(2) },
    candles: h.chapel.candles.map((c) => ({ id: c.id, x: c.x, z: c.z, freed: c.freed, lit: !!c.flames?.visible })),
    beds: h.garden.beds.map((b) => ({ id: b.id, x: b.x, z: b.z, chosen: v.garden === b.id })),
    tended: h.garden.tended,
  };
}
