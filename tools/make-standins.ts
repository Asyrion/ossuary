/* Stand-in assets for the pipeline's tests (M3.5 step 1): made here in code, in place of the owner's first Tripo and
   MidJourney files, then sent through the real pipeline (prepare-asset, prepare-texture) into tests/fixtures/assets/
   with a manifest the game loads under ?assets=/tests/fixtures/assets/assets.json. The urn starts off-centre and too
   heavy, so the run shows the script fixing both. They are test fixtures, never shipped.

   Usage: npx tsx tools/make-standins.ts */
import { Document, NodeIO } from '@gltf-transform/core';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import * as THREE from 'three';

const ROOT = resolve(import.meta.dirname, '..'), RAW = join(ROOT, 'tests/fixtures/raw'), OUT = join(ROOT, 'tests/fixtures/assets');
rmSync(RAW, { recursive: true, force: true }); rmSync(OUT, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true }); mkdirSync(OUT, { recursive: true });

/** A painted-looking texture: a base colour, soft blotches and bands, in `size` px (PNG). */
async function paint(size: number, base: string, marks: string, bands = 0) {
  let seed = size + base.length * 7; const R = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const blots = Array.from({ length: 40 }, () => `<circle cx="${R() * size}" cy="${R() * size}" r="${4 + R() * size / 10}" fill="${marks}" opacity="${.08 + R() * .15}"/>`).join('');
  const lines = Array.from({ length: bands }, (_, i) => `<rect x="0" y="${(i + 1) * size / (bands + 1) - 6}" width="${size}" height="12" fill="${marks}" opacity=".7"/>`).join('');
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="${base}"/>${blots}${lines}</svg>`)).png().toBuffer();
}

/** A GLB of one three.js geometry with a texture, moved by `at`. */
async function glb(file: string, geo: THREE.BufferGeometry, tex: Buffer, at: [number, number, number] = [0, 0, 0]) {
  const doc = new Document(), buf = doc.createBuffer(), g = geo.index ? geo : geo.setIndex([...Array(geo.attributes.position.count).keys()]);
  const acc = (type: 'VEC2' | 'VEC3' | 'SCALAR', a: ArrayLike<number>, int = false) => doc.createAccessor().setType(type).setArray(int ? new Uint32Array(a) : new Float32Array(a)).setBuffer(buf);
  const texture = doc.createTexture('paint').setImage(new Uint8Array(tex)).setMimeType('image/png');
  const mat = doc.createMaterial('paint').setBaseColorTexture(texture).setRoughnessFactor(.85).setMetallicFactor(0);
  const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc('SCALAR', g.index!.array, true))
    .setAttribute('POSITION', acc('VEC3', g.attributes.position.array)).setAttribute('NORMAL', acc('VEC3', g.attributes.normal.array)).setAttribute('TEXCOORD_0', acc('VEC2', g.attributes.uv.array));
  doc.createScene().addChild(doc.createNode('standin').setMesh(doc.createMesh().addPrimitive(prim)).setTranslation(at));
  await new NodeIO().write(join(RAW, file), doc);
}

const V = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));
// the urn: a glazed jar, finely turned (too many triangles) and off its centre, as a raw export might be
const urn = new THREE.LatheGeometry(V([[0, 0], [.16, 0], [.2, .05], [.27, .2], [.26, .3], [.18, .42], [.12, .48], [.13, .52], [.15, .55], [0, .56]]), 160); urn.computeVertexNormals();
await glb('urn.glb', urn, await paint(512, '#3f6f6a', '#d9c9a0', 3), [.35, .02, -.2]);
// the pedestal: an eight-sided column with a broad top
const ped = new THREE.LatheGeometry(V([[0, 0], [.4, 0], [.4, .06], [.3, .1], [.28, .58], [.42, .6], [.42, .7], [0, .7]]), 8); ped.computeVertexNormals();
await glb('pedestal.glb', ped, await paint(512, '#6b5a48', '#2a2018'));
// the Ember Sigil: a knotted ring of warm metal
await glb('ember_sigil.glb', new THREE.TorusKnotGeometry(.14, .04, 96, 12), await paint(512, '#c07a2a', '#ffd27a', 2));
// a crypt floor tile and the sigil's icon
await sharp(await paint(1024, '#5a5046', '#2e2620')).png().toFile(join(RAW, 'crypt_floor.png'));
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><g fill="none" stroke="#f0a040" stroke-width="18"><circle cx="128" cy="128" r="80"/><path d="M128 40 L128 216 M40 128 L216 128"/></g><circle cx="128" cy="128" r="30" fill="#ffcf70"/></svg>`)).png().toFile(join(RAW, 'ember_sigil_icon.png'));

// through the pipeline, as the owner's files would go
const run = (script: string, ...a: string[]) => console.log(execFileSync('npx', ['tsx', join(ROOT, 'tools', script), ...a, '--out', OUT, ...(script === 'prepare-texture.ts' ? ['--previews', join(ROOT, 'asset-previews')] : [])], { encoding: 'utf8', cwd: ROOT }));
run('prepare-asset.ts', join(RAW, 'urn.glb'), '--kind', 'prop', '--id', 'urn');
run('prepare-asset.ts', join(RAW, 'pedestal.glb'), '--kind', 'prop', '--id', 'pedestal');
run('prepare-asset.ts', join(RAW, 'ember_sigil.glb'), '--kind', 'artifact', '--id', 'ember_sigil');
run('prepare-texture.ts', join(RAW, 'crypt_floor.png'), '--kind', 'floor', '--id', 'crypt');
run('prepare-texture.ts', join(RAW, 'ember_sigil_icon.png'), '--kind', 'icon', '--id', 'ember_sigil');
rmSync(RAW, { recursive: true, force: true });

writeFileSync(join(OUT, 'assets.json'), JSON.stringify({
  props: { urn: { file: 'props/urn.glb', height: .6 }, pedestal: { file: 'props/pedestal.glb', height: .7 } },
  artifacts: { ember_sigil: { file: 'artifacts/ember_sigil.glb', height: .4 } },
  floors: { crypt: { floor: 'textures/crypt/floor.jpg' } },
  icons: { ember_sigil: { file: 'icons/ember_sigil.png' } },
}, null, 2) + '\n');
console.log(`stand-ins written to ${OUT}`);
