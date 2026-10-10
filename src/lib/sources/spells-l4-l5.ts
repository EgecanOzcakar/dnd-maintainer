import type { SpellDef } from '@/types/spells';

/** 2024 PHB spells (levels 4-5) not in the core SPELL_CATALOG list. Spread into SPELL_CATALOG. */
export const SPELLS_L4_L5 = [] as const satisfies readonly SpellDef[];
