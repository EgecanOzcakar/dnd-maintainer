import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').pop() ?? key,
  }),
}));

const sampleSavingThrows = {
  str: {
    bonus: 3,
    proficient: true,
    breakdown: [
      { type: 'ability', label: 'str', value: 2 },
      { type: 'proficiency', label: 'pb', value: 1 },
    ],
  },
  dex: { bonus: 5, proficient: false, breakdown: [{ type: 'ability', label: 'dex', value: 5 }] },
  con: {
    bonus: 2,
    proficient: true,
    breakdown: [
      { type: 'ability', label: 'con', value: 1 },
      { type: 'proficiency', label: 'pb', value: 1 },
    ],
  },
  int: { bonus: 0, proficient: false, breakdown: [] },
  wis: { bonus: 1, proficient: false, breakdown: [] },
  cha: { bonus: -1, proficient: false, breakdown: [] },
};

describe('SavingThrowsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders saving throws list with bonuses', () => {
    render(<SavingThrowsPanel savingThrows={sampleSavingThrows as never} buildError={null} />);
    expect(screen.getByText('str')).toBeInTheDocument();
    expect(screen.getByText('dex')).toBeInTheDocument();
  });

  it('triggers onSelectRollPreset when a saving throw row or roll button is clicked', () => {
    const mockSelectPreset = vi.fn();
    render(
      <SavingThrowsPanel
        savingThrows={sampleSavingThrows as never}
        buildError={null}
        onSelectRollPreset={mockSelectPreset}
      />
    );

    const rollBtns = screen.getAllByRole('button', { name: /^roll$/i });
    expect(rollBtns.length).toBeGreaterThan(0);

    fireEvent.click(rollBtns[0]);

    expect(mockSelectPreset).toHaveBeenCalledWith(
      expect.objectContaining({ die: 20, count: 1, modifier: 3, contextLabel: 'Save: str (+3)', mode: null })
    );
  });

  it('rolls with the active-effect bonus, advantage and extra dice', () => {
    const mockSelectPreset = vi.fn();
    render(
      <SavingThrowsPanel
        savingThrows={sampleSavingThrows as never}
        buildError={null}
        onSelectRollPreset={mockSelectPreset}
        effects={
          {
            str: {
              bonus: 1,
              mode: 'adv',
              extra: ['+1d4'],
              parts: [{ type: 'exhaustion', label: 'exhaustion', value: -2 }],
            },
          } as never
        }
      />
    );
    fireEvent.click(screen.getAllByRole('button', { name: /^roll$/i })[0]);
    expect(mockSelectPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        modifier: 1,
        mode: 'adv',
        extra: ['+1d4'],
        // printed 3, effects bring it to 1: the -2 is listed as its own term
        breakdown: expect.arrayContaining([expect.objectContaining({ value: '-2' })]),
      })
    );
  });
});
