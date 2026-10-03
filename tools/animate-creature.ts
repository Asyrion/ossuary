/* Animate a rigged creature in code (docs/creatures.md):
     npm run animate-creature -- owlbear path/to/owlbear.glb
   Reads the owner's Tripo GLB, binds its skin again from the bones (Tripo's auto-rig weights can't bend a limb), bakes
   the clips of its recipe (tools/creatures/<id>.ts) into it as glTF animations, cuts its textures to 1,024 px JPEG and
   writes public/assets/creatures/<id>.glb, with what the game needs to play it (each clip's length, whether it loops,
   when its sounds fall, how fast its walk goes) in data/creatures.json. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Rig, bake, reskin } from './creatureRig';
import * as owlbear from './creatures/owlbear';

/** Each recipe: its legs, skin, jaw, clips, the bones that move, its walk's speed, and how tall it stands in the game. */
const RECIPES = { owlbear: { ...owlbear, height: 1.45 } };

async function main() {
  const [id, input] = process.argv.slice(2).filter(a => !a.startsWith('-'));
  const R = RECIPES[id as keyof typeof RECIPES];
  if (!R || !input) { console.error(`usage: npm run animate-creature -- <${Object.keys(RECIPES).join('|')}> <in.glb>`); process.exit(1); }
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'sharp': sharp });
  const doc = await io.read(input);
  const rig = new Rig(doc);
  for (const [leg, def] of Object.entries(R.LEGS)) rig.leg(leg, def);
  const bound = reskin(doc, rig, R.SKIN, R.jawOf);
  bake(doc, rig, R.CLIPS, R.MOVING);
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 88 }));
  const out = resolve(import.meta.dirname, `../public/assets/creatures/${id}.glb`);
  mkdirSync(dirname(out), { recursive: true });
  await io.write(out, doc);
  // its bounds, for the game's scale
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const b = p.getAttribute('POSITION')!; lo = lo.map((v, i) => Math.min(v, b.getMinNormalized([])[i])); hi = hi.map((v, i) => Math.max(v, b.getMaxNormalized([])[i])); }
  const dataPath = resolve(import.meta.dirname, '../data/creatures.json');
  let data: Record<string, unknown> = {}; try { data = JSON.parse(readFileSync(dataPath, 'utf8')); } catch { /* the first */ }
  data[id] = {
    file: `assets/creatures/${id}.glb`, height: R.height, modelHeight: +(hi[1] - lo[1]).toFixed(3), modelLength: +(hi[2] - lo[2]).toFixed(3),
    walkSpeed: +R.WALK_SPEED.toFixed(4),
    clips: Object.fromEntries(Object.entries(R.CLIPS).map(([name, c]) => [name, { duration: c.duration, loop: c.loop, events: c.events.map(e => ({ ...e, t: +e.t.toFixed(3) })) }])),
  };
  writeFileSync(dataPath, JSON.stringify({ _comment: 'Written by tools/animate-creature.ts (docs/creatures.md): each animated creature\'s file, how tall it stands in the game, its walk\'s speed in model units a second, and its clips with the times their sounds fall.', ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== '_comment')) }, null, 2) + '\n');
  console.log(`${id}: ${bound} vertices bound again, ${Object.keys(R.CLIPS).length} clips (${Object.keys(R.CLIPS).join(', ')}), ${(statSync(out).size / 1024).toFixed(0)} KB -> ${out}`);
}
main().catch(e => { console.error(e); process.exit(1); });
