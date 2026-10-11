import { SPELL_MECHANICS_L6_L9 as M } from '@/lib/sources/spell-mechanics/l6-l9';

describe('L6-L9 spell mechanics', () => {
  it('has no spell with both attack and save', () => {
    for (const m of Object.values(M)) expect(!(m.attack && m.save)).toBe(true);
  });
  it('matches key 2024 values', () => {
    expect(M['circle-of-death']?.damage).toMatchObject({ dice: '8d8', perSlot: '2d8' });
    expect(M['crown-of-stars']?.attack).toBe('ranged');
    expect(M['befuddlement']?.save).toBe('int');
  });
});
