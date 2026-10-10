import { describe, expect, it } from 'vitest';
import type { ResolvedAction } from '@/lib/resolver/actions';
import { applyEffects, availableEffects, combineMode, rageDamage, type EffectContext } from '@/lib/resolver/effects';
import type { ResolvedCharacter } from '@/types/resolved';

const ab = (modifier: number) => ({ base: 10, bonuses: [], total: 10 + modifier * 2, modifier });
const save = (bonus: number) => ({ proficient: false, bonus, sources: [], breakdown: [] });

function makeResolved(over: { armored?: boolean; features?: string[]; spells?: string[] } = {}): ResolvedCharacter {
  const base = over.armored ? 14 : 12; // 10 + DEX 2 unarmored, or chain shirt
  return {
    abilities: { str: ab(3), dex: ab(2), con: ab(1), int: ab(0), wis: ab(0), cha: ab(0) },
    speed: { walk: { value: 30, sources: [] } },
    armorClass: {
      calculations: [{ mode: over.armored ? 'armored' : 'unarmored', baseValue: base, source: {} }],
      bonuses: [],
      effective: base,
    },
    savingThrows: { str: save(5), dex: save(2), con: save(1), int: save(0), wis: save(0), cha: save(0) },
    equipment: over.armored ? [{ equipped: true, itemDef: { type: 'armor', category: 'medium' } }] : [],
    attacks: [
      { weaponId: 'greataxe', range: 'melee', properties: [] },
      { weaponId: 'longbow', range: 'ranged', properties: [] },
      { weaponId: 'rapier', range: 'melee', properties: ['finesse'] },
    ],
    features: (over.features ?? []).map((id) => ({ feature: { id } })),
    spellcasting: over.spells
      ? { cantrips: [], knownSpells: over.spells.map((spellId) => ({ spellId })), alwaysPreparedSpells: [] }
      : null,
  } as unknown as ResolvedCharacter;
}

const weapon = (id: string): ResolvedAction => ({
  key: `weapon:${id}`,
  kind: 'weapon',
  refId: id,
  activation: 'action',
  isAttack: true,
  toHit: 6,
  damage: { dice: '1d12', bonus: 3, type: 'slashing' },
});
const actions = [weapon('greataxe'), weapon('longbow'), weapon('rapier')];

const ctx = (over: Partial<EffectContext> = {}): EffectContext => ({
  activeEffects: [],
  conditions: [],
  exhaustionLevel: 0,
  classLevels: {},
  ...over,
});

const RAGER = makeResolved({ features: ['barbarian-rage', 'barbarian-reckless-attack'] });

describe('rageDamage', () => {
  it.each([
    [1, 2],
    [8, 2],
    [9, 3],
    [15, 3],
    [16, 4],
    [20, 4],
  ])('barbarian level %i -> +%i', (level, bonus) => expect(rageDamage(level)).toBe(bonus));
});

describe('combineMode', () => {
  it.each([
    [true, false, 'adv'],
    [false, true, 'dis'],
    [true, true, null],
    [false, false, null],
  ])('adv=%s dis=%s -> %s', (a, d, expected) => expect(combineMode(a, d)).toBe(expected));
});

describe('applyEffects', () => {
  it('is a no-op with nothing active', () => {
    const out = applyEffects(RAGER, actions, ctx());
    expect(out.armorClass).toBe(12);
    expect(out.speed.walk?.value).toBe(30);
    expect(out.actions.map((a) => [a.toHit, a.damage?.bonus, a.mode])).toEqual(
      actions.map((a) => [a.toHit, a.damage?.bonus, null])
    );
    expect(out.resistances).toEqual([]);
  });

  it('rage adds damage to STR melee only, plus resistances and STR advantage', () => {
    const out = applyEffects(RAGER, actions, ctx({ activeEffects: ['rage'], classLevels: { barbarian: 9 } }));
    expect(out.actions.map((a) => a.damage?.bonus)).toEqual([6, 3, 6]); // finesse rapier counts: STR >= DEX
  });

  it('rage skips a finesse weapon when DEX is higher than STR', () => {
    const dexy = makeResolved({ features: ['barbarian-rage'] });
    (dexy.abilities as { dex: { modifier: number } }).dex = ab(4);
    const out = applyEffects(dexy, actions, ctx({ activeEffects: ['rage'], classLevels: { barbarian: 1 } }));
    expect(out.actions.map((a) => a.damage?.bonus)).toEqual([5, 3, 3]);
  });

  it('rage level table, resistances, STR adv', () => {
    const lvl16 = applyEffects(RAGER, actions, ctx({ activeEffects: ['rage'], classLevels: { barbarian: 16 } }));
    expect(lvl16.actions[0].damage?.bonus).toBe(7);
    expect(lvl16.resistances).toEqual(['bludgeoning', 'piercing', 'slashing']);
    expect(lvl16.savingThrows.str.mode).toBe('adv');
    expect(lvl16.checks.str).toBe('adv');
    expect(lvl16.savingThrows.dex.mode).toBeNull();
  });

  it('ignores effects the character does not have', () => {
    const out = applyEffects(makeResolved(), actions, ctx({ activeEffects: ['rage', 'shield'] }));
    expect(out.armorClass).toBe(12);
    expect(out.resistances).toEqual([]);
  });

  describe('armor class', () => {
    const casty = makeResolved({ spells: ['mage-armor', 'shield', 'shield-of-faith', 'barkskin', 'haste'] });
    const castyArmored = makeResolved({ armored: true, spells: ['mage-armor', 'barkskin'] });

    it('mage armor sets unarmored base 13 + DEX', () => {
      expect(applyEffects(casty, [], ctx({ activeEffects: ['mage-armor'] })).armorClass).toBe(15);
    });
    it('mage armor does nothing while body armor is worn', () => {
      expect(applyEffects(castyArmored, [], ctx({ activeEffects: ['mage-armor'] })).armorClass).toBe(14);
    });
    it('barkskin raises to 17 but never lowers', () => {
      expect(applyEffects(casty, [], ctx({ activeEffects: ['barkskin'] })).armorClass).toBe(17);
      const high = makeResolved({ spells: ['barkskin'] });
      (high.armorClass as { effective: number }).effective = 19;
      expect(applyEffects(high, [], ctx({ activeEffects: ['barkskin'] })).armorClass).toBe(19);
    });
    it('stacks shield of faith, shield and haste', () => {
      const out = applyEffects(casty, [], ctx({ activeEffects: ['shield', 'shield-of-faith', 'haste'] }));
      expect(out.armorClass).toBe(12 + 5 + 2 + 2);
    });
    it('mage armor plus shield', () => {
      expect(applyEffects(casty, [], ctx({ activeEffects: ['mage-armor', 'shield'] })).armorClass).toBe(20);
    });
  });

  describe('speed and exhaustion', () => {
    const hasty = makeResolved({ spells: ['haste'] });
    it('haste doubles speed and grants DEX save advantage', () => {
      const out = applyEffects(hasty, [], ctx({ activeEffects: ['haste'] }));
      expect(out.speed.walk?.value).toBe(60);
      expect(out.savingThrows.dex.mode).toBe('adv');
    });
    it('exhaustion: -5 ft and -2 to d20 tests per level', () => {
      const out = applyEffects(RAGER, actions, ctx({ exhaustionLevel: 3 }));
      expect(out.speed.walk?.value).toBe(15);
      expect(out.actions[0].toHit).toBe(0);
      expect(out.savingThrows.str.bonus).toBe(-1);
      expect(out.checkPenalty).toBe(6);
    });
    it('speed never drops below 0', () => {
      expect(applyEffects(RAGER, [], ctx({ exhaustionLevel: 6 })).speed.walk?.value).toBe(0);
    });
    it('haste doubles before exhaustion applies', () => {
      expect(applyEffects(hasty, [], ctx({ activeEffects: ['haste'], exhaustionLevel: 2 })).speed.walk?.value).toBe(50);
    });
  });

  describe('advantage and disadvantage', () => {
    it('invisible gives advantage on all attacks', () => {
      const out = applyEffects(makeResolved(), actions, ctx({ activeEffects: ['invisible'] }));
      expect(out.actions.map((a) => a.mode)).toEqual(['adv', 'adv', 'adv']);
    });
    it('reckless attack affects STR melee only', () => {
      const out = applyEffects(RAGER, actions, ctx({ activeEffects: ['reckless-attack'] }));
      expect(out.actions.map((a) => a.mode)).toEqual(['adv', null, 'adv']);
    });
    it('advantage and disadvantage cancel', () => {
      const out = applyEffects(RAGER, actions, ctx({ activeEffects: ['reckless-attack'], conditions: ['poisoned'] }));
      expect(out.actions.map((a) => a.mode)).toEqual([null, 'dis', null]);
    });
    it.each(['poisoned', 'prone', 'restrained', 'blinded', 'frightened'])('%s -> disadvantage on attacks', (c) => {
      expect(applyEffects(RAGER, actions, ctx({ conditions: [c] })).actions[0].mode).toBe('dis');
    });
    it('poisoned and frightened impose disadvantage on checks; prone does not', () => {
      expect(applyEffects(RAGER, [], ctx({ conditions: ['poisoned'] })).checks.cha).toBe('dis');
      expect(applyEffects(RAGER, [], ctx({ conditions: ['frightened'] })).checks.str).toBe('dis');
      expect(applyEffects(RAGER, [], ctx({ conditions: ['prone'] })).checks.str).toBeNull();
    });
    it('rage STR check advantage cancels poisoned disadvantage', () => {
      const out = applyEffects(RAGER, [], ctx({ activeEffects: ['rage'], conditions: ['poisoned'] }));
      expect(out.checks.str).toBeNull();
      expect(out.checks.dex).toBe('dis');
    });
    it('dodge: attacks against you at disadvantage, DEX save advantage', () => {
      const out = applyEffects(makeResolved(), [], ctx({ activeEffects: ['dodge'] }));
      expect(out.attacksAgainst).toBe('dis');
      expect(out.savingThrows.dex.mode).toBe('adv');
    });
    it('restrained gives disadvantage on DEX saves', () => {
      expect(applyEffects(makeResolved(), [], ctx({ conditions: ['restrained'] })).savingThrows.dex.mode).toBe('dis');
    });
  });

  describe('extra dice', () => {
    const blessed = makeResolved({ spells: ['bless', 'bane', 'hunters-mark', 'hex'] });
    it('bless adds +1d4 to attacks and saves, bane -1d4', () => {
      const bless = applyEffects(blessed, actions, ctx({ activeEffects: ['bless'] }));
      expect(bless.actions[0].toHitExtra).toEqual(['+1d4']);
      expect(bless.savingThrows.wis.extra).toEqual(['+1d4']);
      const bane = applyEffects(blessed, actions, ctx({ activeEffects: ['bane'] }));
      expect(bane.actions[0].toHitExtra).toEqual(['-1d4']);
    });
    it("hunter's mark only on weapon attacks; hex also on spell attacks", () => {
      const spell: ResolvedAction = {
        key: 'spell:eldritch-blast',
        kind: 'spell',
        refId: 'eldritch-blast',
        activation: 'action',
        isAttack: true,
        toHit: 6,
        damage: { dice: '1d10', bonus: 0, type: 'force' },
      };
      const mark = applyEffects(blessed, [weapon('longbow'), spell], ctx({ activeEffects: ['hunters-mark'] }));
      expect(mark.actions[0].damageExtra).toEqual(['+1d6']);
      expect(mark.actions[1].damageExtra).toBeUndefined();
      const hex = applyEffects(blessed, [spell], ctx({ activeEffects: ['hex'] }));
      expect(hex.actions[0].damageExtra).toEqual(['+1d6']);
    });
  });
});

describe('availableEffects', () => {
  it('offers always-on effects plus those backed by features and spells', () => {
    const ids = (r: ResolvedCharacter) => availableEffects(r).map((e) => e.id);
    expect(ids(makeResolved())).toEqual(['dodge', 'invisible']);
    expect(ids(RAGER)).toEqual(['rage', 'dodge', 'reckless-attack', 'invisible']);
    expect(ids(makeResolved({ spells: ['bless'] }))).toContain('bless');
  });
});
