import { describe, expect, it } from 'vitest';
import { scaleDice } from '@/lib/resolver/actions';
import { DRUID_FIGHTER_MONK_ACTIONS } from './druid-fighter-monk';

describe('druid/fighter/monk actions', () => {
  it('scales the Martial Arts die', () => {
    const d = DRUID_FIGHTER_MONK_ACTIONS['monk-martial-arts']!.damage!.dice;
    expect([1, 5, 11, 17].map((l) => scaleDice(d, l))).toEqual(['1d6', '1d8', '1d10', '1d12']);
  });
  it('scales the superiority die', () => {
    const d = DRUID_FIGHTER_MONK_ACTIONS['battlemaster-combat-superiority']!.damage!.dice;
    expect([3, 10, 18].map((l) => scaleDice(d, l))).toEqual(['1d8', '1d10', '1d12']);
  });
});
