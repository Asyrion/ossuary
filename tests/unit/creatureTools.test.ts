/* The tools that make a Tripo creature fit for the game (docs/creatures.md): turning inside-out faces outward, padding a
   texture's islands, and turning a model that faces another way to face +z. */
import { describe, expect, it } from 'vitest';
import { Document } from '@gltf-transform/core';
import sharp from 'sharp';
import { orientOutward } from '../../tools/orientFaces';
import { padIslands } from '../../tools/padIslands';
import { faceForward } from '../../tools/creatureRig';
import * as THREE from 'three';

/** A unit cube about the origin, each side two faces wound outward, with its own corners (as a UV seam splits them). */
function cube(doc: Document) {
  const sides = [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] as const, pos: number[] = [], nor: number[] = [], idx: number[] = [];
  for (const [axis, sign] of sides) {
    const u = (axis + 1) % 3, v = (axis + 2) % 3, base = pos.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const p = [0, 0, 0], n = [0, 0, 0]; p[axis] = sign * .5; p[u] = a * .5; p[v] = b * .5 * sign; n[axis] = sign; pos.push(...p); nor.push(...n); }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const buf = doc.createBuffer();
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf));
  doc.createMesh().addPrimitive(prim);
  return prim;
}
/** Each face's winding normal, dotted with the way from the cube's centre to the face. */
function facing(prim: ReturnType<typeof cube>) {
  const P = prim.getAttribute('POSITION')!, I = prim.getIndices()!.getArray()!, out: number[] = [];
  for (let t = 0; t < I.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map(k => P.getElement(I[t + k], [0, 0, 0]));
    const e1 = b.map((x, i) => x - a[i]), e2 = c.map((x, i) => x - a[i]);
    const g = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    out.push(g.reduce((s, x, i) => s + x * (a[i] + b[i] + c[i]) / 3, 0));
  }
  return out;
}

describe('orientOutward', () => {
  it('turns the faces of a side wound inward back out, and leaves the rest', () => {
    const doc = new Document(), prim = cube(doc);
    expect(facing(prim).every(d => d > 0)).toBe(true);
    // one side inside out, as Tripo left its patches
    const I = prim.getIndices()!, a = Array.from(I.getArray()!);
    for (const t of [0, 3]) [a[t + 1], a[t + 2]] = [a[t + 2], a[t + 1]];
    I.setArray(new Uint32Array(a));
    expect(facing(prim).filter(d => d < 0)).toHaveLength(2);
    const r = orientOutward(doc);
    expect(r.faces).toBe(12);
    expect(facing(prim).every(d => d > 0)).toBe(true);
    // the normals made again point out of the cube
    const N = prim.getAttribute('NORMAL')!, P = prim.getAttribute('POSITION')!;
    for (let i = 0; i < P.getCount(); i++) { const n = N.getElement(i, [0, 0, 0]), p = P.getElement(i, [0, 0, 0]); expect(n[0] * p[0] + n[1] * p[1] + n[2] * p[2]).toBeGreaterThan(0); }
  });
});

describe('padIslands', () => {
  it('grows an island outward into the black round it, and keeps the island', async () => {
    const W = 16, img = Buffer.alloc(W * W * 3); // black, with a red island in the left half
    for (let y = 0; y < W; y++) for (let x = 0; x < W / 2; x++) img[(y * W + x) * 3] = 200;
    const doc = new Document(), buf = doc.createBuffer();
    const tex = doc.createTexture().setImage(new Uint8Array(await sharp(img, { raw: { width: W, height: W, channels: 3 } }).png().toBuffer())).setMimeType('image/png');
    const prim = doc.createPrimitive() // (two faces over the left half in UV)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(12)).setBuffer(buf))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array([0, 0, .5, 0, .5, 1, 0, 1])).setBuffer(buf))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array([0, 1, 2, 0, 2, 3])).setBuffer(buf))
      .setMaterial(doc.createMaterial().setBaseColorTexture(tex));
    doc.createMesh().addPrimitive(prim);
    const r = await padIslands(doc, tex, 64, 100);
    expect(r.size).toBe(W); expect(r.filled).toBe(W * W / 2);
    const { data } = await sharp(Buffer.from(tex.getImage()!)).raw().toBuffer({ resolveWithObject: true });
    for (const y of [0, 8, 15]) for (const x of [2, 9, 15]) expect(data[(y * W + x) * 3]).toBeGreaterThan(150); // (the island, and the black beside it now red)
  });
});

describe('faceForward', () => {
  it('turns a skinned model to face +z: its vertices, the top of its skeleton and its bind matrices together', () => {
    // a snout at +x on a skeleton of two joints (a root at the origin, a head joint at +x), bound in its rest pose
    const doc = new Document(), buf = doc.createBuffer();
    const head = doc.createNode('head').setTranslation([0.5, 0.2, 0]), root = doc.createNode('root').addChild(head);
    const ibms = [new THREE.Matrix4(), new THREE.Matrix4().makeTranslation(0.5, 0.2, 0).invert()].flatMap(m => m.toArray());
    const skin = doc.createSkin().addJoint(root).addJoint(head).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(new Float32Array(ibms)).setBuffer(buf));
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array([1, 0.2, 0])).setBuffer(buf))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array([1, 0, 0])).setBuffer(buf));
    doc.createScene().addChild(root).addChild(doc.createNode('mesh').setMesh(doc.createMesh().addPrimitive(prim)).setSkin(skin));
    faceForward(doc, -90);
    const near = (a: number[], b: number[]) => a.forEach((x, i) => expect(x).toBeCloseTo(b[i], 5));
    near(prim.getAttribute('POSITION')!.getElement(0, []), [0, 0.2, 1]); // (the snout now at +z)
    near(prim.getAttribute('NORMAL')!.getElement(0, []), [0, 0, 1]);
    near(head.getTranslation(), [0.5, 0.2, 0]); // (only the skeleton's top is turned; the head follows its parent)
    // each joint's world matrix times its inverse bind matrix is still the identity: the skin binds as it did
    const world = (n: typeof root) => new THREE.Matrix4().compose(new THREE.Vector3(...n.getTranslation()), new THREE.Quaternion(...n.getRotation()), new THREE.Vector3(1, 1, 1));
    const ibm = (i: number) => new THREE.Matrix4().fromArray(skin.getInverseBindMatrices()!.getElement(i, []));
    near(world(root).multiply(ibm(0)).toArray(), new THREE.Matrix4().toArray());
    near(world(root).multiply(world(head)).multiply(ibm(1)).toArray(), new THREE.Matrix4().toArray());
    near(world(root).multiply(world(head)).toArray().slice(12, 15), [0, 0.2, 0.5]); // (the head joint at +z)
  });
});
