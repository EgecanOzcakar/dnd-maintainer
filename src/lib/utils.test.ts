import { cn, parseIntOrDefault, todayLocal } from '@/lib/utils';

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('handles conditional and falsy values', () => {
    const condA = false;
    const condB = 0;
    expect(cn('foo', condA && 'bar', null, undefined, condB && 'baz')).toBe('foo');
  });

  it('resolves Tailwind conflicts — last value wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('returns empty string for empty input', () => {
    expect(cn()).toBe('');
  });
});

describe('parseIntOrDefault', () => {
  it.each([
    ['42', 0, 42],
    ['1', 0, 1],
    ['-5', 0, -5],
    ['0', 1, 0],
    ['3.7', 0, 3],
    ['', 1, 1],
    [' ', 1, 1],
    ['abc', 99, 99],
  ])('parseIntOrDefault(%j, %i) returns %i', (value, defaultValue, expected) => {
    expect(parseIntOrDefault(value, defaultValue)).toBe(expected);
  });
});

describe('todayLocal', () => {
  it('uses the local calendar date, not UTC', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 23, 30)); // local 23:30 — already the next day in UTC for UTC- zones
    expect(todayLocal()).toBe('2026-01-05');
    vi.useRealTimers();
  });
});
