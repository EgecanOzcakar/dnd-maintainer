import type { FeatureActionMeta } from '@/types/actions';

/** Action-economy data for sorcerer, warlock and wizard features (and their subclasses). */
export const SORCERER_WARLOCK_WIZARD_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = {
  // ─── Sorcerer ──────────────────────────────────────────────────────────────
  'sorcerer-innate-sorcery': {
    activation: 'bonus-action',
    poolId: 'innate-sorcery',
  },
  // Convert spell slots <-> Sorcery Points.
  'sorcerer-font-of-magic': { activation: 'bonus-action', poolId: 'sorcery-points' },
  // Spend Sorcery Points as part of casting a spell.
  'sorcerer-metamagic': { activation: 'free', poolId: 'sorcery-points' },
  // Short Rest: regain Sorcery Points up to half Sorcerer level.
  'sorcerer-sorcerous-restoration': { activation: 'special', poolId: 'sorcerous-restoration' },

  // Aberrant Mind
  'aberrantsorcery-telepathic-speech': { activation: 'bonus-action' },
  'aberrantsorcery-revelation-in-flesh': { activation: 'bonus-action', poolId: 'sorcery-points' },
  'aberrantsorcery-warping-implosion': {
    activation: 'action',
    save: { ability: 'str', dcAbility: 'spellcasting' },
    damage: { dice: '3d10', type: 'force' },
    poolId: 'warping-implosion',
  },

  // Clockwork Soul
  'clockworksorcery-restore-balance': { activation: 'reaction', poolId: 'restore-balance' },
  // Ward of d8s equal to Sorcery Points spent (1-5); the dice reduce damage, so no damage/heal roll here.
  'clockworksorcery-bastion-of-law': { activation: 'action', poolId: 'sorcery-points' },
  'clockworksorcery-trance-of-order': { activation: 'bonus-action', poolId: 'trance-of-order' },
  // Restores up to 100 HP divided among creatures in the Cube, which no dice field models.
  'clockworksorcery-clockwork-cavalcade': { activation: 'action', poolId: 'clockwork-cavalcade' },

  // Draconic
  'draconicsorcery-dragon-wings': { activation: 'bonus-action', poolId: 'dragon-wings' },
  'draconicsorcery-dragon-companion': { activation: 'bonus-action' },

  // Wild Magic
  // Advantage on one d20 Test; no action cost.
  'wildmagicsorcery-tides-of-chaos': { activation: 'free', poolId: 'tides-of-chaos' },
  // 2 Sorcery Points, roll 1d4 and add or subtract it from another creature's d20 Test.
  'wildmagicsorcery-bend-luck': { activation: 'reaction', poolId: 'sorcery-points' },
  'wildmagicsorcery-tamed-surge': { activation: 'special' },

  // ─── Warlock ───────────────────────────────────────────────────────────────
  // 1-minute rites.
  'warlock-magical-cunning': { activation: 'special', poolId: 'magical-cunning' },
  'warlock-contact-patron': { activation: 'special', poolId: 'contact-patron' },
  'warlock-eldritch-master': { activation: 'special', poolId: 'eldritch-master' },
  'warlock-pact-of-the-blade': { activation: 'bonus-action' },

  // Archfey
  // Misty Step as a Bonus Action; Refreshing Step heals a Pact slot die, which varies with slot level.
  'archfeypatron-steps-of-the-fey': { activation: 'bonus-action' },
  'archfeypatron-misty-escape': { activation: 'reaction', poolId: 'misty-escape' },
  'archfeypatron-beguiling-defenses': {
    activation: 'reaction',
    save: { ability: 'wis', dcAbility: 'spellcasting' },
  },

  // Celestial
  // Spend up to CHA-mod d6s from the pool; each die spent is rolled.
  'celestialpatron-healing-light': {
    activation: 'bonus-action',
    heal: { dice: '1d6' },
    poolId: 'healing-light',
  },
  'celestialpatron-searing-vengeance': {
    activation: 'reaction',
    damage: { dice: '2d8', type: 'radiant', addMod: 'spellcasting' },
    poolId: 'searing-vengeance',
  },

  // Fiend
  // Add a d10 to an ability check or saving throw.
  'fiendpatron-dark-ones-own-luck': { activation: 'free', poolId: 'dark-ones-own-luck' },
  // Rides an attack hit (no save): the target takes the psychic damage unless it is a Fiend.
  'fiendpatron-hurl-through-hell': {
    activation: 'special',
    damage: { dice: '8d10', type: 'psychic' },
    poolId: 'hurl-through-hell',
  },

  // Great Old One
  'greatoldonepatron-clairvoyant-combatant': { activation: 'special', poolId: 'clairvoyant-combatant' },
  // Bonus Action hex; deals Psychic damage equal to your Proficiency Bonus (flat, no dice).
  'greatoldonepatron-eldritch-hex': { activation: 'bonus-action', poolId: 'eldritch-hex' },
  'greatoldonepatron-create-thrall': { activation: 'action' },

  // ─── Wizard ────────────────────────────────────────────────────────────────
  'wizard-arcane-recovery': { activation: 'special', poolId: 'arcane-recovery' },

  // Abjurer
  'abjurer-arcane-ward': { activation: 'special' },
  'abjurer-projected-ward': { activation: 'reaction' },

  // Diviner
  'diviner-portent': { activation: 'special', poolId: 'portent' },
  'diviner-the-third-eye': { activation: 'bonus-action' },

  // Evoker
  'evoker-sculpt-spells': { activation: 'special' },
  'evoker-overchannel': { activation: 'special' },

  // Illusionist
  'illusionist-improved-illusions': { activation: 'bonus-action' },
  'illusionist-phantasmal-creatures': { activation: 'special' },
  'illusionist-illusory-self': { activation: 'reaction', poolId: 'illusory-self' },
  'illusionist-illusory-reality': { activation: 'bonus-action' },
};
