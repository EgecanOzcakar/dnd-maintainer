import type { SpellDef } from '@/types/spells';

/** 2024 PHB spells (cantrips and level 1) not in the core SPELL_CATALOG list. Spread into SPELL_CATALOG. */
export const SPELLS_CANTRIPS_L1 = [] as const satisfies readonly SpellDef[];
