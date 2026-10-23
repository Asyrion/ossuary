/* A creature's file without its painted texture (docs/creatures.md):
     npm run creature-strip -- hart warden      those creatures' public/assets/creatures/<id>.glb (or: run, for all of
                                                `RUN_CREATURES`)
   A run wears a creature's texture only as the pixel art tools/texel-bake.ts baked from it (<id>.texel.png), never the
   texture in its file, so once the bake is done the file's images go: its JPEG base colour and roughness maps, and the
   textures and samplers only they used. Each material stays, marked `extras.texel` (three.js: `userData.texel`), so the
   game still knows the meshes that wear the bake (texturePixel.ts `wearTexel`); the meshes, their UVs, the skeleton and
   the clips are written back as they were. tools/animate-creature.ts runs it after its bake on the creatures a run
   loads (`RUN_CREATURES`); this runs it over files already written. The townspeople keep theirs: the Vigil draws a
   speaker's icon from its file as it is (vigil/town.ts `speakerIcon`). A file without its texture can't be baked again:
   bake from animate-creature (docs/creatures.md). */
import { NodeIO, type Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { CFG } from '../src/config';

const DIR = resolve(import.meta.dirname, '../public/assets/creatures');

/** The creatures a run loads: those the bosses fight as (CFG.madeBosses) and Fen-Nex's two. */
export const RUN_CREATURES = [
  ...new Set([
    ...Object.values(CFG.madeBosses as Record<string, { creature?: { id: string } }>).flatMap((h) =>
      h.creature ? [h.creature.id] : [],
    ),
    'fennex',
    'fennex_full',
  ]),
];

/** Take every texture out of `doc`: the materials that wore one marked `extras.texel`. How many it took. */
export function stripTextures(doc: Document) {
  const root = doc.getRoot();
  for (const m of root.listMaterials()) if (m.getBaseColorTexture()) m.setExtras({ ...m.getExtras(), texel: true }); // (it wears the baked pixel art)
  const textures = root.listTextures();
  for (const t of textures) t.dispose(); // (its slots in every material emptied with it; its image is written no more)
  return textures.length;
}

/** Strip the file of creature `id` in place: its size before and after, in bytes. */
export async function stripCreature(id: string) {
  const file = resolve(DIR, `${id}.glb`);
  if (!existsSync(file)) throw new Error(`no file ${file}`);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS),
    doc = await io.read(file),
    before = statSync(file).size,
    taken = stripTextures(doc);
  if (taken) await io.write(file, doc);
  return { before, after: statSync(file).size, taken };
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(0)} KB`;

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const want = process.argv.slice(2),
    ids = want[0] === 'run' ? RUN_CREATURES : want;
  (async () => {
    if (!ids.length) throw new Error('usage: npm run creature-strip -- <creature id>...|run');
    for (const id of ids) {
      const r = await stripCreature(id);
      console.log(
        r.taken
          ? `${id}: ${r.taken} textures taken out, ${kb(r.before)} -> ${kb(r.after)}`
          : `${id}: no texture, left as it was`,
      );
    }
  })().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
