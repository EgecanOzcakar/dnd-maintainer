import type { FeatureActionMeta, ScaledDice } from '@/types/actions';

/** Martial Arts die: d6, d8 at 5, d10 at 11, d12 at 17. */
const MARTIAL_ARTS_DIE: ScaledDice = [
  [1, '1d6'],
  [5, '1d8'],
  [11, '1d10'],
  [17, '1d12'],
];

/** Three Martial Arts dice (Elemental Burst), from Monk level 6. */
const THREE_MARTIAL_ARTS_DICE: ScaledDice = [
  [6, '3d8'],
  [11, '3d10'],
  [17, '3d12'],
];

/** Land's Aid healing and necrotic damage: 2d6, 3d6 at 10, 4d6 at 14. */
const LANDS_AID_DICE: ScaledDice = [
  [3, '2d6'],
  [10, '3d6'],
  [14, '4d6'],
];

/** Psionic Energy die by Fighter level: d6, d8 at 5, d10 at 11, d12 at 17. */
const PSIONIC_DIE: ScaledDice = [
  [3, '1d6'],
  [5, '1d8'],
  [11, '1d10'],
  [17, '1d12'],
];

/** Action-economy data for druid, fighter and monk features (and their subclasses). */
export const DRUID_FIGHTER_MONK_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  // ---- Druid ----
  'druid-wild-shape': { activation: 'bonus-action', poolId: 'wild-shape' },
  'druid-wild-companion': { activation: 'action' },
  // Once per turn, with no Wild Shape uses left, spend a spell slot to regain one.
  'druid-wild-resurgence': { activation: 'free' },

  // Circle of the Land
  // Land's Aid: expend a Wild Shape use; allies regain the dice, others take them as necrotic (CON save halves).
  'circleland-lands-aid': {
    activation: 'action',
    save: { ability: 'con', dcAbility: 'wis' },
    damage: { dice: LANDS_AID_DICE, type: 'necrotic' },
    heal: { dice: LANDS_AID_DICE },
    poolId: 'wild-shape',
  },
  'circleland-natures-sanctuary': { activation: 'action', poolId: 'wild-shape' },

  // Circle of the Moon
  'circlemoon-moonlight-step': { activation: 'bonus-action', poolId: 'moonlight-step' },
  // Once per turn, on a hit while in Wild Shape.
  'circlemoon-lunar-form': { activation: 'special', damage: { dice: '2d10', type: 'radiant' } },

  // Circle of the Sea
  // Wrath of the Sea: spend a Wild Shape use; the target makes a CON save or takes WIS-modifier d6s (min 1)
  // of Cold or Lightning damage. The dice count is the modifier, which a fixed dice string can't express.
  'circlesea-wrath-of-the-sea': {
    activation: 'bonus-action',
    save: { ability: 'con', dcAbility: 'wis' },
    poolId: 'wild-shape',
  },

  // Circle of the Stars
  // Starry Form (spend a Wild Shape use). The roll shown is the Archer constellation's Bonus Action
  // ranged spell attack: 1d8 + WIS radiant, 2d8 from level 10 (Twinkling Constellations).
  'circlestars-starry-form': {
    activation: 'bonus-action',
    attack: { ability: 'spellcasting' },
    damage: {
      dice: [
        [3, '1d8'],
        [10, '2d8'],
      ],
      type: 'radiant',
      addMod: 'wis',
    },
    poolId: 'wild-shape',
  },
  // Free Guiding Bolt (4d6 radiant) a proficiency-bonus number of times per Long Rest.
  'circlestars-star-map': {
    activation: 'action',
    attack: { ability: 'spellcasting' },
    damage: { dice: '4d6', type: 'radiant' },
    poolId: 'star-map-guiding-bolt',
  },
  // Add or subtract 1d6 from a roll within 30 feet.
  'circlestars-cosmic-omen': { activation: 'reaction', poolId: 'cosmic-omen-use' },
  // Switch constellations while in Starry Form.
  'circlestars-twinkling-constellations': { activation: 'bonus-action' },

  // ---- Fighter ----
  'fighter-second-wind': {
    activation: 'bonus-action',
    heal: { dice: '1d10', addLevel: true },
    poolId: 'second-wind',
  },
  'fighter-action-surge': { activation: 'free', poolId: 'action-surge' },
  // Reroll a failed save, adding Fighter level.
  'fighter-indomitable': { activation: 'free', poolId: 'indomitable' },
  // Add 1d10 to a failed ability check (spends a Second Wind use only if the check still fails).
  'fighter-tactical-mind': { activation: 'free' },

  // Champion
  'champion-heroic-warrior': { activation: 'free' },

  // Battle Master: the superiority die is rolled by each maneuver (extra damage, a to-hit or AC bonus, etc.).
  'battlemaster-combat-superiority': {
    activation: 'special',
    damage: {
      dice: [
        [3, '1d8'],
        [10, '1d10'],
        [18, '1d12'],
      ],
      type: 'weapon',
    },
    poolId: 'superiority-dice',
  },
  'battlemaster-know-your-enemy': { activation: 'bonus-action' },

  // Eldritch Knight
  'eldritchknight-war-bond': { activation: 'bonus-action' },
  // Teleport up to 30 feet when you use Action Surge.
  'eldritchknight-arcane-charge': { activation: 'free' },

  // Psi Warrior
  // Psionic Strike: once per turn after a weapon hit, extra Force damage of a Psionic Energy die + INT.
  // (Protective Field is a Reaction and Telekinetic Movement an Action, both spending the same dice.)
  'psiwarrior-psionic-power': {
    activation: 'special',
    damage: { dice: PSIONIC_DIE, type: 'force', addMod: 'int' },
    poolId: 'psionic-energy',
  },
  // Psi-Powered Leap (Bonus Action, free once per Short Rest); Telekinetic Thrust forces a STR save.
  'psiwarrior-telekinetic-adept': {
    activation: 'bonus-action',
    save: { ability: 'str', dcAbility: 'int' },
    poolId: 'psi-powered-leap-use',
  },
  'psiwarrior-bulwark-of-force': { activation: 'bonus-action', poolId: 'psionic-energy' },
  // Cast Telekinesis without a slot.
  'psiwarrior-telekinetic-master': { activation: 'action' },

  // ---- Monk ----
  // Bonus Action Unarmed Strike after the Attack action.
  'monk-martial-arts': {
    activation: 'bonus-action',
    attack: { ability: 'dex' },
    damage: { dice: MARTIAL_ARTS_DIE, type: 'bludgeoning', addMod: 'dex' },
  },
  // Two Unarmed Strikes.
  'monk-flurry-of-blows': {
    activation: 'bonus-action',
    attack: { ability: 'dex' },
    damage: { dice: MARTIAL_ARTS_DIE, type: 'bludgeoning', addMod: 'dex' },
    poolId: 'focus-points',
  },
  'monk-patient-defense': { activation: 'bonus-action', poolId: 'focus-points' },
  'monk-step-of-the-wind': { activation: 'bonus-action', poolId: 'focus-points' },
  // Redirect: spend 1 Focus Point, DEX save, 2 Martial Arts dice + DEX of the attack's damage type.
  // Reducing the hit itself is 1d10 + DEX + Monk level.
  'monk-deflect-attacks': {
    activation: 'reaction',
    save: { ability: 'dex', dcAbility: 'wis' },
    damage: {
      dice: [
        [1, '2d6'],
        [5, '2d8'],
        [11, '2d10'],
        [17, '2d12'],
      ],
      type: 'weapon',
      addMod: 'dex',
    },
  },
  'monk-stunning-strike': {
    activation: 'special',
    save: { ability: 'con', dcAbility: 'wis' },
    poolId: 'focus-points',
  },
  // Reduces fall damage by 5 x Monk level.
  'monk-slow-fall': { activation: 'reaction' },
  // On rolling Initiative: regain all Focus Points and heal a Martial Arts die + Monk level.
  'monk-uncanny-metabolism': {
    activation: 'free',
    heal: { dice: MARTIAL_ARTS_DIE, addLevel: true },
    poolId: 'uncanny-metabolism',
  },
  // Reroll a failed save for 1 Focus Point.
  'monk-disciplined-survivor': { activation: 'free', poolId: 'focus-points' },
  'monk-superior-defense': { activation: 'free', poolId: 'focus-points' },

  // Warrior of Mercy
  // Magic action or in place of a Flurry strike: Martial Arts die + WIS healing.
  'warriorofmercy-hand-of-healing': {
    activation: 'action',
    heal: { dice: MARTIAL_ARTS_DIE, addMod: 'wis' },
    poolId: 'focus-points',
  },
  // Once per turn on an Unarmed Strike hit.
  'warriorofmercy-hand-of-harm': {
    activation: 'special',
    damage: { dice: MARTIAL_ARTS_DIE, type: 'necrotic', addMod: 'wis' },
    poolId: 'focus-points',
  },
  'warriorofmercy-physicians-touch': {
    activation: 'special',
    save: { ability: 'con', dcAbility: 'wis' },
  },
  'warriorofmercy-hand-of-ultimate-mercy': {
    activation: 'action',
    heal: { dice: '4d10', addMod: 'wis' },
    poolId: 'hand-of-ultimate-mercy',
  },

  // Warrior of Shadow
  'warriorofshadow-shadow-step': { activation: 'bonus-action' },
  // Unarmed Strike immediately after the teleport.
  'warriorofshadow-improved-shadow-step': {
    activation: 'special',
    attack: { ability: 'dex' },
    damage: { dice: MARTIAL_ARTS_DIE, type: 'bludgeoning', addMod: 'dex' },
    poolId: 'focus-points',
  },
  'warriorofshadow-cloak-of-shadows': { activation: 'action', poolId: 'focus-points' },

  // Warrior of the Elements
  'warriorofelements-elemental-attunement': { activation: 'bonus-action', poolId: 'focus-points' },
  // 3 Martial Arts dice of the attuned element (Acid, Cold, Fire, Lightning or Thunder); half on a success.
  'warriorofelements-elemental-burst': {
    activation: 'action',
    save: { ability: 'dex', dcAbility: 'wis' },
    damage: { dice: THREE_MARTIAL_ARTS_DICE, type: 'fire' },
    poolId: 'focus-points',
  },

  // Warrior of the Open Hand
  // On a Flurry hit: STR save (prone/push), or DEX save for Topple; Addle needs no save.
  'warrioropenhand-open-hand-technique': {
    activation: 'special',
    save: { ability: 'str', dcAbility: 'wis' },
  },
  'warrioropenhand-wholeness-of-body': {
    activation: 'bonus-action',
    heal: { dice: MARTIAL_ARTS_DIE, addMod: 'wis' },
    poolId: 'wholeness-of-body',
  },
  // Vibrations on an Unarmed Strike hit (4 Focus Points); later ended with an action.
  'warrioropenhand-quivering-palm': {
    activation: 'special',
    save: { ability: 'con', dcAbility: 'wis' },
    damage: { dice: '10d12', type: 'force' },
    poolId: 'focus-points',
  },
};
