import { describe, expect, it, beforeAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { Document } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';
import { BUDGETS, IMAGES, MANIFEST, manifestFiles, validateManifest, type Manifest } from '../../src/assets/assetData';
import { CFG } from '../../src/config';
import { facing, measure, prepareModel, type Check } from '../../tools/assetReport';
import { coinCircle, lightSpread, seamScore, transparentBorder } from '../../tools/imageChecks';
import artifacts from '../../data/artifacts.json';
import floors from '../../data/floors.json';

const known = { artifacts: new Set(artifacts.map((a) => a.id)), looks: new Set(floors.map((f) => f.look.name)) };

/** A glTF document holding one three.js geometry, moved by `at`; optionally with a rig whose hands face `face`. */
function model(geo: THREE.BufferGeometry, at: [number, number, number] = [0, 0, 0], face?: '+z' | '-z') {
  const doc = new Document(),
    buf = doc.createBuffer();
  const g = geo.index ? geo : geo.setIndex([...Array(geo.attributes.position.count).keys()]);
  const pos = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array(g.attributes.position.array))
    .setBuffer(buf);
  const idx = doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.index!.array)).setBuffer(buf);
  const mesh = doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION', pos).setIndices(idx));
  const node = doc.createNode('body').setMesh(mesh).setTranslation(at);
  const scene = doc.createScene().addChild(node);
  if (face) {
    const s = face === '+z' ? 1 : -1,
      hips = doc.createNode('mixamorig:Hips').setTranslation([0, 0.5, 0]);
    const l = doc.createNode('mixamorig:LeftHand').setTranslation([0.3 * s, 0.1, 0]),
      r = doc.createNode('mixamorig:RightHand').setTranslation([-0.3 * s, 0.1, 0]);
    hips.addChild(l).addChild(r);
    scene.addChild(hips);
    node.setSkin(doc.createSkin().addJoint(hips).addJoint(l).addJoint(r));
  }
  return doc;
}
const status = (checks: Check[], name: string) => checks.find((c) => c.name === name)?.status;
const urnLike = () =>
  new THREE.LatheGeometry(
    [
      [0, 0],
      [0.15, 0],
      [0.25, 0.2],
      [0.15, 0.44],
      [0.14, 0.54],
      [0, 0.55],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    12,
  );

beforeAll(async () => {
  await MeshoptSimplifier.ready;
});

describe('the model report', () => {
  it('passes a small prop that fits', async () => {
    const checks = await prepareModel(model(urnLike()), 'prop', { simplifier: MeshoptSimplifier });
    expect(checks.filter((c) => c.status === 'fail')).toEqual([]);
    expect(status(checks, 'Triangles')).toBe('pass');
    expect(status(checks, 'Centre and base')).toBe('pass');
  });
  it('lowers a model that is too heavy to its budget', async () => {
    const doc = model(new THREE.SphereGeometry(0.5, 128, 96)); // about 24,000 triangles
    expect(measure(doc).tris).toBeGreaterThan(BUDGETS.prop.triangles);
    const checks = await prepareModel(doc, 'prop', { simplifier: MeshoptSimplifier });
    expect(status(checks, 'Triangles')).toBe('fixed');
    expect(measure(doc).tris).toBeLessThanOrEqual(BUDGETS.prop.triangles);
  });
  it('fails a model that is too heavy when asked only to check', async () => {
    const checks = await prepareModel(model(new THREE.SphereGeometry(0.5, 128, 96)), 'prop', {
      simplifier: MeshoptSimplifier,
      fix: false,
    });
    expect(status(checks, 'Triangles')).toBe('fail');
  });
  it('fails a model whose units are wrong (far too small)', async () => {
    const checks = await prepareModel(model(urnLike().scale(1e-4, 1e-4, 1e-4)), 'prop', {
      simplifier: MeshoptSimplifier,
    });
    expect(status(checks, 'Size')).toBe('fail');
  });
  it('moves a model off its centre and under the floor back to the origin', async () => {
    const doc = model(urnLike(), [0.4, -0.2, -0.3]);
    const checks = await prepareModel(doc, 'prop', { simplifier: MeshoptSimplifier });
    expect(status(checks, 'Centre and base')).toBe('fixed');
    const m = measure(doc);
    expect((m.min[0] + m.max[0]) / 2).toBeCloseTo(0, 5);
    expect((m.min[2] + m.max[2]) / 2).toBeCloseTo(0, 5);
    expect(m.min[1]).toBeCloseTo(0, 5);
  });
  it('turns a character that faces away', async () => {
    const doc = model(new THREE.BoxGeometry(0.5, 1, 0.3).translate(0, 0.5, 0), [0, 0, 0], '-z');
    expect(facing(doc.getRoot().listSkins()[0].listJoints())).toBe('-z');
    const checks = await prepareModel(doc, 'enemy', { simplifier: MeshoptSimplifier });
    expect(status(checks, 'Facing')).toBe('fixed');
    expect(facing(doc.getRoot().listSkins()[0].listJoints())).toBe('+z');
    expect(status(checks, 'Clips')).toBe('fail'); // (and it has no clips)
  });
  it('fails a character with no rig, and notes a rig on a static kind', async () => {
    expect(
      status(
        await prepareModel(model(new THREE.BoxGeometry(0.5, 1, 0.3)), 'enemy', { simplifier: MeshoptSimplifier }),
        'Rig',
      ),
    ).toBe('fail');
    expect(
      status(
        await prepareModel(model(new THREE.BoxGeometry(0.5, 1, 0.3), [0, 0, 0], '+z'), 'prop', {
          simplifier: MeshoptSimplifier,
        }),
        'Rig',
      ),
    ).toBe('warn');
  });
  it('warns when a model is much wider than its kind', async () => {
    const checks = await prepareModel(model(new THREE.BoxGeometry(3, 0.2, 0.5)), 'prop', {
      simplifier: MeshoptSimplifier,
    });
    expect(status(checks, 'Size')).toBe('warn');
  });
});

describe('the asset manifest', () => {
  it('data/assets.json is valid and every file it names exists', () => {
    expect(validateManifest(MANIFEST, known)).toEqual([]);
    for (const f of manifestFiles(MANIFEST)) expect(existsSync(join('public/assets', f.file)), f.where).toBe(true);
  });
  it('the test manifest is valid and every file it names exists', () => {
    const dir = 'tests/fixtures/assets',
      m = JSON.parse(readFileSync(join(dir, 'assets.json'), 'utf8')) as Manifest;
    expect(validateManifest(m, known)).toEqual([]);
    expect(manifestFiles(m).length).toBeGreaterThan(0);
    for (const f of manifestFiles(m)) expect(existsSync(join(dir, f.file)), f.where).toBe(true);
  });
  it('catches unknown ids, bad heights and paths outside the assets folder', () => {
    const bad: Manifest = {
      props: { vase: { file: 'props/vase.glb', height: 0.5 }, urn: { file: 'props/urn.glb', height: 0 } },
      artifacts: { nothing: { file: '../x.glb', height: 0.4 } },
      floors: { moon: { floor: 'textures/moon/floor.gif' } },
      icons: { ember_sigil: { file: 'https://example.com/i.png' } },
      walls: {
        moon: { bricks: 'textures/moon/bricks.png' },
        crypt: { lattice: 'textures/crypt/l.png', bones: 'b.jpg' },
      },
    };
    const errs = validateManifest(bad, known).join('\n');
    for (const bit of [
      'props.vase',
      'props.urn: height',
      'artifacts.nothing: no such artifact',
      'artifacts.nothing: ../x.glb',
      'floors.moon: no such floor look',
      'floors.moon.floor',
      'icons.ember_sigil',
      'walls.moon: no such floor look',
      'walls.crypt.lattice: no such kind of wall',
      'walls.crypt.bones: b.jpg',
    ])
      expect(errs).toContain(bit);
  });
  it('coin faces: each names a face and an icon, and the obols wear one of them', () => {
    expect(MANIFEST.obol && MANIFEST.coins?.[MANIFEST.obol]).toBeTruthy();
    expect(IMAGES.coin.size).toBe(CFG.pickups.coinPixels * CFG.pixelLook.fineLayer); // (a face pixel for every pixel of the fine layer)
    const errs = validateManifest(
      {
        ...MANIFEST,
        coins: {
          'Pale Obol': { face: 'coins/p.png', icon: 'coins/p-icon.png' },
          owl: { face: 'coins/owl.jpg', icon: '../owl.png' },
        },
        obol: 'star_crystal',
      },
      known,
    ).join('\n');
    for (const bit of [
      "coins.Pale Obol: a coin's name",
      'coins.owl.face: coins/owl.jpg',
      'coins.owl.icon: ../owl.png',
      'obol: star_crystal is not one of the coins',
    ])
      expect(errs).toContain(bit);
    expect(
      manifestFiles({ ...MANIFEST, coins: { owl: { face: 'coins/owl.png', icon: 'coins/owl-icon.png' } } })
        .filter((f) => f.where.startsWith('coins.'))
        .map((f) => f.where),
    ).toEqual(['coins.owl.face', 'coins.owl.icon']);
  });
  it("the spells' circles of pixel art are there (magic/spellFx.ts `sigilTex`)", () => {
    for (const id of ['pyre_seal', 'consecrate', 'ferrymans_toll'])
      expect(existsSync(join('public/assets/textures/spells', `${id}.png`)), id).toBe(true);
  });
  it('budgets are positive for every kind', () => {
    for (const b of Object.values(BUDGETS)) {
      expect(b.triangles).toBeGreaterThan(0);
      expect(b.texture).toBeGreaterThan(0);
      expect(b.height).toBeGreaterThan(0);
    }
  });
});

describe('the texture checks', () => {
  /** A w × w RGB image from a brightness function. */
  const img = (w: number, f: (x: number, y: number) => number) => {
    const data = new Uint8Array(w * w * 3);
    for (let y = 0; y < w; y++)
      for (let x = 0; x < w; x++) {
        const v = Math.max(0, Math.min(255, f(x, y)));
        data.set([v, v, v], (y * w + x) * 3);
      }
    return { data, width: w, height: w, channels: 3 };
  };
  const w = 128,
    tiling = (x: number, y: number) => 120 + 30 * Math.sin((x / w) * Math.PI * 4) * Math.cos((y / w) * Math.PI * 6);
  it('a tile that repeats cleanly scores about 1 for seams; one that jumps at its edge scores high', () => {
    expect(seamScore(img(w, tiling))).toBeLessThan(2);
    expect(seamScore(img(w, (x, y) => tiling(x, y) + x * 0.6))).toBeGreaterThan(2); // (a ramp: the right edge meets the left with a step)
  });
  it('light baked into one side of a tile shows as spread', () => {
    expect(lightSpread(img(w, tiling))).toBeLessThan(0.25);
    expect(lightSpread(img(w, (x, y) => tiling(x, y) * (0.5 + x / w)))).toBeGreaterThan(0.25);
  });
  it('an icon cut out from its background has a transparent border', () => {
    const rgba = (clear: boolean) => {
      const d = new Uint8Array(32 * 32 * 4).fill(200);
      for (let y = 0; y < 32; y++)
        for (let x = 0; x < 32; x++) if (clear && (x < 4 || y < 4 || x > 27 || y > 27)) d[(y * 32 + x) * 4 + 3] = 0;
      return { data: d, width: 32, height: 32, channels: 4 };
    };
    expect(transparentBorder(rgba(true))).toBe(true);
    expect(transparentBorder(rgba(false))).toBe(false);
  });
  it('a coin is found on a white ground or cut out, as the circle across its width, a shadow under it left out', () => {
    /** A coin of radius 20 at (40, 30) on a 96 × 96 ground, a shadow 8 px deep under it; RGB on white, or RGBA cut out. */
    const coin = (cut: boolean) => {
      const c = cut ? 4 : 3,
        d = new Uint8Array(96 * 96 * c);
      for (let y = 0; y < 96; y++)
        for (let x = 0; x < 96; x++) {
          const i = (y * 96 + x) * c,
            on = Math.hypot(x + 0.5 - 40, y + 0.5 - 30) <= 20,
            shadow = !on && Math.abs(x + 0.5 - 40) < 14 && y >= 50 && y < 58;
          d.set(on ? [190, 150, 60] : shadow ? [120, 120, 120] : cut ? [0, 0, 0] : [255, 255, 255], i);
          if (cut) d[i + 3] = on || shadow ? 255 : 0;
        }
      return { data: d, width: 96, height: 96, channels: c };
    };
    for (const cut of [false, true]) {
      const found = coinCircle(coin(cut))!;
      expect(found.r).toBeCloseTo(20, 0);
      expect(found.cx).toBeCloseTo(40, 0);
      expect(found.cy).toBeCloseTo(30, 0);
      expect(found.round).toBeGreaterThan(1.1); // (the shadow: taller than wide, reported, and left out of the circle)
    }
    expect(coinCircle({ data: new Uint8Array(16 * 16 * 3).fill(255), width: 16, height: 16, channels: 3 })).toBeNull();
  });
});
