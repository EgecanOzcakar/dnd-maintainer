import type { SpellMechanics } from '@/types/actions';

/**
 * Attack/save/damage data for level 6-9 spells (see SpellMechanics).
 * Flat HP/damage that has no dice form is noted in comments rather than modelled.
 * Omitted on purpose (flat amounts, no roll): Heal (70 HP, +10/slot), Mass Heal (700 HP),
 * Power Word Heal (all HP), Power Word Fortify (temp HP), Prismatic Wall (12d6 per layer, varies by layer).
 */
export const SPELL_MECHANICS_L6_L9: Readonly<Record<string, SpellMechanics>> = {
  // Level 6
  'blade-barrier': { save: 'dex', damage: { dice: '6d10', type: 'force' } },
  'bones-of-the-earth': { save: 'dex', damage: { dice: '6d6', type: 'bludgeoning' } },
  // Higher slots add one target, not dice.
  'chain-lightning': { save: 'dex', damage: { dice: '10d8', type: 'lightning' } },
  'circle-of-death': { save: 'con', damage: { dice: '8d8', type: 'necrotic', perSlot: '2d8' } },
  disintegrate: { save: 'dex', damage: { dice: '10d6', type: 'force', flat: 40, perSlot: '3d6' } },
  // 5d10 radiant or necrotic (caster's choice at cast time), no save; radiant shown.
  forbiddance: { damage: { dice: '5d10', type: 'radiant' } },
  harm: { save: 'con', damage: { dice: '14d6', type: 'necrotic' } },
  'otilukes-freezing-sphere': {
    save: 'con',
    damage: { dice: '10d6', type: 'cold', perSlot: '1d6' },
  },
  sunbeam: { save: 'con', damage: { dice: '6d8', type: 'radiant' } },
  'wall-of-ice': { save: 'dex', damage: { dice: '10d6', type: 'cold', perSlot: '2d6' } },
  'wall-of-thorns': { save: 'dex', damage: { dice: '7d8', type: 'piercing', perSlot: '1d8' } },

  // Level 7
  'crown-of-stars': { attack: 'ranged', damage: { dice: '4d12', type: 'radiant' } },
  'delayed-blast-fireball': { save: 'con', damage: { dice: '12d6', type: 'fire', perSlot: '1d6' } },
  // Breath: 6d8 force, 60-ft cone.
  'draconic-transformation': { save: 'dex', damage: { dice: '6d8', type: 'force' } },
  'finger-of-death': { save: 'con', damage: { dice: '7d8', type: 'necrotic', flat: 30 } },
  'fire-storm': { save: 'dex', damage: { dice: '7d10', type: 'fire' } },
  'mordenkainens-sword': { attack: 'melee', damage: { dice: '4d12', type: 'force' } },
  // Each ray differs (12d6 of the ray's type, or a non-damage effect); fire (ray 1) shown.
  'prismatic-spray': { save: 'dex', damage: { dice: '12d6', type: 'fire' } },
  // 4d8 + 15 HP, then 1 HP at the start of each turn.
  regenerate: { heal: { dice: '4d8', flat: 15 } },
  // 70 HP, +10 per slot level above 6th.
  heal: { heal: { flat: 70, flatPerSlot: 10 } },
  // Only the Death symbol deals damage (10d10 necrotic).
  symbol: { save: 'con', damage: { dice: '10d10', type: 'necrotic' } },
  whirlwind: { save: 'dex', damage: { dice: '10d6', type: 'bludgeoning' } },

  // Level 8
  'abi-dalzims-horrid-wilting': { save: 'con', damage: { dice: '12d8', type: 'necrotic' } },
  befuddlement: { save: 'int', damage: { dice: '10d12', type: 'psychic' } },
  'dark-star': { save: 'con', damage: { dice: '8d10', type: 'force' } },
  // Fissure/aftershock damage is approximated as a DEX save for bludgeoning.
  earthquake: { save: 'dex', damage: { dice: '6d6', type: 'bludgeoning' } },
  // Breath: 7d6 of the damage type chosen on cast; fire shown.
  'illusory-dragon': { save: 'dex', damage: { dice: '7d6', type: 'fire' } },
  'incendiary-cloud': { save: 'dex', damage: { dice: '10d8', type: 'fire' } },
  sunburst: { save: 'con', damage: { dice: '12d6', type: 'radiant' } },
  tsunami: { save: 'str', damage: { dice: '6d10', type: 'bludgeoning' } },

  // Level 9
  'blade-of-disaster': { attack: 'melee', damage: { dice: '4d12', type: 'force' } },
  // 20d6 fire plus 20d6 bludgeoning; only the fire half is representable.
  'meteor-swarm': { save: 'dex', damage: { dice: '20d6', type: 'fire' } },
  // Targets with more than 100 HP take 12d12 psychic instead of dying; no save.
  'power-word-kill': { damage: { dice: '12d12', type: 'psychic' } },
  'psychic-scream': { save: 'int', damage: { dice: '14d6', type: 'psychic' } },
  // Round 1 only (2d6 thunder); later rounds deal acid/lightning/cold damage.
  'storm-of-vengeance': { save: 'con', damage: { dice: '2d6', type: 'thunder' } },
  weird: { save: 'wis', damage: { dice: '10d10', type: 'psychic' } },
};
