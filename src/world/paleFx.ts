/* Whether the floor in play is pale (floor 4's ivory and gold: `CFG.paleFx.looks`), where foes' magic is drawn in its
   school's deepened light over an edge in the floor's shadow colour rather than added (added light burnt white there).
   Set with the floor's colours (kitColours.ts); every other floor keeps its own look. A module of its own, light to
   import from the actors, combat and magic. */
import type { FloorLook } from '../types';
import { CFG } from '../config';
import { SCHOOL_LIGHT, deepen } from '../render/arcane';

let pale = false,
  shadow = 0;
/** Whether the floor's foes' magic is drawn rather than added. */
export const paleFx = () => pale;
/** The floor's shadow colour (its grade's), the dark edge that magic drawn on a pale floor stands on. */
export const paleShadow = () => shadow;
/** Take the floor's look: pale or not, and its shadow colour. */
export function setPaleFx(look: FloorLook) {
  pale = CFG.paleFx.looks.includes(look.name);
  shadow = parseInt((look.grade?.shadow ?? '#000000').slice(1), 16);
}
const TONES = new Map<number, number>(
  Object.entries(CFG.paleFx.tones).map(([k, v]) => [SCHOOL_LIGHT[k as keyof typeof SCHOOL_LIGHT], v]),
);
/** A school's light as magic on a pale floor draws it: its own deep tone where `CFG.paleFx.tones` names one (a gold or a
    yellow held dark turns olive), else held at lightness `CFG.paleFx.deep`. */
export const paleTone = (color: number) => TONES.get(color) ?? deepen(color, CFG.paleFx.deep);
