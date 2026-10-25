import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CustomModifiersPanel } from '@/components/character-sheet/CustomModifiersPanel';

describe('CustomModifiersPanel', () => {
  it('detects a modifier in pasted text and adds it only once approved', () => {
    const onChange = vi.fn();
    render(<CustomModifiersPanel onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('customModifiers.text'), {
      target: { value: 'You gain a +1 bonus to all saving throws.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.detect' }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'customModifiers.addApproved' }));
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        enabled: true,
        grants: [expect.objectContaining({ type: 'roll-modifier', target: 'save', bonus: 1 })],
      }),
    ]);
  });

  it('toggles and removes a modifier', () => {
    const onChange = vi.fn();
    const mod = { id: 'a', label: '+1 to save', enabled: true, grants: [] };
    render(<CustomModifiersPanel modifiers={[mod]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('customModifiers.toggle'));
    expect(onChange).toHaveBeenLastCalledWith([{ ...mod, enabled: false }]);
    fireEvent.click(screen.getByLabelText('customModifiers.remove'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
