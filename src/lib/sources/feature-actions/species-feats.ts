import type { ActionDamageType, FeatureActionMeta } from '@/types/actions';

/** Breath Weapon (2024 PHB): replaces one attack; Dex save, DC 8 + Con mod + PB; damage grows at character level 5/11/17. */
const breath = (type: ActionDamageType): FeatureActionMeta => ({
  activation: 'special',
  save: { ability: 'dex', dcAbility: 'con' },
  damage: {
    dice: [
      [1, '1d10'],
      [5, '2d10'],
      [11, '3d10'],
      [17, '4d10'],
    ],
    type,
  },
});

/**
 * Action-economy data for species traits and fighting styles.
 * Feat features (`feat-lucky`, `feat-sentinel`, ...) have no `gamedata.json` features entry yet, so
 * they cannot be keyed here until one exists. Pool-backed traits (uses = PB) have no `resource-pool`
 * grant, so no `poolId`.
 */
export const SPECIES_FEAT_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  'dragonborn-breath-chromatic-black': breath('acid'),
  'dragonborn-breath-chromatic-blue': breath('lightning'),
  'dragonborn-breath-chromatic-green': breath('poison'),
  'dragonborn-breath-chromatic-red': breath('fire'),
  'dragonborn-breath-chromatic-white': breath('cold'),
  'dragonborn-breath-metallic-brass': breath('fire'),
  'dragonborn-breath-metallic-bronze': breath('lightning'),
  'dragonborn-breath-metallic-copper': breath('acid'),
  'dragonborn-breath-metallic-gold': breath('fire'),
  'dragonborn-breath-metallic-silver': breath('cold'),
  // Magic action: touch, regain d4s equal to PB (PB steps up at levels 5/9/13/17).
  'aasimar-healing-hands': {
    activation: 'action',
    heal: {
      dice: [
        [1, '1d4'],
        [5, '2d4'],
        [9, '3d4'],
        [13, '4d4'],
        [17, '5d4'],
      ],
    },
  },
  'aasimar-celestial-revelation': { activation: 'bonus-action' },
  'goliath-large-form': { activation: 'bonus-action' },
  // Dash as a Bonus Action and gain temp HP equal to PB (flat, so no dice to model).
  'orc-adrenaline-rush': { activation: 'bonus-action' },
  'halfling-lucky': { activation: 'free' },
  'fighting-style-protection': { activation: 'reaction' },
  // Reduces the hit by 1d10 + PB (a reduction, not damage/heal, so no roll modeled).
  'fighting-style-interception': { activation: 'reaction' },
  // Start of your turn: 1d4 bludgeoning to one creature you have Grappled.
  'fighting-style-unarmed-fighting': {
    activation: 'special',
    damage: { dice: '1d4', type: 'bludgeoning' },
  },
};
