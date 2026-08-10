import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CharacterRollEntry {
  formula: string;
  total: number;
  rolls: number[];
  modifier: number;
  timestamp: string;
  label?: string;
}

export interface PartyFullState {
  campaignId: string;
  initiatives: Record<string, number>; // characterId -> initiative roll
  hp: Record<string, number>;          // characterId -> current HP
  lastRolls: Record<string, CharacterRollEntry>; // characterId -> last rolled dice
  updatedAt: string;
  displayImage?: { url: string; title?: string; caption?: string } | null;
}

export function usePartyState(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['party-state', campaignId],
    queryFn: async (): Promise<PartyFullState | null> => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('campaigns')
        .select('dm_notes')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      const rawNotes = data?.dm_notes;
      if (!rawNotes) return null;

      try {
        const parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
        if (!parsed || typeof parsed !== 'object') return null;

        const partyInit = parsed.party_initiatives?.initiatives ?? {};
        const partyHp = parsed.party_hp?.hpMap ?? parsed.party_hp ?? {};
        const partyRolls = parsed.character_rolls?.rollsMap ?? parsed.character_rolls ?? {};
        const displayImage = parsed.shared_image ?? null;

        return {
          campaignId,
          initiatives: partyInit,
          hp: partyHp,
          lastRolls: partyRolls,
          displayImage,
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        };
      } catch {
        return null;
      }
    },
    enabled: !!campaignId,
    refetchInterval: 2000,
  });
}

/**
 * Mutation to update current HP for one or more characters in a campaign
 */
export function useUpdatePartyHP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      hpMap,
    }: {
      campaignId: string;
      hpMap: Record<string, number>;
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

      const existingPartyHp = (existingMeta.party_hp as Record<string, unknown>)?.hpMap ?? existingMeta.party_hp ?? {};

      const updatedPartyHp = {
        ...(typeof existingPartyHp === 'object' && existingPartyHp !== null ? existingPartyHp : {}),
        ...hpMap,
      };

      const updatedMeta = {
        ...existingMeta,
        party_hp: {
          campaignId,
          hpMap: updatedPartyHp,
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
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['party-initiatives', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Mutation to record a character's last rolled dice
 */
export function useRecordCharacterRoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      characterId,
      roll,
    }: {
      campaignId: string;
      characterId: string;
      roll: {
        formula: string;
        total: number;
        rolls: number[];
        modifier: number;
        label?: string;
      };
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

      const existingRolls = (existingMeta.character_rolls as Record<string, unknown>)?.rollsMap ?? existingMeta.character_rolls ?? {};

      const updatedRolls = {
        ...(typeof existingRolls === 'object' && existingRolls !== null ? existingRolls : {}),
        [characterId]: {
          ...roll,
          timestamp: new Date().toISOString(),
        },
      };

      const updatedMeta = {
        ...existingMeta,
        character_rolls: {
          campaignId,
          rollsMap: updatedRolls,
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
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['party-initiatives', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Mutation to update the shared DM scene image for a campaign
 */
export function useUpdateSharedImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      image,
    }: {
      campaignId: string;
      image: { url: string; title?: string; caption?: string } | null;
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
        shared_image: image,
        updatedAt: new Date().toISOString(),
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
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

