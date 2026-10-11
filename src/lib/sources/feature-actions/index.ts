import type { FeatureActionMeta } from '@/types/actions';
import { BARBARIAN_BARD_CLERIC_ACTIONS } from '@/lib/sources/feature-actions/barbarian-bard-cleric';
import { DRUID_FIGHTER_MONK_ACTIONS } from '@/lib/sources/feature-actions/druid-fighter-monk';
import { PALADIN_RANGER_ROGUE_ACTIONS } from '@/lib/sources/feature-actions/paladin-ranger-rogue';
import { SORCERER_WARLOCK_WIZARD_ACTIONS } from '@/lib/sources/feature-actions/sorcerer-warlock-wizard';
import { SPECIES_FEAT_ACTIONS } from '@/lib/sources/feature-actions/species-feats';

/** Per-group catalogs, kept separate so each can be edited without touching the others. */
export const FEATURE_ACTION_GROUPS = [
  BARBARIAN_BARD_CLERIC_ACTIONS,
  DRUID_FIGHTER_MONK_ACTIONS,
  PALADIN_RANGER_ROGUE_ACTIONS,
  SORCERER_WARLOCK_WIZARD_ACTIONS,
  SPECIES_FEAT_ACTIONS,
] as const;

export const FEATURE_ACTIONS: Readonly<Record<string, FeatureActionMeta>> = Object.assign({}, ...FEATURE_ACTION_GROUPS);
