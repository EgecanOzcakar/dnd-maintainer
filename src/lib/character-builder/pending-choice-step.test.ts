import { describe, expect, it } from 'vitest';
import { pendingChoiceStep } from '@/lib/character-builder/pending-choice-step';
import type { PendingChoice } from '@/types/resolved';

const source = { origin: 'class', id: 'fighter', level: 1 };
const choiceKey = 'class:fighter:skill-choice:0';

describe('pendingChoiceStep', () => {
  it.each([
    [{ type: 'skill-choice', category: 'skill', count: 2, from: null }, 'details'],
    [{ type: 'subclass', classId: 'fighter' }, 'class'],
    [{ type: 'bundle-choice', category: 'armor', bundleIds: [] }, 'equipment'],
    [{ type: 'feat-choice', from: null, category: 'origin' }, 'origin'],
    [{ type: 'asi', points: 2, from: null }, 'abilities'],
  ])('maps %# to its step', (partial, step) => {
    expect(pendingChoiceStep({ choiceKey, source, ...partial } as unknown as PendingChoice)).toBe(step);
  });
});
