import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { BattleMap, DisplayMode } from '@/types/battle-map';

export interface BattleMapState {
  map: BattleMap | null;
  displayMode: DisplayMode;
}

async function readMeta(campaignId: string): Promise<Record<string, unknown>> {
  const { data: campaign, error } = await supabase.from('campaigns').select('dm_notes').eq('id', campaignId).single();

  if (error) throw error;

  if (!campaign?.dm_notes) return {};
  try {
    return typeof campaign.dm_notes === 'string' ? JSON.parse(campaign.dm_notes) : campaign.dm_notes;
  } catch {
    return { raw_notes: campaign.dm_notes };
  }
}

async function writeMeta(campaignId: string, meta: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('campaigns')
    .update({
      dm_notes: JSON.stringify(meta),
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) throw error;
}

/**
 * Reads the campaign's active battle map and the DM's current display mode from
 * `campaigns.dm_notes`. Polled like the rest of the shared party state.
 */
export function useBattleMap(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['battle-map', campaignId],
    queryFn: async (): Promise<BattleMapState> => {
      if (!campaignId) return { map: null, displayMode: 'image' };
      const meta = await readMeta(campaignId);
      const map = (meta.battle_map as BattleMap | undefined) ?? null;
      const displayMode: DisplayMode = meta.display_mode === 'map' ? 'map' : 'image';
      return { map, displayMode };
    },
    enabled: !!campaignId,
    refetchInterval: 2000,
  });
}

export function useUpdateBattleMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, map }: { campaignId: string; map: BattleMap }) => {
      const meta = await readMeta(campaignId);
      await writeMeta(campaignId, {
        ...meta,
        battle_map: { ...map, updatedAt: new Date().toISOString() },
      });
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['battle-map', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useSetDisplayMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, mode }: { campaignId: string; mode: DisplayMode }) => {
      const meta = await readMeta(campaignId);
      await writeMeta(campaignId, { ...meta, display_mode: mode });
    },
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: ['battle-map', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['party-state', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
