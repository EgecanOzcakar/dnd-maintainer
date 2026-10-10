import type { SpellMechanics } from '@/types/actions';

/** Attack/save/damage data for level 2-3 spells (see SpellMechanics). 2024 PHB values. */
export const SPELL_MECHANICS_L2_L3: Readonly<Record<string, SpellMechanics>> = {
  // ---- Level 2 ----
  'blindness-deafness': { save: 'con' },
  // Rider on the next weapon hit (no roll of its own).
  'branding-smite': { damage: { dice: '2d6', type: 'radiant', perSlot: '1d6' } },
  'calm-emotions': { save: 'cha' },
  'cloud-of-daggers': { damage: { dice: '4d4', type: 'slashing', perSlot: '2d4' } },
  'cordon-of-arrows': { save: 'dex', damage: { dice: '1d6', type: 'piercing' } },
  'crown-of-madness': { save: 'wis' },
  'detect-thoughts': { save: 'wis' }, // only when probing deeper
  // Damage type is chosen at cast (acid/cold/fire/lightning/poison); fire is the default shown.
  'dragons-breath': { save: 'dex', damage: { dice: '3d6', type: 'fire', perSlot: '1d6' } },
  'enlarge-reduce': { save: 'con' }, // unwilling targets only
  // Bonus-action melee spell attack; real upcast is +1d6 per two slot levels above 2nd, not expressible.
  'flame-blade': { attack: 'melee', damage: { dice: '3d6', type: 'fire' } },
  'flaming-sphere': { save: 'dex', damage: { dice: '2d6', type: 'fire', perSlot: '1d6' } },
  'gust-of-wind': { save: 'str' },
  'healing-spirit': { heal: { dice: '1d6', perSlot: '1d6', addMod: true } },
  // Damage on cast and each turn has no save; the CON save is to avoid dropping/disadvantage.
  'heat-metal': { save: 'con', damage: { dice: '2d8', type: 'fire', perSlot: '1d8' } },
  'hold-person': { save: 'wis' },
  levitate: { save: 'con' }, // unwilling targets only
  // Ranged attack, 4d4 acid now; end-of-turn damage not modeled.
  'melfs-acid-arrow': { attack: 'ranged', damage: { dice: '4d4', type: 'acid', perSlot: '1d4' } },
  'mind-spike': { save: 'wis', damage: { dice: '3d8', type: 'psychic', perSlot: '1d8' } },
  moonbeam: { save: 'con', damage: { dice: '2d10', type: 'radiant', perSlot: '1d10' } },
  'phantasmal-force': { save: 'int', damage: { dice: '2d8', type: 'psychic', perSlot: '1d8' } },
  'prayer-of-healing': { heal: { dice: '2d8', perSlot: '1d8', addMod: true } },
  // Unsure of exact 2024 text: modeled as CON save with no damage.
  'ray-of-enfeeblement': { save: 'con' },
  // One ray shown; the spell fires 3 rays, +1 ray per slot level above 2nd.
  'scorching-ray': { attack: 'ranged', damage: { dice: '2d6', type: 'fire' } },
  shatter: { save: 'con', damage: { dice: '3d8', type: 'thunder', perSlot: '1d8' } },
  // Rider on the next weapon hit.
  'shining-smite': { damage: { dice: '2d6', type: 'radiant', perSlot: '1d6' } },
  // Damage is per 5 feet of movement through the area; no save.
  'spike-growth': { damage: { dice: '2d4', type: 'piercing' } },
  'spiritual-weapon': {
    attack: 'melee',
    damage: { dice: '1d8', type: 'force', perSlot: '1d8', addMod: true },
  },
  suggestion: { save: 'wis' },
  web: { save: 'dex' },
  'zone-of-truth': { save: 'cha' },

  // ---- Level 3 ----
  'aura-of-vitality': { heal: { dice: '2d6', perSlot: '1d6' } },
  'bestow-curse': { save: 'wis' }, // curse rider 1d8 necrotic not modeled
  // Rider on the next weapon hit; CON save to avoid Blinded.
  'blinding-smite': { save: 'con', damage: { dice: '3d8', type: 'radiant', perSlot: '1d8' } },
  'call-lightning': { save: 'dex', damage: { dice: '3d10', type: 'lightning', perSlot: '1d10' } },
  // Unsure of 2024 damage type: modeled as force.
  'conjure-barrage': { save: 'dex', damage: { dice: '5d8', type: 'force' } },
  counterspell: { save: 'con' },
  // Extra damage on each hit of the caster's attacks, no roll of its own.
  'crusaders-mantle': { damage: { dice: '1d6', type: 'radiant' } },
  // Extra damage on weapon hits; type chosen at cast, 2d4 at slot 5, 3d4 at slot 7.
  'elemental-weapon': { damage: { dice: '1d4', type: 'fire' } },
  // Unsure of 2024 text: WIS save, 2d10 psychic at end of each frightened turn.
  fear: { save: 'wis', damage: { dice: '2d10', type: 'psychic', perSlot: '1d10' } },
  fireball: { save: 'dex', damage: { dice: '8d6', type: 'fire', perSlot: '1d6' } },
  // Explosive Runes: type chosen at inscription (acid/cold/fire/lightning/thunder); fire shown.
  'glyph-of-warding': { save: 'dex', damage: { dice: '5d8', type: 'fire', perSlot: '1d8' } },
  // Cold on entering/starting in the void; acid (DEX save) at end of turn is the saved damage.
  'hunger-of-hadar': { save: 'dex', damage: { dice: '2d6', type: 'acid', perSlot: '1d6' } },
  'hypnotic-pattern': { save: 'wis' },
  // Triggers off a ranged weapon attack; targets in the burst save DEX.
  'lightning-arrow': { save: 'dex', damage: { dice: '4d8', type: 'lightning', perSlot: '1d8' } },
  'lightning-bolt': { save: 'dex', damage: { dice: '8d6', type: 'lightning', perSlot: '1d6' } },
  'mass-healing-word': { heal: { dice: '2d4', perSlot: '1d4', addMod: true } },
  'sleet-storm': { save: 'dex' },
  slow: { save: 'wis' },
  'spirit-guardians': { save: 'wis', damage: { dice: '3d8', type: 'radiant', perSlot: '1d8' } },
  'stinking-cloud': { save: 'con' },
  'vampiric-touch': { attack: 'melee', damage: { dice: '3d6', type: 'necrotic', perSlot: '1d6' } },
  'wind-wall': { save: 'str', damage: { dice: '4d8', type: 'bludgeoning' } },
};
