import { describe, expect, it } from 'vitest';
import { arcStage, levelsHeld } from '../../src/actors/costumeData';
import { CFG } from '../../src/config';
import { Rng } from '../../src/rng';
import { FLOORS, generateFloor } from '../../src/world/generate';
import { TEMPLATES, parseTemplate } from '../../src/world/templates';
import { championIndex, fillRoles, packCount, packRoll } from '../../src/world/fill';
import { FOES } from '../../src/actors/foeData';
import {
  LEVEL_CAP,
  bossInsight,
  clearInsight,
  insightAt,
  levelAtFloor,
  levelFor,
  levelProgress,
  potionInsight,
  purseOf,
} from '../../src/progression/levelData';

/* M6 step 1: insight and levels (docs/archive/M6-plan.md). */

describe('levels', () => {
  const at = CFG.levels.at;
  it('rise at the thresholds, up to the cap', () => {
    expect(LEVEL_CAP).toBe(12);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(at[0] - 0.01)).toBe(1);
    expect(levelFor(at[0])).toBe(2);
    expect(levelFor(at[at.length - 1])).toBe(LEVEL_CAP);
    expect(levelFor(1e9)).toBe(LEVEL_CAP);
    for (let i = 1; i < at.length; i++) expect(at[i]).toBeGreaterThan(at[i - 1]);
    for (let lv = 1; lv <= LEVEL_CAP; lv++) expect(levelFor(insightAt(lv))).toBe(lv);
  });
  it('say how far into its level the insight is', () => {
    expect(levelProgress(0)).toEqual({ level: 1, into: 0, span: at[0] });
    expect(levelProgress(at[0] + 5)).toEqual({ level: 2, into: 5, span: at[1] - at[0] });
    expect(levelProgress(at[at.length - 1] + 99).span).toBe(0); // (full at the cap)
  });
});

describe('insight', () => {
  it("is a foe's health ÷ 4 on its floor, twice a champion's, a nest's with its first brood, none for the dummy", () => {
    expect(purseOf('sporeling', 1)).toBeCloseTo(FOES.sporeling.hp / 4);
    expect(purseOf('sporeling', 1.5)).toBeCloseTo((FOES.sporeling.hp * 1.5) / 4);
    expect(purseOf('sporeling', 1, true)).toBeCloseTo((FOES.sporeling.hp * CFG.champion.hpMul) / 4);
    expect(purseOf('waspNest', 1)).toBeCloseTo(
      (FOES.waspNest.hp + Number(FOES.waspNest.params.brood) * FOES.emberWasp.hp) / 4,
    );
    expect(purseOf('dummy', 1)).toBe(0);
    expect(purseOf('rotling', 1)).toBeCloseTo(CFG.enemy.rotling.hp / 4); // (the browser tests' target pays too)
  });
  it('comes from clears, potions and bosses by the floor', () => {
    expect([0, 1, 2, 3, 4].map((f) => clearInsight(f))).toEqual([4, 8, 12, 16, 20]);
    expect(clearInsight(2, true)).toBe(24);
    expect(potionInsight(0)).toBe(4);
    const boss = FLOORS.map((_, f) => bossInsight(f));
    expect(boss).toEqual([60, 130, 230, 360, 540, 720]); // (M7: the Seal's boss last)
  });
});

/** One run's insight, room by room in the order of their distance from the start, each floor ending with its boss: the
    rooms filled as `buildRoom` and `spawnWave` fill them (world/fill.ts), kills, first clears and bosses only. */
function runOf(seed: string) {
  const steps: { floor: number; insight: number; boss: boolean }[] = [];
  let x = 0;
  FLOORS.forEach((floor, fi) => {
    const plan = generateFloor(Rng.from(seed, 'floor' + fi), floor, fi);
    const fights = plan.rooms.filter((r) => r.type === 'normal' || r.type === 'ordeal').sort((a, b) => a.dist - b.dist);
    for (const room of fights) {
      const t = parseTemplate(TEMPLATES.get(room.templateId)!, room.mirrorX, room.mirrorY),
        filled = fillRoles(room, t.waves, floor);
      if (!filled.waves.length) continue; // (a quiet room left empty pays nothing)
      const mortal = (filled.waves[0] ?? []).filter((f) => f.kind !== 'boss');
      const champion =
        room.variant === 'champion' && mortal.length ? mortal[championIndex(room.seed, mortal.length)] : undefined;
      filled.waves.forEach((wave, wi) => {
        const roll = packRoll(room.seed, wi);
        for (const f of wave) {
          if (f.kind === 'boss') continue;
          const n = packCount(f.kind, roll);
          x += purseOf(f.kind, floor.enemyHp, f === champion) + (n - 1) * purseOf(f.kind, floor.enemyHp);
        }
      });
      x += clearInsight(fi, room.type === 'ordeal');
      steps.push({ floor: fi, insight: x, boss: false });
    }
    x += bossInsight(fi);
    steps.push({ floor: fi, insight: x, boss: true });
  });
  return steps;
}

describe('the curve (the M6 plan, measured on 300 seeds)', () => {
  const runs = Array.from({ length: 300 }, (_, i) => runOf('CURVE' + i));
  const share = (f: (r: ReturnType<typeof runOf>) => boolean) => runs.filter(f).length / runs.length;
  it('reaches level 2 by the second fight room', () => {
    expect(share((r) => levelFor(r[Math.min(1, r.length - 1)].insight) >= 2)).toBeGreaterThanOrEqual(0.75);
  });
  it("reaches level 4 by floor 1's end, then about 3 levels a floor, then 2", () => {
    const endOf = (r: ReturnType<typeof runOf>, f: number) => levelFor(r.filter((s) => s.floor === f).at(-1)!.insight);
    expect(share((r) => endOf(r, 0) >= 4)).toBeGreaterThanOrEqual(0.9);
    expect(share((r) => endOf(r, 1) >= 7)).toBeGreaterThanOrEqual(0.9);
    expect(share((r) => endOf(r, 2) >= 9)).toBeGreaterThanOrEqual(0.9);
    expect(share((r) => endOf(r, 3) >= 11)).toBeGreaterThanOrEqual(0.9);
  });
  it('never reaches the cap before floor 5, and every run reaches it by its boss', () => {
    expect(share((r) => r.some((s) => s.floor < 4 && levelFor(s.insight) >= LEVEL_CAP))).toBe(0);
    expect(share((r) => levelFor(r.at(-1)!.insight) >= LEVEL_CAP)).toBeGreaterThanOrEqual(0.97);
  });
});

describe('the run around it (M6 step 12)', () => {
  it('starts a deeper floor at its expected level: 1, 4, 7, 9 and 11', () => {
    expect([0, 1, 2, 3, 4].map((f) => levelAtFloor(f))).toEqual([1, 4, 7, 9, 11]);
  });
  it("keeps the floors' insight within a tenth of the curve measured here", () => {
    const runs = Array.from({ length: 300 }, (_, i) => runOf('CURVE' + i));
    const median = (xs: number[]) => {
      const s = [...xs].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    CFG.levels.floorInsight.forEach((want, f) => {
      const per = runs.map((r) => {
        const at = r.filter((s) => s.floor === f),
          before = r.filter((s) => s.floor < f).at(-1)?.insight ?? 0;
        return at.at(-1)!.insight - before;
      });
      expect(Math.abs(median(per) - want) / want).toBeLessThan(0.1);
    });
  });
  it('counts every three levels gained as one artifact held toward the arc', () => {
    const held = (artifacts: number, level: number) => artifacts + levelsHeld(level, CFG.arc.perLevels);
    expect(arcStage(held(0, 12), CFG.arc.at)).toBe(1); // (a level-12 run with nothing held: the first stage)
    expect(arcStage(held(0, 9), CFG.arc.at)).toBe(0);
    expect(arcStage(held(2, 4), CFG.arc.at)).toBe(1);
  });
});
