import { describe, expect, it } from 'vitest';
import { SAVE_VERSION, blankSave, dustFor, migrate, obolsHome, validate } from '../../src/vigil/vigilData';
import { CFG } from '../../src/config';
import { BAR_SCHOOLS, VIGIL, validateVigil, vigilPlan, type VigilMap } from '../../src/vigil/vigilMap';
import { FLOORS, generateFloor } from '../../src/world/generate';
import { Rng } from '../../src/rng';

const D = CFG.vigil.dust;

describe('the keeping (M7 step 4): one save', () => {
  it('takes over the five keys kept before it, once, when there is no save yet', () => {
    const s = migrate(null, {
      knowledge: { arc: { seen: true, learned: true, casts: 12 } },
      reactions: ['steam', 3, 'shatter'],
      weaves: ['conductor'],
      bestiary: { sporeling: { met: true, weak: true, resist: false } },
      recipes: { pairs: { 'ash+dew': 'healing', bad: 7 }, potions: ['healing'] },
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
    const kept = {
      ...blankSave(),
      dust: 140,
      obols: 33,
      runs: 4,
      wins: 1,
      deepest: 6,
      reactions: ['blight'],
      echoes: [
        {
          seed: 'A1',
          won: false,
          floor: 3,
          room: 'boss',
          template: 'boss_belfry',
          struck: 'tiger',
          carried: ['twin_staff'],
          level: 5,
          dust: 40,
          obols: 2,
          felled: ['warden'],
        },
      ],
    };
    const s = migrate(JSON.parse(JSON.stringify(kept)), { reactions: ['steam'] });
    expect(s.reactions).toEqual(['blight']);
    expect(s).toMatchObject({ dust: 140, obols: 33, runs: 4, wins: 1, deepest: 6 });
    expect(s.echoes[0]).toMatchObject({ seed: 'A1', struck: 'tiger', carried: ['twin_staff'] });
    const bad = migrate({
      v: 1,
      dust: -5,
      obols: 'many',
      echoes: [{ nope: 1 }, { seed: 'B2', floor: 2 }],
      sigils: 'x',
      flags: { a: 1, b: {} },
    });
    expect(bad).toMatchObject({ dust: 0, obols: 0, sigils: { owned: [], placed: [] }, flags: { a: 1 } });
    expect(bad.echoes.map((e) => e.seed)).toEqual(['B2']);
    expect(migrate('garbage')).toEqual(blankSave());
  });
  it('refuses to import what is not a save', () => {
    expect(validate(blankSave())).toEqual([]);
    expect(validate(null)).not.toEqual([]);
    expect(validate({ hello: 1 })).not.toEqual([]);
    expect(validate({ ...blankSave(), wins: 3, runs: 1 })).toContain('more wins than runs');
    expect(validate({ ...blankSave(), echoes: 'x' })).toContain('echoes is not a list');
  });
});

describe('what a run brings home', () => {
  it('pays Dust for the deepest floor, the bosses, Kaelith and the first finds, a line for each', () => {
    const r = dustFor({ floor: 3, bosses: 2, kaelith: false, firsts: 4, freed: 0, vows: 0, echoes: 0 }, D);
    expect(r.lines.map((l) => l.source)).toEqual(['floor', 'bosses', 'firsts']);
    expect(r.total).toBe(3 * D.floor + 2 * D.boss + 4 * D.first);
    const win = dustFor({ floor: 6, bosses: 5, kaelith: true, firsts: 0, freed: 1, vows: 0, echoes: 0 }, D);
    expect(win.lines.find((l) => l.source === 'kaelith')?.dust).toBe(D.kaelith);
    expect(win.total).toBe(6 * D.floor + 5 * D.boss + D.kaelith + D.shade);
  });
  it('pays the vows kept as a share of the rest, only once the run went deep enough', () => {
    const shallow = dustFor(
      { floor: D.vowFloor - 1, bosses: 1, kaelith: false, firsts: 0, freed: 0, vows: 2, echoes: 0 },
      D,
    );
    expect(shallow.lines.some((l) => l.source === 'vows')).toBe(false);
    const deep = dustFor({ floor: D.vowFloor, bosses: 1, kaelith: false, firsts: 0, freed: 0, vows: 2, echoes: 0 }, D);
    const base = D.vowFloor * D.floor + D.boss;
    expect(deep.total).toBe(base + Math.round(base * D.vow * 2));
  });
  it("a first run to floor 3 with a shade freed buys a sigil, and a power takes a few runs (the plan's first numbers)", () => {
    const run = dustFor({ floor: 3, bosses: 2, kaelith: false, firsts: 3, freed: 1, vows: 0, echoes: 0 }, D).total;
    expect(run).toBeGreaterThanOrEqual(20 * 2); // (a sigil costs 20 to 60)
    expect(run * 3).toBeGreaterThanOrEqual(150);
    expect(run).toBeLessThan(150); // (a power, 100 to 200, takes more than one)
  });
  it('brings every obol home after a win, a tenth after a death', () => {
    expect(obolsHome(57, true, 0.1)).toBe(57);
    expect(obolsHome(57, false, 0.1)).toBe(5);
    expect(obolsHome(-3, false, 0.1)).toBe(0);
  });
});

describe('the Vigil as a place (M7 step 5): its map', () => {
  const copy = (): VigilMap => JSON.parse(JSON.stringify(VIGIL)) as VigilMap;
  it('passes its checks: three rooms laid by hand, the Crypt first, nothing to fight; six more behind the barred ways', () => {
    expect(validateVigil()).toEqual([]);
    const plan = vigilPlan(new Rng(7)),
      names = VIGIL.rooms.map((r) => r.name);
    expect(plan.rooms.map((r) => r.templateId)).toEqual([
      'vigil_crypt',
      'vigil_nave',
      'vigil_landing',
      'vigil_cave',
      'vigil_chapel',
      'vigil_pool',
      'vigil_gallery',
      'vigil_garden',
      'vigil_practice',
    ]);
    expect(plan.startId).toBe(0);
    expect(plan.bossId).toBe(-1);
    expect(plan.rooms.every((r) => r.type === 'vigil' && r.dist !== undefined)).toBe(true);
    const to = (i: number) => plan.rooms[i].doors.map((d) => names[d.to] + (d.barred ? '#' : '')).sort();
    expect(to(0)).toEqual(['chapel#', 'nave']); // (the Crypt to the Nave, and its chapel barred by Hallow)
    expect(to(1)).toEqual(['cave#', 'crypt', 'gallery#', 'landing', 'pool#']);
    expect(to(2)).toEqual(['garden#', 'nave', 'practice#']);
    for (const r of VIGIL.rooms.filter((o) => o.behind)) expect(to(names.indexOf(r.name)), r.name).toHaveLength(1); // (each behind its way alone, though it touches others)
    expect(VIGIL.pieces.map((p) => p.kind)).toEqual(
      expect.arrayContaining(['bier', 'candleWall', 'skulls', 'lectern', 'plinth', 'boat']),
    );
  });
  it('bars six ways, one a school, each leading into the room behind it (M7 step 9)', () => {
    expect(VIGIL.bars.map((b) => b.school).sort()).toEqual([...BAR_SCHOOLS].sort());
    expect(
      VIGIL.rooms
        .filter((r) => r.behind)
        .map((r) => r.behind)
        .sort(),
    ).toEqual([...BAR_SCHOOLS].sort());
    const into = copy();
    into.bars[0] = { ...into.bars[0], room: 'landing', side: 'w', at: [0, 2], size: [1, 3] }; // (the Landing's west wall: the Nave beyond)
    expect(validateVigil(into).join()).toMatch(/leads into the nave, not the cave behind it/);
    const out = copy();
    out.bars.find((b) => b.school === 'storm')!.at = [12, 0]; // (the Nave's north wall over its first cell: the Cave Mouth, not the pool)
    expect(validateVigil(out).join()).toMatch(/storm bar leads into the cave, not the pool/);
    const two = copy();
    two.bars[1] = { ...two.bars[1], school: two.bars[0].school };
    expect(validateVigil(two).join()).toMatch(/one school each/);
    const first = copy();
    first.rooms[0] = { ...first.rooms[0], behind: 'ember' };
    expect(validateVigil(first).join()).toMatch(/first room is barred/);
  });
  it('opens a way when its school is among the parts opened (M7 step 9)', () => {
    const shut = vigilPlan(new Rng(7)),
      open = vigilPlan(new Rng(7), VIGIL, undefined, ['ember', 'verdant']);
    const barred = (p: typeof shut) =>
      p.rooms
        .flatMap((r, i) =>
          r.doors.filter((d) => d.barred).map((d) => `${VIGIL.rooms[i].name}>${VIGIL.rooms[d.to].name}`),
        )
        .sort();
    expect(barred(shut)).toHaveLength(12); // (six ways, each from both sides)
    expect(barred(open)).not.toContain('nave>cave');
    expect(barred(open)).not.toContain('cave>nave');
    expect(barred(open)).not.toContain('garden>landing');
    expect(barred(open)).toContain('crypt>chapel');
  });
  it('fills the rooms behind: a Cave Mouth spot for each shade, a chapel candle for each, a garden bed for each reagent', () => {
    const bad = copy();
    bad.unfold.cave.spots = bad.unfold.cave.spots.slice(0, 4);
    expect(validateVigil(bad).join()).toMatch(/one thing for each shade freed/);
    const lane = copy();
    lane.unfold.chapel.candles.scribe = [6, 6]; // (in the doorway's lane to the Crypt)
    expect(validateVigil(lane).join()).toMatch(/scribe's candle at \(6,6\) in the chapel stands in a doorway's lane/);
    const bed = copy();
    delete (bed.unfold.garden.beds as Record<string, unknown>).emberSalt;
    bed.unfold.garden.beds.ash = [6, 3];
    expect(validateVigil(bed).join()).toMatch(
      /a bed of ash, which is no reagent.*no bed of emberSalt|no bed of emberSalt/,
    );
  });
  it('keeps the doorways, the water and the waking spot clear', () => {
    const lane = copy();
    lane.pieces.find((p) => p.kind === 'plinth')!.at = [0, 12]; // (the Nave's door to the Crypt)
    expect(validateVigil(lane).join()).toMatch(/doorway's lane/);
    const dry = copy();
    dry.pieces.find((p) => p.kind === 'boat')!.at = [2, 1];
    expect(validateVigil(dry).join()).toMatch(/not water/);
    const bed = copy();
    bed.wake.at = [3.5, 4.2]; // (on the bier)
    expect(validateVigil(bed).join()).toMatch(/isn't clear floor/);
  });
  it('is never drawn by a generated floor', () => {
    for (let s = 0; s < 30; s++)
      FLOORS.forEach((f, i) => {
        if (!f.fixed)
          for (const r of generateFloor(Rng.from('VG' + s, 'floor' + i), f, i).rooms) expect(r.type).not.toBe('vigil');
      });
  });
  it('keeps the two spells held there, made whole from whatever was stored', () => {
    expect(blankSave().slots).toEqual([null, null]);
    expect(migrate({ v: 1, slots: ['arc', 7, 'x'] }).slots).toEqual(['arc', null]);
    expect(migrate({ v: 1 }).slots).toEqual([null, null]);
  });
});
