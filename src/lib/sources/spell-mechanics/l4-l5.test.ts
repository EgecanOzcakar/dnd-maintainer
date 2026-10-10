import { describe, expect, it } from 'vitest';
import { SPELL_MECHANICS_L4_L5 as M } from './l4-l5';

describe('l4-l5 spell mechanics', () => {
  it('never combines attack and save', () => {
    for (const [id, m] of Object.entries(M)) expect(m.attack && m.save, id).toBeFalsy();
  });
});
