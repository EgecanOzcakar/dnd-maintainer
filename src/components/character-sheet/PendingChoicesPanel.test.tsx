import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingChoicesPanel } from '@/components/character-sheet/PendingChoicesPanel';
import type { ChoiceKey } from '@/types/choices';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').pop(),
  }),
}));

const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (m: string) => mockToastSuccess(m) } }));

let pending: readonly { choiceKey: ChoiceKey; type: string }[];
let hasResolved = true;

vi.mock('@/hooks/useCharacterContext', () => ({
  useCharacterContext: () => ({
    resolved: hasResolved ? { pendingChoices: pending } : null,
    build: { choices: {} },
    bundles: [],
    makeChoice: vi.fn(),
    clearChoice: vi.fn(),
  }),
}));

vi.mock('@/lib/use-all-choice-grants', () => ({
  useAllChoiceGrants: () => pending,
}));

vi.mock('@/components/character-builder/ChoicePicker', () => ({
  ChoicePicker: ({ choice }: { choice: { type: string } }) => <div data-testid="picker">{choice.type}</div>,
}));

const skillChoice = { choiceKey: 'skill-choice:class:fighter:0' as ChoiceKey, type: 'skill-choice' };

describe('PendingChoicesPanel', () => {
  beforeEach(() => {
    pending = [skillChoice];
    hasResolved = true;
    mockToastSuccess.mockClear();
  });

  it('shows a compact banner and only opens the pickers on request', () => {
    render(<PendingChoicesPanel />);

    expect(screen.getByText('title')).toBeTruthy();
    expect(screen.queryByTestId('picker')).toBeNull();

    fireEvent.click(screen.getByText('resolve'));
    expect(screen.getByTestId('picker')).toBeTruthy();
  });

  it('renders nothing when no choices are pending', () => {
    pending = [];
    const { container } = render(<PendingChoicesPanel />);
    expect(container.firstChild).toBeNull();
  });

  it('toasts once the last pending choice is resolved', () => {
    const { rerender } = render(<PendingChoicesPanel />);
    expect(mockToastSuccess).not.toHaveBeenCalled();

    pending = [];
    rerender(<PendingChoicesPanel />);
    expect(mockToastSuccess).toHaveBeenCalledWith('allDone');
  });

  it('does not toast when resolved is only transiently unavailable', () => {
    const { rerender } = render(<PendingChoicesPanel />);

    hasResolved = false;
    rerender(<PendingChoicesPanel />);
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
