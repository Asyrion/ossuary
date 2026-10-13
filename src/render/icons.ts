/* The game's drawn icons as inline SVG: hearts, soul motes, the purse's obol, key and glyph, the spells. They are pictures
   of game things, not HUD state, so the HUD, the lore cards, the inventory and the grimoire pages' textures share them. */
import { spell } from '../magic/spellData';
import { obolIconUrl } from '../items/obolFace';

/** A soul mote's flame (M4.1), and its colours: fill, rim, and the brighter core. */
export const SOUL_PATH =
  'M12 2.8c2.4 3.4 6.3 6.8 6.3 11.3a6.3 6.3 0 0 1-12.6 0c0-2.9 1.5-4.5 2.8-6.1.3 1.7 1.1 2.9 2.3 3.4-.4-3.1 0-5.9 1.2-8.6z';
export const SOUL_HUES = {
  pale: ['#cfe0ff', '#5a6a8a', '#ffffff'],
  black: ['#2a1640', '#a266ff', '#c8a0ff'],
  hallowed: ['#ffe39a', '#9a7a2a', '#fffbe8'],
} as const;
export const soulSvg = (kind: keyof typeof SOUL_HUES) => {
  const [fill, rim, core] = SOUL_HUES[kind];
  return `<svg viewBox="0 0 24 24" class="soul ${kind}"><path d="${SOUL_PATH}" fill="${fill}" stroke="${rim}" stroke-width="1.4"/><ellipse cx="12" cy="15.2" rx="2.3" ry="3" fill="${core}" opacity=".75"/></svg>`;
};
export const HEART_PATH =
  'M12 21.2s-7.6-4.7-9.7-9.3C.8 8.3 3 4.4 6.7 4.4c2.1 0 3.6 1.1 4.4 2.7.8-1.6 2.3-2.7 4.4-2.7 3.7 0 5.9 3.9 4.3 7.5-2.1 4.6-9.8 9.3-9.8 9.3z';
/** How the drawn icons (spells, resources) stroke their lines. */
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/* Placeholder spell icons, drawn in the spell's colour. */
const SPELL_ICONS: Record<string, string> = {
  arc: `<path d="M13 2L5 13h6l-2 9 9-12h-6z" fill="currentColor"/>`,
  lance: `<path d="M3 21L21 3" ${S}/><path d="M14 3h7v7" ${S}/><path d="M5 13c2 1 4 3 5 6" ${S}/>`,
  seal: `<circle cx="12" cy="12" r="8" ${S}/><path d="M12 6c2 3 3 5 0 8-3-3-2-5 0-8z" fill="currentColor"/><path d="M8 17h8" ${S}/>`,
  shards: `<path d="M4 20l4-9 2 5zM12 20l0-11 2 6zM20 20l-4-9-2 5z" fill="currentColor"/>`,
  wall: `<path d="M3 20h18M4 20V9l3-4 3 4v11M10 20V7l3-4 3 4v13M16 20V10l3-3 2 3v10" ${S}/>`,
  mantle: `<circle cx="12" cy="8" r="3" ${S}/><path d="M6 21c0-5 3-8 6-8s6 3 6 8" ${S}/><path d="M3 12l3-2-1 4 3-1M21 12l-3-2 1 4-3-1" ${S}/>`,
  // Hallow and Umbral (M4.1)
  consecrate: `<ellipse cx="12" cy="17" rx="9" ry="3.5" ${S}/><path d="M12 3v9M8 6l2 5M16 6l-2 5" ${S}/>`,
  judgement: `<path d="M9 2h6v12H9z" fill="currentColor"/><path d="M4 20h16M7 17l5 3 5-3" ${S}/>`,
  wardlight: `<circle cx="12" cy="12" r="7" ${S} stroke-dasharray="2 3"/><circle cx="12" cy="5" r="2.2" fill="currentColor"/><circle cx="18" cy="15" r="2.2" fill="currentColor"/><circle cx="6" cy="15" r="2.2" fill="currentColor"/>`,
  hexbolt: `<path d="M3 21l7-7" ${S}/><circle cx="14" cy="10" r="5.5" fill="currentColor"/><circle cx="14" cy="10" r="1.8" fill="#120a1c"/>`,
  grasp: `<path d="M7 20v-7M10 20V8M13 20V7M16 20v-9M19 20v-5" ${S}/><path d="M4 21h17" ${S}/>`,
  lantern: `<path d="M12 2v3" ${S}/><path d="M8 7h8l-1 11H9z" ${S}/><path d="M9 20h6" ${S}/><circle cx="12" cy="12.5" r="2.2" fill="currentColor"/>`,
  harvest: `<path d="M5 19c2-8 8-13 15-14c-2 5-6 9-11 10" ${S}/><circle cx="7" cy="8" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/><circle cx="18" cy="14" r="1.6" fill="currentColor"/>`,
  toll: `<circle cx="12" cy="12" r="8" ${S}/><rect x="9.5" y="9.5" width="5" height="5" fill="currentColor"/>`,
  // Verdant (M5)
  thorns: `<path d="M5 21c1-6 4-9 7-11M19 21c-1-6-4-9-7-11M12 21V5" ${S}/><path d="M8 13l-2-1M16 13l2-1M12 9l-2-2M12 9l2-2" ${S}/><path d="M3 21h18" ${S}/>`,
  pollen: `<circle cx="12" cy="13" r="3" fill="currentColor"/><circle cx="6" cy="8" r="1.4" fill="currentColor"/><circle cx="18" cy="7" r="1.6" fill="currentColor"/><circle cx="7" cy="18" r="1.2" fill="currentColor"/><circle cx="17" cy="18" r="1.4" fill="currentColor"/><circle cx="12" cy="4" r="1.1" fill="currentColor"/>`,
  livingwall: `<path d="M3 21h18M6 21v-9M12 21V9M18 21v-8" ${S}/><circle cx="6" cy="9" r="3" ${S}/><circle cx="12" cy="6" r="3.2" ${S}/><circle cx="18" cy="10" r="2.8" ${S}/>`,
};
/** A spell's icon as inline SVG in its colour. */
export function spellIcon(id: string) {
  const def = spell(id);
  return `<svg viewBox="0 0 24 24" style="color:${def.color}" role="img" aria-label="${def.name}"><title>${def.name}: ${def.text}\n\n${def.lore}</title>${SPELL_ICONS[def.icon] ?? SPELL_ICONS.arc}</svg>`;
}

/** A spell's icon as a standalone SVG document in `color` (for drawing onto a canvas, a grimoire page). */
export function spellIconSvg(id: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128" style="color:${color}">${SPELL_ICONS[spell(id).icon] ?? SPELL_ICONS.arc}</svg>`;
}

/* Obol, bone key and glyph icons for the counters under the artifacts. */
export const RES_ICONS = {
  coins: `<circle cx="12" cy="12" r="8" fill="#b8903e" stroke="#5a4418" stroke-width="1.5"/><rect x="10" y="10" width="4" height="4" fill="#3a2a10"/>`,
  keys: `<circle cx="7" cy="12" r="3.6" fill="none" stroke="#e8dcc0" stroke-width="2.2"/><path d="M10.5 12H20M17 12v3.5M20 12v2.5" stroke="#e8dcc0" stroke-width="2.2" stroke-linecap="round"/>`,
  glyphs: `<circle cx="12" cy="12" r="9" fill="#2b2622" stroke="#6b6158" stroke-width="1.2"/><path d="M${Array.from(
    { length: 8 },
    (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI * 6) / 7;
      return `${(12 + Math.cos(a) * 6.3).toFixed(2)} ${(12 + Math.sin(a) * 6.3).toFixed(2)}`;
    },
  ).join('L')}" fill="none" stroke="#ffb04a" stroke-width="1.2" stroke-linejoin="round"/>`,
};

/** The obol's icon inside a 24 × 24 viewBox: the face the obols wear (2026-10-02, the owner's coins), or the drawn coin. */
export function coinIconBody() {
  const url = obolIconUrl();
  return url ? `<image href="${url}" width="24" height="24" style="image-rendering:pixelated"/>` : RES_ICONS.coins;
}
