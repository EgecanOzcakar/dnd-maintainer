import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Which NPCs the DM has added to the party. Stored alongside the rest of the
 * shared party state in `campaigns.dm_notes` (`party_npcs: string[]` of
 * character ids) and polled like the other party hooks.
 */
export function usePartyNpcs(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['party-npcs', campaignId],
    queryFn: async (): Promise<string[]> => {
      if (!campaignId) return [];
      const { data, error } = await supabase.from('campaigns').select('dm_notes').eq('id', campaignId).single();

      if (error) throw error;

      const rawNotes = data?.dm_notes;
      if (!rawNotes) return [];

      try {
        const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
        const ids = parsed?.party_npcs;
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
      } catch {
        return [];
      }
    },
    enabled: !!campaignId,
    refetchInterval: 2000,
  });
}

export function useUpdatePartyNpcs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, npcIds }: { campaignId: string; npcIds: string[] }) => {
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
        party_npcs: Array.from(new Set(npcIds)),
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
      queryClient.invalidateQueries({ queryKey: ['party-npcs', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['party-initiatives', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
