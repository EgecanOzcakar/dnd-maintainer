import type { AbilityKey } from '@/lib/dnd-helpers';
import { getLogger } from '@/lib/logger';

const logger = getLogger('resolver.abilities');
import type { AbilityScores } from '@/types/database';
import type { GrantBundle, SourceTag } from '@/types/sources';
import type { ChoiceKey, ChoiceDecision } from '@/types/choices';
import type { ResolvedAbility } from '@/types/resolved';

import { collectGrantsByType } from '@/lib/resolver/helpers';
import { getFeatSource } from '@/lib/sources';

export function resolveAbilities(
  baseAbilities: AbilityScores,
  bundles: readonly GrantBundle[],
  choices: Readonly<Record<ChoiceKey, ChoiceDecision>>
): Readonly<Record<AbilityKey, ResolvedAbility>> {
  const keys: readonly AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  // Accumulate bonuses per ability
  const bonusList: Record<AbilityKey, { readonly value: number; readonly source: SourceTag }[]> = {
    str: [],
    dex: [],
    con: [],
    int: [],
    wis: [],
    cha: [],
  };

  // Direct ability-bonus grants
  for (const { grant, source } of collectGrantsByType(bundles, 'ability-bonus')) {
    bonusList[grant.ability].push({ value: grant.bonus, source });
  }

  // Ability-choice grants — look up the decision in choices
  for (const { grant, source } of collectGrantsByType(bundles, 'ability-choice')) {
    const decision = choices[grant.key];
    if (decision?.type === 'ability-choice') {
      for (const ability of decision.abilities) {
        bonusList[ability].push({ value: grant.bonus, source });
      }
    }
  }

  // ASI grants — look up the allocation decision in choices
  for (const { grant, source } of collectGrantsByType(bundles, 'asi')) {
    const decision = choices[grant.key];
    if (decision?.type === 'asi') {
      const totalAllocated = Object.values(decision.allocation).reduce((sum, v) => sum + (v ?? 0), 0);
      if (totalAllocated > grant.points) {
        logger.warn(`ASI grant "${grant.key}" over-allocated (${totalAllocated}/${grant.points}) — skipping`);
        continue;
      }
      if (grant.from != null) {
        const hasOutOfPool = Object.keys(decision.allocation).some(
          (k) => (decision.allocation[k as AbilityKey] ?? 0) > 0 && !grant.from!.includes(k as AbilityKey)
        );
        if (hasOutOfPool) {
          logger.warn(`ASI grant "${grant.key}" has out-of-pool allocation — skipping`);
          continue;
        }
      }
      for (const [ability, value] of Object.entries(decision.allocation)) {
        if (value !== undefined && value > 0) {
          bonusList[ability as AbilityKey].push({ value, source });
        }
      }
    }
  }

  // Ability-set grants (Belt of Giant Strength, Headband of Intellect): the best one wins, only if it is higher.
  const setScores: Partial<Record<AbilityKey, { readonly score: number; readonly source: SourceTag }>> = {};
  for (const { grant, source } of collectGrantsByType(bundles, 'ability-set')) {
    const best = setScores[grant.ability];
    if (!best || grant.score > best.score) setScores[grant.ability] = { score: grant.score, source };
  }

  const result = {} as Record<AbilityKey, ResolvedAbility>;
  for (const key of keys) {
    const base = baseAbilities[key];
    const bonuses = [...bonusList[key]];
    const rawTotal = base + bonuses.reduce((sum, b) => sum + b.value, 0);
    // An Epic Boon feat raises the ceiling for the score it increased (to 30).
    const epicBoon = bonuses.some(
      (b) => b.source.origin === 'feat' && getFeatSource(b.source.id)?.category === 'epicBoon'
    );
    const capped = Math.min(rawTotal, epicBoon ? 30 : 20);
    const set = setScores[key];
    // The item raises the score past the normal cap of 20; show the difference as its own bonus.
    if (set && set.score > capped) bonuses.push({ value: set.score - capped, source: set.source });
    const total = set && set.score > capped ? set.score : capped;
    result[key] = {
      base,
      bonuses,
      total,
      modifier: Math.floor((total - 10) / 2),
    };
  }
  return result;
}
