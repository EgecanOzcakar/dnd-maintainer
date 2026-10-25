import {
  renderHook,
  waitFor,
  createWrapper,
  supabase,
  mockQueryResult,
  setupMockReset,
} from '@/test/hook-test-helpers';
import { vi, describe, it, expect } from 'vitest';
import { applyNpcChange, usePartyNpcs, useUpdatePartyNpcs } from '@/hooks/usePartyNpcs';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

setupMockReset();

describe('applyNpcChange', () => {
  it.each([
    [['a'], { add: 'b' }, ['a', 'b']],
    [['a', 'b'], { remove: 'a' }, ['b']],
    [['a'], { add: 'a' }, ['a']],
    [undefined, { add: 'x' }, ['x']],
    [['a', 'b'], { npcIds: ['c', 'c'] }, ['c']],
    ['garbage', { remove: 'a' }, []],
  ])('from %j applying %j gives %j', (current, change, expected) => {
    expect(applyNpcChange(current, change)).toEqual(expected);
  });
});

describe('usePartyNpcs hooks', () => {
  it('reads the NPC ids from the shared party snapshot', async () => {
    mockQueryResult.data = { dm_notes: JSON.stringify({ party_npcs: ['n1', 7, 'n2'] }) };

    const { result } = renderHook(() => usePartyNpcs('c1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(['n1', 'n2']);
  });

  it('applies a one-NPC delta to the freshly read list instead of overwriting it', async () => {
    // Another tab already added n2; this tab only knows about n1 and adds n3.
    mockQueryResult.data = { dm_notes: JSON.stringify({ party_npcs: ['n1', 'n2'] }) };
    const { result } = renderHook(() => useUpdatePartyNpcs(), { wrapper: createWrapper() });

    await result.current.mutateAsync({ campaignId: 'c1', add: 'n3' });

    const written = vi.mocked(supabase.update).mock.calls[0][0] as { dm_notes: string };
    expect(JSON.parse(written.dm_notes).party_npcs).toEqual(['n1', 'n2', 'n3']);
  });
});
