import { describe, expect, it } from 'vitest';
import {
  MAGIC,
  applyStatus,
  canAct,
  canHeal,
  consumeShock,
  damageTakenMul,
  newStatus,
  spendHex,
  speedFactor,
  tickStatus,
} from '../../src/magic/status';

const T = MAGIC;

describe('burn', () => {
  it('deals damage over time in ticks, and a new burn lasts at least as long as the old', () => {
    const s = newStatus();
    applyStatus(s, 'burn', 2, false);
    let dmg = 0;
    for (let i = 0; i < 180; i++) dmg += tickStatus(s, 1 / 60).burnDamage;
    expect(dmg).toBeCloseTo(T.burn.dps * 2, 5);
    expect(s.burn).toBe(0);
    applyStatus(s, 'burn', 3, false);
    applyStatus(s, 'burn', 1, false);
    expect(s.burn).toBe(3);
  });
});

describe('chill', () => {
  it('slows with each stack and freezes on the third, then guards against freezing again', () => {
    const s = newStatus();
    applyStatus(s, 'chill', 1, false);
    expect(speedFactor(s)).toBeCloseTo(1 - T.chill.slowPerStack);
    applyStatus(s, 'chill', 1, false);
    expect(applyStatus(s, 'chill', 1, false)).toEqual({ froze: true });
    expect(speedFactor(s)).toBe(0);
    expect(canAct(s)).toBe(false);
    expect(damageTakenMul(s)).toBe(T.chill.frozenDamageMul);
    let thawed = false;
    for (let i = 0; i < 60 * T.chill.freezeTime + 2; i++) thawed ||= tickStatus(s, 1 / 60).thawed;
    expect(thawed).toBe(true);
    expect(canAct(s)).toBe(true);
    for (let i = 0; i < 3; i++) applyStatus(s, 'chill', 1, false); // the guard holds
    expect(s.frozen).toBe(0);
    expect(s.chill).toBe(T.chill.freezeAt - 1);
  });

  it('thaws its stacks after a while', () => {
    const s = newStatus();
    applyStatus(s, 'chill', 1, false);
    tickStatus(s, T.chill.stackTime + 0.1);
    expect(s.chill).toBe(0);
    expect(speedFactor(s)).toBe(1);
  });

  it('slows a boss but never freezes it', () => {
    const s = newStatus();
    for (let i = 0; i < 6; i++) expect(applyStatus(s, 'chill', 1, true).froze).toBeFalsy();
    expect(s.chill).toBe(T.chill.bossMaxStacks);
    expect(speedFactor(s)).toBeGreaterThan(0);
  });
});

describe('shock', () => {
  it('stuns briefly and marks the foe; the next hit uses the mark up', () => {
    const s = newStatus();
    expect(applyStatus(s, 'shock', 2, false)).toEqual({ stunned: true });
    expect(canAct(s)).toBe(false);
    tickStatus(s, T.shock.stun + 0.01);
    expect(canAct(s)).toBe(true);
    expect(consumeShock(s)).toBe(true);
    expect(consumeShock(s)).toBe(false);
  });

  it('stuns a boss only now and then', () => {
    const s = newStatus();
    expect(applyStatus(s, 'shock', 2, true).stunned).toBe(true);
    expect(applyStatus(s, 'shock', 2, true).stunned).toBeFalsy();
    tickStatus(s, T.shock.bossStunGuard + 0.01);
    expect(applyStatus(s, 'shock', 2, true).stunned).toBe(true);
  });
});

describe('reactions', () => {
  it('Shatter: a frozen foe shocked, or a shocked foe frozen', () => {
    const a = newStatus();
    for (let i = 0; i < 3; i++) applyStatus(a, 'chill', 1, false);
    expect(applyStatus(a, 'shock', 2, false)).toEqual({ reaction: 'shatter' });
    expect(a.frozen).toBe(0);
    const b = newStatus();
    applyStatus(b, 'shock', 2, false);
    applyStatus(b, 'chill', 2, false);
    expect(applyStatus(b, 'chill', 1, false)).toEqual({ reaction: 'shatter' });
    expect(b.shock).toBe(0);
  });

  it('Overload: a burning foe shocked, or a shocked foe set burning', () => {
    const a = newStatus();
    applyStatus(a, 'burn', 3, false);
    expect(applyStatus(a, 'shock', 2, false)).toEqual({ reaction: 'overload' });
    expect(a.burn).toBe(0);
    const b = newStatus();
    applyStatus(b, 'shock', 2, false);
    expect(applyStatus(b, 'burn', 3, false)).toEqual({ reaction: 'overload' });
    expect(b.shock).toBe(0);
    expect(b.burn).toBe(0);
  });

  it('Overload works on bosses; Shatter never does, since they never freeze', () => {
    const s = newStatus();
    applyStatus(s, 'burn', 3, true);
    expect(applyStatus(s, 'shock', 2, true)).toEqual({ reaction: 'overload' });
    for (let i = 0; i < 4; i++) applyStatus(s, 'chill', 1, true);
    expect(applyStatus(s, 'shock', 2, true).reaction).toBeUndefined();
  });
});

describe('Hallow and Umbral (M4.1)', () => {
  it('sanctified: a foe takes more from everything for a while, and nothing heals it', () => {
    const s = newStatus();
    applyStatus(s, 'sanct', 2, false);
    expect(damageTakenMul(s)).toBeCloseTo(MAGIC.sanct.damageMul);
    expect(canHeal(s)).toBe(false);
    tickStatus(s, 2.1);
    expect(damageTakenMul(s)).toBe(1);
    expect(canHeal(s)).toBe(true);
  });

  it('hex: stacks up to a cap and fades; each blow spends a stack for mana', () => {
    const s = newStatus();
    for (let i = 0; i < 4; i++) applyStatus(s, 'hex', 2, false);
    expect(s.hex).toBe(MAGIC.hex.max);
    expect(spendHex(s)).toBe(MAGIC.hex.manaPerStack);
    expect(s.hex).toBe(MAGIC.hex.max - 1);
    tickStatus(s, MAGIC.hex.time + 0.1);
    expect(s.hex).toBe(0);
    expect(spendHex(s)).toBe(0);
  });

  it('root holds a foe still but lets it act, and a boss only for a moment', () => {
    const s = newStatus();
    applyStatus(s, 'root', 2, false);
    expect(speedFactor(s)).toBe(0);
    expect(canAct(s)).toBe(true);
    const b = newStatus();
    applyStatus(b, 'root', 2, true);
    expect(b.root).toBe(MAGIC.root.bossMax);
  });

  it('eclipse: sanctified meets hex (either way round), the foe is out of the fight, then it comes back', () => {
    for (const [first, second] of [
      ['sanct', 'hex'],
      ['hex', 'sanct'],
    ] as const) {
      const s = newStatus();
      applyStatus(s, first, 2, false);
      expect(applyStatus(s, second, 2, false).reaction).toBe('eclipse');
      expect(s.sanct + s.hex).toBe(0);
      expect(canAct(s)).toBe(false);
      expect(speedFactor(s)).toBe(0);
      expect(applyStatus(s, 'burn', 3, false)).toEqual({}); // (nothing reaches it meanwhile)
      expect(tickStatus(s, MAGIC.reactions.eclipse.time + 0.01).eclipsed).toBe(true);
      expect(canAct(s)).toBe(true);
    }
    const b = newStatus();
    applyStatus(b, 'hex', 1, true);
    expect(applyStatus(b, 'sanct', 2, true).reaction).toBe('eclipse');
    expect(b.eclipse).toBe(0); // (a boss is only struck)
  });

  it('steam: fire meets cold (either way round), both going up; a frozen foe thaws, guarded from freezing again; blackfire stays', () => {
    const a = newStatus();
    applyStatus(a, 'chill', 1, false);
    expect(applyStatus(a, 'burn', 3, false)).toEqual({ reaction: 'steam' });
    expect(a.chill).toBe(0);
    expect(a.burn).toBe(0);
    const b = newStatus();
    applyStatus(b, 'burn', 3, false);
    expect(applyStatus(b, 'chill', 1, false)).toEqual({ reaction: 'steam' });
    expect(b.burn).toBe(0);
    expect(b.chill).toBe(0);
    const c = newStatus();
    for (let i = 0; i < T.chill.freezeAt; i++) applyStatus(c, 'chill', 1, false);
    expect(c.frozen).toBeGreaterThan(0);
    expect(applyStatus(c, 'burn', 3, false)).toEqual({ reaction: 'steam' });
    expect(c.frozen).toBe(0);
    expect(c.guard).toBe(T.chill.refreezeGuard);
    const d = newStatus();
    applyStatus(d, 'hex', 1, false);
    applyStatus(d, 'burn', 3, false);
    expect(d.black).toBe(true);
    expect(applyStatus(d, 'chill', 1, false)).toEqual({});
    expect(d.burn).toBeGreaterThan(0); // (blackfire never goes out)
  });

  it('blackfire: hex meets burn (either way round), and the burn never goes out', () => {
    for (const [first, second] of [
      ['hex', 'burn'],
      ['burn', 'hex'],
    ] as const) {
      const s = newStatus();
      applyStatus(s, first, 2, false);
      expect(applyStatus(s, second, 2, false).reaction).toBe('blackfire');
      expect(s.black).toBe(true);
      let dealt = 0;
      for (let i = 0; i < 40; i++) dealt += tickStatus(s, 0.25).burnDamage; // ten seconds, far past any burn
      expect(s.burn).toBeGreaterThan(0);
      expect(dealt).toBeCloseTo(MAGIC.reactions.blackfire.dps * 10, 0);
    }
  });
});

describe('the full wheel (M4.8): every pair of the five schools reacts', () => {
  it('Searing: fire on holy light (or holy light on fire) burns the guard away a while', () => {
    let s = newStatus();
    applyStatus(s, 'sanct', 3, false);
    expect(applyStatus(s, 'burn', 2, false)).toEqual({ reaction: 'searing' });
    expect(s).toMatchObject({ sanct: 0, burn: 0, seared: T.reactions.searing.time });
    s = newStatus();
    applyStatus(s, 'burn', 2, false);
    expect(applyStatus(s, 'sanct', 3, false).reaction).toBe('searing');
    expect(s.burn).toBe(0);
    tickStatus(s, T.reactions.searing.time + 0.1);
    expect(s.seared).toBe(0);
  });
  it('Prism: a frozen foe sanctified, or a sanctified one freezing, is a prism while the ice lasts', () => {
    let s = newStatus();
    for (let i = 0; i < T.chill.freezeAt; i++) applyStatus(s, 'chill', 1, false);
    expect(s.frozen).toBeGreaterThan(0);
    expect(applyStatus(s, 'sanct', 3, false)).toEqual({ reaction: 'prism' });
    expect(s.prism).toBeCloseTo(s.frozen);
    s = newStatus();
    applyStatus(s, 'sanct', 3, false);
    let last = {};
    for (let i = 0; i < T.chill.freezeAt; i++) last = applyStatus(s, 'chill', 1, false);
    expect(last).toEqual({ froze: true, reaction: 'prism' });
    expect(s.sanct).toBe(0);
    tickStatus(s, T.chill.freezeTime + 0.1);
    expect(s.prism).toBe(0); // (the ice gone, the prism with it)
  });
  it('Verdict, Black Ice and Void Spark', () => {
    let s = newStatus();
    applyStatus(s, 'sanct', 3, false);
    expect(applyStatus(s, 'shock', 1, false)).toEqual({ reaction: 'verdict' });
    expect(s.sanct).toBe(0);
    s = newStatus();
    applyStatus(s, 'shock', 1, false);
    expect(applyStatus(s, 'sanct', 2, false).reaction).toBe('verdict');
    s = newStatus();
    applyStatus(s, 'hex', 2, false);
    expect(applyStatus(s, 'chill', 1, false)).toEqual({ reaction: 'blackice' });
    expect(s).toMatchObject({ hex: 0, chill: 0 });
    s = newStatus();
    applyStatus(s, 'chill', 1, false);
    expect(applyStatus(s, 'hex', 1, false).reaction).toBe('blackice');
    s = newStatus();
    applyStatus(s, 'hex', 2, false);
    expect(applyStatus(s, 'shock', 1, false)).toEqual({ reaction: 'voidspark' });
    expect(s).toMatchObject({ hex: 0, voidT: T.reactions.voidspark.time });
    s = newStatus();
    applyStatus(s, 'shock', 1, false);
    expect(applyStatus(s, 'hex', 1, false).reaction).toBe('voidspark');
  });
  it("every pair of statuses of two schools reacts, one way or the other (M5: of six, with Verdant's Overgrown)", async () => {
    const { REACTIONS } = await import('../../src/magic/status');
    const kinds = ['burn', 'chill', 'shock', 'sanct', 'hex', 'grow'] as const;
    for (const a of kinds)
      for (const b of kinds) {
        if (a === b) continue;
        // (chill meets shock and holy light once it freezes, as Shatter always has: it is laid on till it does)
        const lay = (k: (typeof kinds)[number]) => {
          let r: string | undefined;
          for (let i = 0; i < (k === 'chill' ? T.chill.freezeAt : 1) && !r; i++)
            r = applyStatus(s, k, k === 'chill' ? 1 : 2, false).reaction;
          return r;
        };
        const s = newStatus();
        lay(a);
        const r = lay(b) as keyof typeof REACTIONS | undefined;
        expect(r, `${a} then ${b}`).toBeDefined();
        expect(REACTIONS[r!].slice().sort(), `${a} then ${b}`).toEqual([a, b].sort());
      }
  });
  it('holy light on a prism keeps it one without setting it off again (M4.8 review)', () => {
    const s = newStatus();
    for (let k = 0; k < MAGIC.chill.freezeAt; k++) applyStatus(s, 'chill', 1, false);
    expect(applyStatus(s, 'sanct', 3, false)).toEqual({ reaction: 'prism' });
    expect(applyStatus(s, 'sanct', 3, false)).toEqual({});
    expect(s.prism).toBeGreaterThan(0);
  });
});

describe('Verdant (M5): Overgrown and its five reactions', () => {
  it('vines slow a foe a little at once and more the longer they hold, a boss half as much, and wither', () => {
    const s = newStatus();
    expect(applyStatus(s, 'grow', 3, false)).toEqual({});
    const first = speedFactor(s);
    expect(first).toBeCloseTo(1 - T.grow.slow);
    tickStatus(s, 2);
    expect(speedFactor(s)).toBeLessThan(first);
    expect(speedFactor(s)).toBeGreaterThanOrEqual(1 - T.grow.maxSlow);
    expect(speedFactor(s, T, true)).toBeGreaterThan(speedFactor(s));
    tickStatus(s, 2);
    expect(s.grow).toBe(0);
    expect(speedFactor(s)).toBe(1);
  });
  it('fire, cold, a shock and a hex on the vines set off Wildfire, Frostbloom, Pollen Spark and Blight, spending them', () => {
    for (const [k, r] of [
      ['burn', 'wildfire'],
      ['chill', 'frostbloom'],
      ['shock', 'pollenspark'],
      ['hex', 'blight'],
    ] as const) {
      const s = newStatus();
      applyStatus(s, 'grow', 3, false);
      expect(applyStatus(s, k, k === 'chill' ? 1 : 2, false).reaction, k).toBe(r);
      expect(s.grow, k).toBe(0);
    }
    const w = newStatus();
    applyStatus(w, 'grow', 3, false);
    applyStatus(w, 'burn', 2, false);
    expect(w.burn).toBeGreaterThan(0); // (the foe burns too)
    const b = newStatus();
    applyStatus(b, 'grow', 3, false);
    applyStatus(b, 'hex', 1, false);
    expect(b.hex).toBeGreaterThan(1); // (thorns: more hex)
  });
  it('holy light on the vines makes it flower once (Bloom), keeping both', () => {
    const s = newStatus();
    applyStatus(s, 'grow', 3, false);
    expect(applyStatus(s, 'sanct', 2, false)).toEqual({ reaction: 'bloom' });
    expect(s).toMatchObject({ bloom: true });
    expect(s.grow).toBeGreaterThan(0);
    expect(s.sanct).toBeGreaterThan(0);
    expect(applyStatus(s, 'sanct', 2, false)).toEqual({});
    const t = newStatus();
    applyStatus(t, 'sanct', 2, false);
    expect(applyStatus(t, 'grow', 3, false)).toEqual({ reaction: 'bloom' });
  });
});
