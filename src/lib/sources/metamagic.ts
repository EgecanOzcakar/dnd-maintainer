/** Sorcery Point cost of each Metamagic option (2024 PHB). */
export const METAMAGIC_COSTS: Readonly<Record<string, number>> = {
  'metamagic-careful-spell': 1,
  'metamagic-distant-spell': 1,
  'metamagic-empowered-spell': 1,
  'metamagic-extended-spell': 1,
  'metamagic-heightened-spell': 2,
  'metamagic-quickened-spell': 2,
  'metamagic-seeking-spell': 1,
  'metamagic-subtle-spell': 1,
  'metamagic-transmuted-spell': 1,
  'metamagic-twinned-spell': 1,
};

/** Font of Magic: Sorcery Points to create a spell slot of each level (no slots above 5th). */
export const SLOT_CREATION_COST: Readonly<Record<number, number>> = { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 };

export const SORCERY_POINTS = 'sorcery-points';
