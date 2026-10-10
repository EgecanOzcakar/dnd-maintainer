import type { SpellDef } from '@/types/spells';

/** 2024 PHB spells (levels 2-3) not in the core SPELL_CATALOG list. Spread into SPELL_CATALOG. */
export const SPELLS_L2_L3 = [] as const satisfies readonly SpellDef[];
