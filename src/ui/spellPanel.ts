/* A spell described as far as the mage knows it (M3.7, GDD: Spells, Spell knowledge). The panel over a grimoire page and
   the inventory's spells tab share it. Seen: name, school, the one-line effect. Learned: its shape, mana, cooldown,
   damage and statuses (M6 step 5: a status's number as the boons taken make it, and those boons). Used: its lore and the
   reactions it sets off. Upgraded: what changed it (M6). M6 step 7: a slotted spell is shown as its runes make it (the
   numbers runed, the base in brackets), with the runes carved in its slot; Upgraded lists the runes it has borne. */
import { STR } from '../strings';
import { CFG } from '../config';
import { spellIcon } from './hud';
import { spellCost } from '../magic/cost';
import type { SpellDef } from '../magic/spellData';
import { rune, runedDef, type RuneId } from '../magic/runeData';
import { upgradesOf } from '../magic/memory';
import { runeIconImg } from '../items/runeLooks';
import { type Stage, REACTION_IDS, atLeast, reactionSchools, reactionsOf } from '../magic/knowledge';
import type { Reaction } from '../magic/status';
import { reactionsFound, weavesFound } from '../magic/memory';
import { WEAVES, WEAVE_IDS, weavesOf, type WeaveId } from '../magic/weaves';
import type { School, SpellStatus } from '../magic/spellData';
import { SCHOOL_LIGHT } from '../render/arcane';
import { G } from '../state';
import { MAGIC } from '../magic/status';
import { boon, boonText, boonTuning, boonsTouching, statusMul } from '../progression/boonData';

export const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** A panel's head: its icon, name and kind. */
export function head(icon: string, name: string, kind: string, kindIsHtml = false) {
  return `<div class="top">${icon ? `<div class="big">${icon}</div>` : ''}<div><h3>${esc(name)}</h3><p class="kind">${kindIsHtml ? kind : esc(kind)}</p></div></div>`;
}

/** `def` at `stage`, with a note (which slot it is in, that it was given up...). `casts` counts toward knowing it well;
    `runes` are those carved in its slot (M6 step 7). */
export function spellSheet(base: SpellDef, stage: Stage, note = '', casts = 0, runes: readonly RuneId[] = []) {
  const I = STR.inv,
    K = STR.knowledge,
    learned = atLeast(stage, 'learned'),
    used = atLeast(stage, 'used'),
    def = runedDef(base, runes);
  const school = `<span style="color:${def.color}">${esc(I.school(STR.schools[def.school]))}</span>`;
  let html =
    head(spellIcon(def.id), def.name, learned ? `${school} · ${esc(I.shapes[def.shape] ?? def.shape)}` : school, true) +
    `<p class="effect">${esc(def.text)}</p>`;
  if (!learned)
    return html + (note ? `<p class="note">${esc(note)}</p>` : '') + `<p class="note">${esc(K.seenOnly)}</p>`;
  const cost = Math.round(spellCost(def)),
    statuses = Object.entries(def.status ?? {}),
    taken = G.run.boons;
  const chip = (k: string, v: number) => {
    const now = Math.round(v * statusMul(k as SpellStatus, taken) * 10) / 10,
      t = I.status[k]?.(now) ?? k;
    return now === v ? t : I.boosted(t, v);
  };
  const boons = boonsTouching(def, taken);
  const was = (t: string, now: number, then: number) => (now === then ? t : I.boosted(t, then)); // (M6: a rune changed it: the base in brackets)
  html +=
    `<div class="chips">${[
      I.mana(cost, base.mana),
      was(I.cooldown(def.cooldown), def.cooldown, base.cooldown),
      def.damage ? was(I.damage(def.damage), def.damage, base.damage) : '',
    ]
      .filter(Boolean)
      .map((t) => `<span class="chip">${esc(t)}</span>`)
      .join('')}` +
    statuses.map(([k, v]) => `<span class="chip st-${k}">${esc(chip(k, v))}</span>`).join('') +
    '</div>' +
    (note ? `<p class="note">${esc(note)}</p>` : '') +
    statuses
      .map(
        ([k]) =>
          `<p class="note">${esc(k === 'chill' ? I.chillText(boonTuning(MAGIC, taken).chill.freezeAt) : (I.statusText[k] ?? ''))}</p>`,
      )
      .join('') +
    (boons.length
      ? `<p class="lbl">${esc(STR.boons.yours)}</p>` +
        boons
          .map((id) => {
            const b = boon(id),
              r = taken[id] ?? 1;
            return `<p class="note boon" style="--c:${b.color}"><i style="background:${b.color}"></i><b>${esc(r > 1 ? STR.boons.ranked(b.name) : b.name)}</b>: ${esc(boonText(id, r))}</p>`;
          })
          .join('')
      : '') +
    (runes.length
      ? `<p class="lbl">${esc(K.runesLbl)}</p>` +
        runes
          .map((id) => {
            const r = rune(id);
            return `<p class="note rune">${runeIconImg(id)}<b>${esc(r.name)}</b>: ${esc(r.text)}</p>`;
          })
          .join('')
      : '');
  if (!used) return html + `<p class="note">${esc(K.castMore(Math.max(1, CFG.knowledge.usedCasts - casts)))}</p>`;
  const sets = reactionsOf(def);
  const found = reactionsFound(); // (M4.8: the ones not yet found are marked so, and dimmed)
  if (sets.length)
    html +=
      `<p class="lbl">${esc(K.sets)}</p>` +
      sets
        .map((r) =>
          found.includes(r.reaction)
            ? `<p class="note">${esc(K.reaction(STR.reactions[r.reaction], STR.schools[r.with], K.reactionText[r.reaction]))}</p>`
            : `<p class="note dim">${esc(K.reaction(STR.reactions[r.reaction], STR.schools[r.with], K.notFound))}</p>`,
        )
        .join('');
  const woven = weavesOf(def),
    wf = weavesFound(); // (M4.10: the weaves it takes part in, found or not yet)
  if (woven.length)
    html +=
      `<p class="lbl">${esc(K.weavesLbl)}</p>` +
      woven
        .map((id) =>
          wf.includes(id)
            ? `<p class="note">${esc(STR.weaves[id].name)}: ${esc(STR.weaves[id].text)}</p>`
            : `<p class="note dim">${esc(K.unfound)}</p>`,
        )
        .join('');
  const borne =
    stage === 'upgraded'
      ? upgradesOf(def.id)
          .filter((u) => u.startsWith('rune:'))
          .map((u) => u.slice(5))
      : []; // (M6: what changed it)
  if (borne.length)
    html += `<p class="lbl">${esc(K.upgradedLbl)}</p><p class="note">${esc(K.borne(borne.map((id) => rune(id as RuneId).name).join(', ')))}</p>`;
  return html + `<p class="lore">${esc(def.lore)}</p>`;
}

/* ---------- the wheel of reactions (M4.8) ---------- */

const css = (c: number) => '#' + c.toString(16).padStart(6, '0');
/** Where each school sits on the wheel: six spokes, Verdant's (M5) at the foot. */
const SPOKES = ['ember', 'frost', 'storm', 'verdant', 'umbral', 'hallow'] as const;
const spoke = (school: string) => {
  const a = -Math.PI / 2 + (SPOKES.indexOf(school as (typeof SPOKES)[number]) * Math.PI) / 3;
  return { x: 100 + Math.cos(a) * 72, y: 100 + Math.sin(a) * 72 };
};

/** A reaction's tile: the two schools' lights overlapping (found), or two hollow rings (not yet). */
export const reactionIcon = (r: Reaction, found: boolean) => pairIcon(reactionSchools(r), found);
/** Two schools' lights overlapping (found), or two hollow rings (not yet): a reaction's tile, or a weave's (M4.10). */
export function pairIcon(schools: readonly [School, School], found: boolean, ring = false) {
  const [a, b] = schools.map((k) => css(SCHOOL_LIGHT[k]));
  if (ring && found)
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="24" r="10" fill="none" stroke="${a}" stroke-width="4"/><circle cx="30" cy="24" r="10" fill="none" stroke="${b}" stroke-width="4"/></svg>`; // (a weave: two rings linked)
  return found
    ? `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="24" r="11" fill="${a}" opacity=".85"/><circle cx="30" cy="24" r="11" fill="${b}" opacity=".85" style="mix-blend-mode:screen"/><circle cx="24" cy="24" r="3" fill="#fff8e0"/></svg>`
    : `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="24" r="10" fill="none" stroke="${a}" stroke-width="2" opacity=".5"/><circle cx="30" cy="24" r="10" fill="none" stroke="${b}" stroke-width="2" opacity=".5"/></svg>`;
}

/** The wheel of the schools: a chord for every reaction, lit once found, `chosen` drawn bold. */
export function reactionWheel(chosen?: Reaction) {
  const found = reactionsFound();
  const chords = REACTION_IDS.map((r) => {
    const [a, b] = reactionSchools(r).map(spoke),
      on = found.includes(r),
      pick = r === chosen;
    const stroke = pick ? '#e8a640' : on ? '#b8843a' : '#6e5a42'; // (amber: readable on the dark card and the light one)
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${stroke}" stroke-width="${pick ? 4 : on ? 2.2 : 1.2}"${on ? '' : ` stroke-dasharray="${pick ? '7 5' : '4 4'}"`} opacity="${pick || on ? 1 : 0.75}"/>`;
  }).join('');
  const dots = SPOKES.map((k) => {
    const p = spoke(k),
      sealed = false,
      fill = sealed ? '#2a241c' : css(SCHOOL_LIGHT[k]);
    const name = STR.knowledge.spoke[k] ?? k;
    return (
      `<circle cx="${p.x}" cy="${p.y}" r="15" fill="${fill}" stroke="${sealed ? '#5e4d39' : '#17110c'}" stroke-width="2"${sealed ? ' stroke-dasharray="3 3"' : ''}/>` +
      `<text x="${p.x}" y="${p.y + 4.5}" text-anchor="middle" font-size="${sealed ? 14 : 11}" font-weight="700" fill="${sealed ? '#7a6a52' : '#17110c'}">${esc(name)}</text>`
    );
  }).join('');
  return `<div class="wheel"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(STR.knowledge.wheel)}">${chords}${dots}</svg></div>`;
}

/** Reaction `r` described in the book: found, what it does (and where else it happens); not yet, which two schools make it. */
export function reactionSheet(r: Reaction) {
  const K = STR.knowledge,
    found = reactionsFound(),
    on = found.includes(r);
  const [a, b] = reactionSchools(r).map((k) => STR.schools[k]),
    what = K.reactionText[r];
  const body = on
    ? `<p class="effect">${esc(what.charAt(0).toUpperCase() + what.slice(1))}.</p>` +
      (K.onTiles[r] ? `<p class="note">${esc(K.onTiles[r])}</p>` : '')
    : `<p class="effect">${esc(K.unfoundText(a, b))}</p>`;
  return (
    head(reactionIcon(r, on), on ? STR.reactions[r] : K.unfound, K.pair(a, b)) +
    body +
    reactionWheel(r) +
    `<p class="note">${esc(K.foundOf(found.filter((f) => (REACTION_IDS as string[]).includes(f)).length, REACTION_IDS.length))}</p>`
  );
}

/* ---------- weaves and chains (M4.10) ---------- */

/** Weave or chain `id` described in the book: found, what it does; not yet, which two schools make it. */
export function weaveSheet(id: WeaveId) {
  const K = STR.knowledge,
    w = WEAVES[id],
    on = weavesFound().includes(id),
    kind = K.weaveKind[w.kind];
  const [a, b] = w.schools.map((k) => STR.schools[k]);
  return (
    head(
      pairIcon(w.schools, on, w.kind === 'weave'),
      on ? STR.weaves[id].name : K.unfound,
      `${kind} · ${K.pair(a, b)}`,
    ) +
    `<p class="effect">${esc(on ? STR.weaves[id].text : K.weaveSealedText(w.kind))}</p>` +
    (on ? '' : `<p class="note">${esc(K.weaveSealed(kind, a, b))}</p>`) +
    `<p class="note">${esc(K.weavesFoundOf(weavesFound().length, WEAVE_IDS.length))}</p>`
  );
}
