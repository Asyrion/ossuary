import { describe, expect, it } from 'vitest';
import { MAGIC, applyStatus, canAct, consumeShock, damageTakenMul, newStatus, speedFactor, tickStatus } from '../../src/magic/status';

const T = MAGIC;

describe('burn', () => {
  it('deals damage over time in ticks, and a new burn lasts at least as long as the old', () => {
    const s = newStatus();
    applyStatus(s, 'burn', 2, false);
    let dmg = 0; for (let i = 0; i < 180; i++) dmg += tickStatus(s, 1 / 60).burnDamage;
    expect(dmg).toBeCloseTo(T.burn.dps * 2, 5);
    expect(s.burn).toBe(0);
    applyStatus(s, 'burn', 3, false); applyStatus(s, 'burn', 1, false);
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
    let thawed = false; for (let i = 0; i < 60 * T.chill.freezeTime + 2; i++) thawed ||= tickStatus(s, 1 / 60).thawed;
    expect(thawed).toBe(true);
    expect(canAct(s)).toBe(true);
    for (let i = 0; i < 3; i++) applyStatus(s, 'chill', 1, false); // the guard holds
    expect(s.frozen).toBe(0);
    expect(s.chill).toBe(T.chill.freezeAt - 1);
  });

  it('thaws its stacks after a while', () => {
    const s = newStatus(); applyStatus(s, 'chill', 1, false);
    tickStatus(s, T.chill.stackTime + .1);
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
    tickStatus(s, T.shock.stun + .01);
    expect(canAct(s)).toBe(true);
    expect(consumeShock(s)).toBe(true);
    expect(consumeShock(s)).toBe(false);
  });

  it('stuns a boss only now and then', () => {
    const s = newStatus();
    expect(applyStatus(s, 'shock', 2, true).stunned).toBe(true);
    expect(applyStatus(s, 'shock', 2, true).stunned).toBeFalsy();
    tickStatus(s, T.shock.bossStunGuard + .01);
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
