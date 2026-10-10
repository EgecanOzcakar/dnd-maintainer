import type { FeatureActionMeta } from '@/types/actions';

/** Action-economy data for barbarian, bard and cleric features (and their subclasses). */
export const BARBARIAN_BARD_CLERIC_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  'barbarian-rage': {
    activation: 'bonus-action',
    // Rage Damage bonus on STR attacks while raging: +2 / +3 at 9 / +4 at 16 (shown as the rider).
    poolId: 'rage',
  },
};
