import type { FeatureActionMeta } from '@/types/actions';

/** Action-economy data for paladin, ranger and rogue features (and their subclasses). */
export const PALADIN_RANGER_ROGUE_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  'rogue-sneak-attack': {
    // Once per turn rider on a Finesse/Ranged hit — no action of its own.
    activation: 'special',
    damage: {
      dice: [
        [1, '1d6'],
        [3, '2d6'],
        [5, '3d6'],
        [7, '4d6'],
        [9, '5d6'],
        [11, '6d6'],
        [13, '7d6'],
        [15, '8d6'],
        [17, '9d6'],
        [19, '10d6'],
      ],
      type: 'weapon',
    },
  },
  'paladin-lay-on-hands': {
    activation: 'bonus-action',
    poolId: 'lay-on-hands',
  },
};
