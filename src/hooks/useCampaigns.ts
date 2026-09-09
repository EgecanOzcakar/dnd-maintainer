import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignSummary } from '@/types/database';
import { CAMPAIGN_SUMMARY_COLS, CAMPAIGN_DETAIL_COLS } from '@/lib/query-columns';
import { validateSlug } from '@/lib/slug-utils';
import { setCampaignPassphrase, setCampaignUnlocked } from '@/lib/campaign-auth';

// --- Queries ---

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      // Sort by most-recent session date, falling back to created_at, so non-activity
      // edits like theme changes don't reorder the list. The old `last_activity_at`
      // PostgREST computed field ran `max(sessions.date)` as a per-row subquery — in
      // both ORDER BY *and* the select list — and was hitting the statement timeout
      // (57014) under load. Embed the session dates instead (one indexed join) and
      // reduce to a max client-side; the list is small.
      const { data, error } = await supabase
        .from('campaigns')
        .select(`${CAMPAIGN_SUMMARY_COLS}, sessions(date)`)
        .is('archived_at', null);
      if (error) throw error;
      const rows = (data || []) as unknown as (CampaignSummary & { sessions?: { date: string | null }[] })[];
      const activity = (c: (typeof rows)[number]) =>
        (c.sessions ?? []).reduce((max, s) => (s.date && s.date > max ? s.date : max), c.created_at ?? '');
      rows.sort((a, b) => (activity(a) < activity(b) ? 1 : -1));
      return rows.map(({ sessions: _sessions, ...c }) => c) as CampaignSummary[];
    },
  });
}

export function useCampaign(slug: string | undefined) {
  return useQuery({
    queryKey: ['campaign', slug],
    queryFn: async () => {
      const safe = validateSlug(slug!);
      // Two single-index lookups instead of one `slug = ? OR previous_slugs @> ?`.
      // The OR forces the planner into a BitmapOr (or a seq scan) across the btree
      // and GIN indexes, which was hitting the statement timeout under load. The
      // current slug is the common case; previous_slugs is only checked on a miss
      // (i.e. an old URL after a rename).
      const current = await supabase.from('campaigns').select(CAMPAIGN_DETAIL_COLS).eq('slug', safe).maybeSingle();
      if (current.error) throw current.error;
      if (current.data) return current.data as unknown as Campaign;

      const renamed = await supabase
        .from('campaigns')
        .select(CAMPAIGN_DETAIL_COLS)
        .contains('previous_slugs', [safe])
        .single();
      if (renamed.error) throw renamed.error;
      return renamed.data as unknown as Campaign;
    },
    enabled: !!slug,
  });
}

// --- Mutations ---

/** Project a full campaign row down to the summary shape held in the list cache. */
function toCampaignSummary(c: Campaign): CampaignSummary {
  return {
    id: c.id,
    slug: c.slug,
    previous_slugs: c.previous_slugs,
    name: c.name,
    description: c.description,
    setting: c.setting,
    status: c.status,
    theme: c.theme,
    created_at: c.created_at,
    updated_at: c.updated_at,
    archived_at: c.archived_at,
    is_demo: c.is_demo,
  };
}

export function useCampaignMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['campaigns'] });

  const create = useMutation({
    mutationFn: async ({
      passphrase,
      ...campaign
    }: {
      name: string;
      setting?: string;
      description?: string;
      passphrase?: string;
    }) => {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({ ...campaign, status: 'planning' })
        .select()
        .single();
      if (error) throw error;
      if (passphrase && passphrase.trim()) {
        await setCampaignPassphrase(data.id, passphrase.trim());
      }
      setCampaignUnlocked(data.id, data.slug);
      return data as Campaign;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Campaign> & { id: string }) => {
      const { data, error } = await supabase.from('campaigns').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as Campaign;
    },
    // Capture the campaign's slug before the write so onSuccess can tell whether a
    // rename changed it (a rename moves the slug; the page may still be keyed on the
    // old one, reachable via previous_slugs).
    onMutate: ({ id }) => {
      const entry = queryClient
        .getQueriesData<Campaign>({ queryKey: ['campaign'] })
        .find(([, cached]) => cached?.id === id);
      return { previousSlug: entry?.[1]?.slug };
    },
    onSuccess: (data, _variables, context) => {
      // The PATCH returns the full updated row, so refresh the caches in place rather
      // than refetching. List order is keyed on the `last_activity_at` computed field,
      // not `updated_at`, so a metadata edit never reorders the list — only its fields.
      queryClient.setQueryData(['campaign', data.slug], data);
      queryClient.setQueryData<CampaignSummary[]>(['campaigns'], (old) =>
        old?.map((c) => (c.id === data.id ? toCampaignSummary(data) : c))
      );
      // On rename, also refresh the old-slug detail entry so a page still mounted on it
      // shows the new data without a round-trip (the old slug now resolves to this row).
      const { previousSlug } = context ?? {};
      if (previousSlug && previousSlug !== data.slug) {
        queryClient.setQueryData(['campaign', previousSlug], data);
      }
    },
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').update({ archived_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, archive };
}
