/* Whether the floor in play is pale (floor 4's ivory and gold: `CFG.paleFx.looks`), where foes' magic is drawn in its
   school's deepened light over an edge in the floor's shadow colour rather than added (added light burnt white there).
   Floor 5's dark shore has a switch of its own (`shoreFx`, `CFG.shoreFx`). Both are set with the floor's colours
   (kitColours.ts); every other floor keeps its own look. A module of its own, light to
   import from the actors, combat and magic. */
import type { FloorLook } from '../types';
import { CFG } from '../config';
import { SCHOOL_LIGHT, deepen } from '../render/arcane';
import { bandGlow, paleBlobs } from '../render/materials';

let pale = false,
  shore = false,
  shadow = 0;
/** Whether the floor's foes' magic is drawn rather than added. */
export const paleFx = () => pale;
/** Whether the floor in play is floor 5's dark shore (`CFG.shoreFx.looks`), where foes' magic and what they leave keep
    tones of their own (added frost burnt pale foes white, black and pale ones were lost on its mist and dark water). */
export const shoreFx = () => shore;
/** The floor's shadow colour (its grade's), the dark edge that magic drawn on a pale floor stands on. */
export const paleShadow = () => shadow;
/** Take the floor's look: pale or not, the shore or not, and its shadow colour; the blob shadows held lighter on a pale one. */
export function setPaleFx(look: FloorLook) {
  pale = CFG.paleFx.looks.includes(look.name);
  shore = CFG.shoreFx.looks.includes(look.name);
  shadow = parseInt((look.grade?.shadow ?? '#000000').slice(1), 16);
  paleBlobs(pale ? CFG.paleFx.blob.most : null);
}
const TONES = new Map<number, number>(
  Object.entries(CFG.paleFx.tones).map(([k, v]) => [SCHOOL_LIGHT[k as keyof typeof SCHOOL_LIGHT], v]),
);
/** A school's light as magic on a pale floor draws it: its own deep tone where `CFG.paleFx.tones` names one (a gold or a
    yellow held dark turns olive), else held at lightness `CFG.paleFx.deep`. */
export const paleTone = (color: number) => TONES.get(color) ?? deepen(color, CFG.paleFx.deep);
const STRIP_TONES = new Map<number, number>(
  Object.entries(CFG.paleFx.stripTones).map(([k, v]) => [SCHOOL_LIGHT[k as keyof typeof SCHOOL_LIGHT], v]),
);
/** A strip on a pale floor's tone and strength: its school's own (`CFG.paleFx.stripTones`, Hallow's deep gold read brown
    laid thin over the dark squares), else `paleTone` at the strip's strength. */
export const paleStripTone = (color: number): [number, number] => {
  const own = STRIP_TONES.get(color);
  return own === undefined ? [paleTone(color), CFG.paleFx.strip.alpha] : [own, CFG.paleFx.stripToneAlpha];
};
/** A dark halo drawn behind a pickup or an artifact on a pale floor (`CFG.paleFx.halo`), `size` across round the thing at
    height `y` in its group: in bands of the floor's shadow colour, one material for all (on the ivory a pale thing showed
    only its outline, and its added glow none). It stands `back` below the thing, and is drawn that much higher, so it is
    behind it to the camera, and stays so as an artifact turns. */
export function paleHalo(size: number, y: number) {
  const H = CFG.paleFx.halo,
    tilt = (CFG.camTiltDeg * Math.PI) / 180,
    s = bandGlow(shadow, size, 1, H.rings, true, {});
  s.position.set(0, y - H.back, 0);
  s.center.set(0.5, 0.5 - (H.back * Math.cos(tilt)) / size);
  return s;
}
