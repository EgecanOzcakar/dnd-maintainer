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

  // ---- Paladin ----
  // Divine Sense is a Channel Divinity option in 2024 (Bonus Action).
  'paladin-divine-sense': { activation: 'bonus-action', poolId: 'channel-divinity' },
  // Divine Smite: always-prepared spell, Bonus Action right after a melee hit; 2d8 +1d8 per slot above 1st.
  'paladin-divine-smite': { activation: 'bonus-action', damage: { dice: '2d8', type: 'radiant' } },
  // Abjure Foes: Magic action, Channel Divinity; targets (up to Cha mod) save or are Frightened.
  'paladin-abjure-foes': {
    activation: 'action',
    save: { ability: 'wis', dcAbility: 'cha' },
    poolId: 'channel-divinity',
  },
  // Radiant Strikes: +1d8 Radiant on every melee weapon / Unarmed hit.
  'paladin-radiant-strikes': { activation: 'special', damage: { dice: '1d8', type: 'radiant' } },

  // Oath of Devotion: Sacred Weapon is used as part of the Attack action.
  'oathofdevotion-sacred-weapon': { activation: 'special', poolId: 'channel-divinity' },
  'oathofdevotion-holy-nimbus': { activation: 'bonus-action' },
  'oathofglory-peerless-athlete': { activation: 'bonus-action', poolId: 'channel-divinity' },
  // Inspiring Smite: after Divine Smite, distribute Temp HP equal to 2d8 + paladin level.
  'oathofglory-inspiring-smite': {
    activation: 'special',
    heal: { dice: '2d8', addLevel: true },
    poolId: 'channel-divinity',
  },
  'oathofglory-glorious-defense': { activation: 'reaction' },
  'oathofglory-living-legend': { activation: 'bonus-action' },
  // Nature's Wrath: target chooses Strength or Dexterity save (Strength modeled).
  'oathofancients-natures-wrath': {
    activation: 'action',
    save: { ability: 'str', dcAbility: 'cha' },
    poolId: 'channel-divinity',
  },
  'oathofancients-undying-sentinel': { activation: 'special' },
  'oathofancients-elder-champion': { activation: 'bonus-action' },
  'oathofvengeance-vow-of-enmity': { activation: 'special', poolId: 'channel-divinity' },
  'oathofvengeance-soul-of-vengeance': { activation: 'reaction' },
  'oathofvengeance-avenging-angel': {
    activation: 'bonus-action',
    save: { ability: 'wis', dcAbility: 'cha' },
  },

  // ---- Ranger ----
  // Favored Enemy: free Hunter's Mark casts (Bonus Action); its rider is 1d6 Force, 1d10 with Foe Slayer (L20).
  'ranger-favored-enemy': {
    activation: 'bonus-action',
    damage: {
      dice: [
        [1, '1d6'],
        [20, '1d10'],
      ],
      type: 'force',
    },
    poolId: 'favored-enemy',
  },
  // Tireless: Magic action, Temp HP 1d8 + Wisdom modifier.
  'ranger-tireless': { activation: 'action', heal: { dice: '1d8', addMod: 'wis' } },
  'ranger-natures-veil': { activation: 'bonus-action' },
  'hunter-hunters-prey-colossus-slayer': { activation: 'special', damage: { dice: '1d8', type: 'weapon' } },
  // Superior Hunter's Prey: the Hunter's Mark rider also hits a second creature within 30 ft.
  'hunter-superior-hunters-prey': {
    activation: 'special',
    damage: {
      dice: [
        [1, '1d6'],
        [20, '1d10'],
      ],
      type: 'force',
    },
  },
  'hunter-superior-hunters-defense': { activation: 'reaction' },
  // Primal Companion: Bonus Action to command it; Beast's Strike uses your spell attack modifier
  // and deals 1d8 + 2 + your spellcasting modifier.
  'beastmaster-primal-companion': {
    activation: 'bonus-action',
    attack: { ability: 'spellcasting' },
    damage: { dice: '1d8', type: 'weapon', addMod: 'spellcasting', flat: 2 },
  },
  // Dreadful Strikes: once per turn per creature, 1d4 Psychic (1d6 from L11).
  'feywanderer-dreadful-strikes': {
    activation: 'special',
    damage: {
      dice: [
        [3, '1d4'],
        [11, '1d6'],
      ],
      type: 'psychic',
    },
  },
  'feywanderer-beguiling-twist': {
    activation: 'reaction',
    save: { ability: 'wis', dcAbility: 'spellcasting' },
  },
  'feywanderer-misty-wanderer': { activation: 'bonus-action' },
  // Dreadful Strike (part of Dread Ambusher): Wis-mod uses per Long Rest, 2d6 Psychic, 2d8 from L11.
  'gloomstalker-dread-ambusher': {
    activation: 'special',
    damage: {
      dice: [
        [3, '2d6'],
        [11, '2d8'],
      ],
      type: 'psychic',
    },
  },
  'gloomstalker-shadowy-dodge': { activation: 'reaction' },

  // ---- Rogue ----
  'rogue-cunning-action': { activation: 'bonus-action' },
  'rogue-steady-aim': { activation: 'bonus-action' },
  'rogue-uncanny-dodge': { activation: 'reaction' },
  // Cunning Strike: trade Sneak Attack dice for an effect; Poison/Trip/Withdraw saves use 8 + PB + Dex.
  'rogue-cunning-strike': { activation: 'special', save: { ability: 'con', dcAbility: 'dex' } },
  'rogue-stroke-of-luck': { activation: 'special' },
  'thief-fast-hands': { activation: 'bonus-action' },
  // Assassinate: on round 1, a hit deals extra damage equal to rogue level (weapon's type).
  'assassin-assassinate': { activation: 'special', damage: { type: 'weapon', addLevel: true } },
  // Envenom Weapons: Poison Cunning Strike also deals 2d6 Poison on a failed Con save.
  'assassin-envenom-weapons': {
    activation: 'special',
    save: { ability: 'con', dcAbility: 'dex' },
    damage: { dice: '2d6', type: 'poison' },
  },
  'assassin-death-strike': { activation: 'special', save: { ability: 'con', dcAbility: 'dex' } },
  'arcanetrickster-mage-hand-legerdemain': { activation: 'bonus-action' },
  'arcanetrickster-versatile-trickster': { activation: 'bonus-action' },
  'arcanetrickster-spell-thief': { activation: 'reaction' },
  // Psychic Blades: 1d6 Psychic + Dex (Attack action); the Bonus Action second blade is 1d4.
  'soulknife-psychic-blades': {
    activation: 'action',
    attack: { ability: 'dex' },
    damage: { dice: '1d6', type: 'psychic', addMod: 'dex' },
  },
  // Soul Blades: Psychic Teleportation (Bonus Action) / Homing Strikes both spend a Psionic Energy die.
  'soulknife-soul-blades': { activation: 'bonus-action', poolId: 'psionic-energy' },
  'soulknife-psychic-veil': { activation: 'action' },
  // Rend Mind: on a Psychic Blade hit, Wis save or Stunned.
  'soulknife-rend-mind': { activation: 'special', save: { ability: 'wis', dcAbility: 'dex' } },
};
