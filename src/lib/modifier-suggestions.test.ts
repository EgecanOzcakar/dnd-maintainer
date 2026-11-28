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
    expect(suggestModifiers('It weighs 5 pounds and costs 50 gp. Spell slot level-1 only.')).toEqual([]);
  });

  it.each([
    ['You gain a +2 bonus to your Strength score.', [{ type: 'ability-bonus', ability: 'str', bonus: 2 }]],
    ['+1 CON', [{ type: 'ability-bonus', ability: 'con', bonus: 1 }]],
    ['-1 dex check', [{ type: 'roll-modifier', target: 'check', abilities: ['dex'], bonus: -1 }]],
    ['-1d4 to attack rolls', [{ type: 'roll-modifier', target: 'attack', dice: '-1d4' }]],
    ['+1 Wisdom saving throws', [{ type: 'roll-modifier', target: 'save', abilities: ['wis'], bonus: 1 }]],
  ])('homebrew shorthand: %s', (text, expected) => {
    expect(suggestModifiers(text).flatMap((s) => s.grants)).toEqual(expected);
  });

  // Real homebrew item names from a campaign (Turkish table shorthand).
  it.each([
    ['Sessiz Adım Zırhı (sth +1)', ['+1 to check (stealth)']],
    ['Orta Hat Dövmesi (-1 Persuasion)', ['-1 to check (persuasion)']],
    ['Fısıltı Küpesi: insan sesi ve konuşmaları algıda pasif perc +2', ['+2 to check (perception)']],
    ['Usta Gözü: tuzak ve mekanik kusur incelemesinde inv/perception +2', ['+2 to check (perception/investigation)']],
    ['Yukcu Kemeri: pitonla tirmaninca athletics ve acrobatics +1', ['+1 to check (acrobatics/athletics)']],
    ['Yaban Derisi Eldiven: +1d4 str saving, +1d4 dex savng throw', ['+1d4 to save (str)', '+1d4 to save (dex)']],
    ['Bataklık Botları (burda dex stealth str athletics avantaj)', ['Advantage on check (str/dex/athletics/stealth)']],
    ['Yarım Sur Armour: ac 16 + dex, stealth dezavantaj', ['Disadvantage on check (stealth)']],
    ['Slutter: menzilli arbalet, 1d10 piercing, >30ft hedefe +1d6 piercing', ['+1d6 to damage']],
    ['Ivory (1d10 piercing 10ft +1 atk, 5ft disadv)', ['+1 to attack']],
    ['Ring Of Thunder Resistance', ['Resistance: thunder']],
    // Negated or limited-use effects must not become always-on modifiers.
    ['Bataklık Botları (çamur, sığ suda no dezavantaj)', []],
    ['Karabasan Gözlük (parlak güneş dezavantajlarini yok sayar)', []],
    ['Baba Yadigari Short Rest 1 Sefer Advantage', []],
  ])('real item: %s', (text, labels) => {
    expect(suggestModifiers(text).map((s) => s.label)).toEqual(labels);
  });
});
