import type { FeatureActionMeta } from '@/types/actions';

// Rage Damage bonus (+2 / +3 at 9 / +4 at 16) is also the number of d6s for Frenzy.
const RAGE_D6S = [
  [1, '2d6'],
  [9, '3d6'],
  [16, '4d6'],
] as const;

// Bardic Inspiration die by bard level.
const BARDIC_DIE = [
  [1, '1d6'],
  [5, '1d8'],
  [10, '1d10'],
  [15, '1d12'],
] as const;

const DIVINE_SPARK_DICE = [
  [1, '1d8'],
  [7, '2d8'],
  [13, '3d8'],
  [18, '4d8'],
] as const;

/**
 * Action-economy data for barbarian, bard and cleric features (and their subclasses).
 * Rules that cannot be expressed as fixed dice (WIS-mod dice, "+ class level", Temp HP) are
 * left off the roll and explained in the entry's comment.
 */
export const BARBARIAN_BARD_CLERIC_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  // ─── Barbarian ───────────────────────────────────────────────────────────────
  'barbarian-rage': {
    activation: 'bonus-action',
    // Rage Damage bonus on STR attacks while raging: +2 / +3 at 9 / +4 at 16 (shown as the rider).
    poolId: 'rage',
  },
  // Declared as part of the first attack of your turn.
  'barbarian-reckless-attack': { activation: 'free' },
  // Reckless Attack, forgo Advantage on one STR attack: +1d10 of the weapon's damage type (2d10 at 17).
  'barbarian-brutal-strike': {
    activation: 'special',
    damage: {
      dice: [
        [9, '1d10'],
        [17, '2d10'],
      ],
      type: 'weapon',
    },
  },

  // ─── Berserker ───────────────────────────────────────────────────────────────
  // Reckless Attack while raging: first target hit each turn takes d6s equal to the Rage Damage bonus.
  'berserker-frenzy': {
    activation: 'special',
    damage: { dice: RAGE_D6S, type: 'weapon' },
  },
  'berserker-retaliation': { activation: 'reaction' },
  // Bonus Action, 30-ft Emanation, WIS save, DC 8 + PB + STR mod; Frightened 1 minute.
  // Free once per Long Rest, otherwise spend a Rage use (no dedicated pool).
  'berserker-intimidating-presence': {
    activation: 'bonus-action',
    save: { ability: 'wis', dcAbility: 'str' },
  },

  // ─── Path of the World Tree ──────────────────────────────────────────────────
  // Strength save, DC 8 + PB + STR mod; failure teleports the creature next to you. Rage must be active.
  'worldtree-branches-of-the-tree': {
    activation: 'reaction',
    save: { ability: 'str', dcAbility: 'str' },
  },
  // Bonus Action teleport 60 ft (also free when you activate Rage).
  'worldtree-travel-along-the-tree': { activation: 'bonus-action' },

  // ─── Path of the Zealot ──────────────────────────────────────────────────────
  // Divine Fury: first hit each turn while raging, 1d6 + half Barbarian level.
  'zealot-divine-fury-necrotic': {
    activation: 'special',
    damage: { dice: '1d6', type: 'necrotic', addLevel: 'half' },
  },
  'zealot-divine-fury-radiant': {
    activation: 'special',
    damage: { dice: '1d6', type: 'radiant', addLevel: 'half' },
  },
  // Bonus Action: expend a d12 from the pool to regain HP equal to the roll.
  'zealot-warrior-of-the-gods': {
    activation: 'bonus-action',
    heal: { dice: '1d12' },
    poolId: 'warrior-of-the-gods',
  },
  // Free once per Long Rest, otherwise spend a Rage use.
  'zealot-zealous-presence': { activation: 'bonus-action', poolId: 'zealous-presence' },
  // Assumed when you activate Rage.
  'zealot-rage-of-the-gods': { activation: 'free', poolId: 'rage-of-the-gods' },

  // ─── Bard ────────────────────────────────────────────────────────────────────
  // The die is given away, not rolled by the bard (no roll here); uses = CHA mod, no pool is granted yet.
  'bard-bardic-inspiration': { activation: 'bonus-action' },
  'bard-countercharm': { activation: 'reaction' },

  // ─── College of Dance ────────────────────────────────────────────────────────
  // Bardic Damage: Unarmed Strike deals a Bardic Inspiration die + DEX mod Bludgeoning.
  'collegedance-dazzling-footwork': {
    activation: 'special',
    attack: { ability: 'dex' },
    damage: { dice: BARDIC_DIE, type: 'bludgeoning', addMod: 'dex' },
    scaleClass: 'bard',
  },
  'collegedance-inspiring-movement': { activation: 'reaction' },

  // ─── College of Glamour ──────────────────────────────────────────────────────
  // Gives Temp HP (two Bardic Inspiration die rolls) to up to CHA-mod creatures; Temp HP is not modeled.
  'collegeglamour-mantle-of-inspiration': { activation: 'bonus-action' },
  // After casting an Enchantment or Illusion spell; WIS save against your spell save DC.
  'collegeglamour-beguiling-magic': {
    activation: 'free',
    save: { ability: 'wis', dcAbility: 'spellcasting' },
  },
  // Casts Command on yourself as a Bonus Action; free once per Long Rest, else a 3rd-level+ slot.
  'collegeglamour-mantle-of-majesty': { activation: 'bonus-action' },
  // CHA save against your spell save DC.
  'collegeglamour-unbreakable-majesty': {
    activation: 'bonus-action',
    save: { ability: 'cha', dcAbility: 'spellcasting' },
  },

  // ─── College of Lore ─────────────────────────────────────────────────────────
  // Subtracts a Bardic Inspiration die from the roll (a penalty, not damage).
  'collegelore-cutting-words': { activation: 'reaction' },
  'collegelore-peerless-skill': { activation: 'free' },

  // ─── College of Valor ────────────────────────────────────────────────────────
  // Offense: an inspired creature adds the die to weapon damage (its Defense use is a Reaction to AC).
  'collegevalor-combat-inspiration': {
    activation: 'special',
    damage: { dice: BARDIC_DIE, type: 'weapon' },
    scaleClass: 'bard',
  },
  'collegevalor-battle-magic': { activation: 'bonus-action' },

  // ─── Cleric ──────────────────────────────────────────────────────────────────
  // Magic action. Heal: d8s + WIS mod. Or Necrotic/Radiant damage (CON save, half on success, no modifier).
  // Damage type is a choice; radiant is shown.
  'cleric-divine-spark': {
    activation: 'action',
    save: { ability: 'con', dcAbility: 'spellcasting' },
    damage: { dice: DIVINE_SPARK_DICE, type: 'radiant' },
    heal: { dice: DIVINE_SPARK_DICE, addMod: 'spellcasting' },
    poolId: 'channel-divinity',
  },
  // Undead in 30 ft make a WIS save or are Frightened and Incapacitated. Sear Undead adds WIS-mod d8s
  // Radiant damage on a failure (variable dice count, not modeled).
  'cleric-turn-undead': {
    activation: 'action',
    save: { ability: 'wis', dcAbility: 'spellcasting' },
    poolId: 'channel-divinity',
  },
  // Blessed Strikes: once per turn +1d8 Necrotic or Radiant on a weapon hit (2d8 from level 14). Radiant shown.
  'cleric-blessed-strikes-divine-strike': {
    activation: 'special',
    damage: {
      dice: [
        [7, '1d8'],
        [14, '2d8'],
      ],
      type: 'radiant',
    },
  },
  'cleric-divine-intervention': { activation: 'action' },
  'cleric-greater-divine-intervention': { activation: 'action' },

  // ─── Life Domain ─────────────────────────────────────────────────────────────
  // Magic action: restores 5 × Cleric level HP, divided among creatures within 30 ft.
  'lifedomain-preserve-life': { activation: 'action', heal: { addLevel: 5 }, poolId: 'channel-divinity' },

  // ─── Light Domain ────────────────────────────────────────────────────────────
  // Reaction, WIS-mod uses per Long Rest (no pool granted).
  'lightdomain-warding-flare': { activation: 'reaction' },
  // Magic action, CON save: 2d10 + Cleric level Radiant, half on success.
  'lightdomain-radiance-of-the-dawn': {
    activation: 'action',
    save: { ability: 'con', dcAbility: 'spellcasting' },
    damage: { dice: '2d10', type: 'radiant', addLevel: true },
    poolId: 'channel-divinity',
  },
  'lightdomain-corona-of-light': { activation: 'action' },

  // ─── Trickery Domain ─────────────────────────────────────────────────────────
  'trickerydomain-blessing-of-the-trickster': { activation: 'action' },
  'trickerydomain-invoke-duplicity': { activation: 'bonus-action', poolId: 'channel-divinity' },
  'trickerydomain-tricksters-transposition': { activation: 'bonus-action' },

  // ─── War Domain ──────────────────────────────────────────────────────────────
  // Bonus Action weapon attack after the Attack action; Proficiency Bonus uses per Long Rest.
  'wardomain-war-priest': { activation: 'bonus-action', poolId: 'war-priest' },
  // +10 to an attack roll just made by you or a creature within 30 ft.
  'wardomain-guided-strike': { activation: 'free', poolId: 'channel-divinity' },
  // Cast Shield of Faith or Spiritual Weapon with Channel Divinity instead of a slot.
  'wardomain-war-gods-blessing': { activation: 'free', poolId: 'channel-divinity' },
};
