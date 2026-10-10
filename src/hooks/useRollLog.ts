import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/supabase';

export interface RollLogEntry {
  id: string;
  campaign_id: string;
  character_id: string | null;
  label: string | null;
  formula: string | null;
  result: number | null;
  detail: { rolls?: number[]; kept?: number[]; natural?: 'nat20' | 'nat1' | null } | null;
  created_at: string | null;
  characters: { name: string } | null;
}

export function useRollLog(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['roll-log', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roll_log')
        .select('*, characters(name)')
        .eq('campaign_id', campaignId as string)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as RollLogEntry[];
    },
    enabled: !!campaignId,
    refetchInterval: 5000, // no realtime in this project; 5s poll of <=50 small rows
  });
}

export function useAddRoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roll: TablesInsert<'roll_log'>) => {
      const { data, error } = await supabase.from('roll_log').insert(roll).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => queryClient.invalidateQueries({ queryKey: ['roll-log', vars.campaign_id] }),
  });
}
