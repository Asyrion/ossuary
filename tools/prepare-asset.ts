/* Prepare a Tripo GLB for the game: shrink textures to 1,024 px JPEG, write the result to public/assets/,
   and print a report on what the game will make of it.

   Usage: npm run prepare-asset -- <input.glb> [output-name.glb]

   The clip-role and base-detection logic is imported from src/actors so the report always matches
   what the game does at runtime. */
import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { mkdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { HIPS_OFFSET_LIMIT, HIPS_RE, assignRoles, hipsOffset, type Role } from '../src/actors/clipRoles';
import { findMiniatureBase, type MeshData } from '../src/actors/baseDetect';

const TEXTURE_SIZE = 1024;
const OUT_DIR = resolve(import.meta.dirname, '../public/assets');

const [input, outName] = process.argv.slice(2);
if (!input || !/\.glb$/i.test(input)) {
  console.error('Usage: npm run prepare-asset -- <input.glb> [output-name.glb]');
  process.exit(1);
}
const output = join(OUT_DIR, outName ?? basename(input));

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(input);

const report = analyse(doc);

// normal maps keep a little more JPEG quality, as the old Python script did
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [TEXTURE_SIZE, TEXTURE_SIZE], quality: 92, slots: /^normalTexture$/ }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [TEXTURE_SIZE, TEXTURE_SIZE], quality: 88, slots: /^(?!normalTexture$).*$/ }),
);
mkdirSync(OUT_DIR, { recursive: true });
await io.write(output, doc);

const kb = (f: string) => `${Math.round(statSync(f).size / 1024).toLocaleString('en')} KB`;
console.log(`\n${basename(input)} (${kb(input)}) -> ${output} (${kb(output)})\n`);
console.log(report.join('\n'));

/* ---------------------------------------------------------------- */

function analyse(doc: Document): string[] {
  const root = doc.getRoot();
  const lines: string[] = [];
  const row = (k: string, v: string) => lines.push(`${(k + ':').padEnd(14)} ${v}`);

  // triangles, counted per node instance like the game does
  const meshes: MeshData[] = [];
  let tris = 0;
  for (const scene of root.listScenes()) scene.traverse(node => {
    const mesh = node.getMesh(); if (!mesh) return;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // TRIANGLES only
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : pos.getCount();
      tris += count / 3;
      const positions = new Float32Array(pos.getCount() * 3), p = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p);
        positions[i * 3] = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
        positions[i * 3 + 1] = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
        positions[i * 3 + 2] = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
      }
      meshes.push({ positions, index: idx ? Array.from(idx.getArray()!) : [...Array(count).keys()] });
    }
  });
  row('Triangles', Math.round(tris).toLocaleString('en'));

  const skins = root.listSkins();
  const rigged = skins.length > 0;
  row('Rigged', rigged ? `yes (${skins.reduce((n, s) => n + s.listJoints().length, 0)} bones)` : 'no (static: procedural bob and lean)');

  // clips and the role each would get
  const anims = root.listAnimations();
  const roles = assignRoles(anims, a => a.getName());
  const roleOf = new Map<unknown, Role>(Object.entries(roles).map(([r, a]) => [a, r as Role]));
  if (!anims.length) row('Clips', 'none');
  else {
    row('Clips', `${anims.length}`);
    for (const a of anims) {
      const dur = Math.max(0, ...a.listSamplers().map(s => s.getInput()?.getMax([])[0] ?? 0));
      const role = [...Object.entries(roles)].filter(([, c]) => c === a).map(([r]) => r).join(' + ') || '(unused)';
      lines.push(`  ${a.getName().padEnd(28)} ${dur.toFixed(2).padStart(6)} s  -> ${role}`);
    }
    for (const r of ['idle', 'walk', 'cast', 'hit', 'death'] as Role[]) if (!roles[r]) lines.push(`  (no ${r} clip)`);
    if (!rigged) lines.push('  note: the model has no skin, so the game ignores these clips');
  }

  // horizontal hips offset, measured against the idle clip like centreHips()
  const hips = findHips(skins.flatMap(s => s.listJoints())) ?? findHips(root.listNodes());
  if (!hips) row('Hips offset', rigged ? 'no hips/pelvis bone found' : 'n/a');
  else {
    const track = (a: (typeof anims)[number] | undefined) => {
      const ch = a?.listChannels().find(c => c.getTargetNode() === hips && c.getTargetPath() === 'translation');
      const s = ch?.getSampler(); const out = s?.getOutput()?.getArray(); if (!s || !out) return null;
      if (s.getInterpolation() !== 'CUBICSPLINE') return Array.from(out);
      const v: number[] = []; for (let i = 0; i < out.length; i += 9) v.push(out[i + 3], out[i + 4], out[i + 5]);
      return v;
    };
    const ref = track(roles.idle); const rest = hips.getTranslation();
    const rx = ref ? ref[0] : rest[0], rz = ref ? ref[2] : rest[2];
    const found: string[] = [];
    for (const a of anims) {
      const t = track(a); if (!t) continue;
      const off = hipsOffset(t, rx, rz);
      if (off.dist >= HIPS_OFFSET_LIMIT) found.push(`${a.getName()} ${off.dist.toFixed(3)}${roleOf.has(a) && a !== roles.idle ? ' (re-centred in game)' : ''}`);
    }
    row('Hips offset', found.length ? `yes: ${found.join(', ')}` : `no (all clips within ${HIPS_OFFSET_LIMIT})`);
  }

  // round base, same test as stripMiniatureBase()
  const base = meshes.length ? findMiniatureBase(meshes) : null;
  row('Round base', base ? (rigged ? 'yes (kept: the game only strips bases from static models)' : 'yes (the game will cut it off)') : 'no');

  // textures and alpha, since JPEG drops alpha
  const blended = root.listMaterials().filter(m => m.getAlphaMode() !== 'OPAQUE').map(m => m.getName() || '(unnamed)');
  row('Textures', `${root.listTextures().length}, resized to max ${TEXTURE_SIZE} px JPEG`);
  if (blended.length) lines.push(`  warning: materials using alpha (${blended.join(', ')}) lose transparency as JPEG`);
  return lines;
}

function findHips(nodes: Node[]) { return nodes.find(n => HIPS_RE.test(n.getName())) ?? null; }
