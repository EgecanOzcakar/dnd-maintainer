import { describe, expect, it } from 'vitest';
import {
  activationFromCastingTime,
  attacksPerAction,
  cantripDice,
  resolveActions,
  scaleDice,
} from '@/lib/resolver/actions';
import type { AbilityKey } from '@/types/database';
import type { ResolvedAbility, ResolvedCharacter, ResolvedSpellcasting } from '@/types/resolved';

const ability = (score: number): ResolvedAbility => ({
  base: score,
  bonuses: [],
  total: score,
  modifier: Math.floor((score - 10) / 2),
});

function makeResolved(overrides: Partial<ResolvedCharacter> = {}): ResolvedCharacter {
  const abilities = Object.fromEntries(
    (['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]).map((k) => [k, ability(10)])
  ) as ResolvedCharacter['abilities'];
  return {
    abilities,
    hitDie: [],
    hitPoints: { max: 10 },
    speed: {},
    initiative: 0,
    proficiencyBonus: 3,
    armorClass: { effective: 10, calculations: [], bonuses: [] },
    savingThrows: {} as ResolvedCharacter['savingThrows'],
    skills: {} as ResolvedCharacter['skills'],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    languages: [],
    features: [],
    resistances: [],
    immunities: [],
    spellcasting: null,
    equipment: [],
    attacks: [],
    toolExpertise: [],
    bardicInspiration: null,
    pendingChoices: [],
    weaponMasteries: [],
    resourcePools: [],
    ...overrides,
  };
}

const wizardCasting: ResolvedSpellcasting = {
  ability: 'int',
  spellSaveDC: null,
  spellAttackBonus: null,
  cantrips: ['fire-bolt'],
  cantripsKnown: 1,
  knownSpells: [
    { spellId: 'magic-missile', spellLevel: 1 },
    { spellId: 'burning-hands', spellLevel: 1 },
  ],
  spellsKnown: [],
  alwaysPreparedSpells: ['cure-wounds'],
  slots: [],
  preparedCount: 0,
  pactMagic: null,
  spellAbilityOverrides: { 'cure-wounds': 'wis' },
};

describe('dice helpers', () => {
  it.each([
    [1, '1d10'],
    [4, '1d10'],
    [5, '2d10'],
    [11, '3d10'],
    [17, '4d10'],
  ] as const)('cantrip 1d10 at level %i → %s', (level, expected) => {
    expect(cantripDice('1d10', level)).toBe(expected);
  });

  it('scaleDice picks the highest row at or below the level', () => {
    const table = [
      [1, '1d6'],
      [5, '3d6'],
    ] as const;
    expect(scaleDice(table, 4)).toBe('1d6');
    expect(scaleDice(table, 5)).toBe('3d6');
    expect(scaleDice([[3, '1d8']], 2)).toBeNull();
    expect(scaleDice('2d4', 20)).toBe('2d4');
  });

  it.each([
    ['Action', 'action'],
    ['Bonus Action', 'bonus-action'],
    ['Reaction', 'reaction'],
    ['1 minute', 'special'],
  ] as const)('casting time %s → %s', (time, expected) => {
    expect(activationFromCastingTime(time)).toBe(expected);
  });

  it('attacks per action', () => {
    expect(attacksPerAction(new Set())).toBe(1);
    expect(attacksPerAction(new Set(['paladin-extra-attack']))).toBe(2);
    expect(attacksPerAction(new Set(['fighter-extra-attack', 'fighter-extra-attack-2']))).toBe(3);
    expect(attacksPerAction(new Set(['fighter-extra-attack-3']))).toBe(4);
  });
});

describe('resolveActions', () => {
  const resolved = makeResolved({
    abilities: { ...makeResolved().abilities, int: ability(18), wis: ability(14) },
    spellcasting: wizardCasting,
  });
  const byRef = (level: number) =>
    Object.fromEntries(resolveActions(resolved, { wizard: level }).actions.map((a) => [a.refId, a]));

  it('spell attack: proficiency + casting mod, cantrip dice scale with character level', () => {
    expect(byRef(5)['fire-bolt']).toMatchObject({
      activation: 'action',
      isAttack: true,
      toHit: 3 + 4,
      damage: { dice: '2d10', bonus: 0, type: 'fire' },
    });
  });

  it('with a prepared list, only cantrips, always-prepared and prepared spells are listed', () => {
    const refs = resolveActions(resolved, { wizard: 1 }, ['burning-hands']).actions.map((a) => a.refId);
    expect(refs).toEqual(expect.arrayContaining(['fire-bolt', 'cure-wounds', 'burning-hands']));
    expect(refs).not.toContain('magic-missile');
  });

  it('save spell: DC 8 + proficiency + casting mod, with upcast dice', () => {
    expect(byRef(1)['burning-hands']).toMatchObject({
      save: { ability: 'dex', dc: 8 + 3 + 4 },
      damage: { dice: '3d6' },
      upcast: '1d6',
      spellLevel: 1,
    });
  });

  it('heal adds the per-spell ability override modifier', () => {
    expect(byRef(1)['cure-wounds']).toMatchObject({ heal: { dice: '2d8', bonus: 2 }, isAttack: false });
  });

  it('features: rogue sneak attack scales with rogue level, second wind heals 1d10 + fighter level', () => {
    const r = makeResolved({
      features: [
        { feature: { id: 'rogue-sneak-attack' }, source: { origin: 'class', id: 'rogue', level: 1 } },
        { feature: { id: 'fighter-second-wind' }, source: { origin: 'class', id: 'fighter', level: 1 } },
      ],
    });
    const actions = Object.fromEntries(resolveActions(r, { rogue: 7, fighter: 2 }).actions.map((a) => [a.refId, a]));
    expect(actions['rogue-sneak-attack']).toMatchObject({ activation: 'special', damage: { dice: '4d6' } });
    expect(actions['fighter-second-wind']).toMatchObject({
      activation: 'bonus-action',
      heal: { dice: '1d10', bonus: 2 },
      poolId: 'second-wind',
    });
  });

  it('off-hand weapon attacks are bonus actions', () => {
    const r = makeResolved({
      attacks: [
        {
          weaponId: 'dagger',
          attackBonus: 5,
          attackBreakdown: [],
          damageDice: '1d4',
          damageBonus: 0,
          damageBreakdown: [],
          damageType: 'piercing',
          properties: ['light'],
          range: 'melee',
          offHand: true,
        },
      ],
    });
    expect(resolveActions(r, {}).actions[0]).toMatchObject({ activation: 'bonus-action', offHand: true });
  });
});
