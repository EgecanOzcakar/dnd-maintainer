import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { renderHook, waitFor, supabase, mockQueryResult, setupMockReset } from '@/test/hook-test-helpers';
import { useBattleMap } from '@/hooks/useBattleMap';
import { usePartyInitiatives } from '@/hooks/usePartyInitiatives';
import { usePartyNpcs } from '@/hooks/usePartyNpcs';
import { usePartyState, useUpdatePartyHP } from '@/hooks/usePartyState';
import { partySnapshotKey, PARTY_POLL_MS, type PartySnapshot } from '@/hooks/usePartySnapshot';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

setupMockReset();

function clientWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, Wrapper };
}

describe('shared party snapshot', () => {
  it('serves every party hook from one request pair', async () => {
    mockQueryResult.data = {
      dm_notes: JSON.stringify({
        party_npcs: ['n1'],
        party_initiatives: { campaignId: 'c1', initiatives: { p1: 12 } },
        display_mode: 'map',
      }),
    };
    const { Wrapper } = clientWrapper();

    const { result } = renderHook(
      () => ({
        state: usePartyState('c1'),
        init: usePartyInitiatives('c1'),
        npcs: usePartyNpcs('c1'),
        map: useBattleMap('c1'),
      }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.map.isSuccess).toBe(true));
    expect(result.current.npcs.data).toEqual(['n1']);
    expect(result.current.init.data?.initiatives).toEqual({ p1: 12 });
    expect(result.current.map.data?.displayMode).toBe('map');
    expect(result.current.state.data?.initiatives).toEqual({ p1: 12 });
    // campaigns (dm_notes) + characters (hp), once, not once per hook.
    expect(vi.mocked(supabase.from).mock.calls.map(([table]) => table)).toEqual(['campaigns', 'characters']);
  });

  it('polls no faster than every 5 seconds', () => {
    expect(PARTY_POLL_MS).toBeGreaterThanOrEqual(5000);
  });

  it('shows an HP change at once and rolls it back when the write fails', async () => {
    const { queryClient, Wrapper } = clientWrapper();
    queryClient.setQueryData<PartySnapshot>(partySnapshotKey('c1'), { meta: null, hp: { p1: 20 } });
    const seen: number[] = [];
    queryClient.getQueryCache().subscribe(() => {
      const hp = queryClient.getQueryData<PartySnapshot>(partySnapshotKey('c1'))?.hp.p1;
      if (hp !== undefined && seen[seen.length - 1] !== hp) seen.push(hp);
    });
    mockQueryResult.error = { message: 'write failed' };

    const { result } = renderHook(() => useUpdatePartyHP(), { wrapper: Wrapper });
    result.current.mutate({ campaignId: 'c1', hpMap: { p1: 5 } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(seen).toContain(5);
    expect(queryClient.getQueryData<PartySnapshot>(partySnapshotKey('c1'))?.hp.p1).toBe(20);
  });
});
