import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// JSON.parse keeps the last of two identical keys, so a duplicate (easy to get from a
// merge) silently drops an entry. Scan tokens instead: every string literal is consumed
// (so braces inside values don't count) and only a string followed by ':' is a key.
function duplicateKeys(json: string): string[] {
  const dups: string[] = [];
  const stack: Set<string>[] = [];
  const re = /"((?:[^"\\]|\\.)*)"(\s*:)?|[{}]/g;
  for (const m of json.matchAll(re)) {
    if (m[0] === '{') stack.push(new Set());
    else if (m[0] === '}') stack.pop();
    else if (m[2]) {
      const seen = stack[stack.length - 1];
      if (seen.has(m[1])) dups.push(m[1]);
      seen.add(m[1]);
    }
  }
  return dups;
}

describe.each(['common', 'gamedata'])('src/locales/en/%s.json', (ns) => {
  it('has no duplicate keys', () => {
    expect(duplicateKeys(readFileSync(`src/locales/en/${ns}.json`, 'utf8'))).toEqual([]);
  });
});
