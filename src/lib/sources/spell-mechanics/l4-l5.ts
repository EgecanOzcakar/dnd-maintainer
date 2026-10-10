import type { SpellMechanics } from '@/types/actions';

/** Attack/save/damage data for level 4-5 spells (see SpellMechanics). */
export const SPELL_MECHANICS_L4_L5: Readonly<Record<string, SpellMechanics>> = {
  // ---- Level 4 ----
  blight: { save: 'con', damage: { dice: '8d8', type: 'necrotic', perSlot: '1d8' } },
  'ice-storm': {
    save: 'dex',
    // Real spell: 2d10 bludgeoning AND 4d6 cold; models the larger part (cold). Upcast adds 1d10 bludgeoning.
    damage: { dice: '4d6', type: 'cold', perSlot: '1d10' },
  },
  'phantasmal-killer': {
    save: 'wis',
    damage: { dice: '4d10', type: 'psychic', perSlot: '1d10' },
  },
  'sickening-radiance': { save: 'con', damage: { dice: '4d10', type: 'radiant' } },
  'staggering-smite': {
    // Rider on a weapon hit; the save is against the Stagger effect.
    save: 'wis',
    damage: { dice: '4d6', type: 'psychic', perSlot: '1d6' },
  },
  'vitriolic-sphere': {
    save: 'dex',
    // Initial 10d4; a failed save also takes 5d4 at the end of its next turn (not modelled).
    damage: { dice: '10d4', type: 'acid', perSlot: '2d4' },
  },
  'evards-black-tentacles': {
    save: 'dex',
    damage: { dice: '3d6', type: 'bludgeoning', perSlot: '1d6' },
  },
  'grasping-vine': { save: 'str' },
  'otilukes-resilient-sphere': { save: 'dex' },
  banishment: { save: 'cha' },
  compulsion: { save: 'wis' },
  confusion: { save: 'wis' },
  polymorph: { save: 'wis' },
  // ---- Level 5 ----
  'banishing-smite': {
    // Rider on a weapon hit: 5d10 force; no save of its own.
    damage: { dice: '5d10', type: 'force' },
  },
  'bigbys-hand': {
    // Clenched Fist option; other options (Forceful Hand, Grasping Hand) use checks.
    attack: 'melee',
    damage: { dice: '4d8', type: 'force', perSlot: '2d8' },
  },
  cloudkill: { save: 'con', damage: { dice: '5d8', type: 'poison', perSlot: '1d8' } },
  'cone-of-cold': { save: 'con', damage: { dice: '8d8', type: 'cold', perSlot: '1d8' } },
  // Damage type matches the ammunition used; piercing is the common case.
  'conjure-volley': { save: 'dex', damage: { dice: '8d8', type: 'piercing' } },
  'contact-other-plane': { save: 'int', damage: { dice: '6d6', type: 'psychic' } },
  contagion: {
    // Melee spell attack; the hit deals 11d8 necrotic, the disease then uses CON saves.
    attack: 'melee',
    damage: { dice: '11d8', type: 'necrotic' },
  },
  'flame-strike': {
    save: 'dex',
    // Real spell: 5d6 fire AND 5d6 radiant; models one half. Upcast adds 1d6 of each.
    damage: { dice: '5d6', type: 'fire', perSlot: '1d6' },
  },
  'holy-weapon': {
    // Radiant Burst (ends the spell): 4d8 radiant to creatures within 30 ft, CON save.
    save: 'con',
    damage: { dice: '4d8', type: 'radiant' },
  },
  'insect-plague': { save: 'con', damage: { dice: '4d10', type: 'piercing', perSlot: '1d10' } },
  'jallarzis-storm-of-radiance': {
    save: 'con',
    // Real spell: 2d10 radiant AND 2d10 thunder; models one half.
    damage: { dice: '2d10', type: 'radiant' },
  },
  'mass-cure-wounds': { heal: { dice: '5d8', perSlot: '1d8', addMod: true } },
  'steel-wind-strike': { attack: 'melee', damage: { dice: '6d10', type: 'force' } },
  'synaptic-static': { save: 'int', damage: { dice: '8d6', type: 'psychic' } },
  'wall-of-fire': { save: 'dex', damage: { dice: '5d8', type: 'fire', perSlot: '1d8' } },
  'yolandes-regal-presence': {
    save: 'wis',
    damage: { dice: '4d6', type: 'psychic', perSlot: '1d6' },
  },
  'dominate-person': { save: 'wis' },
  'dominate-beast': { save: 'wis' },
  'charm-monster': { save: 'wis' },
  'hold-monster': { save: 'wis' },
  'modify-memory': { save: 'wis' },
  scrying: { save: 'wis' },
  // Damage only on breaking the command (5d10 psychic); modelled as the save alone.
  geas: { save: 'wis' },
  'planar-binding': { save: 'cha' },
  'wall-of-stone': { save: 'dex' },
};
