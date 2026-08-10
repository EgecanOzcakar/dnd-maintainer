import { renderHook, waitFor, createWrapper, setupMockReset } from '@/test/hook-test-helpers';
import { vi, describe, it, expect } from 'vitest';
import { usePartyCharacterStats } from '@/hooks/usePartyCharacterStats';
import type { CharacterSummary } from '@/types/database';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

setupMockReset();

describe('usePartyCharacterStats hook', () => {
  const dummyPcs: CharacterSummary[] = [
    {
      id: 'pc1',
      slug: 'thorin',
      previous_slugs: [],
      campaign_id: 'c1',
      name: 'Thorin',
      player_name: 'Alice',
      character_type: 'pc',
      species: 'dwarf',
      background: 'soldier',
      class: 'fighter',
      subclass: 'champion',
      level: 3,
      hit_points_max: 28,
      armor_class: 16,
      conditions: [],
      portrait_url: null,
      status: 'ready',
      updated_at: '2026-08-07T12:00:00Z',
    },
  ];

  it('returns empty object when campaignId is undefined or pcs is empty', async () => {
    const { result } = renderHook(() => usePartyCharacterStats(undefined, dummyPcs), { wrapper: createWrapper() });
    expect(result.current.data).toBeUndefined();

    const { result: emptyPcsResult } = renderHook(() => usePartyCharacterStats('c1', []), { wrapper: createWrapper() });
    expect(emptyPcsResult.current.data).toBeUndefined();
  });

  it('calculates passive perception, wisdom, and intelligence stats for party characters', async () => {
    const { result } = renderHook(() => usePartyCharacterStats('c1', dummyPcs), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pc1).toEqual({
      characterId: 'pc1',
      wisScore: expect.any(Number),
      wisMod: expect.any(Number),
      intScore: expect.any(Number),
      intMod: expect.any(Number),
      perceptionBonus: expect.any(Number),
      passivePerception: expect.any(Number),
      passiveWisdom: expect.any(Number),
      passiveIntelligence: expect.any(Number),
      perceptionProficient: expect.any(Boolean),
      perceptionExpertise: expect.any(Boolean),
    });
  });
});
