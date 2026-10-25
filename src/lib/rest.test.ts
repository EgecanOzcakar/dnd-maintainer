import { describe, it, expect } from 'vitest';
import {
  getHitDiceMax,
  getSpellSlotMax,
  spendHitDie,
  markSpellSlot,
  recoverSpellSlot,
  applyShortRest,
  applyLongRest,
  applyPoolRest,
  buildRestUpdate,
  poolRemaining,
  spendPool,
  type HitDiceUsed,
  type SpellSlotsUsed,
  type RestUsed,
} from '@/lib/rest';
import type { ResolvedCharacter } from '@/types/resolved';

// Minimal resolved character factory
function makeResolved(overrides: Partial<ResolvedCharacter> = {}): ResolvedCharacter {
  return {
    abilities: {} as ResolvedCharacter['abilities'],
    hitDie: [],
    hitPoints: { max: 0 },
    speed: {},
    initiative: 0,
    proficiencyBonus: 2,
    armorClass: { calculations: [], bonuses: [], effective: 10 },
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

function makeSpellcasting(
  overrides: Partial<ResolvedCharacter['spellcasting']> = {}
): NonNullable<ResolvedCharacter['spellcasting']> {
  return {
    ability: 'wis',
    spellSaveDC: 14,
    spellAttackBonus: 6,
    cantrips: [],
    cantripsKnown: 0,
    knownSpells: [],
    spellsKnown: [],
    alwaysPreparedSpells: [],
    slots: [],
    preparedCount: 0,
    pactMagic: null,
    spellAbilityOverrides: {},
    ...overrides,
  };
}

// ─── getHitDiceMax ────────────────────────────────────────────────────────────

describe('getHitDiceMax', () => {
  it('returns empty object when hitDie is empty', () => {
    const resolved = makeResolved({ hitDie: [] });
    expect(getHitDiceMax(resolved)).toEqual({});
  });

  it('returns single die entry for a single-class character', () => {
    const resolved = makeResolved({ hitDie: [{ die: 8, count: 3 }] });
    expect(getHitDiceMax(resolved)).toEqual({ '8': 3 });
  });

  it('combines counts for duplicate die sizes (multiclass same die)', () => {
    const resolved = makeResolved({
      hitDie: [
        { die: 8, count: 2 },
        { die: 8, count: 1 },
      ],
    });
    expect(getHitDiceMax(resolved)).toEqual({ '8': 3 });
  });

  it('returns separate entries for different die sizes (multiclass)', () => {
    const resolved = makeResolved({
      hitDie: [
        { die: 12, count: 2 },
        { die: 8, count: 3 },
      ],
    });
    expect(getHitDiceMax(resolved)).toEqual({ '12': 2, '8': 3 });
  });
});

// ─── getSpellSlotMax ──────────────────────────────────────────────────────────

describe('getSpellSlotMax', () => {
  it('returns empty object when spellcasting is null', () => {
    const resolved = makeResolved({ spellcasting: null });
    expect(getSpellSlotMax(resolved)).toEqual({});
  });

  it('skips levels with 0 slots', () => {
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({ slots: [2, 0, 0, 0, 0, 0, 0, 0, 0] }),
    });
    expect(getSpellSlotMax(resolved)).toEqual({ '1': 2 });
  });

  it('keys are 1-based spell level strings', () => {
    // slots[0] = level 1, slots[1] = level 2, etc.
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({ slots: [4, 3, 2, 1, 0, 0, 0, 0, 0] }),
    });
    expect(getSpellSlotMax(resolved)).toEqual({ '1': 4, '2': 3, '3': 2, '4': 1 });
  });

  it('includes pact magic as "pact" key when present', () => {
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({
        slots: [],
        pactMagic: { count: 2, slotLevel: 3 },
      }),
    });
    expect(getSpellSlotMax(resolved)).toEqual({ pact: 2 });
  });

  it('includes both normal slots and pact when both present (edge case)', () => {
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({
        slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        pactMagic: { count: 1, slotLevel: 1 },
      }),
    });
    expect(getSpellSlotMax(resolved)).toEqual({ '1': 2, pact: 1 });
  });
});

// ─── spendHitDie ─────────────────────────────────────────────────────────────

describe('spendHitDie', () => {
  it('increments used count for the given die', () => {
    const used: HitDiceUsed = {};
    const maxByDie: HitDiceUsed = { '8': 3 };
    expect(spendHitDie(used, 8, maxByDie)).toEqual({ '8': 1 });
  });

  it('does not mutate the input object', () => {
    const used: HitDiceUsed = { '8': 1 };
    const maxByDie: HitDiceUsed = { '8': 3 };
    const result = spendHitDie(used, 8, maxByDie);
    expect(used).toEqual({ '8': 1 });
    expect(result).toEqual({ '8': 2 });
  });

  it('is clamped at max and returns original object when already at max', () => {
    const used: HitDiceUsed = { '8': 3 };
    const maxByDie: HitDiceUsed = { '8': 3 };
    const result = spendHitDie(used, 8, maxByDie);
    expect(result).toBe(used); // same reference — no change
  });

  it('returns unchanged object when die size is not in max', () => {
    const used: HitDiceUsed = {};
    const maxByDie: HitDiceUsed = {};
    const result = spendHitDie(used, 12, maxByDie);
    expect(result).toBe(used);
  });
});

// ─── markSpellSlot ────────────────────────────────────────────────────────────

describe('markSpellSlot', () => {
  it('increments used count for the given level', () => {
    const used: SpellSlotsUsed = {};
    const max: SpellSlotsUsed = { '1': 4 };
    expect(markSpellSlot(used, 1, max)).toEqual({ '1': 1 });
  });

  it('does not mutate the input object', () => {
    const used: SpellSlotsUsed = { '1': 1 };
    const max: SpellSlotsUsed = { '1': 4 };
    const result = markSpellSlot(used, 1, max);
    expect(used).toEqual({ '1': 1 });
    expect(result).toEqual({ '1': 2 });
  });

  it('is clamped at max and returns original object when all slots used', () => {
    const used: SpellSlotsUsed = { '1': 4 };
    const max: SpellSlotsUsed = { '1': 4 };
    const result = markSpellSlot(used, 1, max);
    expect(result).toBe(used);
  });

  it('accepts "pact" as level string for warlock pact magic', () => {
    const used: SpellSlotsUsed = {};
    const max: SpellSlotsUsed = { pact: 2 };
    expect(markSpellSlot(used, 'pact', max)).toEqual({ pact: 1 });
  });
});

// ─── recoverSpellSlot ─────────────────────────────────────────────────────────

describe('recoverSpellSlot', () => {
  it('decrements used count for the given level', () => {
    const used: SpellSlotsUsed = { '1': 2 };
    expect(recoverSpellSlot(used, 1)).toEqual({ '1': 1 });
  });

  it('does not mutate the input object', () => {
    const used: SpellSlotsUsed = { '1': 2 };
    const result = recoverSpellSlot(used, 1);
    expect(used).toEqual({ '1': 2 });
    expect(result).toEqual({ '1': 1 });
  });

  it('is clamped at 0 and returns original object when already 0', () => {
    const used: SpellSlotsUsed = { '1': 0 };
    const result = recoverSpellSlot(used, 1);
    expect(result).toBe(used);
  });

  it('is clamped at 0 for missing keys (treat as 0)', () => {
    const used: SpellSlotsUsed = {};
    const result = recoverSpellSlot(used, 1);
    expect(result).toBe(used);
  });

  it('accepts "pact" as level string', () => {
    const used: SpellSlotsUsed = { pact: 1 };
    expect(recoverSpellSlot(used, 'pact')).toEqual({ pact: 0 });
  });
});

// ─── applyShortRest ───────────────────────────────────────────────────────────

describe('applyShortRest', () => {
  it('resets pact slots to 0 when pact magic is present', () => {
    const used: RestUsed = {
      hitDiceUsed: { '8': 2 },
      spellSlotsUsed: { pact: 2 },
    };
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({ pactMagic: { count: 2, slotLevel: 3 } }),
    });
    const result = applyShortRest(used, resolved);
    expect(result.spellSlotsUsed).toEqual({ pact: 0 });
  });

  it('does not change hit dice on short rest', () => {
    const used: RestUsed = {
      hitDiceUsed: { '8': 2 },
      spellSlotsUsed: { pact: 2 },
    };
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({ pactMagic: { count: 2, slotLevel: 3 } }),
    });
    const result = applyShortRest(used, resolved);
    expect(result.hitDiceUsed).toEqual({ '8': 2 });
  });

  it('does not change normal spell slots on short rest', () => {
    const used: RestUsed = {
      hitDiceUsed: {},
      spellSlotsUsed: { '1': 3, pact: 1 },
    };
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({ pactMagic: { count: 2, slotLevel: 3 } }),
    });
    const result = applyShortRest(used, resolved);
    expect(result.spellSlotsUsed['1']).toBe(3);
    expect(result.spellSlotsUsed['pact']).toBe(0);
  });

  it('returns original used object unchanged when spellcasting is null', () => {
    const used: RestUsed = {
      hitDiceUsed: { '8': 1 },
      spellSlotsUsed: { '1': 2 },
    };
    const resolved = makeResolved({ spellcasting: null });
    const result = applyShortRest(used, resolved);
    expect(result).toBe(used);
  });

  it('returns original used object unchanged when no pact magic', () => {
    const used: RestUsed = {
      hitDiceUsed: { '8': 1 },
      spellSlotsUsed: { '1': 2 },
    };
    const resolved = makeResolved({
      spellcasting: makeSpellcasting({ pactMagic: null }),
    });
    const result = applyShortRest(used, resolved);
    expect(result).toBe(used);
  });
});

// ─── applyLongRest ────────────────────────────────────────────────────────────

describe('applyLongRest', () => {
  it('resets all normal spell slots to 0', () => {
    const used: RestUsed = {
      hitDiceUsed: {},
      spellSlotsUsed: { '1': 4, '2': 3, '3': 2 },
    };
    const resolved = makeResolved({ hitDie: [{ die: 8, count: 1 }] });
    const result = applyLongRest(used, resolved);
    expect(result.spellSlotsUsed).toEqual({ '1': 0, '2': 0, '3': 0 });
  });

  it('resets pact spell slots to 0', () => {
    const used: RestUsed = {
      hitDiceUsed: {},
      spellSlotsUsed: { pact: 2 },
    };
    const resolved = makeResolved({ hitDie: [{ die: 8, count: 1 }] });
    const result = applyLongRest(used, resolved);
    expect(result.spellSlotsUsed).toEqual({ pact: 0 });
  });

  it.each<[string, HitDiceUsed, ResolvedCharacter['hitDie']]>([
    ['single class', { '8': 3 }, [{ die: 8, count: 4 }]],
    ['level 1', { '8': 1 }, [{ die: 8, count: 1 }]],
    [
      'multiclass',
      { '10': 3, '6': 2 },
      [
        { die: 10, count: 3 },
        { die: 6, count: 3 },
      ],
    ],
  ])('recovers ALL spent hit dice (2024), %s', (_name, hitDiceUsed, hitDie) => {
    const result = applyLongRest({ hitDiceUsed, spellSlotsUsed: {} }, makeResolved({ hitDie }));
    expect(Object.values(result.hitDiceUsed).every((n) => n === 0)).toBe(true);
  });

  it('does not mutate the input used object', () => {
    const hitDiceUsed: HitDiceUsed = { '8': 3 };
    const spellSlotsUsed: SpellSlotsUsed = { '1': 2 };
    const used: RestUsed = { hitDiceUsed, spellSlotsUsed };
    const resolved = makeResolved({ hitDie: [{ die: 8, count: 4 }] });
    applyLongRest(used, resolved);
    expect(hitDiceUsed).toEqual({ '8': 3 });
    expect(spellSlotsUsed).toEqual({ '1': 2 });
  });
});

// ─── buildRestUpdate ──────────────────────────────────────────────────────────

describe('buildRestUpdate', () => {
  it('long rest resets all spell slots and recovers hit dice, returning both columns', () => {
    // 2024: a long rest recovers every spent hit die
    const character = {
      hit_dice_used: { '8': 3 } as HitDiceUsed,
      spell_slots_used: { '1': 4, '2': 3, pact: 2 } as SpellSlotsUsed,
    };
    const resolved = makeResolved({
      hitDie: [{ die: 8, count: 4 }],
      spellcasting: makeSpellcasting({ slots: [4, 3, 0, 0, 0, 0, 0, 0, 0] }),
    });
    const result = buildRestUpdate('long', character, resolved);
    // Both columns must be present
    expect(result).toHaveProperty('hit_dice_used');
    expect(result).toHaveProperty('spell_slots_used');
    // All spell slots reset to 0
    expect(result.spell_slots_used).toEqual({ '1': 0, '2': 0, pact: 0 });
    // 2024: every spent hit die comes back
    expect(result.hit_dice_used['8'] ?? 0).toBe(0);
  });

  it('short rest leaves hit_dice_used untouched and resets only pact slots', () => {
    const character = {
      hit_dice_used: { '8': 2 } as HitDiceUsed,
      spell_slots_used: { '1': 3, pact: 2 } as SpellSlotsUsed,
    };
    const resolved = makeResolved({
      hitDie: [{ die: 8, count: 4 }],
      spellcasting: makeSpellcasting({
        slots: [4, 0, 0, 0, 0, 0, 0, 0, 0],
        pactMagic: { count: 2, slotLevel: 3 },
      }),
    });
    const result = buildRestUpdate('short', character, resolved);
    // Both columns returned
    expect(result).toHaveProperty('hit_dice_used');
    expect(result).toHaveProperty('spell_slots_used');
    // Hit dice unchanged
    expect(result.hit_dice_used).toEqual({ '8': 2 });
    // Normal spell slots unchanged; pact reset to 0
    expect(result.spell_slots_used['1']).toBe(3);
    expect(result.spell_slots_used['pact']).toBe(0);
  });

  it('short rest with no pact magic returns hit_dice_used unchanged', () => {
    const character = {
      hit_dice_used: { '10': 1 } as HitDiceUsed,
      spell_slots_used: { '1': 2 } as SpellSlotsUsed,
    };
    const resolved = makeResolved({
      hitDie: [{ die: 10, count: 3 }],
      spellcasting: makeSpellcasting({ slots: [4, 0, 0, 0, 0, 0, 0, 0, 0], pactMagic: null }),
    });
    const result = buildRestUpdate('short', character, resolved);
    expect(result.hit_dice_used).toEqual({ '10': 1 });
    expect(result.spell_slots_used).toEqual({ '1': 2 });
  });

  it('handles null hit_dice_used and spell_slots_used (treats both as empty)', () => {
    const character = {
      hit_dice_used: null as unknown as HitDiceUsed,
      spell_slots_used: null as unknown as SpellSlotsUsed,
    };
    const resolved = makeResolved({
      hitDie: [{ die: 8, count: 2 }],
    });
    const result = buildRestUpdate('long', character, resolved);
    expect(result.hit_dice_used).toEqual({});
    expect(result.spell_slots_used).toEqual({});
  });
});

describe('resource pools', () => {
  const pool = (poolId: string, regen: ResolvedCharacter['resourcePools'][number]['regen']) => ({
    poolId,
    max: 4,
    regen,
    source: { origin: 'class', id: 'fighter' } as never,
  });
  const resolved = makeResolved({
    resourcePools: [
      pool('second-wind', 'short-rest'),
      pool('rage', 'long-rest'),
      pool('psionic', { mode: 'compound', shortRestAmount: 1 }),
    ],
  });
  const used = { 'second-wind': 1, rage: 2, psionic: 3 };

  it('spends and restores within 0..max', () => {
    expect(spendPool({}, 'rage', 3)).toEqual({ rage: 1 });
    expect(spendPool({ rage: 3 }, 'rage', 3)).toEqual({ rage: 3 });
    expect(spendPool({ rage: 1 }, 'rage', 3, -5)).toEqual({ rage: 0 });
    expect(poolRemaining({ rage: 1 }, 'rage', 3)).toBe(2);
    expect(poolRemaining({ rage: 9 }, 'rage', 3)).toBe(0);
  });

  it('short rest refills short-rest pools and partly refills compound pools', () => {
    expect(applyPoolRest(used, resolved, 'short')).toEqual({ rage: 2, psionic: 2 });
  });

  it('Sorcerous Restoration refills half your level in Sorcery Points once per long rest', () => {
    const sorc = makeResolved({
      resourcePools: [
        { poolId: 'sorcery-points', max: 8, regen: 'long-rest', source: { origin: 'class', id: 'sorcerer' } as never },
        {
          poolId: 'sorcerous-restoration',
          max: 1,
          regen: 'long-rest',
          source: { origin: 'class', id: 'sorcerer' } as never,
        },
      ],
    });
    const first = applyPoolRest({ 'sorcery-points': 7 }, sorc, 'short');
    expect(first).toEqual({ 'sorcery-points': 3, 'sorcerous-restoration': 1 });
    expect(applyPoolRest(first, sorc, 'short')).toEqual(first);
    // nothing spent: the daily use is kept
    expect(applyPoolRest({}, sorc, 'short')).toEqual({});
  });

  it('long rest refills everything', () => {
    expect(applyPoolRest(used, resolved, 'long')).toEqual({});
  });

  it('buildRestUpdate includes the pools column', () => {
    const r = buildRestUpdate('long', { hit_dice_used: {}, spell_slots_used: {}, resource_pools_used: used }, resolved);
    expect(r.resource_pools_used).toEqual({});
  });
});
