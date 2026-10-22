/* The assets made for the game (docs/assets.md): which file replaces which placeholder, how big it stands in the
   game, and the budgets each kind of asset has to fit. Pure: data/assets.json read and checked here; the game loads
   the files in assets/models.ts, and tools/prepare-asset.ts and tools/prepare-texture.ts use the same budgets. */
import raw from '../../data/assets.json';
import { WALL_KINDS } from '../world/kitData';

export type ModelKind = 'hero' | 'enemy' | 'boss' | 'prop' | 'large-prop' | 'artifact';
export type ImageKind = 'floor' | 'wall' | 'icon' | 'coin';
export const MODEL_KINDS: readonly ModelKind[] = ['hero', 'enemy', 'boss', 'prop', 'large-prop', 'artifact'];
export const IMAGE_KINDS: readonly ImageKind[] = ['floor', 'wall', 'icon', 'coin'];

export interface Budget {
  /** At most this many triangles. */ triangles: number;
  /** Textures at most this many pixels across. */ texture: number;
  /** Whether the kind has a rig and clips. */ rigged: boolean;
  /** Its usual height in the game, in units (an entry gives its own). */ height: number;
  /** Width over height, at most (a sanity check on proportions). */ maxWidth: number;
  /** Its folder under public/assets/. */ folder: string;
}
export interface ImageSpec {
  /** Pixels across, as shipped. */ size: number;
  /** Pixels across of the original to keep, so the image can be redone later. */ source?: number;
  /** A coin's icon, pixels across. */ icon?: number;
  folder: string;
}

/** A Tripo model's texture made pixel art (tools/texel-bake.ts): its colour and its glow, under the folder. */
export interface TexelFiles {
  file: string;
  glow: string;
}
/** A model in the game: its file under the manifest's folder, its height in units, and a nudge after centring; `texel`, its
    texture as pixel art, which it wears (prepare-asset bakes it for every model it prepares). */
export interface ModelEntry {
  file: string;
  height: number;
  /** x, y, z in units */ offset?: [number, number, number];
  /** turn, radians */ yaw?: number;
  texel?: TexelFiles;
}
export interface Manifest {
  /** Placeholders a model replaces (PROP_SLOTS). */ props: Record<string, ModelEntry>;
  /** An artifact's floating model, by artifact id. */ artifacts: Record<string, ModelEntry>;
  /** A floor look's painted floor tile, by look name (data/floors.json). */ floors: Record<string, { floor: string }>;
  /** A floor look's made wall faces, by look name and the room kit's kind of wall (tools/art/walltile.py): a PNG at the
      kit's texel in the floor's colours, as many units across as it is texels over 48; the kinds left out are drawn in
      code. */ walls?: Record<string, Record<string, string>>;
  /** A floor look's made floor faces, by look name and a name of their own (tools/art/floortile.py): a grey PNG of steps
      of light at the kit's texel, which a look's `floor.face` names and the room's floor colours paint. */
  floorFaces?: Record<string, Record<string, string>>;
  /** An artifact's painted icon, by artifact id. */ icons: Record<string, { file: string }>;
  /** Coin faces, by a name of their own: the face drawn on a coin in the room, at
      the game's pixel (`images.coin.size` across), and its icon for the HUD and the lore card. */ coins?: Record<
    string,
    { face: string; icon: string }
  >;
  /** The coin face the obols wear (one of `coins`); without one, the obol built in code. */ obol?: string;
}

export const BUDGETS = raw.budgets as Record<ModelKind, Budget>;
export const IMAGES = raw.images as Record<ImageKind, ImageSpec>;
/** The placeholders a prop model can take the place of, and the kind each is. */
export const PROP_SLOTS: Record<string, ModelKind> = {
  urn: 'prop',
  pedestal: 'prop',
  // the relics strewn over floor 1 (a floor's `scatter` of `relics`, world/themes.ts): made models only, no placeholder
  grave_marker: 'prop',
  coffin_lid: 'prop',
  fallen_candelabrum: 'prop',
  angel_head: 'large-prop',
  skull_pile: 'large-prop',
  broken_urn: 'large-prop',
  // floor 2's relics (its look's `relics`): made models only, no placeholder
  toppled_font: 'large-prop',
  pillar_stump: 'large-prop',
  fungus_log: 'large-prop',
  sunken_bell: 'large-prop',
  rotten_planks: 'prop',
  rimed_bones: 'prop',
  // floor 3's relics (its look's `relics`): made models only, no placeholder
  charred_beam: 'large-prop',
  toppled_brazier: 'large-prop',
  wax_mound: 'large-prop',
  brimstone_cluster: 'large-prop',
  scorched_bones: 'prop',
  slag_heap: 'prop',
  // floor 4's relics (its look's `relics`): made models only, no placeholder
  gilded_reliquary: 'prop',
  fallen_saint: 'large-prop',
  candle_stand: 'prop',
  coin_heap: 'prop',
  bell_fallen: 'large-prop',
  prayer_book_stand: 'large-prop',
  // floor 5's relics (its look's `relics`): made models only, no placeholder
  wrecked_skiff: 'large-prop',
  mooring_post: 'large-prop',
  net_heap: 'prop',
  ferry_lantern: 'large-prop',
  frozen_cairn: 'large-prop',
  // floor 2's foes made in Tripo (actors/madeFoes.ts): a still model in place of the look in code
  foe_mireToad: 'prop',
  foe_lanternJelly: 'prop',
  foe_thunderhead: 'prop',
  foe_puddleElemental: 'prop',
  foe_puffcap: 'prop',
  foe_rimeSnail: 'prop',
  foe_glassNewt: 'prop',
  foe_stormDarter: 'prop',
  foe_cisternLurker: 'prop',
  foe_brineSerpent: 'prop',
  foe_abbess: 'prop',
  foe_pyre: 'prop',
  // floor 3's foes and the War-Tiger and Twin Guardians (actors/madeFoes.ts, madeBosses.ts)
  foe_cinderSalamander: 'prop',
  foe_magmaOoze: 'prop',
  foe_hexImp: 'prop',
  foe_waspNest: 'prop',
  foe_emberWasp: 'prop',
  foe_cinderDjinn: 'prop',
  foe_rimeDrakeling: 'prop',
  foe_phoenix: 'prop',
  foe_basilisk: 'prop',
  foe_saltGolem: 'prop',
  foe_rubbleGolem: 'prop',
  foe_tiger: 'prop',
  foe_twins: 'prop',
  foe_twins2: 'prop', // (the second guardian: greyer, a forked beard, a crest)
  // floor 4's foes and the Hart (actors/madeFoes.ts, madeBosses.ts)
  foe_wickmouse: 'prop',
  foe_chimeBat: 'prop',
  foe_gargoyleWhelp: 'prop',
  foe_moonstagFawn: 'prop',
  foe_radiantEye: 'prop',
  foe_harpy: 'prop',
  foe_lodestoneGolem: 'prop',
  foe_hearthGolem: 'prop',
  foe_shadowFox: 'prop',
  foe_rimeScarab: 'prop',
  foe_griffin: 'prop',
  foe_hart: 'large-prop',
  // floor 5's foes and the Deep Angler (actors/madeFoes.ts, madeBosses.ts)
  foe_rootling: 'prop',
  foe_rimeWolf: 'prop',
  foe_frostJackalope: 'prop',
  foe_stormRay: 'prop',
  foe_voidMote: 'prop',
  foe_gloomRaven: 'prop',
  foe_lanternTortoise: 'prop',
  foe_glacierGolem: 'prop',
  foe_dustPangolin: 'prop',
  foe_manticore: 'prop',
  foe_angler: 'large-prop',
  // the solid parts of spells (magic/spellFx.ts): made models only, no placeholder; the spells draw their own without them
  ice_column: 'prop',
  bone_hand: 'prop',
  thorn_vines: 'prop',
  thorn_hedge: 'prop',
  judgement_sword: 'prop',
  vigil_lantern: 'prop',
  // the containers (items/pickupLooks.ts): a made one, its lid a node named `lid` on its hinge, takes the place of the one
  // built in code
  coffer: 'prop',
  chest: 'prop',
  chest_gilded: 'prop',
  // a floor's own made urn, shrine stone and bone altar, by its look's name (world/rooms.ts, specialLooks.ts,
  // objectLooks.ts): in place of the one built in code, which keeps what lights or changes (the stone's runes, the
  // altar's candles)
  urn_drowned: 'prop',
  bargain_stone_drowned: 'prop',
  altar_drowned: 'large-prop',
  urn_burning: 'prop',
  altar_burning: 'large-prop',
  urn_reliquary: 'prop',
  altar_reliquary: 'large-prop',
  urn_shore: 'prop',
  altar_shore: 'large-prop',
};
export const MANIFEST: Manifest = {
  props: raw.props,
  artifacts: raw.artifacts,
  floors: raw.floors,
  walls: raw.walls,
  floorFaces: raw.floorFaces,
  icons: raw.icons,
  coins: raw.coins,
  obol: raw.obol,
};

/** What a manifest names: the known ids it may use. */
export interface Known {
  artifacts: ReadonlySet<string>;
  looks: ReadonlySet<string>;
}

/** Everything wrong with a manifest (an empty list when it is fine). */
export function validateManifest(m: Manifest, known: Known): string[] {
  const errs: string[] = [];
  const file = (where: string, f: unknown, ext: RegExp) => {
    if (typeof f !== 'string' || !f) errs.push(`${where}: no file`);
    else if (!ext.test(f)) errs.push(`${where}: ${f} should end in ${ext.source.replace(/\\|\$/g, '')}`);
    else if (f.startsWith('/') || f.includes('..') || f.includes('://'))
      errs.push(`${where}: ${f} must be a path inside the assets folder`);
  };
  const model = (where: string, e: ModelEntry) => {
    file(where, e?.file, /\.glb$/);
    if (!(e?.height > 0)) errs.push(`${where}: height must be above 0`);
    if (
      e?.offset !== undefined &&
      !(Array.isArray(e.offset) && e.offset.length === 3 && e.offset.every(Number.isFinite))
    )
      errs.push(`${where}: offset must be [x, y, z]`);
    if (e?.yaw !== undefined && !Number.isFinite(e.yaw)) errs.push(`${where}: yaw must be a number`);
    if (e?.texel !== undefined) texel(`${where}.texel`, e.texel);
  };
  const texel = (where: string, t: TexelFiles) => {
    file(`${where}.file`, t?.file, /\.png$/);
    file(`${where}.glow`, t?.glow, /\.png$/);
  };
  for (const [id, e] of Object.entries(m.props ?? {})) {
    if (!PROP_SLOTS[id]) errs.push(`props.${id}: no such placeholder (${Object.keys(PROP_SLOTS).join(', ')})`);
    model(`props.${id}`, e);
  }
  for (const [id, e] of Object.entries(m.artifacts ?? {})) {
    if (!known.artifacts.has(id)) errs.push(`artifacts.${id}: no such artifact`);
    model(`artifacts.${id}`, e);
  }
  for (const [look, e] of Object.entries(m.floors ?? {})) {
    if (!known.looks.has(look)) errs.push(`floors.${look}: no such floor look (${[...known.looks].join(', ')})`);
    file(`floors.${look}.floor`, e?.floor, /\.(jpg|png)$/);
  }
  for (const [look, kinds] of Object.entries(m.walls ?? {})) {
    if (!known.looks.has(look)) errs.push(`walls.${look}: no such floor look (${[...known.looks].join(', ')})`);
    for (const [kind, f] of Object.entries(kinds ?? {})) {
      if (!(WALL_KINDS as readonly string[]).includes(kind))
        errs.push(`walls.${look}.${kind}: no such kind of wall (${WALL_KINDS.join(', ')})`);
      file(`walls.${look}.${kind}`, f, /\.png$/);
    }
  }
  for (const [look, faces] of Object.entries(m.floorFaces ?? {})) {
    if (!known.looks.has(look)) errs.push(`floorFaces.${look}: no such floor look (${[...known.looks].join(', ')})`);
    for (const [name, f] of Object.entries(faces ?? {})) {
      if (!/^[a-z0-9_]+$/.test(name))
        errs.push(`floorFaces.${look}.${name}: a face's name is lower case, digits and _`);
      file(`floorFaces.${look}.${name}`, f, /\.png$/);
    }
  }
  for (const [id, e] of Object.entries(m.icons ?? {})) {
    if (!known.artifacts.has(id)) errs.push(`icons.${id}: no such artifact`);
    file(`icons.${id}`, e?.file, /\.png$/);
  }
  for (const [id, e] of Object.entries(m.coins ?? {})) {
    if (!/^[a-z0-9_]+$/.test(id)) errs.push(`coins.${id}: a coin's name is lower case, digits and _`);
    file(`coins.${id}.face`, e?.face, /\.png$/);
    file(`coins.${id}.icon`, e?.icon, /\.png$/);
  }
  if (m.obol !== undefined && !m.coins?.[m.obol])
    errs.push(`obol: ${m.obol} is not one of the coins (${Object.keys(m.coins ?? {}).join(', ')})`);
  return errs;
}

/** Every file a manifest names, with where it is named. */
export function manifestFiles(m: Manifest): { where: string; file: string }[] {
  return [
    // (a group left out of a hand-made manifest is empty, not an error: ?assets= may point at one)
    ...Object.entries(m.props ?? {}).map(([id, e]) => ({ where: `props.${id}`, file: e.file })),
    ...Object.entries(m.artifacts ?? {}).map(([id, e]) => ({ where: `artifacts.${id}`, file: e.file })),
    ...Object.entries(m.floors ?? {}).map(([look, e]) => ({ where: `floors.${look}.floor`, file: e.floor })),
    ...Object.entries(m.walls ?? {}).flatMap(([look, kinds]) =>
      Object.entries(kinds).map(([kind, file]) => ({ where: `walls.${look}.${kind}`, file })),
    ),
    ...Object.entries(m.floorFaces ?? {}).flatMap(([look, faces]) =>
      Object.entries(faces).map(([name, file]) => ({ where: `floorFaces.${look}.${name}`, file })),
    ),
    ...Object.entries(m.icons ?? {}).map(([id, e]) => ({ where: `icons.${id}`, file: e.file })),
    ...Object.entries(m.coins ?? {}).flatMap(([id, e]) => [
      { where: `coins.${id}.face`, file: e.face },
      { where: `coins.${id}.icon`, file: e.icon },
    ]),
  ];
}
