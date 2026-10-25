import { describe, it, expect } from 'vitest';
import { createSlot, slotToPoints, spendSorceryPoints } from '@/lib/metamagic';

describe('sorcery points', () => {
  it('spends only what is left', () => {
    expect(spendSorceryPoints({ 'sorcery-points': 3 }, 5, 2)).toEqual({ 'sorcery-points': 5 });
    expect(spendSorceryPoints({ 'sorcery-points': 4 }, 5, 2)).toBeNull();
  });

  it('converts a slot into points up to the maximum', () => {
    const r = slotToPoints({ slots: {}, pools: { 'sorcery-points': 4 } }, { '3': 2 }, 6, 3);
    expect(r).toEqual({ slots: { '3': 1 }, pools: { 'sorcery-points': 1 } });
    expect(slotToPoints({ slots: { '3': 2 }, pools: {} }, { '3': 2 }, 6, 3)).toBeNull();
    // already nearly full: gain is capped
    expect(slotToPoints({ slots: {}, pools: { 'sorcery-points': 1 } }, { '3': 2 }, 6, 3)?.pools).toEqual({
      'sorcery-points': 0,
    });
  });

  it('creates a slot for the 2024 cost, beyond the maximum, and refuses level 6+', () => {
    const r = createSlot({ slots: {}, pools: {} }, 6, 3);
    expect(r).toEqual({ slots: { '3': -1 }, pools: { 'sorcery-points': 5 } });
    expect(createSlot({ slots: {}, pools: { 'sorcery-points': 2 } }, 6, 3)).toBeNull();
    expect(createSlot({ slots: {}, pools: {} }, 9, 6)).toBeNull();
    // Minimum Sorcerer level: a 4th-level slot needs level 7 even when 6 points are available.
    expect(createSlot({ slots: {}, pools: {} }, 6, 4)).toBeNull();
    expect(createSlot({ slots: {}, pools: {} }, 7, 4)).not.toBeNull();
  });
});
