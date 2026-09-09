/**
 * Regression "stress" tests for the Sept 2026 `57014 canceling statement due to
 * statement timeout` incident on the campaigns list.
 *
 * Root causes and the fix each test guards:
 *  1. List ordered by the `last_activity_at` PostgREST computed field, which ran
 *     `max(sessions.date)` once per row.        -> embedded `sessions(date)` + client-side sort
 *  2. The list VIEW fired 3 queries: campaigns + a full `characters` scan + a full
 *     `sessions` scan.                          -> one query with embedded child rows
 *  3. `useCampaign` used `slug = ? OR previous_slugs @> ?` (BitmapOr / seq scan).  -> two single-index lookups
 *  4. `retry: 2` re-fired every failing query three times.                         -> `retry: 1`
 *  5. `refetchOnWindowFocus` refetched the whole persisted cache on every tab
 *     refocus — the storm's main amplifier.     -> `refetchOnWindowFocus: false`
 *
 * These run against the REAL `queryClient` (not the permissive test wrapper) so the
 * config guardrails actually mean something.
 */
import { setupMockReset, renderHook, waitFor, supabase, mockQueryResult } from '@/test/hook-test-helpers';

vi.mock('@/lib/supabase', () => import('@/test/mocks/supabase'));

import { createElement, type ReactNode } from 'react';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/ThemeProvider';
import { queryClient } from '@/lib/query-client';
import { useCampaigns, useCampaign } from '@/hooks/useCampaigns';

const Wrapper = ({ children }: { children: ReactNode }): ReactNode =>
  createElement(ThemeProvider, null, createElement(QueryClientProvider, { client: queryClient }, children));

setupMockReset();
beforeEach(() => queryClient.clear());
afterAll(() => queryClient.clear());

type Row = Record<string, unknown>;
const campaignRow = (id: string, extra: Row = {}): Row => ({
  id,
  slug: id,
  previous_slugs: [],
  name: id,
  description: null,
  setting: null,
  status: 'active',
  theme: null,
  archived_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  sessions: [],
  characters: [],
  ...extra,
});

const fromCalls = (table: string) => vi.mocked(supabase.from).mock.calls.filter((c) => c[0] === table).length;

describe('57014 incident — client config guardrails', () => {
  it('retries a failing query at most once', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
  });

  it('does not refetch every query on window refocus', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });

  it('keeps data fresh long enough that a cache rehydration does not trigger a refetch storm', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime as number).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });
});

describe('57014 incident — campaign list is one cheap round-trip', () => {
  it('loads the whole list view (campaigns + per-card counts) in a single query', async () => {
    mockQueryResult.data = [
      campaignRow('a', {
        sessions: [{ date: '2024-03-01' }],
        characters: [{ character_type: 'pc' }, { character_type: 'npc' }],
      }),
    ];

    const { result } = renderHook(() => useCampaigns(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fromCalls('campaigns')).toBe(1);
    expect(fromCalls('characters')).toBe(0); // embedded, not a separate full-table scan
    expect(fromCalls('sessions')).toBe(0);
    expect(result.current.data![0]).toMatchObject({ pcCount: 1, npcCount: 1, sessionCount: 1 });
  });

  it('never orders by, nor selects, the `last_activity_at` computed field', async () => {
    mockQueryResult.data = [campaignRow('a')];
    renderHook(() => useCampaigns(), { wrapper: Wrapper });
    await waitFor(() => expect(supabase.select).toHaveBeenCalled());

    const selectArg = String(vi.mocked(supabase.select).mock.calls[0][0]);
    expect(selectArg).not.toMatch(/last_activity_at/);
    expect(vi.mocked(supabase.order)).not.toHaveBeenCalledWith('last_activity_at', expect.anything());
  });

  it('sorts hundreds of campaigns client-side and still returns them newest-activity first', async () => {
    const rows = Array.from({ length: 300 }, (_, i) =>
      campaignRow(`c${i}`, {
        sessions: Array.from({ length: 20 }, (_, j) => ({
          date: `2024-${String((j % 12) + 1).padStart(2, '0')}-01`,
        })),
      })
    );
    (rows[137].sessions as Row[]).push({ date: '2030-01-01' }); // clearly the latest activity
    mockQueryResult.data = rows;

    const { result } = renderHook(() => useCampaigns(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!).toHaveLength(300);
    expect(result.current.data![0].id).toBe('c137');
  });
});

describe('57014 incident — no OR-scan on campaign lookup', () => {
  it('useCampaign uses single-index lookups, never `.or()`', async () => {
    mockQueryResult.data = campaignRow('demo');

    const { result } = renderHook(() => useCampaign('demo'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(vi.mocked(supabase.or)).not.toHaveBeenCalled();
    expect(vi.mocked(supabase.eq)).toHaveBeenCalledWith('slug', 'demo');
  });
});

describe('57014 incident — fan-out and refocus do not stampede', () => {
  it('20 components sharing campaign data trigger ONE fetch, and a refocus adds none', async () => {
    mockQueryResult.data = [campaignRow('a')];

    const hooks = Array.from({ length: 20 }, () => renderHook(() => useCampaigns(), { wrapper: Wrapper }));
    await waitFor(() => expect(hooks[0].result.current.isSuccess).toBe(true));
    expect(fromCalls('campaigns')).toBe(1); // in-flight request dedup

    focusManager.setFocused(false);
    focusManager.setFocused(true);
    await new Promise((r) => setTimeout(r, 50));

    expect(fromCalls('campaigns')).toBe(1); // refetchOnWindowFocus: false held the line
    focusManager.setFocused(undefined); // hand focus tracking back to the browser
  });

  it('a failing list query retries once, not twice', async () => {
    mockQueryResult.error = { message: 'canceling statement due to statement timeout', code: '57014' };

    const { result } = renderHook(() => useCampaigns(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 4000 });

    expect(fromCalls('campaigns')).toBe(2); // initial attempt + exactly one retry
  });
});
