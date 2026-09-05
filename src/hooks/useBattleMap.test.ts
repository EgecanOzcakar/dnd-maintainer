import {
  renderHook,
  waitFor,
  createWrapper,
  supabase,
  mockQueryResult,
  setupMockReset,
} from '@/test/hook-test-helpers';
import { vi, describe, it, expect } from 'vitest';
import { useBattleMap, useUpdateBattleMap, useSetDisplayMode } from '@/hooks/useBattleMap';
import { createEmptyMap } from '@/lib/battle-map';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

setupMockReset();

describe('useBattleMap hooks', () => {
  it('stays disabled when campaignId is missing', () => {
    const { result } = renderHook(() => useBattleMap(undefined), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
  });

  it('reads battle_map and display_mode from campaigns.dm_notes', async () => {
    const map = createEmptyMap('Ruins');
    mockQueryResult.data = { dm_notes: JSON.stringify({ battle_map: map, display_mode: 'map' }) };

    const { result } = renderHook(() => useBattleMap('c1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.displayMode).toBe('map');
    expect(result.current.data?.map?.name).toBe('Ruins');
  });

  it('writes the map via useUpdateBattleMap', async () => {
    mockQueryResult.data = { dm_notes: null };
    const { result } = renderHook(() => useUpdateBattleMap(), { wrapper: createWrapper() });

    await result.current.mutateAsync({ campaignId: 'c1', map: createEmptyMap('Camp') });

    expect(supabase.update).toHaveBeenCalledWith({
      dm_notes: expect.stringContaining('"battle_map"'),
      updated_at: expect.any(String),
    });
  });

  it('writes display mode via useSetDisplayMode', async () => {
    mockQueryResult.data = { dm_notes: JSON.stringify({ shared_image: null }) };
    const { result } = renderHook(() => useSetDisplayMode(), { wrapper: createWrapper() });

    await result.current.mutateAsync({ campaignId: 'c1', mode: 'map' });

    expect(supabase.update).toHaveBeenCalledWith({
      dm_notes: expect.stringContaining('"display_mode":"map"'),
      updated_at: expect.any(String),
    });
  });
});
