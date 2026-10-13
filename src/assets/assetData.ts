/* The assets made for the game (M3.5, docs/assets.md): which file replaces which placeholder, how big it stands in the
   game, and the budgets each kind of asset has to fit. Pure: data/assets.json read and checked here; the game loads
   the files in assets/models.ts, and tools/prepare-asset.ts and tools/prepare-texture.ts use the same budgets. */
import raw from '../../data/assets.json';

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
  /** Pixels across, as kept by the owner. */ source?: number;
  /** A coin's icon, pixels across. */ icon?: number;
  folder: string;
}

/** A Tripo model's texture made pixel art (tools/texel-bake.ts, 2026-10-05): its colour and its glow, under the folder. */
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
  /** A floor look's painted floor tile, by look name (data/floors.json); walls stay procedural for now. */ floors: Record<
    string,
    { floor: string }
  >;
  /** An artifact's painted icon, by artifact id. */ icons: Record<string, { file: string }>;
  /** Coin faces, by a name of their own (2026-10-02, from the owner's coins): the face drawn on a coin in the room, at
      the game's pixel (`images.coin.size` across), and its icon for the HUD and the lore card. */ coins?: Record<
    string,
    { face: string; icon: string }
  >;
  /** The coin face the obols wear (one of `coins`); without one, the obol built in code. */ obol?: string;
}

export const BUDGETS = raw.budgets as Record<ModelKind, Budget>;
export const IMAGES = raw.images as Record<ImageKind, ImageSpec>;
/** The placeholders a prop model can take the place of, and the kind each is. */
export const PROP_SLOTS: Record<string, ModelKind> = { urn: 'prop', pedestal: 'prop' };
export const MANIFEST: Manifest = {
  props: raw.props,
  artifacts: raw.artifacts,
  floors: raw.floors,
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
    ...Object.entries(m.icons ?? {}).map(([id, e]) => ({ where: `icons.${id}`, file: e.file })),
    ...Object.entries(m.coins ?? {}).flatMap(([id, e]) => [
      { where: `coins.${id}.face`, file: e.face },
      { where: `coins.${id}.icon`, file: e.icon },
    ]),
  ];
}
