import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PartyInitiativeEntry {
  characterId: string;
  initiative: number;
  updatedAt: string;
}

export interface PartyInitiativesState {
  campaignId: string;
  initiatives: Record<string, number>; // characterId -> initiative roll
  updatedAt: string;
}

export function usePartyInitiatives(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['party-initiatives', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('campaigns')
        .select('dm_notes')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      // Extract initiative state from campaign dm_notes metadata
      const rawNotes = data?.dm_notes;
      if (!rawNotes) return null;

      try {
        const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
        if (parsed?.party_initiatives) {
          return parsed.party_initiatives as PartyInitiativesState;
        }
      } catch {
        // Return null if notes field is plain text
      }
      return null;
    },
    enabled: !!campaignId,
    refetchInterval: 2000,
  });
}

export function useUpdatePartyInitiatives() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      initiatives,
    }: {
      campaignId: string;
      initiatives: Record<string, number>;
    }) => {
      // 1. Fetch current campaign row
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
        party_initiatives: {
          campaignId,
          initiatives,
          updatedAt: new Date().toISOString(),
        },
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
      queryClient.invalidateQueries({ queryKey: ['party-initiatives', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
