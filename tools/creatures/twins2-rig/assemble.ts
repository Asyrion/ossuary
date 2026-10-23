/* The second guardian on the first's skeleton: the first guardian's Tripo GLB (twins/walk.glb, its armature, skin and
   node rest rotations untouched) with its joints moved to where joints.json puts them in twins2's body, its inverse binds
   made again from them, and its mesh replaced by twins2's as Blender bound it (bound.glb, rig2.py), joints matched by
   name, its textures twins2's. Only the joints' translations change, so Tripo's preset clips (local rotations) replay
   on it as on the first guardian.
   npx tsx tools/creatures/twins2-rig/assemble.ts <twins walk.glb> <bound.glb> <joints.json> <out.glb> (build.sh runs it) */
import { NodeIO, type Node as GNode, type TypedArray } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

const [baseF, srcF, jointsF, outF] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const base = await io.read(baseF),
  src = await io.read(srcF);
const J = JSON.parse(readFileSync(jointsF, 'utf8')) as Record<string, [number, number, number]>;
const gl = (p: [number, number, number]) => new THREE.Vector3(p[0], p[2], -p[1]); // (Blender's z-up to glTF's y-up)

const world = (n: GNode): THREE.Matrix4 => {
  const m = new THREE.Matrix4().fromArray(n.getMatrix());
  const p = n.getParentNode();
  return p ? world(p).multiply(m) : m;
};
const skin = base.getRoot().listSkins()[0],
  joints = skin.listJoints();
// top-down, so each parent is moved before its children are placed under it
const depth = (n: GNode): number => (n.getParentNode() ? depth(n.getParentNode()!) + 1 : 0);
let moved = 0;
for (const j of [...joints].sort((a, b) => depth(a) - depth(b))) {
  const to = J[j.getName()];
  if (!to) continue;
  const p = j.getParentNode(),
    local = gl(to).applyMatrix4(p ? world(p).invert() : new THREE.Matrix4());
  if (local.distanceTo(new THREE.Vector3(...j.getTranslation())) > 1e-6) moved++;
  j.setTranslation(local.toArray());
}
const ibm = skin.getInverseBindMatrices()!;
joints.forEach((j, i) => ibm.setElement(i, world(j).invert().toArray()));

// the mesh: twins2's, as bound in Blender, its joints renumbered to the first guardian's skin
const srcSkin = src.getRoot().listSkins()[0],
  srcNames = srcSkin.listJoints().map((j) => j.getName()),
  names = joints.map((j) => j.getName());
const remap = srcNames.map((n) => {
  const i = names.indexOf(n);
  if (i < 0) throw new Error(`no joint ${n} in the first guardian's skin`);
  return i;
});
const srcPrim = src.getRoot().listMeshes()[0].listPrimitives()[0],
  node = base
    .getRoot()
    .listNodes()
    .find((n) => n.getSkin() === skin && n.getMesh())!,
  prim = node.getMesh()!.listPrimitives()[0];
const buf = base.getRoot().listBuffers()[0];
const copy = (semantic: string, f?: (a: TypedArray) => TypedArray) => {
  const a = semantic === 'indices' ? srcPrim.getIndices()! : srcPrim.getAttribute(semantic)!;
  let arr = a.getArray()!.slice();
  if (f) arr = f(arr);
  return base.createAccessor().setType(a.getType()).setArray(arr).setNormalized(a.getNormalized()).setBuffer(buf);
};
for (const s of prim.listSemantics()) prim.setAttribute(s, null);
for (const s of srcPrim.listSemantics())
  prim.setAttribute(
    s,
    copy(
      s,
      s === 'JOINTS_0'
        ? (a) => {
            const out = new Uint16Array(a.length);
            for (let i = 0; i < a.length; i++) out[i] = remap[a[i]];
            return out;
          }
        : undefined,
    ),
  );
prim.setIndices(copy('indices'));
// its textures: twins2's images in the first guardian's material's slots
const sm = srcPrim.getMaterial()!,
  m = prim.getMaterial()!;
for (const [get, name] of [
  [(x: typeof m) => x.getBaseColorTexture(), 'base colour'],
  [(x: typeof m) => x.getNormalTexture(), 'normal'],
  [(x: typeof m) => x.getMetallicRoughnessTexture(), 'metal-rough'],
] as const) {
  const t = get(m),
    s = get(sm);
  if (t && s) t.setImage(s.getImage()).setMimeType(s.getMimeType());
  else console.log(`(no ${name} texture to carry: ${!!t} ${!!s})`);
}
for (const a of base.getRoot().listAccessors()) if (!a.listParents().some((p) => p !== base.getRoot())) a.dispose();
const pos = prim.getAttribute('POSITION')!;
console.log(
  `${moved} joints moved, ${pos.getCount()} vertices, bounds ${pos
    .getMin([])
    .map((x) => x.toFixed(3))
    .join(',')} .. ${pos
    .getMax([])
    .map((x) => x.toFixed(3))
    .join(',')}, ${srcNames.length} joints in Blender's skin`,
);
await io.write(outF, base);
