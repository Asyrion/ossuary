/* Animate a rigged creature in code (docs/creatures.md):
     npm run animate-creature -- owlbear path/to/owlbear.glb
     npm run animate-creature -- --bones path/to/model.glb      (reads a new model's rig, for writing its recipe)
   Reads the owner's Tripo GLB, binds its skin again from the bones (Tripo's auto-rig weights can't bend a limb), bakes
   the clips of its recipe (tools/creatures/<id>.ts) into it as glTF animations, cuts its textures to 1,024 px JPEG and
   writes public/assets/creatures/<id>.glb, with what the game needs to play it (each clip's length, whether it loops,
   when its sounds fall, how fast its walk goes) in data/creatures.json. Beside it, <id>.full.glb keeps the textures as
   imported (their own size, the normal map), loaded only when the dev menu asks to compare: outside the game's budget. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Rig, bake, reskin } from './creatureRig';
import { padIslands } from './padIslands';
import { orientOutward } from './orientFaces';
import * as owlbear from './creatures/owlbear';
import { BUDGETS } from '../src/assets/assetData';

/** Each recipe: its legs, skin, jaw, clips, the bones that move, its walk's speed, how tall it stands in the game, and
    the budget it keeps to (data/assets.json: a creature the size of a boss keeps a boss's). */
const RECIPES = { owlbear: { ...owlbear, height: 1.45, budget: 'boss' as const } };

/** `--bones <in.glb>`: what a new creature's recipe needs to know, read off the model before one is written. Each bone in
    its tree with where its joint stands (the model's frame: x left-right, y up, z forward) and how many vertices Tripo
    bound to it most; the model's triangles, size and textures. */
async function bones(input: string) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(input), rig = new Rig(doc), most = new Map<string, number>();
  let tris = 0;
  for (const skin of doc.getRoot().listSkins()) {
    const joints = skin.listJoints().map(j => j.getName());
    for (const node of doc.getRoot().listNodes()) if (node.getSkin() === skin) for (const p of node.getMesh()!.listPrimitives()) {
      const J = p.getAttribute('JOINTS_0'), W = p.getAttribute('WEIGHTS_0'); if (!J || !W) continue;
      for (let i = 0; i < J.getCount(); i++) {
        const j = J.getElement(i, [0, 0, 0, 0]), w = W.getElement(i, [0, 0, 0, 0]), k = w.indexOf(Math.max(...w));
        most.set(joints[j[k]], (most.get(joints[j[k]]) ?? 0) + 1);
      }
    }
  }
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3;
  const f = (n: number) => n.toFixed(3).padStart(7);
  const walk = (o: { name: string; children: { name: string }[] }, depth: number) => {
    const at = rig.at(o.name);
    console.log(`${'  '.repeat(depth)}${o.name.padEnd(24 - Math.min(20, depth * 2))} ${f(at.x)} ${f(at.y)} ${f(at.z)}   ${most.get(o.name) ?? 0} vertices`);
    for (const c of o.children) walk(c as typeof o, depth + 1);
  };
  console.log(`${input}: ${tris} triangles\nbone                          x       y       z   (where its joint stands; vertices bound to it most)`);
  for (const c of rig.root.children) walk(c, 0);
  for (const t of doc.getRoot().listTextures()) console.log(`texture ${t.getName() || '(unnamed)'}: ${t.getSize()?.join(' x ')} ${t.getMimeType()}, ${(t.getImage()!.byteLength / 1024).toFixed(0)} KB`);
  for (const m of doc.getRoot().listMaterials()) console.log(`material ${m.getName()}: ${m.getDoubleSided() ? 'two-sided' : 'one-sided'}, ${['base colour', 'normal'].filter((_, i) => i ? m.getNormalTexture() : m.getBaseColorTexture()).join(' and ')} texture`);
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('-'));
  if (process.argv.includes('--bones')) { if (!args[0]) { console.error('usage: npm run animate-creature -- --bones <in.glb>'); process.exit(1); } return bones(args[0]); }
  const [id, input] = args;
  const R = RECIPES[id as keyof typeof RECIPES];
  if (!R || !input) { console.error(`usage: npm run animate-creature -- <${Object.keys(RECIPES).join('|')}> <in.glb>`); process.exit(1); }
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'sharp': sharp });
  const doc = await io.read(input);
  // within its budget: the mesh simplified (before its skin is bound again)
  const B = BUDGETS[R.budget], tris = () => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3, 0), 0);
  const before = tris();
  if (before > B.triangles) { await MeshoptSimplifier.ready; await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: B.triangles / before * .97, error: .02, lockBorder: false })); }
  // its faces turned outward (Tripo left patches inside out, lit inward, only drawn because its material is two-sided)
  const oriented = orientOutward(doc);
  const rig = new Rig(doc);
  for (const [leg, def] of Object.entries(R.LEGS)) rig.leg(leg, def);
  const bound = reskin(doc, rig, R.SKIN, R.jawOf);
  bake(doc, rig, R.CLIPS, R.MOVING);
  const padded = [];
  for (const m of doc.getRoot().listMaterials()) { const t = m.getBaseColorTexture(); if (t) padded.push(await padIslands(doc, t)); }
  const out = resolve(import.meta.dirname, `../public/assets/creatures/${id}.glb`), full = out.replace(/\.glb$/, '.full.glb');
  mkdirSync(dirname(out), { recursive: true });
  await io.write(full, doc); // (the textures as imported, padded: the dev menu's comparison)
  // the game's: the normal map dropped (the pixel-art look lights in flat bands and never reads it), 1,024 px JPEG
  for (const m of doc.getRoot().listMaterials()) { const t = m.getNormalTexture(); if (t) { m.setNormalTexture(null); if (!t.listParents().some(p => p !== doc.getRoot())) t.dispose(); } }
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 88 }));
  await io.write(out, doc);
  // its bounds, for the game's scale
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const b = p.getAttribute('POSITION')!; lo = lo.map((v, i) => Math.min(v, b.getMinNormalized([])[i])); hi = hi.map((v, i) => Math.max(v, b.getMaxNormalized([])[i])); }
  const dataPath = resolve(import.meta.dirname, '../data/creatures.json');
  let data: Record<string, unknown> = {}; try { data = JSON.parse(readFileSync(dataPath, 'utf8')); } catch { /* the first */ }
  data[id] = {
    file: `assets/creatures/${id}.glb`, full: `assets/creatures/${id}.full.glb`, height: R.height, modelHeight: +(hi[1] - lo[1]).toFixed(3), modelLength: +(hi[2] - lo[2]).toFixed(3),
    walkSpeed: +R.WALK_SPEED.toFixed(4),
    clips: Object.fromEntries(Object.entries(R.CLIPS).map(([name, c]) => [name, { duration: c.duration, loop: c.loop, events: c.events.map(e => ({ ...e, t: +e.t.toFixed(3) })) }])),
    budget: R.budget,
  };
  writeFileSync(dataPath, JSON.stringify({ _comment: 'Written by tools/animate-creature.ts (docs/creatures.md): each animated creature\'s file, how tall it stands in the game, its walk\'s speed in model units a second, and its clips with the times their sounds fall.', ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== '_comment')) }, null, 2) + '\n');
  if (tris() > B.triangles) throw new Error(`${id}: ${tris()} triangles, over the ${R.budget} budget of ${B.triangles}`);
  console.log(`${id}: ${before} -> ${tris()} triangles (${R.budget} budget ${B.triangles}), ${oriented.turned} of ${oriented.faces} faces turned outward (${oriented.patches} patches), ${bound} vertices bound again, ${Object.keys(R.CLIPS).length} clips (${Object.keys(R.CLIPS).join(', ')}), ${padded.map(p => `${p.size} px texture: ${p.filled} texels padded round its islands`).join(', ')}, ${(statSync(out).size / 1024).toFixed(0)} KB -> ${out} (as imported: ${(statSync(full).size / 1024).toFixed(0)} KB)`);
}
main().catch(e => { console.error(e); process.exit(1); });
