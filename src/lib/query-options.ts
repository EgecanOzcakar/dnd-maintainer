/**
 * Options for lists several people edit at the table (sessions, notes, campaigns): fresh enough to
 * show a co-DM's change when the tab regains focus, without the global default's 15-minute staleness
 * or a refetch on every focus (staleTime still gates it).
 */
export const SHARED_LIST_QUERY = {
  staleTime: 60_000,
  refetchOnWindowFocus: true,
} as const;
