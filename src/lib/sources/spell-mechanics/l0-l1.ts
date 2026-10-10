import type { SpellMechanics } from '@/types/actions';

/** Attack/save/damage data for cantrips and level 1 spells (see SpellMechanics). */
export const SPELL_MECHANICS_L0_L1: Readonly<Record<string, SpellMechanics>> = {
  'fire-bolt': { attack: 'ranged', damage: { dice: '1d10', type: 'fire', cantripScaling: true } },
  'sacred-flame': { save: 'dex', damage: { dice: '1d8', type: 'radiant', cantripScaling: true } },
  // Three darts that always hit; one more dart per slot level above 1st.
  'magic-missile': { damage: { dice: '3d4', type: 'force', perSlot: '1d4' } },
  'cure-wounds': { heal: { dice: '2d8', perSlot: '2d8', addMod: true } },
  'burning-hands': { save: 'dex', damage: { dice: '3d6', type: 'fire', perSlot: '1d6' } },
};
