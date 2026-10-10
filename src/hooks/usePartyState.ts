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
  hp: Record<string, number>; // characterId -> current HP
  lastRolls: Record<string, CharacterRollEntry>; // characterId -> last rolled dice
  updatedAt: string;
  displayImage?: { url: string; title?: string; caption?: string } | null;
}

export function usePartyState(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['party-state', campaignId],
    queryFn: async (): Promise<PartyFullState | null> => {
      if (!campaignId) return null;
      // HP lives on characters.current_hp (single source of truth); fetched in the same poll tick.
      const [notesRes, hpRes] = await Promise.all([
        supabase.from('campaigns').select('dm_notes').eq('id', campaignId).single(),
        supabase
          .from('characters')
          .select('id, current_hp')
          .eq('campaign_id', campaignId)
          .not('current_hp', 'is', null),
      ]);

      if (notesRes.error) throw notesRes.error;
      if (hpRes.error) throw hpRes.error;

      const hp: Record<string, number> = {};
      if (Array.isArray(hpRes.data)) {
        for (const row of hpRes.data) if (row.current_hp != null) hp[row.id] = row.current_hp;
      }

      const rawNotes = notesRes.data?.dm_notes;
      let parsed: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        parsed = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
      } catch {
        parsed = null;
      }
      if (!parsed || typeof parsed !== 'object') {
        if (Object.keys(hp).length === 0) return null;
        parsed = {};
      }

      return {
        campaignId,
        initiatives: parsed.party_initiatives?.initiatives ?? {},
        hp,
        lastRolls: parsed.character_rolls?.rollsMap ?? parsed.character_rolls ?? {},
        displayImage: parsed.shared_image ?? null,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    },
    enabled: !!campaignId,
    refetchInterval: 2000,
  });
}

/**
 * Mutation to set current HP for one or more characters (writes characters.current_hp).
 * Raising a character above 0 HP also resets its death saves.
 */
export function useUpdatePartyHP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ hpMap }: { campaignId: string; hpMap: Record<string, number> }) => {
      const results = await Promise.all(
        Object.entries(hpMap).map(([id, hp]) =>
          supabase
            .from('characters')
            .update({
              current_hp: hp,
              ...(hp > 0 ? { death_saves: { successes: 0, failures: 0 } } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
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

      const existingRolls =
        (existingMeta.character_rolls as Record<string, unknown>)?.rollsMap ?? existingMeta.character_rolls ?? {};

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
      // dm_notes is polled every 2s by every client — inline image bytes there take the DB down.
      if (image?.url.startsWith('data:'))
        throw new Error('Inline data URLs cannot be shared; upload the image instead');
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
