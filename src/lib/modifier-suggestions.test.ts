import { describe, it, expect } from 'vitest';
import { suggestModifiers } from '@/lib/modifier-suggestions';

const grants = (text: string) => suggestModifiers(text, 'Item').flatMap((s) => s.grants);

describe('suggestModifiers', () => {
  it('+N to all saving throws', () => {
    expect(grants('You gain a +1 bonus to all saving throws.')).toEqual([
      { type: 'roll-modifier', target: 'save', bonus: 1, label: 'Item' },
    ]);
  });

  it('extra dice on saves and an ability check', () => {
    expect(grants('Add 1d4 to your saving throws.')).toEqual([
      { type: 'roll-modifier', target: 'save', dice: '+1d4', label: 'Item' },
    ]);
    expect(grants('You can add 1d4 to Strength checks.')).toEqual([
      { type: 'roll-modifier', target: 'check', abilities: ['str'], dice: '+1d4', label: 'Item' },
    ]);
  });

  it('skill checks and advantage', () => {
    expect(grants('You have advantage on Dexterity (Stealth) checks.')).toEqual([
      { type: 'roll-modifier', target: 'check', abilities: ['dex'], skills: ['stealth'], mode: 'adv', label: 'Item' },
    ]);
  });

  it('+N bonus to AC and to attack and damage rolls', () => {
    expect(grants('You have a +1 bonus to AC while wearing this.')).toEqual([{ type: 'ac-bonus', bonus: 1 }]);
    expect(grants('+2 bonus to attack rolls and damage rolls made with this weapon.').map((g) => g.type)).toEqual([
      'roll-modifier',
      'roll-modifier',
    ]);
  });

  it('resistance and fixed ability score', () => {
    expect(grants('You have resistance to fire and cold damage.')).toEqual([
      { type: 'resistance', damageType: 'fire' },
      { type: 'resistance', damageType: 'cold' },
    ]);
    expect(grants('Your Strength score is 19 while you wear this.')).toEqual([
      { type: 'ability-set', ability: 'str', score: 19 },
    ]);
  });

  it('ignores unrelated numbers', () => {
    expect(suggestModifiers('You gain a +2 bonus to your Strength score. It weighs 5 pounds.')).toEqual([]);
  });
});
