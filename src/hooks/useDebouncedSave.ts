import { useCallback, useEffect, useRef } from 'react';

/**
 * Debounced autosave that merges pending patches and never drops them: the pending patch is flushed
 * on unmount, when the tab is hidden and on `beforeunload`, as well as on demand via `flush()`.
 */
export function useDebouncedSave<T extends object>(save: (patch: T) => void, delay = 3000) {
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(() => {
    clear();
    const patch = pending.current;
    pending.current = null;
    if (patch) saveRef.current(patch);
  }, [clear]);

  const schedule = useCallback(
    (patch: T) => {
      pending.current = { ...pending.current, ...patch };
      clear();
      timer.current = setTimeout(flush, delay);
    },
    [clear, flush, delay]
  );

  /** Drop the pending patch (e.g. after an explicit full save). */
  const cancel = useCallback(() => {
    clear();
    pending.current = null;
  }, [clear]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, [flush]);

  return { schedule, flush, cancel };
}
