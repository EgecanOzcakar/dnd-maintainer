import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Campaign, CampaignSummary } from '@/types/database';
import { CAMPAIGN_SUMMARY_COLS, CAMPAIGN_DETAIL_COLS } from '@/lib/query-columns';
import { validateSlug } from '@/lib/slug-utils';
import { setCampaignPassphrase, setCampaignUnlocked } from '@/lib/campaign-auth';

// --- Queries ---

/** A campaign list row plus the per-card counts the list view renders. */
export type CampaignListItem = CampaignSummary & {
  pcCount: number;
  npcCount: number;
  sessionCount: number;
};

type CampaignListRow = CampaignSummary & {
  sessions?: { date: string | null }[];
  characters?: { character_type: 'pc' | 'npc' }[];
};

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<CampaignListItem[]> => {
      // One round-trip for the whole list view. Previously this was 3 separate
      // queries (campaigns + a full `characters` scan + a full `sessions` scan) plus
      // the `last_activity_at` computed field running `max(sessions.date)` per row in
      // ORDER BY — a cluster of requests that piled up and hit the 57014 statement
      // timeout under load. Embed both child rows and derive everything client-side;
      // the list is small.
      const { data, error } = await supabase
        .from('campaigns')
        .select(`${CAMPAIGN_SUMMARY_COLS}, sessions(date), characters(character_type)`)
        .is('archived_at', null);
      if (error) throw error;

      const rows = (data || []) as unknown as CampaignListRow[];
      const activity = (c: CampaignListRow) =>
        (c.sessions ?? []).reduce((max, s) => (s.date && s.date > max ? s.date : max), c.created_at ?? '');

      return rows
        .map(({ sessions, characters, ...c }) => ({
          ...c,
          _activity: activity({ ...c, sessions } as CampaignListRow),
          sessionCount: sessions?.length ?? 0,
          pcCount: (characters ?? []).filter((ch) => ch.character_type !== 'npc').length,
          npcCount: (characters ?? []).filter((ch) => ch.character_type === 'npc').length,
        }))
        .sort((a, b) => (a._activity < b._activity ? 1 : -1))
        .map(({ _activity, ...c }) => c) as CampaignListItem[];
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
      queryClient.setQueryData<CampaignListItem[]>(['campaigns'], (old) =>
        old?.map((c) =>
          c.id === data.id
            ? // refresh the summary fields, carry the embedded counts across
              { ...toCampaignSummary(data), pcCount: c.pcCount, npcCount: c.npcCount, sessionCount: c.sessionCount }
            : c
        )
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
