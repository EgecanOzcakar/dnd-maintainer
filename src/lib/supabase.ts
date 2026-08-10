import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const envUrl= import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

// Detect runtime environment
export const isLocalhost = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1';

const isLocalOrPrivateUrl = (url?: string) => {
  if (!url) return true;
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes('192.168.') ||
    url.includes('10.') ||
    url.includes('172.16.')
  );
};

// Use direct local port if on localhost, and fallback to window.location.origin 
// when accessed remotely over ngrok/tunnels so requests are proxied by Vite.
export const supabaseUrl = isLocalhost 
  ? (envUrl || 'http://127.0.0.1:54321') 
  : (!isLocalOrPrivateUrl(envUrl) ? envUrl : window.location.origin);

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
