import { describe, it, expect } from 'vitest';
import { checkRollMods } from '@/lib/roll-mods';
import type { ResolvedCharacter } from '@/types/resolved';

const make = (featureIds: string[], opts: { armorDis?: boolean; proficient?: boolean } = {}) =>
  ({
    proficiencyBonus: 3,
    features: featureIds.map((id) => ({ feature: { id } })),
    savingThrows: { str: { disadvantageFromArmor: opts.armorDis }, dex: {} },
    skills: { athletics: { proficient: opts.proficient ?? false } },
  }) as unknown as ResolvedCharacter;

describe('checkRollMods', () => {
  it('Reliable Talent only for proficient skills', () => {
    expect(
      checkRollMods(make(['rogue-reliable-talent'], { proficient: true }), { ability: 'str', skillId: 'athletics' }).min
    ).toBe(10);
    expect(
      checkRollMods(make(['rogue-reliable-talent']), { ability: 'str', skillId: 'athletics' }).min
    ).toBeUndefined();
  });

  it('Remarkable Athlete: advantage on Athletics', () => {
    const r = make(['champion-remarkable-athlete']);
    expect(checkRollMods(r, { ability: 'str', skillId: 'athletics' }).mode).toBe('adv');
  });

  it('untrained armor cancels advantage; exhaustion penalty comes from effects', () => {
    const r = make(['champion-remarkable-athlete'], { armorDis: true });
    expect(checkRollMods(r, { ability: 'str', skillId: 'athletics' }).mode).toBeNull();
    const applied = {
      checks: { str: 'dis' },
      checkPenalty: 4,
      checkFor: () => ({ bonus: 0, extra: [], adv: false, dis: false, parts: [] }),
    } as never;
    expect(checkRollMods(make([]), { ability: 'str' }, applied)).toMatchObject({ mode: 'dis', bonus: -4 });
  });

  it('Jack of All Trades adds half proficiency (rounded down) to raw ability checks, not skills', () => {
    const r = make(['bard-jack-of-all-trades']);
    expect(checkRollMods(r, { ability: 'dex' })).toMatchObject({ bonus: 1 });
    expect(checkRollMods(r, { ability: 'str' }).parts).toEqual([
      { type: 'ability-check-bonus', label: 'bard-jack-of-all-trades', value: 1 },
    ]);
    expect(checkRollMods(r, { ability: 'str', skillId: 'athletics' }).bonus).toBe(0);
  });
});

describe('checkRollMods with item modifiers', () => {
  it('includes bonus, extra dice and advantage from checkFor', () => {
    const applied = {
      checks: { str: null },
      checkPenalty: 0,
      checkFor: () => ({
        bonus: 2,
        extra: ['+1d4'],
        adv: true,
        dis: false,
        parts: [{ type: 'modifier', label: 'Ring', value: 2 }],
      }),
    } as never;
    expect(checkRollMods(make([]), { ability: 'str' }, applied)).toMatchObject({
      bonus: 2,
      mode: 'adv',
      extra: ['+1d4'],
    });
  });
});
