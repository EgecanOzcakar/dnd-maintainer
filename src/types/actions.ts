import type { ClassId } from '@/lib/dnd-helpers';
import type { AbilityKey } from '@/types/database';
import type { DamageDice } from '@/types/items';

/** How a thing is used in the 2024 action economy (the Actions tab filters). */
export type ActivationType = 'action' | 'bonus-action' | 'reaction' | 'free' | 'special';

/**
 * Dice that grow with class level: `[[1, '1d6'], [5, '1d8'], ...]` means 1d6 from level 1,
 * 1d8 from level 5, and so on. A plain `DamageDice` never scales.
 */
export type ScaledDice = DamageDice | readonly (readonly [minLevel: number, dice: DamageDice])[];

/** An ability whose modifier is added, or the character's spellcasting ability. */
export type ModSource = AbilityKey | 'spellcasting';

export type ActionDamageType =
  | 'acid'
  | 'bludgeoning'
  | 'cold'
  | 'fire'
  | 'force'
  | 'lightning'
  | 'necrotic'
  | 'piercing'
  | 'poison'
  | 'psychic'
  | 'radiant'
  | 'slashing'
  | 'thunder'
  /** Damage of the triggering weapon/spell (e.g. Divine Smite rides the weapon hit). */
  | 'weapon';

/**
 * Class level added to a roll: `true` adds the level (Second Wind: 1d10 + fighter level),
 * `'half'` adds half rounded down (Zealot Divine Fury), a number multiplies it (Preserve Life: 5×).
 */
export type LevelBonus = true | 'half' | number;

export interface ActionDamage {
  /** Omit for a purely flat amount (e.g. Assassinate's + rogue level). */
  readonly dice?: ScaledDice;
  readonly type: ActionDamageType;
  /** Modifier added to the damage roll. */
  readonly addMod?: ModSource;
  readonly addLevel?: LevelBonus;
  readonly flat?: number;
}

export interface ActionHeal {
  readonly dice?: ScaledDice;
  readonly addMod?: ModSource;
  readonly addLevel?: LevelBonus;
  readonly flat?: number;
}

/**
 * Action-economy data for a class/subclass/species/feat feature, keyed by feature id in
 * `src/lib/sources/feature-actions/`. Only features you actually *use* (an action, bonus
 * action, reaction, or a rider with dice) get an entry; passive features have none.
 */
export interface FeatureActionMeta {
  readonly activation: ActivationType;
  /** Makes an attack roll: proficiency + this ability's modifier. */
  readonly attack?: { readonly ability: ModSource };
  /** Forces a save; DC = 8 + proficiency + `dcAbility` modifier. */
  readonly save?: { readonly ability: AbilityKey; readonly dcAbility: ModSource };
  readonly damage?: ActionDamage;
  readonly heal?: ActionHeal;
  /** Class whose level drives `ScaledDice` and `addLevel`; defaults to the feature's source class. */
  readonly scaleClass?: ClassId;
  /** Resource pool spent to use it (shown as the uses counter). */
  readonly poolId?: string;
}

/**
 * Attack/save/damage data for a spell, keyed by spell id in `src/lib/sources/spell-mechanics/`.
 * Activation comes from the spell's `castingTime`. Utility spells with no roll have no entry.
 */
export interface SpellMechanics {
  readonly attack?: 'melee' | 'ranged';
  readonly save?: AbilityKey;
  readonly damage?: {
    readonly dice: DamageDice;
    readonly type: Exclude<ActionDamageType, 'weapon'>;
    /** Flat amount added (Disintegrate's +40, Finger of Death's +30). */
    readonly flat?: number;
    /** Cantrip: the dice count multiplies at character level 5 / 11 / 17. */
    readonly cantripScaling?: boolean;
    /** Added once per slot level above the spell's level. */
    readonly perSlot?: DamageDice;
    /** Add the spellcasting modifier (e.g. Spiritual Weapon, Booming Blade-style riders). */
    readonly addMod?: boolean;
  };
  readonly heal?: {
    /** Omit for a flat heal (Heal: 70 HP). */
    readonly dice?: DamageDice;
    readonly perSlot?: DamageDice;
    readonly addMod?: boolean;
    readonly flat?: number;
    /** Extra flat healing per slot level above the spell's level (Heal: +10). */
    readonly flatPerSlot?: number;
  };
}
