import { describe, it, expect } from 'vitest';
import { arcaneBudget, recoverSlot } from '@/lib/arcane-recovery';

describe('arcane recovery', () => {
  it('budget is half the wizard level rounded up', () => {
    expect([1, 2, 5, 6, 20].map(arcaneBudget)).toEqual([1, 1, 3, 3, 10]);
  });
  it('recovers spent slots of 5th level or lower within the budget', () => {
    expect(recoverSlot({ '2': 2 }, 2, 3)).toEqual({ slots: { '2': 1 }, budget: 1 });
    expect(recoverSlot({ '2': 2 }, 2, 1)).toBeNull();
    expect(recoverSlot({ '6': 1 }, 6, 10)).toBeNull();
    expect(recoverSlot({}, 1, 3)).toBeNull();
  });
});
