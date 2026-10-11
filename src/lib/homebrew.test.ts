import { homebrewToActions, parseHomebrew } from '@/lib/homebrew';
import type { HomebrewAction } from '@/lib/homebrew';

const resolved = {
  proficiencyBonus: 3,
  abilities: { str: { modifier: 4 }, int: { modifier: 2 }, dex: { modifier: 1 } },
} as unknown as Parameters<typeof homebrewToActions>[1];

const base = { id: 'a', name: 'Zap', kind: 'spell', activation: 'action' } as const;

describe('parseHomebrew', () => {
  it.each([
    null,
    undefined,
    'x',
    5,
    {},
    [null],
    [{}],
    [{ ...base, name: '' }],
    [{ ...base, damage: { dice: 'x', type: 'fire' } }],
  ])('drops malformed input %j without throwing', (raw) => {
    expect(parseHomebrew(raw)).toEqual([]);
  });

  it('keeps valid entries and drops bad siblings', () => {
    expect(parseHomebrew([base, { nope: 1 }])).toEqual([base]);
  });

  it('requires a bonus or ability for attacks and a dc or dcAbility for saves', () => {
    expect(
      parseHomebrew([
        { ...base, attack: {} },
        { ...base, save: { ability: 'dex' } },
      ])
    ).toEqual([]);
  });
});

describe('homebrewToActions', () => {
  it('computes ability attacks, DCs and damage from the character', () => {
    const entry: HomebrewAction = {
      ...base,
      spellLevel: 2,
      attack: { ability: 'str', proficient: true },
      save: { ability: 'dex', dcAbility: 'int' },
      damage: { dice: '2d6', type: 'fire', bonus: 1, ability: 'int' },
      heal: { bonus: 5 },
      uses: { max: 2, rest: 'long' },
    };
    const [a] = homebrewToActions([entry], resolved);
    expect(a).toMatchObject({
      key: 'homebrew:a',
      name: 'Zap',
      homebrewId: 'a',
      kind: 'spell',
      isAttack: true,
      spellLevel: 2,
      toHit: 7,
      save: { ability: 'dex', dc: 13 },
      damage: { dice: '2d6', bonus: 3, type: 'fire' },
      heal: { dice: '', bonus: 5 },
      usesPerRest: { max: 2, rest: 'long' },
    });
  });

  it('uses flat values as-is and marks plain features as non-attacks', () => {
    const [a, b] = homebrewToActions(
      [
        { ...base, kind: 'attack', attack: { bonus: -1 }, save: { ability: 'dex', dc: 15 } },
        { ...base, id: 'b', kind: 'feature' },
      ],
      resolved
    );
    expect(a).toMatchObject({ kind: 'weapon', toHit: -1, save: { dc: 15 } });
    expect(b).toMatchObject({ kind: 'feature', isAttack: false });
  });
});
