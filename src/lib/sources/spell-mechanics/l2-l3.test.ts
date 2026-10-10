import { SPELL_MECHANICS_L2_L3 } from '@/lib/sources/spell-mechanics/l2-l3';

describe('L2-L3 spell mechanics', () => {
  it('never has both attack and save', () => {
    for (const m of Object.values(SPELL_MECHANICS_L2_L3)) {
      expect(m.attack && m.save).toBeFalsy();
    }
  });
  it('matches key 2024 values', () => {
    expect(SPELL_MECHANICS_L2_L3['fireball']).toEqual({
      save: 'dex',
      damage: { dice: '8d6', type: 'fire', perSlot: '1d6' },
    });
    expect(SPELL_MECHANICS_L2_L3['hold-person']).toEqual({ save: 'wis' });
  });
});
