import { describe, expect, it } from 'vitest';
import { scaleDice } from '@/lib/resolver/actions';
import { SPECIES_FEAT_ACTIONS } from '@/lib/sources/feature-actions/species-feats';

describe('species/feat action data', () => {
  it('breath weapon scales by character level', () => {
    const d = SPECIES_FEAT_ACTIONS['dragonborn-breath-chromatic-red']?.damage?.dice;
    expect([1, 5, 11, 17].map((l) => d && scaleDice(d, l))).toEqual(['1d10', '2d10', '3d10', '4d10']);
  });

  it('healing hands rolls PB d4s', () => {
    const d = SPECIES_FEAT_ACTIONS['aasimar-healing-hands']?.heal?.dice;
    expect([4, 5, 9, 17].map((l) => d && scaleDice(d, l))).toEqual(['2d4', '3d4', '4d4', '6d4']);
  });
});
