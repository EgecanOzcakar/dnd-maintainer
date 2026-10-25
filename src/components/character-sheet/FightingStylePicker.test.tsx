import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FightingStylePicker } from '@/components/character-sheet/FightingStylePicker';
import type { ChoiceKey } from '@/types/choices';
import type { PendingChoice } from '@/types/resolved';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const choice: Extract<PendingChoice, { type: 'fighting-style-choice' }> = {
  type: 'fighting-style-choice',
  choiceKey: 'fighting-style-choice:class:fighter:0' as ChoiceKey,
  source: { origin: 'class', id: 'fighter', level: 1 },
  count: 1,
  from: ['archery', 'defense'],
  alreadyChosen: [],
};

describe('FightingStylePicker', () => {
  it('waits for Confirm by default and marks the selected card as pressed', () => {
    const onDecide = vi.fn();
    render(<FightingStylePicker choice={choice} onDecide={onDecide} />);

    fireEvent.click(screen.getByText('fightingStyles.archery.name'));
    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByText('fightingStyles.archery.name').closest('button')?.getAttribute('aria-pressed')).toBe(
      'true'
    );

    fireEvent.click(screen.getByText('buttons.confirm'));
    expect(onDecide).toHaveBeenCalledWith(choice.choiceKey, { type: 'fighting-style-choice', styles: ['archery'] });
  });

  it('commits on selection and hides Confirm with autoCommit', () => {
    const onDecide = vi.fn();
    render(<FightingStylePicker choice={choice} onDecide={onDecide} autoCommit />);

    fireEvent.click(screen.getByText('fightingStyles.defense.name'));
    expect(onDecide).toHaveBeenCalledWith(choice.choiceKey, { type: 'fighting-style-choice', styles: ['defense'] });
    expect(screen.queryByText('buttons.confirm')).toBeNull();
  });
});
