import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavingThrowsPanel } from '@/components/character-sheet/SavingThrowsPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key.split('.').pop() ?? key,
  }),
}));

const sampleSavingThrows = {
  str: { bonus: 3, proficient: true, breakdown: [{ type: 'ability', label: 'str', value: 2 }, { type: 'proficiency', label: 'pb', value: 1 }] },
  dex: { bonus: 5, proficient: false, breakdown: [{ type: 'ability', label: 'dex', value: 5 }] },
  con: { bonus: 2, proficient: true, breakdown: [{ type: 'ability', label: 'con', value: 1 }, { type: 'proficiency', label: 'pb', value: 1 }] },
  int: { bonus: 0, proficient: false, breakdown: [] },
  wis: { bonus: 1, proficient: false, breakdown: [] },
  cha: { bonus: -1, proficient: false, breakdown: [] },
};

describe('SavingThrowsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders saving throws list with bonuses', () => {
    render(<SavingThrowsPanel savingThrows={sampleSavingThrows as any} buildError={null} />);
    expect(screen.getByText('str')).toBeInTheDocument();
    expect(screen.getByText('dex')).toBeInTheDocument();
  });

  it('triggers onSelectRollPreset when a saving throw row or roll button is clicked', () => {
    const mockSelectPreset = vi.fn();
    render(
      <SavingThrowsPanel
        savingThrows={sampleSavingThrows as any}
        buildError={null}
        onSelectRollPreset={mockSelectPreset}
      />
    );

    const rollBtns = screen.getAllByTitle(/Roll.*Saving Throw/i);
    expect(rollBtns.length).toBeGreaterThan(0);

    fireEvent.click(rollBtns[0]);

    expect(mockSelectPreset).toHaveBeenCalledWith({
      die: 20,
      count: 1,
      modifier: 3,
      contextLabel: 'Save: str (+3)',
    });
  });
});
