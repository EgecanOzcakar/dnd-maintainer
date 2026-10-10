import type { SpellDef } from '@/types/spells';

/** 2024 PHB spells (levels 6-9) not in the core SPELL_CATALOG list. Spread into SPELL_CATALOG. */
export const SPELLS_L6_L9 = [] as const satisfies readonly SpellDef[];
