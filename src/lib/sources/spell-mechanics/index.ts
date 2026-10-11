import type { SpellMechanics } from '@/types/actions';
import { SPELL_MECHANICS_L0_L1 } from '@/lib/sources/spell-mechanics/l0-l1';
import { SPELL_MECHANICS_L2_L3 } from '@/lib/sources/spell-mechanics/l2-l3';
import { SPELL_MECHANICS_L4_L5 } from '@/lib/sources/spell-mechanics/l4-l5';
import { SPELL_MECHANICS_L6_L9 } from '@/lib/sources/spell-mechanics/l6-l9';

/** Per-level-group catalogs, kept separate so each can be edited without touching the others. */
export const SPELL_MECHANICS_GROUPS = [
  { minLevel: 0, maxLevel: 1, mechanics: SPELL_MECHANICS_L0_L1 },
  { minLevel: 2, maxLevel: 3, mechanics: SPELL_MECHANICS_L2_L3 },
  { minLevel: 4, maxLevel: 5, mechanics: SPELL_MECHANICS_L4_L5 },
  { minLevel: 6, maxLevel: 9, mechanics: SPELL_MECHANICS_L6_L9 },
] as const;

export const SPELL_MECHANICS: Readonly<Record<string, SpellMechanics>> = Object.assign(
  {},
  ...SPELL_MECHANICS_GROUPS.map((g) => g.mechanics)
);
