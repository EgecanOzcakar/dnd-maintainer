import { describe, expect, it } from 'vitest';
import enGamedata from '@/locales/en/gamedata.json';
import { SORCERER_WARLOCK_WIZARD_ACTIONS } from './sorcerer-warlock-wizard';

describe('SORCERER_WARLOCK_WIZARD_ACTIONS', () => {
  it.each(Object.keys(SORCERER_WARLOCK_WIZARD_ACTIONS))('%s is a known feature id', (id) => {
    expect(Object.keys(enGamedata.features)).toContain(id);
  });
});
