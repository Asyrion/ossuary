/* The event bus (src/events.ts): synchronous, so a notification lands at the same moment and in the same order as the
   direct call it replaced: every listener runs inside `emit`, in the order it was added, before the next line. */
import { describe, expect, it } from 'vitest';
import { createBus } from '../../src/events';

interface TestEvents {
  hurt: { amount: number };
  cleared: void;
}

describe('createBus', () => {
  it('calls the listeners at once, in the order they were added, before emit returns', () => {
    const bus = createBus<TestEvents>(),
      seen: string[] = [];
    bus.on('hurt', (p) => seen.push(`a${p.amount}`));
    bus.on('hurt', (p) => seen.push(`b${p.amount}`));
    bus.on('cleared', () => seen.push('c'));
    seen.push('before');
    bus.emit('hurt', { amount: 2 });
    seen.push('between');
    bus.emit('cleared');
    seen.push('after');
    expect(seen).toEqual(['before', 'a2', 'b2', 'between', 'c', 'after']);
  });

  it('keeps the order of nested emits as direct calls would', () => {
    const bus = createBus<TestEvents>(),
      seen: string[] = [];
    bus.on('hurt', () => {
      seen.push('hurt in');
      bus.emit('cleared');
      seen.push('hurt out');
    });
    bus.on('cleared', () => seen.push('cleared'));
    bus.emit('hurt', { amount: 1 });
    expect(seen).toEqual(['hurt in', 'cleared', 'hurt out']);
  });

  it('stops calling a listener once it unsubscribes, without skipping the next one mid-emit', () => {
    const bus = createBus<TestEvents>(),
      seen: string[] = [];
    const off = bus.on('cleared', () => {
      seen.push('first');
      off();
    });
    bus.on('cleared', () => seen.push('second'));
    bus.emit('cleared');
    bus.emit('cleared');
    expect(seen).toEqual(['first', 'second', 'second']);
  });

  it('does nothing for an event nobody listens to', () => {
    const bus = createBus<TestEvents>();
    expect(() => bus.emit('hurt', { amount: 3 })).not.toThrow();
  });
});
