import { describe, expect, it } from 'vitest';
import { BARBARIAN_BARD_CLERIC_ACTIONS } from '@/lib/sources/feature-actions/barbarian-bard-cleric';
import gamedata from '@/locales/en/gamedata.json';

describe('barbarian/bard/cleric feature actions', () => {
  it.each(Object.keys(BARBARIAN_BARD_CLERIC_ACTIONS))('%s is a known feature', (id) => {
    expect(gamedata.features).toHaveProperty(id);
  });
});
