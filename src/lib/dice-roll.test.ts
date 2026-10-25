import { describe, it, expect } from 'vitest';
import { rollDice, rollPreset } from '@/lib/dice-roll';

const seq =
  (...vals: number[]) =>
  () =>
    vals.shift() ?? 0;
// rng value that yields a given face
const face = (f: number, die = 20) => (f - 0.5) / die;

describe('rollDice', () => {
  it('rolls plain dice and adds modifier', () => {
    const r = rollDice({ die: 6, count: 2, modifier: 3 }, seq(face(4, 6), face(5, 6)));
    expect(r.rolls).toEqual([4, 5]);
    expect(r.total).toBe(12);
    expect(r.formula).toBe('2d6+3');
  });

  it('advantage keeps the higher d20 and shows both', () => {
    const r = rollDice({ die: 20, count: 1, modifier: 2, mode: 'advantage' }, seq(face(7), face(15)));
    expect(r.rolls).toEqual([7, 15]);
    expect(r.kept).toEqual([15]);
    expect(r.total).toBe(17);
  });

  it('disadvantage keeps the lower d20', () => {
    const r = rollDice({ die: 20, count: 1, modifier: 0, mode: 'disadvantage' }, seq(face(7), face(15)));
    expect(r.kept).toEqual([7]);
    expect(r.total).toBe(7);
  });

  it('crit doubles dice count but not modifier', () => {
    const r = rollDice({ die: 8, count: 1, modifier: 4, crit: true }, seq(face(8, 8), face(3, 8)));
    expect(r.rolls).toHaveLength(2);
    expect(r.total).toBe(8 + 3 + 4);
    expect(r.formula).toBe('2d8+4');
  });

  it('flags natural 20 and natural 1 on the kept d20', () => {
    expect(rollDice({ die: 20, count: 1, modifier: 0 }, seq(face(20))).natural).toBe('nat20');
    expect(rollDice({ die: 20, count: 1, modifier: 0 }, seq(face(1))).natural).toBe('nat1');
    expect(rollDice({ die: 20, count: 1, modifier: 0, mode: 'advantage' }, seq(face(1), face(20))).natural).toBe(
      'nat20'
    );
    expect(rollDice({ die: 20, count: 2, modifier: 0 }, seq(face(20), face(20))).natural).toBeNull();
    expect(rollDice({ die: 6, count: 1, modifier: 0 }, seq(face(6, 6))).natural).toBeNull();
  });
});

describe('rollPreset', () => {
  it('adds extra dice with their sign (Bless / Bane)', () => {
    const out = rollPreset({ die: 20, count: 1, modifier: 5, extra: ['+1d4'] }, {}, seq(0.95, 0.99));
    expect(out.total).toBe(20 + 5 + 4);
    expect(out.formula).toBe('1d20+5+1d4');
    const bane = rollPreset({ die: 20, count: 1, modifier: 5, extra: ['-1d4'] }, {}, seq(0.95, 0.99));
    expect(bane.total).toBe(20 + 5 - 4);
  });

  it('takes the preset mode, and lets Shift/Alt override it', () => {
    expect(rollPreset({ die: 20, count: 1, modifier: 0, mode: 'adv' }).mode).toBe('advantage');
    expect(rollPreset({ die: 20, count: 1, modifier: 0, mode: 'adv' }, { alt: true }).mode).toBe('disadvantage');
    expect(rollPreset({ die: 20, count: 1, modifier: 0 }, { shift: true }).mode).toBe('advantage');
    expect(rollPreset({ die: 20, count: 1, modifier: 0, mode: 'adv' }, { shift: false }).mode).toBe('advantage');
    expect(rollPreset({ die: 20, count: 1, modifier: 0, mode: 'dis' }, { shift: true, alt: true }).mode).toBe(
      'disadvantage'
    );
  });

  it('Shift on damage is a critical hit: double dice (extras too), flat modifier unchanged', () => {
    const out = rollPreset(
      { die: 6, count: 2, modifier: 3, kind: 'damage', extra: ['+1d6'] },
      { shift: true },
      () => 0.99
    );
    expect(out.crit).toBe(true);
    expect(out.rolls).toHaveLength(4);
    expect(out.total).toBe(4 * 6 + 3 + 2 * 6);
    expect(out.formula).toBe('4d6+3+2d6');
  });

  it('an explicit non-damage kind on a d8 (Superiority Die) never doubles or gains advantage', () => {
    const out = rollPreset({ die: 8, count: 1, modifier: 0, kind: 'd20' }, { shift: true }, () => 0.99);
    expect(out.crit).toBe(false);
    expect(out.mode).toBe('normal');
    expect(out.rolls).toHaveLength(1);
  });

  it('floors every d20 at min (Reliable Talent)', () => {
    const out = rollPreset({ die: 20, count: 1, modifier: 4, min: 10 }, {}, () => 0);
    expect(out.total).toBe(10 + 4);
  });
});
