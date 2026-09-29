/* The checks tools/prepare-asset.ts makes on a model (M3.5, docs/assets.md: Pipeline, step 7), on a glTF document in
   memory so the unit tests can make models to fail them. Each check passes, warns, fails, or was fixed here: a model
   off its centre or under the floor is moved, a character facing away is turned, one over its budget is lowered to
   fit. The clip roles and the round-base test come from src/actors, so the report matches what the game does. */
import type { Document, Node, Texture } from '@gltf-transform/core';
import { simplify, weld } from '@gltf-transform/functions';
import { CORE_ROLES, HIPS_OFFSET_LIMIT, HIPS_RE, assignRoles, hipsOffset } from '../src/actors/clipRoles';
import { findMiniatureBase, type MeshData } from '../src/actors/baseDetect';
import { BUDGETS, type ModelKind } from '../src/assets/assetData';

export type Status = 'pass' | 'warn' | 'fail' | 'fixed';
export interface Check { name: string; status: Status; detail: string; more?: string[] }

/** What a model is: triangles, bounds, rig, textures. */
export interface Measure {
  tris: number; min: [number, number, number]; max: [number, number, number]; meshes: MeshData[];
  joints: Node[]; textures: { tex: Texture; size: [number, number] | null; alpha: boolean }[];
}

const fmt = (n: number) => Math.round(n).toLocaleString('en');
const d2 = (n: number) => n.toFixed(2);

/** Triangles (per node instance, as the game counts them), world bounds, joints and textures. */
export function measure(doc: Document): Measure {
  const root = doc.getRoot(), meshes: MeshData[] = [];
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  for (const scene of root.listScenes()) scene.traverse(node => {
    const mesh = node.getMesh(); if (!mesh) return;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // TRIANGLES only
      const pos = prim.getAttribute('POSITION'); if (!pos) continue;
      const idx = prim.getIndices(), count = idx ? idx.getCount() : pos.getCount();
      tris += count / 3;
      const positions = new Float32Array(pos.getCount() * 3), p = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, p);
        const w = [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
        for (let k = 0; k < 3; k++) { positions[i * 3 + k] = w[k]; if (w[k] < min[k]) min[k] = w[k]; if (w[k] > max[k]) max[k] = w[k]; }
      }
      meshes.push({ positions, index: idx ? Array.from(idx.getArray()!) : [...Array(count).keys()] });
    }
  });
  const alphaTex = new Set<Texture>();
  for (const mat of root.listMaterials()) if (mat.getAlphaMode() !== 'OPAQUE') { const t = mat.getBaseColorTexture(); if (t) alphaTex.add(t); }
  return {
    tris, min, max, meshes, joints: root.listSkins().flatMap(s => s.listJoints()),
    textures: root.listTextures().map(tex => ({ tex, size: tex.getSize() as [number, number] | null, alpha: alphaTex.has(tex) })),
  };
}

/** Where a character faces, from its hands: facing +Z (towards the camera), its left hand is at +X. */
export function facing(joints: Node[]): '+z' | '-z' | null {
  const hand = (side: RegExp) => joints.find(j => side.test(j.getName()) && /hand|wrist/i.test(j.getName()) && !/thumb|index|middle|ring|pinky/i.test(j.getName()));
  const l = hand(/left|(^|[^a-z])l[_.]|[_.]l$/i), r = hand(/right|(^|[^a-z])r[_.]|[_.]r$/i);
  if (!l || !r) return null;
  const lx = l.getWorldTranslation()[0], rx = r.getWorldTranslation()[0];
  return Math.abs(lx - rx) < 1e-6 ? null : lx > rx ? '+z' : '-z';
}

export interface PrepareOptions { /** meshoptimizer's MeshoptSimplifier, ready */ simplifier: unknown; /** change the model (default true) */ fix?: boolean }

/** Check a model against its kind's budget and fix what can be fixed. Returns the checks, in report order. */
export async function prepareModel(doc: Document, kind: ModelKind, opts: PrepareOptions): Promise<Check[]> {
  const B = BUDGETS[kind], fix = opts.fix !== false, checks: Check[] = [];
  const add = (name: string, status: Status, detail: string, more?: string[]) => checks.push({ name, status, detail, more });
  let m = measure(doc);
  const root = doc.getRoot(), rigged = m.joints.length > 0;

  // units first: nothing else means much if the model is a thousand times off
  const h = m.max[1] - m.min[1], w = Math.max(m.max[0] - m.min[0], m.max[2] - m.min[2]);
  if (!(m.tris > 0) || !(h > 0)) { add('Size', 'fail', 'no triangles to measure'); return checks; }
  if (h < 1e-3 || h > 1e3) { add('Size', 'fail', `${h.toExponential(1)} units tall: the export's units look wrong (expected about 0.1 to 100)`); return checks; }

  // rig: the kinds that move need one
  if (B.rigged && !rigged) add('Rig', 'fail', `a ${kind} needs a rig with clips; this model has none`);
  else if (!B.rigged && rigged) add('Rig', 'warn', `a ${kind} is static: the rig (${m.joints.length} bones) is ignored`);
  else add('Rig', 'pass', rigged ? `${m.joints.length} bones` : 'static');

  // facing +Z: characters, from their hands (static models: look at the preview)
  const face = rigged ? facing(m.joints) : null;
  const turn = face === '-z';
  if (!rigged) add('Facing', 'pass', 'not checked for a static model: look at it in the game');
  else if (!face) add('Facing', 'warn', 'no left and right hand bones to tell');
  else if (turn && fix) add('Facing', 'fixed', 'faced -Z: turned round to face +Z (towards the camera)');
  else add('Facing', turn ? 'fail' : 'pass', turn ? 'faces -Z: it should face +Z (towards the camera)' : 'faces +Z');

  // centred on the origin, standing on y = 0 (after the turn, if any)
  const cx = (m.min[0] + m.max[0]) / 2, cz = (m.min[2] + m.max[2]) / 2, off = Math.hypot(cx, cz), sink = m.min[1];
  const offCentre = off > .05 * Math.max(w, 1e-6), offFloor = Math.abs(sink) > .01 * h;
  if ((offCentre || offFloor || turn) && fix) {
    const holder = doc.createNode('prepared');
    // turned half round about Y, (x, z) becomes (-x, -z): move so the centre lands on the origin either way
    if (turn) holder.setRotation([0, 1, 0, 0]);
    holder.setTranslation(turn ? [cx, -sink, cz] : [-cx, -sink, -cz]);
    for (const scene of root.listScenes()) for (const child of scene.listChildren()) { scene.removeChild(child); holder.addChild(child); }
    for (const scene of root.listScenes()) scene.addChild(holder);
  }
  const where = [offCentre ? `centre was ${d2(off)} off the origin` : '', offFloor ? `base was at y = ${d2(sink)}` : ''].filter(Boolean).join(', ');
  add('Centre and base', where ? (fix ? 'fixed' : 'fail') : 'pass', where ? `${where}${fix ? ': moved to the origin, standing on y = 0' : ''}` : 'centred, standing on y = 0');

  // size and proportions (the game scales it to the height its entry gives)
  const ratio = w / h;
  add('Size', ratio > B.maxWidth ? 'warn' : 'pass',
    `${d2(m.max[0] - m.min[0])} × ${d2(h)} × ${d2(m.max[2] - m.min[2])} (w × h × d); ${B.height} tall in the game by default` +
    (ratio > B.maxWidth ? `; ${d2(ratio)} times wider than tall, more than a ${kind} (${B.maxWidth}): is it one object, standing up?` : ''));

  // triangles, lowered to the budget when over it
  const before = m.tris;
  if (before > B.triangles && fix) {
    await doc.transform(weld(), simplify({ simplifier: opts.simplifier, ratio: Math.min(1, B.triangles / before * .97), error: .02, lockBorder: false }));
    m = measure(doc);
  }
  add('Triangles', m.tris <= B.triangles ? (m.tris < before ? 'fixed' : 'pass') : 'fail',
    m.tris < before ? `${fmt(before)} lowered to ${fmt(m.tris)} (budget ${fmt(B.triangles)})` : `${fmt(m.tris)} (budget ${fmt(B.triangles)})${m.tris > B.triangles ? ': lower the face count in Tripo' : ''}`);

  // textures: shrunk to the kind's size by the script; too small reads blurry
  const sizes = m.textures.map(t => t.size ? Math.max(...t.size) : 0), small = sizes.filter(s => s > 0 && s < 256).length;
  add('Textures', !m.textures.length ? 'warn' : small ? 'warn' : 'pass',
    !m.textures.length ? 'none: the model shows its plain material colours' :
      `${m.textures.length}, largest ${Math.max(...sizes)} px, shipped at most ${B.texture} px` + (small ? `; ${small} under 256 px will look blurry` : ''));

  // transparency: JPEG drops it, so those textures stay PNG
  const alpha = m.textures.filter(t => t.alpha).length, blended = root.listMaterials().filter(x => x.getAlphaMode() !== 'OPAQUE');
  add('Alpha', blended.length ? 'warn' : 'pass', blended.length
    ? `${blended.length} material(s) use transparency (${blended.map(x => x.getName() || '(unnamed)').join(', ')}): ${alpha} texture(s) kept as PNG; check it isn't a leftover`
    : 'none (all textures JPEG)');

  // round base (Tripo figurines often stand on one): the game strips it only from a static hero
  const base = findMiniatureBase(m.meshes);
  add('Round base', 'pass', !base ? 'none' : kind === 'hero' && !rigged ? 'yes: the game cuts it off a static hero' : `looks like one: kept (a ${kind}'s foot is part of it)`);

  // clips and their roles, and horizontal hips offsets, for the kinds that move
  if (B.rigged && rigged) add('Clips', ...clipReport(doc));
  return checks;
}

function clipReport(doc: Document): [Status, string, string[]] {
  const root = doc.getRoot(), anims = root.listAnimations(), roles = assignRoles(anims, a => a.getName());
  if (!anims.length) return ['fail', 'none: a character needs at least idle and run', []];
  const lines = anims.map(a => {
    const dur = Math.max(0, ...a.listSamplers().map(s => s.getInput()?.getMax([])[0] ?? 0));
    const role = Object.entries(roles).filter(([, c]) => c === a).map(([r]) => r).join(' + ') || '(unused)';
    return `${a.getName().padEnd(28)} ${dur.toFixed(2).padStart(6)} s  -> ${role}`;
  });
  const missing = CORE_ROLES.filter(r => !roles[r]);
  // horizontal hips offsets, measured against the idle clip as the game's centreHips() does
  const hips = root.listSkins().flatMap(s => s.listJoints()).find(n => HIPS_RE.test(n.getName()));
  if (hips) {
    const track = (a: (typeof anims)[number] | undefined) => {
      const ch = a?.listChannels().find(c => c.getTargetNode() === hips && c.getTargetPath() === 'translation');
      const s = ch?.getSampler(), out = s?.getOutput()?.getArray(); if (!s || !out) return null;
      if (s.getInterpolation() !== 'CUBICSPLINE') return Array.from(out);
      const v: number[] = []; for (let i = 0; i < out.length; i += 9) v.push(out[i + 3], out[i + 4], out[i + 5]);
      return v;
    };
    const ref = track(roles.idle), rest = hips.getTranslation(), rx = ref ? ref[0] : rest[0], rz = ref ? ref[2] : rest[2];
    for (const a of anims) {
      const t = track(a); if (!t) continue;
      const o = hipsOffset(t, rx, rz); if (o.dist >= HIPS_OFFSET_LIMIT) lines.push(`hips move ${o.dist.toFixed(3)} sideways in ${a.getName()} (re-centred in the game)`);
    }
  }
  return [missing.length ? 'warn' : 'pass', `${anims.length}${missing.length ? `; no ${missing.join(', ')} clip (the game makes do)` : ''}`, lines];
}

/** The report as text lines, and whether anything failed. */
export function reportLines(checks: Check[]) {
  const mark: Record<Status, string> = { pass: 'ok  ', warn: 'warn', fail: 'FAIL', fixed: 'fix ' };
  const lines: string[] = [];
  for (const c of checks) { lines.push(`${mark[c.status]}  ${(c.name + ':').padEnd(16)} ${c.detail}`); for (const l of c.more ?? []) lines.push(`        ${l}`); }
  return { lines, failed: checks.some(c => c.status === 'fail') };
}
