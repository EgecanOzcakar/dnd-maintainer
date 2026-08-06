import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const envUrl= import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Detect runtime environment
export const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

// Use local port 54321 if on localhost, otherwise use the env variable (Cloudflare Tunnel URL)
export const supabaseUrl = isLocalhost 
  ? 'http://127.0.0.1:54321' 
  : envUrl;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Missing Supabase environment variables');
}

export const SUPABASE_FETCH_TIMEOUT_MS = 5000;

export function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (url, options) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options?.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    try {
      return await fetch(url, { ...options, signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        const target = typeof url === 'string' ? url : url.toString();
        throw new Error(`Supabase request to ${target} timed out after ${timeoutMs}ms`, { cause: error });
      }
      throw error;
    }
  };
}

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
  global: {
    fetch: createTimeoutFetch(SUPABASE_FETCH_TIMEOUT_MS),
  },
});
