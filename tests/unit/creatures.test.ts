/* The animated creatures (data/creatures.json, docs/creatures.md): their data's check, and every name the game asks a
   creature for, its clips and its bones, found in it. A boss or Fen-Nex asking for a clip or bone its file lacks does
   nothing at all in the game (the clip isn't played, the glow rides nothing), so it is caught here. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PropertyBinding } from 'three';
import creatureData from '../../data/creatures.json';
import { validateCreatures, type CreatureInfo } from '../../src/actors/creatureData';
import { CFG } from '../../src/config';

const ROOT = resolve(import.meta.dirname, '../..');
const CREATURES = creatureData as unknown as Record<string, CreatureInfo>;

/** The names of a GLB's nodes as three.js's loader gives them (each name stripped of the characters a track path
    reserves: `tripo::Head_1` comes as `tripoHead_1`), and whether any two come out the same (the loader would then rename
    the second). */
function nodeNames(file: string) {
  const b = readFileSync(resolve(ROOT, 'public', file));
  expect(b.toString('latin1', 0, 4)).toBe('glTF');
  const json = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12))) as { nodes?: { name?: string }[] };
  const names = (json.nodes ?? []).map((n) => PropertyBinding.sanitizeNodeName(n.name ?? ''));
  return { names: new Set(names), clash: names.length !== new Set(names).size };
}

/** The clip names a source's calls to `.clip(` ask for (every quoted name in the first argument: `sp ? 'walk' : 'idle'`),
    by the top-level function they are in. */
function clipsAsked(path: string) {
  const src = readFileSync(resolve(ROOT, path), 'utf8'),
    by: Record<string, Set<string>> = {};
  const fns = [...src.matchAll(/^(?:export )?function (\w+)/gm)];
  fns.forEach((f, i) => {
    const body = src.slice(f.index, fns[i + 1]?.index ?? src.length),
      set = (by[f[1]] = new Set<string>());
    for (const m of body.matchAll(/\.clip(?:\?\.)?\(/g)) {
      // (its first argument: up to the comma or close at its own depth)
      let depth = 0,
        j = m.index + m[0].length;
      const from = j;
      for (; j < body.length; j++) {
        const ch = body[j];
        if (ch === '(') depth++;
        else if (ch === ')' && depth-- === 0) break;
        else if (ch === ',' && depth === 0) break;
      }
      for (const q of body.slice(from, j).matchAll(/'(\w+)'/g)) set.add(q[1]);
    }
  });
  return by;
}

describe('data/creatures.json', () => {
  it('is sound', () => {
    expect(validateCreatures(creatureData)).toEqual([]);
  });
  it('its check finds what is wrong', () => {
    const errors = validateCreatures({
      bad: {
        file: 'x.png',
        height: 0,
        modelHeight: 1,
        modelLength: 1,
        walkSpeed: -1,
        budget: 'huge',
        clips: {
          idle: { duration: 2, loop: 'yes', at: 3, speed: 0, events: [{ t: 5, sound: 'roar' }] },
        },
        texel: { file: 'a.png', glow: 'b.png', side: 100, colours: 0.5, glowing: -1 },
      },
    });
    for (const want of [
      'file must be a .glb',
      'height must be above 0',
      'walkSpeed',
      'budget "huge"',
      'loop must be',
      'speed must be above 0',
      'at must fall within',
      'a sound and a time',
      'side must be a power of two',
      'colours must be',
      'glowing must be',
    ])
      expect(errors.join('\n')).toContain(want);
    expect(
      validateCreatures({ bare: { file: 'a.glb', height: 1, modelHeight: 1, modelLength: 1, walkSpeed: 0 } }),
    ).toEqual(['bare: needs its clips, an idle among them', 'bare: texel: no baked texture (npm run texel-bake)']);
  });
});

describe('every name the game asks a creature for is in it', () => {
  type Made = {
    creature?: {
      id: string;
      head: string;
      bow?: Record<string, number>;
      look?: Record<string, number>;
      fire?: string;
      over?: Record<string, number>;
    };
  };
  const made = Object.entries(CFG.madeBosses as Record<string, Made>).flatMap(([boss, h]) =>
    h.creature ? [[boss, h.creature] as const] : [],
  );
  // the fight that plays each made boss's clips (actors/bosses.ts and the bosses with files of their own)
  const asked = {
    ...clipsAsked('src/actors/bosses.ts'),
    ...clipsAsked('src/actors/twinGuardians.ts'),
    ...clipsAsked('src/actors/kaelith.ts'),
    ...clipsAsked('src/actors/kaelithLooks.ts'),
  };
  const FIGHT: Record<string, string> = {
    warden: 'updateWarden',
    abbess: 'updateAbbess',
    pyre: 'updateKnight',
    hart: 'updateHart',
    tiger: 'updateTiger',
    twins: 'updateTwin',
    twins2: 'updateTwin',
    kaelith: 'updateKaelith',
    kaelith_kneel: 'kaelithKneeling',
  };

  it('every boss that fights as a creature has its fight here', () => {
    expect(made.map(([boss]) => boss).sort()).toEqual(Object.keys(FIGHT).sort());
    for (const fn of Object.values(FIGHT)) expect(asked[fn]?.size, fn).toBeGreaterThan(0);
  });

  for (const [boss, c] of made)
    it(`${boss}: its creature ${c.id}, the clips its fight plays and the bones it names`, () => {
      const info = CREATURES[c.id];
      expect(info, `${c.id} in data/creatures.json`).toBeDefined();
      const clips = Object.keys(info.clips);
      // (it starts in its idle; what is played over the others; what its fight asks for)
      const want = new Set(['idle', ...Object.keys(c.over ?? {}), ...asked[FIGHT[boss]]]);
      expect(
        [...want].filter((k) => !clips.includes(k)),
        `clips ${c.id} lacks`,
      ).toEqual([]);
      const { names, clash } = nodeNames(info.file);
      expect(clash).toBe(false);
      const bones = [c.head, ...Object.keys(c.bow ?? {}), ...Object.keys(c.look ?? {}), ...(c.fire ? [c.fire] : [])];
      expect(
        bones.filter((b) => !names.has(PropertyBinding.sanitizeNodeName(b))),
        `bones ${c.id} lacks`,
      ).toEqual([]);
    });

  it("Fen-Nex: both its creatures, the clips the familiar plays and those played over the rest; the full shape's breath", () => {
    const M = CFG.artifacts.fennex.made,
      fen = clipsAsked('src/combat/fennex.ts').updateFennex;
    expect([...fen].sort()).toEqual(['bite', 'breathe', 'idle', 'run', 'shake', 'trot']);
    for (const id of ['fennex', 'fennex_full']) {
      const info = CREATURES[id];
      expect(info, id).toBeDefined();
      // (the Rune Fox never breathes: only its full shape does, stage 3)
      const want = [...new Set(['idle', ...fen, ...M.over])].filter((k) => id === 'fennex_full' || k !== 'breathe');
      expect(
        want.filter((k) => !info.clips[k]),
        `clips ${id} lacks`,
      ).toEqual([]);
      expect(nodeNames(info.file).clash).toBe(false);
    }
    expect(CREATURES.fennex_full.clips.breathe.at).toBeGreaterThan(0); // (its bolts go out as its clip throws its head forward)
  });
  it("Fen-Nex: the bones its glows ride (actors/fennexLook.ts, the Rune Fox's lights and its full shape's)", () => {
    const src = readFileSync(resolve(ROOT, 'src/actors/fennexLook.ts'), 'utf8');
    const bonesIn = (fn: string) => {
      const from = src.indexOf(`function ${fn}(`),
        body = src.slice(from, src.indexOf('\n}\n', from));
      return [...new Set([...body.matchAll(/'(tripo::\w+)'/g)].map((m) => m[1]))];
    };
    for (const [fn, id] of [
      ['runeFoxLights', 'fennex'],
      ['fenNexLights', 'fennex_full'],
    ]) {
      const bones = bonesIn(fn),
        { names } = nodeNames(CREATURES[id].file);
      expect(bones.length, fn).toBeGreaterThan(1);
      expect(
        bones.filter((b) => !names.has(PropertyBinding.sanitizeNodeName(b))),
        `bones ${id} lacks`,
      ).toEqual([]);
    }
  });
});
