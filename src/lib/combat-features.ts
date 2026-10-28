import gamedata from '@/locales/en/gamedata.json';
import { FEATURE_ACTIONS } from '@/lib/sources/feature-actions';
import type { ResolvedFeature } from '@/types/resolved';

// ponytail: keyword match on the English rules text; add a `combat` flag to FeatureDef if it misfires.
const COMBAT_TEXT =
  /\b(attacks?|damage|Armor Class|AC|weapons?|initiative|Reaction|Bonus Action|Hit Points|critical|Speed)\b/i;

const DESCRIPTIONS: Readonly<Record<string, { description?: string }>> = gamedata.features;

/** Passive features and feats that shape combat; features that are their own action rows are excluded. */
export function combatFeatures(features: readonly ResolvedFeature[]): ResolvedFeature[] {
  return features.filter(
    ({ feature }) =>
      !FEATURE_ACTIONS[feature.id] &&
      COMBAT_TEXT.test(DESCRIPTIONS[feature.id]?.description ?? feature.description ?? '')
  );
}
