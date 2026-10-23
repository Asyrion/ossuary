/* Animate a rigged creature in code (docs/creatures.md):
     npm run animate-creature -- owlbear path/to/owlbear.glb
     npm run animate-creature -- --bones [--face=-90] path/to/model.glb   (reads a new model's rig, for writing its recipe;
                                                                          --face turns it to face +z first)
   Reads a Tripo GLB, binds its skin again from the bones (Tripo's auto-rig weights can't bend a limb), bakes
   the clips of its recipe (tools/creatures/<id>.ts) into it as glTF animations, cuts its textures to 1,024 px JPEG and
   writes public/assets/creatures/<id>.glb, with what the game needs to play it (each clip's length, whether it loops,
   when its sounds fall, how fast its walk goes) in data/creatures.json, then bakes its texture as pixel art (texel-bake.ts). */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Rig, bake, faceForward, mixamoFacing, reskin, restFromBind, type SkinBone } from './creatureRig';
import { padIslands } from './padIslands';
import { orientOutward } from './orientFaces';
import * as owlbear from './creatures/owlbear';
import * as dragonling from './creatures/dragonling';
import * as chameleon from './creatures/chameleon';
import * as hart from './creatures/hart';
import * as warden from './creatures/warden';
import { TOWNSFOLK_RECIPES } from './creatures/townsfolk';
import { BUDGETS } from '../src/assets/assetData';
import { texelBake } from './texel-bake';

/** Each recipe: its legs, skin, jaw, clips, the bones that move, its walk's speed, how far it is turned to face +z, how
    tall it stands in the game, and the budget it keeps to (data/assets.json: a creature the size of a boss keeps a boss's). */
const RECIPES = {
  owlbear: { ...owlbear, face: 0, height: 1.45, budget: 'boss' as const },
  dragonling: { ...dragonling, height: 1.8, budget: 'boss' as const }, // (about a horse)
  chameleon: { ...chameleon, height: 1.4, budget: 'boss' as const }, // (a pony)
  hart: { ...hart, height: 2.8, budget: 'boss' as const }, // (floor 4's boss, its antlers counted; it fights: madeBosses.ts)
  warden: { ...warden, height: 2.2, budget: 'boss' as const }, // (floor 1's boss, its candles counted; it fights: madeBosses.ts)
  ...TOWNSFOLK_RECIPES, // (the townspeople, the Ferryman, Dr. Jelly and Kaelith, one Mixamo recipe)
} as Record<
  string,
  {
    LEGS: Record<string, import('./creatureRig').LegDef>;
    SKIN: SkinBone[] | null;
    jawOf?: (p: import('three').Vector3) => string | null;
    REMAP?: Record<string, string>;
    CLIPS: Record<string, import('./creatureRig').ClipDef>;
    MOVING: readonly string[];
    WALK_SPEED: number;
    face: number | 'mixamo';
    height: number;
    fine?: boolean;
    budget: 'boss' | 'enemy';
    rebind?: SkinBone[];
    triangles?: number;
  }
>;

/** Whether a skin's weights are spent: most of its vertices on one bone (an export that lost them binds all to the hips). */
function weightsLost(doc: import('@gltf-transform/core').Document) {
  const most = new Map<number, number>();
  let all = 0;
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const J = p.getAttribute('JOINTS_0'),
        W = p.getAttribute('WEIGHTS_0');
      if (!J || !W) continue;
      for (let i = 0, j = [0, 0, 0, 0], w = [0, 0, 0, 0]; i < J.getCount(); i++) {
        J.getElement(i, j);
        W.getElement(i, w);
        const k = w.indexOf(Math.max(...w));
        most.set(j[k], (most.get(j[k]) ?? 0) + 1);
        all++;
      }
    }
  return all > 0 && Math.max(...most.values()) / all > 0.8;
}

/** `--bones <in.glb>`: what a new creature's recipe needs to know, read off the model before one is written. Each bone in
    its tree with where its joint stands (the model's frame: x left-right, y up, z forward) and how many vertices Tripo
    bound to it most (a node of the tree that no skin uses is marked as not a bone); the model's triangles, size and textures. */
async function bones(input: string, face: number) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(input);
  restFromBind(doc);
  faceForward(doc, face);
  const rig = new Rig(doc),
    most = new Map<string, number>();
  const joint = new Set(
    doc
      .getRoot()
      .listSkins()
      .flatMap((s) => s.listJoints().map((j) => j.getName())),
  );
  let tris = 0;
  for (const skin of doc.getRoot().listSkins()) {
    const joints = skin.listJoints().map((j) => j.getName());
    for (const node of doc.getRoot().listNodes())
      if (node.getSkin() === skin)
        for (const p of node.getMesh()!.listPrimitives()) {
          const J = p.getAttribute('JOINTS_0'),
            W = p.getAttribute('WEIGHTS_0');
          if (!J || !W) continue;
          for (let i = 0; i < J.getCount(); i++) {
            const j = J.getElement(i, [0, 0, 0, 0]),
              w = W.getElement(i, [0, 0, 0, 0]),
              k = w.indexOf(Math.max(...w));
            most.set(joints[j[k]], (most.get(joints[j[k]]) ?? 0) + 1);
          }
        }
  }
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives())
      tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3;
  const f = (n: number) => n.toFixed(3).padStart(7);
  const walk = (o: { name: string; children: { name: string }[] }, depth: number) => {
    const at = rig.at(o.name);
    console.log(
      `${'  '.repeat(depth)}${o.name.padEnd(24 - Math.min(20, depth * 2))} ${f(at.x)} ${f(at.y)} ${f(at.z)}   ${joint.has(o.name) ? `${most.get(o.name) ?? 0} vertices` : '(not a bone)'}`,
    );
    for (const c of o.children) walk(c as typeof o, depth + 1);
  };
  console.log(
    `${input}: ${tris} triangles\nbone                          x       y       z   (where its joint stands; vertices bound to it most)`,
  );
  for (const c of rig.root.children) walk(c, 0);
  for (const t of doc.getRoot().listTextures())
    console.log(
      `texture ${t.getName() || '(unnamed)'}: ${t.getSize()?.join(' x ')} ${t.getMimeType()}, ${(t.getImage()!.byteLength / 1024).toFixed(0)} KB`,
    );
  for (const m of doc.getRoot().listMaterials()) {
    const tex = ['base colour', 'normal'].filter((_, i) => (i ? m.getNormalTexture() : m.getBaseColorTexture()));
    console.log(
      `material ${m.getName()}: ${m.getDoubleSided() ? 'two-sided' : 'one-sided'}, ${tex.length ? tex.join(' and ') + ' texture' : 'no textures'}`,
    );
  }
}

async function main() {
  const face = process.argv.find((a) => a.startsWith('--face='))?.slice(7);
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-') || /^-\d/.test(a));
  if (process.argv.includes('--bones')) {
    if (!args[0]) {
      console.error('usage: npm run animate-creature -- --bones [--face=<degrees>] <in.glb>');
      process.exit(1);
    }
    return bones(args[0], +(face ?? 0));
  }
  const [id, input] = args;
  const R = RECIPES[id];
  if (!R || !input) {
    console.error(`usage: npm run animate-creature -- <${Object.keys(RECIPES).join('|')}> <in.glb>`);
    process.exit(1);
  }
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ sharp: sharp });
  const doc = await io.read(input);
  for (const e of doc.getRoot().listExtensionsUsed()) if (e.extensionName === 'KHR_materials_volume') e.dispose(); // (a converter's glass, which the game doesn't draw)
  const rebuilt = restFromBind(doc); // (a rest pose lost in an FBX converter, rebuilt from the bind)
  const skin = R.rebind && (rebuilt || weightsLost(doc)) ? R.rebind : R.SKIN; // (and its weights bound again from the bones)
  const turned = R.face === 'mixamo' ? mixamoFacing(new Rig(doc)) : R.face;
  faceForward(doc, turned); // (turned to face +z, if Tripo set it facing another way)
  // within its budget: the mesh simplified (before its skin is bound again)
  const B = { ...BUDGETS[R.budget], ...(R.triangles && { triangles: R.triangles }) },
    tris = () =>
      doc
        .getRoot()
        .listMeshes()
        .reduce(
          (n, m) =>
            n +
            m
              .listPrimitives()
              .reduce((k, p) => k + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')!.getCount()) / 3, 0),
          0,
        );
  const before = tris();
  // (again, a little tighter, while the simplifier stops short of the budget: it stops at its error as well as its ratio)
  for (let k = 0; k < 8 && tris() > B.triangles; k++) {
    await MeshoptSimplifier.ready;
    await doc.transform(
      weld(),
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: (B.triangles / tris()) * 0.97,
        error: 0.02 * 2 ** k,
        lockBorder: false,
      }),
    );
  }
  // its faces turned outward (Tripo left patches inside out, lit inward, only drawn because its material is two-sided)
  const oriented = orientOutward(doc);
  const rig = new Rig(doc);
  for (const [leg, def] of Object.entries(R.LEGS)) rig.leg(leg, def);
  const bound = reskin(doc, rig, skin, R.jawOf, R.REMAP);
  bake(doc, rig, R.CLIPS, R.MOVING);
  const padded = [];
  for (const m of doc.getRoot().listMaterials()) {
    const t = m.getBaseColorTexture();
    if (t) padded.push(await padIslands(doc, t));
  }
  if (tris() > B.triangles)
    throw new Error(`${id}: ${tris()} triangles, over the ${R.budget} budget of ${B.triangles} (nothing written)`);
  const out = resolve(import.meta.dirname, `../public/assets/creatures/${id}.glb`);
  mkdirSync(dirname(out), { recursive: true });
  // the game's: the normal map dropped (the pixel-art look lights in flat bands and never reads it), 1,024 px JPEG
  for (const m of doc.getRoot().listMaterials()) {
    const t = m.getNormalTexture();
    if (t) {
      m.setNormalTexture(null);
      if (!t.listParents().some((p) => p !== doc.getRoot())) t.dispose();
    }
  }
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 88 }));
  await io.write(out, doc);
  // its bounds, for the game's scale
  let lo = [1e9, 1e9, 1e9],
    hi = [-1e9, -1e9, -1e9];
  for (const m of doc.getRoot().listMeshes())
    for (const p of m.listPrimitives()) {
      const b = p.getAttribute('POSITION')!;
      lo = lo.map((v, i) => Math.min(v, b.getMinNormalized([])[i]));
      hi = hi.map((v, i) => Math.max(v, b.getMaxNormalized([])[i]));
    }
  const dataPath = resolve(import.meta.dirname, '../data/creatures.json');
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(readFileSync(dataPath, 'utf8')) as Record<string, unknown>;
  } catch {
    /* the first */
  }
  data[id] = {
    file: `assets/creatures/${id}.glb`,
    height: R.height,
    ...(R.fine && { fine: true }),
    modelHeight: +(hi[1] - lo[1]).toFixed(3),
    modelLength: +(hi[2] - lo[2]).toFixed(3),
    walkSpeed: +R.WALK_SPEED.toFixed(4),
    clips: Object.fromEntries(
      Object.entries(R.CLIPS).map(([name, c]) => [
        name,
        {
          duration: c.duration,
          loop: c.loop,
          ...(c.speed && { speed: +c.speed.toFixed(4) }),
          ...(c.at !== undefined && { at: c.at }),
          events: c.events.map((e) => ({ ...e, t: +e.t.toFixed(3) })),
        },
      ]),
    ),
    budget: R.budget,
  };
  writeFileSync(
    dataPath,
    JSON.stringify(
      {
        _comment:
          "Written by tools/animate-creature.ts (docs/creatures.md): each animated creature's file, how tall it stands in the game, its walk's speed in model units a second, and its clips with the times their sounds fall.",
        ...Object.fromEntries(Object.entries(data).filter(([k]) => k !== '_comment')),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `${id}: ${before} -> ${tris()} triangles (${R.budget} budget ${B.triangles}), ${oriented.turned} of ${oriented.faces} faces turned outward (${oriented.patches} patches), ${bound} vertices bound again, ${Object.keys(R.CLIPS).length} clips (${Object.keys(R.CLIPS).join(', ')}), ${padded.map((p) => `${p.size} px texture: ${p.filled} texels padded round its islands`).join(', ')}, ${(statSync(out).size / 1024).toFixed(0)} KB -> ${out}${rebuilt ? `, its rest pose rebuilt from the bind (${rebuilt} joints)` : ''}${skin === R.rebind && skin ? ', its skin bound again from the Mixamo bones' : ''}, turned ${turned} degrees`,
  );
  await texelBake(id); // (its texture as pixel art at the size the game draws it)
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
