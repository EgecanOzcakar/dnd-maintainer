import type { FeatureActionMeta } from '@/types/actions';

/** Action-economy data for druid, fighter and monk features (and their subclasses). */
export const DRUID_FIGHTER_MONK_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  'fighter-second-wind': {
    activation: 'bonus-action',
    heal: { dice: '1d10', addLevel: true },
    poolId: 'second-wind',
  },
};
