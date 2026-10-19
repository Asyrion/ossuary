/* Themed rooms (docs/archive/M3.6-plan.md): a template may carry a `theme`, a kind of place in the dungeon (a
   chapel nave, an ossuary, a scriptorium...). The theme dresses the room (torch light, floor stains, what the wall's
   niches hold, scatter on the floor, how its rocks and tombs look) and gives it one twist to learn. Pure (no three.js):
   the generator, the room builder and the tests use it; data/themes.json holds the themes, data/floors.json which
   floors draw on them and how often. */
import themesData from '../../data/themes.json';
import type { FloorLook } from '../types';

/** What a theme's room does differently:
    risingBones  bone piles burst and the floor's walker comes out, if the fight drags on (the ossuary);
    pages        scroll heaps sometimes hide a torn grimoire page (the scriptorium);
    sleepers     its foes sleep until hurt, or until the mage comes close (the pilgrims' rest);
    caveIn       a glyph's blast brings more of the ceiling down (the collapsed crypt);
    blessing     every candle stand lit blesses the mage's next casts (the chapel nave);
    rime         the floor is slick with rime, and the foes wait frozen in ice until struck or thawed (the frozen
                 mausoleum);
    guardians    its foes stand still as statues among the gold, and wake all at once when the mage takes an obol
                 there (or strikes one) (the gilded treasury);
    drowned      while the fight lasts, the drowned climb out of its river now and then, until the river is frozen
                 (the ferry landing);
    garden       the garden grows: Overgrown holds longer on its foes (the overgrown garden). */
export type Twist =
  'none' | 'risingBones' | 'pages' | 'sleepers' | 'caveIn' | 'blessing' | 'rime' | 'guardians' | 'drowned' | 'garden';
export const TWISTS: Twist[] = [
  'none',
  'risingBones',
  'pages',
  'sleepers',
  'caveIn',
  'blessing',
  'rime',
  'guardians',
  'drowned',
  'garden',
];
/** Dressing scattered over free floor, which never blocks (spilled obols, lamps on poles, flowers). */
export type ScatterKind =
  | 'candles'
  | 'pages'
  | 'bones'
  | 'bedrolls'
  | 'embers'
  | 'moss'
  | 'glowmoss'
  | 'pebbles'
  | 'daylight'
  | 'stains'
  | 'rime'
  | 'leaves'
  | 'ropes'
  | 'coins'
  | 'lamps'
  | 'flowers'
  | 'verdigris'
  | 'webs';
export const SCATTER_KINDS: ScatterKind[] = [
  'candles',
  'pages',
  'bones',
  'bedrolls',
  'embers',
  'moss',
  'glowmoss',
  'pebbles',
  'daylight',
  'stains',
  'rime',
  'leaves',
  'ropes',
  'coins',
  'lamps',
  'flowers',
  'verdigris',
  'webs',
];

type LookPatch = { [K in keyof FloorLook]?: Partial<FloorLook[K]> };
export interface ThemeDef {
  id: string;
  name: string;
  twist: Twist;
  /** Changes to the floor's look in this room. */ look?: LookPatch;
  /** How many of each dressing to scatter over its floor. */ scatter: Partial<Record<ScatterKind, number>>;
  /** Rocks as stalagmites, tombs as embalmers' slabs. */ rock?: 'rock' | 'dripstone';
  tomb?: 'tomb' | 'slab';
  /** The skulls in its niches watch: their eyes glow in the colour of the last spell cast there. */ watchers?: boolean;
}

export const THEME_DEFS = themesData as ThemeDef[];
export const THEMES = new Map(THEME_DEFS.map((t) => [t.id, t]));

/** A floor's look, changed where the theme says. */
export function themedLook(look: FloorLook, theme?: ThemeDef): FloorLook {
  if (!theme?.look) return look;
  const out = { ...look } as Record<string, unknown>;
  for (const [k, patch] of Object.entries(theme.look))
    out[k] = { ...(look as unknown as Record<string, object>)[k], ...(patch as object) };
  return out as unknown as FloorLook;
}

/** Problems with the themes, the templates that name them and the floors that draw on them; empty when valid. */
export function validateThemes(
  templates: { id: string; theme?: string; types: string[] }[],
  floors: { themes?: Record<string, number> }[],
  defs = THEME_DEFS,
): string[] {
  const errs: string[] = [],
    ids = new Set<string>();
  for (const t of defs) {
    if (ids.has(t.id)) errs.push(`theme "${t.id}" is listed twice`);
    ids.add(t.id);
    if (!t.name) errs.push(`theme "${t.id}" needs a name`);
    if (!TWISTS.includes(t.twist)) errs.push(`theme "${t.id}" has unknown twist "${t.twist}"`);
    for (const k of Object.keys(t.scatter ?? {}))
      if (!SCATTER_KINDS.includes(k as ScatterKind)) errs.push(`theme "${t.id}" scatters unknown "${k}"`);
    const count = templates.filter((d) => d.theme === t.id).length;
    if (count < 2) errs.push(`theme "${t.id}" has ${count} templates, needs 2 or more`);
  }
  for (const d of templates) {
    if (d.theme === undefined) continue;
    if (!ids.has(d.theme)) errs.push(`template "${d.id}" names unknown theme "${d.theme}"`);
    if (!d.types.includes('normal')) errs.push(`template "${d.id}": only fights are themed`);
  }
  floors.forEach((f, i) => {
    for (const id of Object.keys(f.themes ?? {}))
      if (!ids.has(id)) errs.push(`floor ${i + 1} draws on unknown theme "${id}"`);
  });
  return errs;
}
