import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import i18next from 'i18next';
import { toast } from 'sonner';
import { getLogger } from '@/lib/logger';

const logger = getLogger('query-client');

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      // One retry, not two: a slow query that hits the statement timeout should not
      // be re-fired three times per mount — that turned a single slow query into a
      // pile-up that saturated the DB.
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        toast.error(i18next.t('errors.saveFailed', { ns: 'common' }));
        logger.error('Mutation failed:', error);
      },
    },
  },
});

const IDB_KEY = 'dnd-query-cache';

// Offline read cache: persists the query cache to IndexedDB so previously loaded
// data (campaigns, characters, sessions, ...) stays visible without a connection.
// Bump `buster` when the cached shape changes to force a clean slate.
export const queryPersister = createAsyncStoragePersister({
  key: IDB_KEY,
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
  throttleTime: 1000,
});

export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
export const PERSIST_BUSTER = 'v1';
