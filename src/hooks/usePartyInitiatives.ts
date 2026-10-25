import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { invalidatePartySnapshot, usePartySnapshot, type PartySnapshot } from '@/hooks/usePartySnapshot';

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

const selectInitiatives = ({ meta }: PartySnapshot) =>
  (meta?.party_initiatives as PartyInitiativesState | undefined) ?? null;

export function usePartyInitiatives(campaignId: string | undefined) {
  return usePartySnapshot(campaignId, selectInitiatives);
}

export function useUpdatePartyInitiatives() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, initiatives }: { campaignId: string; initiatives: Record<string, number> }) => {
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
      invalidatePartySnapshot(queryClient, campaignId);
    },
  });
}
