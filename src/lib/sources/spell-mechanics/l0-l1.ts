import type { SpellMechanics } from '@/types/actions';

/** Attack/save/damage data for cantrips and level 1 spells (see SpellMechanics). */
export const SPELL_MECHANICS_L0_L1: Readonly<Record<string, SpellMechanics>> = {
  // ---- Cantrips ----
  'acid-splash': { save: 'dex', damage: { dice: '1d6', type: 'acid', cantripScaling: true } },
  'chill-touch': {
    attack: 'ranged',
    damage: { dice: '1d10', type: 'necrotic', cantripScaling: true },
  },
  // Extra beams are modeled as dice-count scaling.
  'eldritch-blast': {
    attack: 'ranged',
    damage: { dice: '1d10', type: 'force', cantripScaling: true },
  },
  'fire-bolt': { attack: 'ranged', damage: { dice: '1d10', type: 'fire', cantripScaling: true } },
  'mind-sliver': { save: 'int', damage: { dice: '1d6', type: 'psychic', cantripScaling: true } },
  'poison-spray': { save: 'con', damage: { dice: '1d12', type: 'poison', cantripScaling: true } },
  'produce-flame': {
    attack: 'ranged',
    damage: { dice: '1d8', type: 'fire', cantripScaling: true },
  },
  'ray-of-frost': { attack: 'ranged', damage: { dice: '1d8', type: 'cold', cantripScaling: true } },
  'sacred-flame': { save: 'dex', damage: { dice: '1d8', type: 'radiant', cantripScaling: true } },
  'shocking-grasp': {
    attack: 'melee',
    damage: { dice: '1d8', type: 'lightning', cantripScaling: true },
  },
  // Damage type is chosen on cast (acid, cold, fire, lightning, poison, psychic, thunder); acid shown.
  'sorcerous-burst': {
    attack: 'ranged',
    damage: { dice: '1d8', type: 'acid', cantripScaling: true },
  },
  'starry-wisp': {
    attack: 'ranged',
    damage: { dice: '1d8', type: 'radiant', cantripScaling: true },
  },
  'thorn-whip': {
    attack: 'melee',
    damage: { dice: '1d6', type: 'piercing', cantripScaling: true },
  },
  thunderclap: { save: 'con', damage: { dice: '1d6', type: 'thunder', cantripScaling: true } },
  // Base die; the damage die is d12 against a target that is missing Hit Points.
  'toll-the-dead': { save: 'wis', damage: { dice: '1d8', type: 'necrotic', cantripScaling: true } },
  // True Strike is a weapon attack (extra 1d6 radiant only from level 5): not modeled.
  'vicious-mockery': { save: 'wis', damage: { dice: '1d6', type: 'psychic', cantripScaling: true } },
  'word-of-radiance': { save: 'con', damage: { dice: '1d6', type: 'radiant', cantripScaling: true } },

  // ---- Level 1 ----
  'animal-friendship': { save: 'wis' },
  'arms-of-hadar': { save: 'str', damage: { dice: '2d6', type: 'necrotic', perSlot: '1d6' } },
  bane: { save: 'cha' },
  'burning-hands': { save: 'dex', damage: { dice: '3d6', type: 'fire', perSlot: '1d6' } },
  'charm-person': { save: 'wis' },
  // Damage type is chosen on cast (acid, cold, fire, lightning, poison, thunder); fire shown.
  'chromatic-orb': { attack: 'ranged', damage: { dice: '3d8', type: 'fire', perSlot: '1d8' } },
  'color-spray': { save: 'con' },
  command: { save: 'wis' },
  'compelled-duel': { save: 'wis' },
  'cure-wounds': { heal: { dice: '2d8', perSlot: '2d8', addMod: true } },
  'dissonant-whispers': { save: 'wis', damage: { dice: '3d6', type: 'psychic', perSlot: '1d6' } },
  // Rides a weapon hit, so no attack or save of its own.
  'divine-favor': { damage: { dice: '1d4', type: 'radiant' } },
  'divine-smite': { damage: { dice: '2d8', type: 'radiant', perSlot: '1d8' } },
  'ensnaring-strike': { save: 'str', damage: { dice: '1d6', type: 'piercing', perSlot: '1d6' } },
  entangle: { save: 'str' },
  'faerie-fire': { save: 'dex' },
  grease: { save: 'dex' },
  'guiding-bolt': { attack: 'ranged', damage: { dice: '4d6', type: 'radiant', perSlot: '1d6' } },
  'hail-of-thorns': { save: 'dex', damage: { dice: '1d10', type: 'piercing', perSlot: '1d10' } },
  'healing-word': { heal: { dice: '2d4', perSlot: '2d4', addMod: true } },
  'hellish-rebuke': { save: 'dex', damage: { dice: '2d10', type: 'fire', perSlot: '1d10' } },
  hex: { damage: { dice: '1d6', type: 'necrotic' } },
  'hideous-laughter': { save: 'wis' },
  'hunters-mark': { damage: { dice: '1d6', type: 'force' } },
  // The 2d6 cold burst (DEX save) always applies; the 1d10 piercing hit roll is not modeled.
  'ice-knife': { save: 'dex', damage: { dice: '2d6', type: 'cold', perSlot: '1d6' } },
  'inflict-wounds': { save: 'con', damage: { dice: '2d10', type: 'necrotic', perSlot: '2d10' } },
  // Three darts that always hit; one more dart per slot level above 1st.
  'magic-missile': { damage: { dice: '3d4', type: 'force', perSlot: '1d4' } },
  'ray-of-sickness': { attack: 'ranged', damage: { dice: '2d8', type: 'poison', perSlot: '1d8' } },
  sanctuary: { save: 'wis' },
  'searing-smite': { save: 'con', damage: { dice: '1d6', type: 'fire', perSlot: '1d6' } },
  sleep: { save: 'wis' },
  'thunderous-smite': { save: 'str', damage: { dice: '2d6', type: 'thunder', perSlot: '1d6' } },
  thunderwave: { save: 'con', damage: { dice: '2d8', type: 'thunder', perSlot: '1d8' } },
  'witch-bolt': { attack: 'ranged', damage: { dice: '2d12', type: 'lightning', perSlot: '1d12' } },
  'wrathful-smite': { save: 'wis', damage: { dice: '1d6', type: 'psychic' } },
};
