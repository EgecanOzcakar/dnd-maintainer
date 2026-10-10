import {
  setupMockReset,
  describeListQuery,
  describeCreateMutation,
  renderHook,
  createWrapper,
} from '@/test/hook-test-helpers';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

import { useRollLog, useAddRoll } from '@/hooks/useRollLog';

const entry = {
  id: 'r1',
  campaign_id: 'camp-1',
  character_id: 'c1',
  label: 'Longsword',
  formula: '1d20+5',
  result: 17,
  detail: { rolls: [12] },
  created_at: '2026-01-01T00:00:00Z',
  characters: { name: 'Aria' },
};

setupMockReset();

describeListQuery(
  'useRollLog',
  () => renderHook(() => useRollLog('camp-1'), { wrapper: createWrapper() }),
  entry,
  () => renderHook(() => useRollLog(undefined), { wrapper: createWrapper() }),
  'campaign_id'
);

describeCreateMutation(
  'useAddRoll',
  () => renderHook(() => useAddRoll(), { wrapper: createWrapper() }),
  { campaign_id: 'camp-1', label: 'x', formula: '1d20', result: 10 },
  entry
);
