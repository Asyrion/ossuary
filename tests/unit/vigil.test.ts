import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, blankSave, dustFor, migrate, obolsHome, validate } from '../../src/vigil/vigilData';
import { CFG } from '../../src/config';

const D = CFG.vigil.dust;

describe('the keeping (M7 step 4): one save', () => {
  it('takes over the five keys kept before it, once, when there is no save yet', () => {
    const s = migrate(null, {
      knowledge: { arc: { seen: true, learned: true, casts: 12 } }, reactions: ['steam', 3, 'shatter'], weaves: ['conductor'],
      bestiary: { sporeling: { met: true, weak: true, resist: false } }, recipes: { pairs: { 'ash+dew': 'healing', bad: 7 }, potions: ['healing'] },
    });
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.knowledge).toEqual({ arc: { seen: true, learned: true, casts: 12 } });
    expect(s.reactions).toEqual(['steam', 'shatter']); // (what isn't a name is dropped)
    expect(s.weaves).toEqual(['conductor']);
    expect(s.bestiary).toEqual({ sporeling: { met: true, weak: true, resist: false } });
    expect(s.recipes).toEqual({ pairs: { 'ash+dew': 'healing' }, potions: ['healing'] });
    expect(s).toMatchObject({ dust: 0, obols: 0, runs: 0, echoes: [] });
  });
  it('reads a save as stored, ignoring the old keys, and makes a malformed one whole', () => {
    const kept = { ...blankSave(), dust: 140, obols: 33, runs: 4, wins: 1, deepest: 6, reactions: ['blight'], echoes: [{ seed: 'A1', won: false, floor: 3, room: 'boss', template: 'boss_belfry', struck: 'tiger', carried: ['twin_staff'], level: 5, dust: 40, obols: 2 }] };
    const s = migrate(JSON.parse(JSON.stringify(kept)), { reactions: ['steam'] });
    expect(s.reactions).toEqual(['blight']); expect(s).toMatchObject({ dust: 140, obols: 33, runs: 4, wins: 1, deepest: 6 });
    expect(s.echoes[0]).toMatchObject({ seed: 'A1', struck: 'tiger', carried: ['twin_staff'] });
    const bad = migrate({ v: 1, dust: -5, obols: 'many', echoes: [{ nope: 1 }, { seed: 'B2', floor: 2 }], sigils: 'x', flags: { a: 1, b: {} } });
    expect(bad).toMatchObject({ dust: 0, obols: 0, sigils: { owned: [], placed: [] }, flags: { a: 1 } });
    expect(bad.echoes.map(e => e.seed)).toEqual(['B2']);
    expect(migrate('garbage')).toEqual(blankSave());
  });
  it('refuses to import what is not a save', () => {
    expect(validate(blankSave())).toEqual([]);
    expect(validate(null)).not.toEqual([]); expect(validate({ hello: 1 })).not.toEqual([]);
    expect(validate({ ...blankSave(), wins: 3, runs: 1 })).toContain('more wins than runs');
    expect(validate({ ...blankSave(), echoes: 'x' })).toContain('echoes is not a list');
  });
});

describe('what a run brings home', () => {
  it('pays Dust for the deepest floor, the bosses, Kaelith and the first finds, a line for each', () => {
    const r = dustFor({ floor: 3, bosses: 2, kaelith: false, firsts: 4, freed: 0, vows: 0, echoes: 0 }, D);
    expect(r.lines.map(l => l.source)).toEqual(['floor', 'bosses', 'firsts']);
    expect(r.total).toBe(3 * D.floor + 2 * D.boss + 4 * D.first);
    const win = dustFor({ floor: 6, bosses: 5, kaelith: true, firsts: 0, freed: 1, vows: 0, echoes: 0 }, D);
    expect(win.lines.find(l => l.source === 'kaelith')?.dust).toBe(D.kaelith);
    expect(win.total).toBe(6 * D.floor + 5 * D.boss + D.kaelith + D.shade);
  });
  it('pays the vows kept as a share of the rest, only once the run went deep enough', () => {
    const shallow = dustFor({ floor: D.vowFloor - 1, bosses: 1, kaelith: false, firsts: 0, freed: 0, vows: 2, echoes: 0 }, D);
    expect(shallow.lines.some(l => l.source === 'vows')).toBe(false);
    const deep = dustFor({ floor: D.vowFloor, bosses: 1, kaelith: false, firsts: 0, freed: 0, vows: 2, echoes: 0 }, D);
    const base = D.vowFloor * D.floor + D.boss;
    expect(deep.total).toBe(base + Math.round(base * D.vow * 2));
  });
  it('a first run to floor 3 with a shade freed buys a sigil, and a power takes a few runs (the plan\'s first numbers)', () => {
    const run = dustFor({ floor: 3, bosses: 2, kaelith: false, firsts: 3, freed: 1, vows: 0, echoes: 0 }, D).total;
    expect(run).toBeGreaterThanOrEqual(20 * 2); // (a sigil costs 20 to 60)
    expect(run * 3).toBeGreaterThanOrEqual(150); expect(run).toBeLessThan(150); // (a power, 100 to 200, takes more than one)
  });
  it('brings every obol home after a win, a tenth after a death', () => {
    expect(obolsHome(57, true, .1)).toBe(57); expect(obolsHome(57, false, .1)).toBe(5); expect(obolsHome(-3, false, .1)).toBe(0);
  });
});
