import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invalidatePartySnapshot, usePartySnapshot, type PartySnapshot } from '@/hooks/usePartySnapshot';

/**
 * Which NPCs the DM has added to the party. Stored alongside the rest of the
 * shared party state in `campaigns.dm_notes` (`party_npcs: string[]` of
 * character ids) and polled like the other party hooks.
 */
const selectNpcIds = ({ meta }: PartySnapshot): string[] => {
  const ids = meta?.party_npcs;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
};

export function usePartyNpcs(campaignId: string | undefined) {
  return usePartySnapshot(campaignId, selectNpcIds);
}

/** The new NPC id list: an explicit replacement, or the current list with one id added or removed. */
export function applyNpcChange(
  current: unknown,
  { npcIds, add, remove }: { npcIds?: string[]; add?: string; remove?: string }
): string[] {
  if (npcIds) return Array.from(new Set(npcIds));
  const ids = Array.isArray(current) ? current.filter((id): id is string => typeof id === 'string') : [];
  const next = remove ? ids.filter((id) => id !== remove) : ids;
  return Array.from(new Set(add ? [...next, add] : next));
}

export function useUpdatePartyNpcs() {
  const queryClient = useQueryClient();

  return useMutation({
    // `add` / `remove` are applied to the freshly-read list, so two DMs (or a stale tab) can't clobber each other.
    mutationFn: async ({
      campaignId,
      npcIds,
      add,
      remove,
    }: {
      campaignId: string;
      npcIds?: string[];
      add?: string;
      remove?: string;
    }) => {
      const { data: campaign, error: fetchErr } = await supabase
        .from('campaigns')
        .select('dm_notes')
        .eq('id', campaignId)
        .single();

      if (fetchErr) throw fetchErr;

      let existingMeta: Record<string, unknown> = {};
      if (campaign?.dm_notes) {
        try {
          existingMeta = typeof campaign.dm_notes === 'string' ? JSON.parse(campaign.dm_notes) : campaign.dm_notes;
        } catch {
          existingMeta = { raw_notes: campaign.dm_notes };
        }
      }

      const updatedMeta = {
        ...existingMeta,
        party_npcs: applyNpcChange(existingMeta.party_npcs, { npcIds, add, remove }),
      };

      const { error } = await supabase
        .from('campaigns')
        .update({
          dm_notes: JSON.stringify(updatedMeta),
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;
      return updatedMeta;
    },
    onSuccess: (_, { campaignId }) => {
      invalidatePartySnapshot(queryClient, campaignId);
    },
  });
}
