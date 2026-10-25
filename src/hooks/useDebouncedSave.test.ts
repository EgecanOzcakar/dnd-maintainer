import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';

describe('useDebouncedSave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('merges patches and saves once after the delay', () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave<{ a?: number; b?: number }>(save, 1000));
    act(() => {
      result.current.schedule({ a: 1 });
      result.current.schedule({ b: 2 });
    });
    expect(save).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ a: 1, b: 2 });
  });

  it('flushes the pending patch on unmount', () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedSave<{ a: number }>(save, 1000));
    act(() => result.current.schedule({ a: 1 }));
    unmount();
    expect(save).toHaveBeenCalledWith({ a: 1 });
  });

  it('flushes when the tab is hidden', () => {
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave<{ a: number }>(save, 1000));
    act(() => result.current.schedule({ a: 1 }));
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(save).toHaveBeenCalledWith({ a: 1 });
  });

  it('cancel drops the pending patch', () => {
    const save = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedSave<{ a: number }>(save, 1000));
    act(() => result.current.schedule({ a: 1 }));
    act(() => result.current.cancel());
    unmount();
    expect(save).not.toHaveBeenCalled();
  });
});
