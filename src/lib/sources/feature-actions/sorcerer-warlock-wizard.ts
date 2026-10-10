import type { FeatureActionMeta } from '@/types/actions';

/** Action-economy data for sorcerer, warlock and wizard features (and their subclasses). */
export const SORCERER_WARLOCK_WIZARD_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  'sorcerer-innate-sorcery': {
    activation: 'bonus-action',
    poolId: 'innate-sorcery',
  },
};
