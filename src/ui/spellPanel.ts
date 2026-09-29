/* A spell described as far as the mage knows it (M3.7, GDD: Spells, Spell knowledge). The panel over a grimoire page and
   the inventory's spells tab share it. Seen: name, school, the one-line effect. Learned: its shape, mana, cooldown,
   damage and statuses. Used: its lore and the reactions it sets off. Upgraded: what changed it (M6). */
import { STR } from '../strings';
import { CFG } from '../config';
import { spellIcon } from './hud';
import { spellCost } from '../magic/cost';
import type { SpellDef } from '../magic/spellData';
import { type Stage, atLeast, reactionsOf } from '../magic/knowledge';

export const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** A panel's head: its icon, name and kind. */
export function head(icon: string, name: string, kind: string, kindIsHtml = false) {
  return `<div class="top">${icon ? `<div class="big">${icon}</div>` : ''}<div><h3>${esc(name)}</h3><p class="kind">${kindIsHtml ? kind : esc(kind)}</p></div></div>`;
}

/** `def` at `stage`, with a note (which slot it is in, that it was given up...). `casts` counts toward knowing it well. */
export function spellSheet(def: SpellDef, stage: Stage, note = '', casts = 0) {
  const I = STR.inv, K = STR.knowledge, learned = atLeast(stage, 'learned'), used = atLeast(stage, 'used');
  const school = `<span style="color:${def.color}">${esc(I.school(STR.schools[def.school]))}</span>`;
  let html = head(spellIcon(def.id), def.name, learned ? `${school} · ${esc(I.shapes[def.shape] ?? def.shape)}` : school, true)
    + `<p class="effect">${esc(def.text)}</p>`;
  if (!learned) return html + (note ? `<p class="note">${esc(note)}</p>` : '') + `<p class="note">${esc(K.seenOnly)}</p>`;
  const cost = Math.round(spellCost(def)), statuses = Object.entries(def.status ?? {});
  html += `<div class="chips">${[I.mana(cost, def.mana), I.cooldown(def.cooldown), def.damage ? I.damage(def.damage) : ''].filter(Boolean).map(t => `<span class="chip">${esc(t)}</span>`).join('')}`
    + statuses.map(([k, v]) => `<span class="chip st-${k}">${esc(I.status[k]?.(v) ?? k)}</span>`).join('') + '</div>'
    + (note ? `<p class="note">${esc(note)}</p>` : '')
    + statuses.map(([k]) => `<p class="note">${esc(I.statusText[k] ?? '')}</p>`).join('');
  if (!used) return html + `<p class="note">${esc(K.castMore(Math.max(1, CFG.knowledge.usedCasts - casts)))}</p>`;
  const sets = reactionsOf(def);
  if (sets.length) html += `<p class="lbl">${esc(K.sets)}</p>` + sets.map(r => `<p class="note">${esc(K.reaction(STR.reactions[r.reaction], STR.schools[r.with], K.reactionText[r.reaction]))}</p>`).join('');
  return html + `<p class="lore">${esc(def.lore)}</p>`; // (upgraded, M6: what changed it goes here)
}
