/* What the dev board shows: every kind of content in data/, as one declarative table. A new kind is one entry here (and
   its hints in hints.json), never new code. `path` finds the collection inside the file; a collection is a list
   (entries found by `idKey`, or by position when they have no id) or a map (entries are its members, keyed by id). */

export interface Source {
  file: string;
  path?: string[];
  label?: string;
}
export interface KindDef {
  title: string;
  sources: Source[];
  shape: 'list' | 'map';
  /** The id field of a list's entries; none for lists whose entries are known by position (floors, recipes). */
  idKey?: string;
  /** The field shown as the entry's name. */
  labelKey?: string;
  /** A label for entries without a name field (`{n}` the 1-based position, `{field}` a field's value). */
  labelFmt?: string;
  /** Map members that are notes, not entries. */
  skip?: string[];
  /** The fields shown on the entry's card. */
  summary: string[];
  /** The field holding the entry's colour, shown as a swatch. */
  colorKey?: string;
  /** A link that starts the game with this entry (`{id}` its id, `{n}` its position), through the game's ?options. */
  play?: string;
  group: string;
}

export const KINDS: Record<string, KindDef> = {
  artifacts: {
    title: 'Artifacts',
    group: 'Items',
    sources: [{ file: 'data/artifacts.json' }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'name',
    summary: ['kind', 'pools', 'text'],
    colorKey: 'color',
    play: '?give={id}',
  },
  potions: {
    title: 'Potions',
    group: 'Items',
    sources: [{ file: 'data/alchemy.json', path: ['potions'] }],
    shape: 'map',
    labelKey: 'name',
    summary: ['weight', 'drink', 'throw'],
    colorKey: 'color',
    play: '?potions={id}',
  },
  reagents: {
    title: 'Reagents',
    group: 'Items',
    sources: [{ file: 'data/alchemy.json', path: ['reagents'] }],
    shape: 'map',
    labelKey: 'name',
    summary: ['leans', 'lore'],
    colorKey: 'color',
  },
  recipes: {
    title: 'Recipes',
    group: 'Items',
    sources: [{ file: 'data/alchemy.json', path: ['recipes'] }],
    shape: 'list',
    labelFmt: '{of} → {makes}',
    summary: ['of', 'makes'],
  },
  foes: {
    title: 'Foes',
    group: 'World',
    sources: [{ file: 'data/foes.json' }],
    shape: 'map',
    summary: ['floor', 'school', 'weak', 'resist', 'hp', 'speed', 'behaviour'],
    colorKey: 'gib',
    play: '?foe={id}&floor={floor}',
  },
  floors: {
    title: 'Floors',
    group: 'World',
    sources: [{ file: 'data/floors.json' }],
    shape: 'list',
    labelFmt: 'Floor {n}',
    summary: ['rooms', 'enemyHp', 'vaultWarden', 'runes'],
    play: '?floor={n}',
  },
  themes: {
    title: 'Themes',
    group: 'World',
    sources: [{ file: 'data/themes.json' }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'name',
    summary: ['twist', 'scatter'],
    play: '?theme={id}',
  },
  rooms: {
    title: 'Room templates',
    group: 'World',
    shape: 'list',
    idKey: 'id',
    labelKey: 'id',
    sources: [
      { file: 'data/templates/standard.json', label: 'standard' },
      { file: 'data/templates/special.json', label: 'special' },
      { file: 'data/templates/shapes.json', label: 'shapes' },
      { file: 'data/templates/themed.json', label: 'themed' },
      { file: 'data/templates/vigil.json', label: 'vigil' },
    ],
    summary: ['shape', 'types', 'difficulty', 'theme'],
    play: '?room={id}',
  },
  creatures: {
    title: 'Creatures',
    group: 'World',
    sources: [{ file: 'data/creatures.json' }],
    shape: 'map',
    skip: ['_comment'],
    summary: ['height', 'walkSpeed', 'file'],
  },
  spells: {
    title: 'Spells',
    group: 'Magic',
    sources: [{ file: 'data/spells.json' }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'name',
    summary: ['school', 'shape', 'mana', 'cooldown', 'damage', 'text'],
    colorKey: 'color',
    play: '?spells={id}',
  },
  runes: {
    title: 'Runes',
    group: 'Magic',
    sources: [{ file: 'data/runes.json', path: ['runes'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'name',
    summary: ['shapes', 'params', 'text'],
    colorKey: 'color',
  },
  boons: {
    title: 'Boons',
    group: 'Magic',
    sources: [{ file: 'data/boons.json', path: ['boons'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'name',
    summary: ['school', 'max', 'text'],
    colorKey: 'color',
    play: '?boons={id}',
  },
  dialogue: {
    title: 'Dialogue lines',
    group: 'Vigil',
    sources: [{ file: 'data/dialogue.json', path: ['lines'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'id',
    summary: ['who', 'moment', 'text'],
  },
  shades: {
    title: 'Chained shades',
    group: 'Vigil',
    sources: [{ file: 'data/shades.json', path: ['shades'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'id',
    summary: ['floors', 'help'],
    colorKey: 'light',
  },
  townsfolk: {
    title: 'Townsfolk gifts',
    group: 'Vigil',
    sources: [{ file: 'data/townsfolk.json', path: ['folk'] }],
    shape: 'map',
    summary: ['gift', 'second', 'blessing'],
  },
  powers: {
    title: 'Powers',
    group: 'Vigil',
    sources: [{ file: 'data/townsfolk.json', path: ['powers'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'id',
    summary: ['by', 'dust', 'start'],
  },
  quests: {
    title: 'Quests',
    group: 'Vigil',
    sources: [{ file: 'data/townsfolk.json', path: ['quests'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'id',
    summary: ['by', 'goal', 'reward'],
  },
  disciplines: {
    title: 'Disciplines',
    group: 'Vigil',
    sources: [{ file: 'data/townsfolk.json', path: ['disciplines'] }],
    shape: 'list',
    idKey: 'id',
    labelKey: 'id',
    summary: ['school', 'spell', 'focus'],
  },
  vigilRooms: {
    title: 'Vigil rooms',
    group: 'Vigil',
    sources: [{ file: 'data/vigil.json', path: ['rooms'] }],
    shape: 'list',
    labelKey: 'name',
    summary: ['type', 'shape', 'template'],
    play: '?vigil=1',
  },
  magic: { title: 'Magic tuning', group: 'Tuning', sources: [{ file: 'data/magic.json' }], shape: 'map', summary: [] },
  loot: { title: 'Loot', group: 'Tuning', sources: [{ file: 'data/loot.json' }], shape: 'map', summary: [] },
};
