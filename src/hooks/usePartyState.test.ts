import { renderHook, waitFor, createWrapper, supabase, mockQueryResult, setupMockReset } from '@/test/hook-test-helpers';
import { vi, describe, it, expect } from 'vitest';
import { usePartyState, useUpdatePartyHP, useRecordCharacterRoll } from '@/hooks/usePartyState';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

setupMockReset();

describe('usePartyState hooks', () => {
  it('fetches null when campaignId is empty', async () => {
    const { result } = renderHook(() => usePartyState(undefined), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();
  });

  it('fetches parsed party state from campaigns.dm_notes', async () => {
    const sampleDmNotes = JSON.stringify({
      party_initiatives: { campaignId: 'c1', initiatives: { char1: 18 } },
      party_hp: { campaignId: 'c1', hpMap: { char1: 25 } },
      character_rolls: { campaignId: 'c1', rollsMap: { char1: { formula: '1d20+3', total: 18, rolls: [15], modifier: 3, timestamp: '2026-08-06T12:00:00Z' } } },
    });

    mockQueryResult.data = { dm_notes: sampleDmNotes };

    const { result } = renderHook(() => usePartyState('c1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      campaignId: 'c1',
      initiatives: { char1: 18 },
      hp: { char1: 25 },
      lastRolls: {
        char1: { formula: '1d20+3', total: 18, rolls: [15], modifier: 3, timestamp: '2026-08-06T12:00:00Z' },
      },
      displayImage: null,
      updatedAt: expect.any(String),
    });
  });

  it('updates party HP via useUpdatePartyHP mutation', async () => {
    mockQueryResult.data = { dm_notes: JSON.stringify({ party_hp: { hpMap: { char1: 20 } } }) };

    const { result } = renderHook(() => useUpdatePartyHP(), { wrapper: createWrapper() });

    await result.current.mutateAsync({ campaignId: 'c1', hpMap: { char1: 15, char2: 30 } });

    expect(supabase.update).toHaveBeenCalledWith({
      dm_notes: expect.stringContaining('"char1":15'),
      updated_at: expect.any(String),
    });
  });

  it('records character roll via useRecordCharacterRoll mutation', async () => {
    mockQueryResult.data = { dm_notes: null };

    const { result } = renderHook(() => useRecordCharacterRoll(), { wrapper: createWrapper() });

    await result.current.mutateAsync({
      campaignId: 'c1',
      characterId: 'char1',
      roll: { formula: '2d6+3', total: 11, rolls: [4, 4], modifier: 3 },
    });

    expect(supabase.update).toHaveBeenCalledWith({
      dm_notes: expect.stringContaining('"formula":"2d6+3"'),
      updated_at: expect.any(String),
    });
  });
});
