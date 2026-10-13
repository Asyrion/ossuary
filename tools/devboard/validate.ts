/* The dev board's data check: runs the game's own validators over data/ (the same calls the unit tests make) and prints one
   line, `VALIDATE_JSON {"ok": ..., "checks": [{name, errors}]}`. The board runs it after every save, in a fresh process so
   the files are read anew. Run by hand: npx tsx tools/devboard/validate.ts */
import floors from '../../data/floors.json';
import sounds from '../../data/sounds.json';
import { validateArtifacts } from '../../src/items/artifactData';
import { validateFamilies } from '../../src/items/transformData';
import { validateAlchemy } from '../../src/items/alchemyData';
import { validateLoot } from '../../src/items/loot';
import { validateFoes, validatePairs, validatePressure } from '../../src/actors/foeData';
import { validateMantles } from '../../src/actors/mantleData';
import { validateCounters } from '../../src/actors/counterData';
import { MAGIC } from '../../src/magic/status';
import { validateWeaves } from '../../src/magic/weaves';
import { validateSpells } from '../../src/magic/spellData';
import { validateRunes } from '../../src/magic/runeData';
import { validateBoons } from '../../src/progression/boonData';
import { TEMPLATE_DEFS, validateTemplate } from '../../src/world/templates';
import { THEME_DEFS, validateThemes } from '../../src/world/themeData';
import { FLOORS } from '../../src/world/generate';
import { validateKit } from '../../src/world/kitData';
import { validateMusic } from '../../src/audio/musicData';
import { validateAmbience } from '../../src/audio/ambienceData';
import { validateSounds } from '../../src/audio/soundData';
import { ARTIFACT_DEFS } from '../../src/items/artifactData';
import { STR } from '../../src/strings';
import type { KitWeights } from '../../src/world/kitData';
import { DIALOGUE, validateDialogue } from '../../src/vigil/dialogueData';
import { SHADE_IDS, validateShades } from '../../src/vigil/shadeData';
import { TOWNSFOLK, validateTownsfolk } from '../../src/vigil/giftData';
import { validateVigil } from '../../src/vigil/vigilMap';
import { SCHOOLS, SPELL_DEFS } from '../../src/magic/spellData';
import { FOE_IDS } from '../../src/actors/foeData';
import { BOSS_TYPES } from '../../src/config';
import { REACTION_IDS } from '../../src/magic/knowledge';
import { POTION_IDS } from '../../src/items/alchemyData';

const checks: [string, () => unknown][] = [
  ['artifacts', () => validateArtifacts()],
  ['artifact families', () => validateFamilies(ARTIFACT_DEFS)],
  ['alchemy', () => validateAlchemy()],
  ['loot', () => validateLoot()],
  ['foes', () => validateFoes()],
  ['foe pairs', () => validatePairs(floors as never)],
  ['pressure', () => validatePressure(floors)],
  ['mantles', () => validateMantles(MAGIC, floors)],
  ['counters', () => validateCounters()],
  ['weaves', () => validateWeaves(MAGIC.weaves)],
  ['spells', () => validateSpells()],
  ['runes', () => validateRunes()],
  ['boons', () => validateBoons()],
  ['room templates', () => TEMPLATE_DEFS.flatMap((t) => validateTemplate(t))],
  ['themes', () => validateThemes(TEMPLATE_DEFS, FLOORS)],
  [
    'room kit',
    () =>
      [
        ...FLOORS.map((f) => validateKit(f.look.name, f.look.kit)),
        ...THEME_DEFS.map((t) => validateKit(t.id, t.look?.kit as Partial<KitWeights> | undefined, false)),
      ].flat(),
  ],
  ['music', () => validateMusic()],
  [
    'ambience',
    () =>
      validateAmbience(
        Object.keys(STR.dev.roomNames),
        THEME_DEFS.map((t) => t.id),
      ),
  ],
  ['sounds', () => validateSounds(sounds)],
  [
    'dialogue',
    () =>
      validateDialogue(DIALOGUE, {
        speakers: [...SHADE_IDS, 'ferryman'],
        spells: SPELL_DEFS.map((d) => d.id),
        foes: [...FOE_IDS],
        bosses: [...BOSS_TYPES],
        reactions: [...REACTION_IDS],
        recipes: [...POTION_IDS],
      }),
  ],
  ['chained shades', () => validateShades()],
  [
    'townsfolk',
    () =>
      validateTownsfolk(TOWNSFOLK, {
        folk: [...SHADE_IDS],
        spells: SPELL_DEFS.map((s) => s.id),
        potions: [...POTION_IDS],
        artifacts: ARTIFACT_DEFS.map((a) => a.id),
        foci: ARTIFACT_DEFS.filter((a) => a.kind === 'focus').map((a) => a.id),
        schools: [...SCHOOLS],
      }),
  ],
  ['the Vigil', () => validateVigil()],
];

const out = checks.map(([name, run]) => {
  try {
    const r = run();
    return { name, errors: Array.isArray(r) ? r.map(String) : [] };
  } catch (e) {
    return { name, errors: [`the check itself failed: ${e instanceof Error ? e.message : String(e)}`] };
  }
});
console.log('VALIDATE_JSON ' + JSON.stringify({ ok: out.every((c) => !c.errors.length), checks: out }));
