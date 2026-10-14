/* The dev options in the address (docs/architecture.md, Dev hooks and URL options), applied before the game reads
   them: the next run's floor, room, loot, spells and the like, and the DEV switches some of them set. */
import { POTION_IDS, isPotion } from '../items/alchemyData';
import { DEV } from '../state';
import { RUNE_IDS, isRune, type RuneId } from '../magic/runeData';
import { levelAtFloor } from '../progression/levelData';
import { ARTIFACTS } from '../items/artifactData';
import { askVigil, addToNextRun } from '../flow';
import { BOONS } from '../progression/boonData';
import { VARIANTS, type RoomVariant } from '../world/generate';
import { BOSS_TYPES, type BossType } from '../config';
import { RESOURCES, type Resource } from '../items/loot';
import { SPELLS } from '../magic/spellData';
import { TEMPLATES } from '../world/templates';
import { THEMES } from '../world/themeData';
import { FOE_IDS, isFoe } from '../actors/foeData';

/** Dev run options from the address (the seed is the game's: main.ts): ?floor=2 starts deeper,
    ?room=<template id> plays one room template (for reviewing templates), ?variant=dark dresses that room
    in a variant (quiet, champion, ambush, dark), ?give=bone_lens,twin_staff starts the run holding those
    artifacts, ?boss=pyre picks every floor's boss, ?loot=coins:20,glyphs:5 hands out obols, keys and glyphs,
    ?spells=arc starts with spells in the slots, ?theme=ossuary makes every fight one theme's,
    ?boons=deepWinter:2,coldSnap starts with boons taken, ?runes=q:quicken,e:lasting+vein
    with runes carved into the slots' spells. */
export function applyUrlOptions() {
  const q = new URLSearchParams(location.search);
  const vig = q.get('vigil');
  if (vig && vig !== '0') askVigil(vig === 'first'); // (?vigil=1 starts at the Vigil, ?vigil=first wakes there for the first time)
  const floor = Number(q.get('floor')),
    room = q.get('room'),
    variant = q.get('variant') as RoomVariant | null;
  if (variant && !VARIANTS.includes(variant)) console.warn(`?variant=${variant}: use one of ${VARIANTS.join(', ')}`);
  // ?loot=coins:20,keys:2,glyphs:5
  const loot: Partial<Record<Resource, number>> = {};
  for (const part of (q.get('loot') ?? '').split(',').filter(Boolean)) {
    const [k, v] = part.split(':'),
      n = Number(v);
    if (RESOURCES.includes(k as Resource) && n > 0) loot[k as Resource] = n;
    else console.warn(`?loot: "${part}" should be one of ${RESOURCES.join(', ')} with a count, e.g. coins:20`);
  }
  const boss = q.get('boss') as BossType | null,
    bossOk = !!boss && BOSS_TYPES.includes(boss);
  if (boss && !bossOk) console.warn(`?boss=${boss}: use one of ${BOSS_TYPES.join(', ')}`);
  const theme = q.get('theme');
  // ?foe=sporeling: that foe in every template role, on every floor
  const foe = q.get('foe');
  if (foe && isFoe(foe)) DEV.foe = foe;
  else if (foe) console.warn(`?foe=${foe}: use one of ${FOE_IDS.join(', ')}`);
  if (theme && !THEMES.has(theme)) console.warn(`?theme=${theme}: use one of ${[...THEMES.keys()].join(', ')}`);
  const give = (q.get('give') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const spells = (q.get('spells') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const badSpells = spells.filter((id) => !SPELLS.has(id));
  if (badSpells.length)
    console.warn(`?spells: unknown ${badSpells.join(', ')}. Known: ${[...SPELLS.keys()].join(', ')}`);
  const potions = (q.get('potions') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean); // (potions to start with in the belt)
  const level =
    q.get('level') === 'auto' ? levelAtFloor(Math.max(0, Number(q.get('floor') ?? 1) - 1)) : Number(q.get('level')); // (?level=5 starts at that level, its choices waiting; ?level=auto at the floor's expected level)
  const auto = q.get('autolevel');
  if (auto && auto !== '0') DEV.autoLevel = auto === 'skip' ? 'skip' : 'choose'; // (levels choose for themselves (the bot), or pass (the tests))
  if (q.get('level') && !(level >= 1 && level <= 12)) console.warn(`?level=${q.get('level')}: use 1 to 12, or auto`);
  const boons: Record<string, number> = {}; // (?boons=deepWinter:2,coldSnap starts with them taken, at those ranks)
  for (const part of (q.get('boons') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [id, n] = part.split(':'),
      b = BOONS.get(id),
      rank = n ? Number(n) : 1;
    if (b && rank >= 1 && rank <= b.max) boons[id] = rank;
    else
      console.warn(
        `?boons: "${part}" should be a boon with a rank up to its most, e.g. deepWinter:2. Known: ${[...BOONS.keys()].join(', ')}`,
      );
  }
  const runes: RuneId[][] = [[], []]; // (?runes=q:quicken,e:lasting+vein carves them into the slots)
  for (const part of (q.get('runes') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [k, list = ''] = part.split(':'),
      slot = ['q', '0'].includes(k.toLowerCase()) ? 0 : ['e', '1'].includes(k.toLowerCase()) ? 1 : -1;
    const ids = list.split(/[+ ]/).filter(Boolean),
      bad = ids.filter((id) => !isRune(id));
    if (slot < 0 || bad.length || ids.length > 2) {
      console.warn(
        `?runes: "${part}" should be q: or e: with one or two runes joined by +, e.g. q:quicken or e:lasting+vein. Known: ${RUNE_IDS.join(', ')}`,
      );
      continue;
    }
    runes[slot] = ids as RuneId[];
  }
  const badPotions = potions.filter((id) => !isPotion(id));
  if (badPotions.length) console.warn(`?potions: unknown ${badPotions.join(', ')}. Known: ${POTION_IDS.join(', ')}`);
  if (room && !TEMPLATES.has(room))
    console.warn(`?room=${room}: no such template. Known: ${[...TEMPLATES.keys()].join(', ')}`);
  const unknown = give.filter((id) => !ARTIFACTS.has(id));
  if (unknown.length) console.warn(`?give: unknown ${unknown.join(', ')}. Known: ${[...ARTIFACTS.keys()].join(', ')}`);
  addToNextRun({
    floor: floor >= 1 ? floor - 1 : undefined,
    testTemplate: room && TEMPLATES.has(room) ? room : undefined,
    testVariant: variant && VARIANTS.includes(variant) ? variant : undefined,
    give: give.filter((id) => ARTIFACTS.has(id)),
    boss: bossOk ? boss : undefined,
    loot,
    spells: spells.filter((id) => SPELLS.has(id)),
    potions: potions.filter(isPotion),
    level: level >= 1 ? level : undefined,
    boons,
    runes,
    theme: theme && THEMES.has(theme) ? theme : undefined,
  });
}
