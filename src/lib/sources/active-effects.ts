import type { AbilityKey } from '@/types/database';

/** What a character must have for an effect to be offered. */
export type EffectRequirement = { readonly feature: string } | { readonly spell: string } | 'always';

/** Which attack actions an effect touches. */
export type AttackFilter = 'all' | 'str-melee';

export interface EffectMods {
  readonly acBonus?: number;
  /** Replaces the base AC with 13 + DEX when no body armor is worn (Mage Armor). */
  readonly unarmoredBase13?: boolean;
  /** AC can't be lower than this (Barkskin). */
  readonly acMin?: number;
  readonly speedMultiplier?: number;
  /** Flat damage that scales with Barbarian level (Rage). */
  readonly rageDamage?: boolean;
  readonly resistances?: readonly string[];
  readonly attackAdvantage?: AttackFilter;
  /** Attack rolls made against the character have disadvantage. */
  readonly attacksAgainstDisadvantage?: boolean;
  readonly saveAdvantage?: readonly AbilityKey[];
  readonly checkAdvantage?: readonly AbilityKey[];
  /** Extra die added to attack rolls and saving throws, e.g. `+1d4`. */
  readonly d20Die?: string;
  /** Extra damage die on attacks, e.g. `+1d6`. `weapon` limits it to weapon attacks. */
  readonly damageDie?: { readonly dice: string; readonly filter: 'weapon' | 'attack' };
}

export interface ActiveEffectDef {
  readonly id: string;
  readonly requires: EffectRequirement;
  readonly mods: EffectMods;
}

export const ACTIVE_EFFECTS: readonly ActiveEffectDef[] = [
  {
    id: 'rage',
    requires: { feature: 'barbarian-rage' },
    mods: {
      rageDamage: true,
      resistances: ['bludgeoning', 'piercing', 'slashing'],
      saveAdvantage: ['str'],
      checkAdvantage: ['str'],
    },
  },
  { id: 'bless', requires: { spell: 'bless' }, mods: { d20Die: '+1d4' } },
  { id: 'bane', requires: { spell: 'bane' }, mods: { d20Die: '-1d4' } },
  { id: 'shield-of-faith', requires: { spell: 'shield-of-faith' }, mods: { acBonus: 2 } },
  { id: 'shield', requires: { spell: 'shield' }, mods: { acBonus: 5 } },
  {
    id: 'haste',
    requires: { spell: 'haste' },
    mods: { acBonus: 2, speedMultiplier: 2, saveAdvantage: ['dex'] },
  },
  {
    id: 'hunters-mark',
    requires: { spell: 'hunters-mark' },
    mods: { damageDie: { dice: '+1d6', filter: 'weapon' } },
  },
  { id: 'hex', requires: { spell: 'hex' }, mods: { damageDie: { dice: '+1d6', filter: 'attack' } } },
  { id: 'dodge', requires: 'always', mods: { attacksAgainstDisadvantage: true, saveAdvantage: ['dex'] } },
  { id: 'reckless-attack', requires: { feature: 'barbarian-reckless-attack' }, mods: { attackAdvantage: 'str-melee' } },
  { id: 'mage-armor', requires: { spell: 'mage-armor' }, mods: { unarmoredBase13: true } },
  { id: 'barkskin', requires: { spell: 'barkskin' }, mods: { acMin: 17 } },
  { id: 'invisible', requires: 'always', mods: { attackAdvantage: 'all' } },
];

export const ACTIVE_EFFECT_IDS: readonly string[] = ACTIVE_EFFECTS.map((e) => e.id);
