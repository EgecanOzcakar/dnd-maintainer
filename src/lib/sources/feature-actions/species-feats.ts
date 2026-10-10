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
        // d4s equal to your Proficiency Bonus (2 at level 1, +1 at 5/9/13/17).
        [1, '2d4'],
        [5, '3d4'],
        [9, '4d4'],
        [13, '5d4'],
        [17, '6d4'],
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

  // ─── Feats (2024 PHB) ──────────────────────────────────────────────────────
  // Luck Points (PB per Long Rest): spend one to roll an extra d20 on a D20 Test.
  'feat-lucky': { activation: 'free' },
  // Once per turn, reroll a weapon's damage dice and use either roll.
  'feat-savage-attacker': { activation: 'special' },
  // Heavy Weapon Mastery: + PB damage on a Heavy-weapon hit (once per turn); Hew is a Bonus
  // Action attack after a crit or a kill.
  'feat-great-weapon-master': { activation: 'special' },
  // Guardian: Reaction attack when a creature within 5 ft disengages or hits someone else.
  'feat-sentinel': { activation: 'reaction' },
  // Pole Strike: Bonus Action attack with the weapon's butt end, 1d4 Bludgeoning.
  'feat-polearm-master': {
    activation: 'bonus-action',
    attack: { ability: 'str' },
    damage: { dice: '1d4', type: 'bludgeoning', addMod: 'str' },
  },
  // Shield Bash: on a melee hit, STR save or be pushed 5 ft / knocked Prone.
  'feat-shield-master': { activation: 'special', save: { ability: 'str', dcAbility: 'str' } },
  // Reactive Spell: cast a 1-action spell instead of an Opportunity Attack.
  'feat-war-caster': { activation: 'reaction' },
  // Battle Medic: a creature spends a Hit Die and regains the roll + your PB.
  'feat-healer': { activation: 'action' },
  // Charge Attack: after moving 10 ft straight, +1d8 damage (once per turn).
  'feat-charger': { activation: 'special', damage: { dice: '1d8', type: 'weapon' } },
  // Parry: Reaction, + PB to AC against one melee attack.
  'feat-defensive-duelist': { activation: 'reaction' },
  // Concentration Breaker: a creature you damage has Disadvantage on its Concentration save.
  'feat-mage-slayer': { activation: 'special' },
  // Enhanced Dual Wielding: the Light-property Bonus Action attack works with non-Light weapons.
  'feat-dual-wielder': { activation: 'bonus-action' },
  // Telekinetic Shove: Bonus Action, STR save or be moved 5 ft.
  'feat-telekinetic': { activation: 'bonus-action' },
  // Potent Poison: 2d8 Poison on a weapon or ammunition hit (CON save vs your feat DC).
  'feat-poisoner': { activation: 'special', damage: { dice: '2d8', type: 'poison' } },
  // Improve Fate: roll 2d4 and add or subtract it from a D20 Test you can see.
  'feat-boon-of-fate': { activation: 'free' },
  // Recover Vitality: Bonus Action, spend a d10 from a pool of ten and regain the roll.
  'feat-boon-of-recovery': { activation: 'bonus-action', heal: { dice: '1d10' } },
  // Blink Steps: teleport 30 ft right after an Attack or Magic action.
  'feat-boon-of-dimensional-travel': { activation: 'free' },
  // Peerless Aim: turn a miss into a hit once per turn.
  'feat-boon-of-combat-prowess': { activation: 'free' },
  // Treats: Bonus Action to eat one and gain temp HP.
  'feat-chef': { activation: 'bonus-action' },
};
