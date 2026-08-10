import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CharacterSummary } from '@/types/database';
import type { BuildLevelRow } from '@/lib/build-reconstruction';
import { reconstructBuild } from '@/lib/build-reconstruction';
import { collectBundles } from '@/lib/sources/index';
import { resolveCharacter } from '@/lib/resolver/index';
import { isSpeciesId } from '@/lib/dnd-helpers';

export interface CharacterChecksStats {
  characterId: string;
  wisScore: number;
  wisMod: number;
  intScore: number;
  intMod: number;
  perceptionBonus: number;
  passivePerception: number;
  passiveWisdom: number;
  passiveIntelligence: number;
  perceptionProficient: boolean;
  perceptionExpertise: boolean;
}

export function usePartyCharacterStats(campaignId: string | undefined, pcs: CharacterSummary[]) {
  const pcIds = pcs.map((c) => c.id).sort().join(',');

  return useQuery({
    queryKey: ['party-character-stats', campaignId, pcIds],
    queryFn: async (): Promise<Record<string, CharacterChecksStats>> => {
      if (!campaignId || pcs.length === 0) return {};

      const ids = pcs.map((c) => c.id);

      // Fetch build level rows for all PCs
      const { data: levelsData, error: levelsErr } = await supabase
        .from('character_build_levels')
        .select('*')
        .in('character_id', ids)
        .is('deleted_at', null);

      if (levelsErr) throw levelsErr;

      // Fetch character items for all PCs
      const { data: itemsData, error: itemsErr } = await supabase
        .from('character_items')
        .select('*')
        .in('character_id', ids);

      if (itemsErr) throw itemsErr;

      const levelsByCharId = (levelsData || []).reduce<Record<string, BuildLevelRow[]>>((acc, row) => {
        const cid = row.character_id as string;
        if (!acc[cid]) acc[cid] = [];
        acc[cid].push(row as unknown as BuildLevelRow);
        return acc;
      }, {});

      const itemsByCharId = (itemsData || []).reduce<Record<string, string[]>>((acc, item) => {
        const cid = item.character_id as string;
        if (!acc[cid]) acc[cid] = [];
        if (item.equipped && item.item_id) {
          acc[cid].push(item.item_id as string);
        }
        return acc;
      }, {});

      const statsMap: Record<string, CharacterChecksStats> = {};

      for (const pc of pcs) {
        let rows = levelsByCharId[pc.id] || [];
        const equippedItems = itemsByCharId[pc.id] || [];

        // Ensure creation row exists
        if (!rows.some((r) => r.sequence === 0)) {
          const seedRow: BuildLevelRow = {
            sequence: 0,
            base_abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
            ability_method: 'standard-array',
            class_id: null,
            class_level: null,
            subclass_id: null,
            asi_allocation: null,
            feat_id: null,
            hp_roll: null,
            choices: {},
            deleted_at: null,
          };
          rows = [seedRow, ...rows];
        }

        const species = pc.species && isSpeciesId(pc.species) ? pc.species : 'human';
        const background = pc.background ?? null;

        let wisScore = 10;
        let wisMod = 0;
        let intScore = 10;
        let intMod = 0;
        let perceptionBonus = 0;
        let perceptionProficient = false;
        let perceptionExpertise = false;

        try {
          const build = reconstructBuild(
            { species, background },
            rows,
            equippedItems
          );
          const { bundles, expandedFeats } = collectBundles(build);
          const levelRows = rows.filter((r) => r.sequence !== 0);
          const resolved = resolveCharacter({
            baseAbilities: build.baseAbilities,
            level: levelRows.length,
            bundles,
            choices: build.choices,
            levels: build.levels,
            equippedItemIds: equippedItems,
            expandedFeats,
          });

          if (resolved) {
            wisScore = resolved.abilities.wis.total;
            wisMod = resolved.abilities.wis.modifier;
            intScore = resolved.abilities.int.total;
            intMod = resolved.abilities.int.modifier;
            const pSkill = resolved.skills.perception;
            if (pSkill) {
              perceptionBonus = pSkill.bonus;
              perceptionProficient = pSkill.proficient;
              perceptionExpertise = pSkill.expertise;
            } else {
              perceptionBonus = wisMod;
            }
          }
        } catch {
          // Fallback to basic calculations if build reconstruction fails
          wisScore = 10;
          wisMod = 0;
          intScore = 10;
          intMod = 0;
          perceptionBonus = 0;
        }

        const passivePerception = 10 + perceptionBonus;
        const passiveWisdom = 10 + wisMod;
        const passiveIntelligence = 10 + intMod;

        statsMap[pc.id] = {
          characterId: pc.id,
          wisScore,
          wisMod,
          intScore,
          intMod,
          perceptionBonus,
          passivePerception,
          passiveWisdom,
          passiveIntelligence,
          perceptionProficient,
          perceptionExpertise,
        };
      }

      return statsMap;
    },
    enabled: !!campaignId && pcs.length > 0,
  });
}
