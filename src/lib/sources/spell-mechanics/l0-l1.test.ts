import { describe, expect, it } from 'vitest';
import { SPELL_MECHANICS_L0_L1 as M } from '@/lib/sources/spell-mechanics/l0-l1';

describe('l0-l1 spell mechanics', () => {
  it('never has both attack and save', () => {
    for (const [id, m] of Object.entries(M)) expect(!(m.attack && m.save), id).toBe(true);
  });
  it('cantrip-scaling entries have no perSlot', () => {
    for (const [id, m] of Object.entries(M)) {
      if (m.damage?.cantripScaling) expect(m.damage.perSlot, id).toBeUndefined();
    }
  });
});
