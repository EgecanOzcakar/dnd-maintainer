import { useQuery, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * One shared poll for everything the party views need: the DM's `campaigns.dm_notes` blob
 * (initiatives, NPCs, roll log, shared image, battle map) plus current HP from `characters`.
 * `usePartyState`, `usePartyInitiatives`, `usePartyNpcs` and `useBattleMap` all derive their data
 * from this single query with `select`, so N consumers cost one request pair per tick instead of N.
 */
export interface PartySnapshot {
  meta: Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
  hp: Record<string, number>;
}

/** No realtime in this project; TanStack already pauses interval polling while the tab is in the background. */
export const PARTY_POLL_MS = 5000;

export const partySnapshotKey = (campaignId: string | undefined) => ['party-snapshot', campaignId] as const;

export function invalidatePartySnapshot(queryClient: QueryClient, campaignId: string) {
  return queryClient.invalidateQueries({ queryKey: partySnapshotKey(campaignId) });
}

function parseMeta(raw: unknown): PartySnapshot['meta'] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchSnapshot(campaignId: string): Promise<PartySnapshot> {
  // HP lives on characters.current_hp (single source of truth); fetched in the same poll tick.
  const [notesRes, hpRes] = await Promise.all([
    supabase.from('campaigns').select('dm_notes').eq('id', campaignId).single(),
    supabase.from('characters').select('id, current_hp').eq('campaign_id', campaignId).not('current_hp', 'is', null),
  ]);
  if (notesRes.error) throw notesRes.error;
  if (hpRes.error) throw hpRes.error;

  const hp: Record<string, number> = {};
  if (Array.isArray(hpRes.data)) {
    for (const row of hpRes.data) if (row.current_hp != null) hp[row.id] = row.current_hp;
  }
  return { meta: parseMeta(notesRes.data?.dm_notes), hp };
}

export function usePartySnapshot<T>(campaignId: string | undefined, select: (snapshot: PartySnapshot) => T) {
  return useQuery({
    queryKey: partySnapshotKey(campaignId),
    queryFn: () => fetchSnapshot(campaignId!),
    select,
    enabled: !!campaignId,
    refetchInterval: PARTY_POLL_MS,
    // Catch up immediately when the tab regains focus instead of waiting for the next tick.
    refetchOnWindowFocus: true,
    staleTime: PARTY_POLL_MS / 2,
  });
}
