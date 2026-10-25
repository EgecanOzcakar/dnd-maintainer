import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditTextDialog } from '@/components/character-sheet/edit-dialogs/EditTextDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').pop() }),
}));

function setup() {
  const onClose = vi.fn();
  const onSave = vi.fn();
  render(
    <EditTextDialog title="Backstory" field="backstory" value="old" onSave={onSave} onClose={onClose} saving={false} />
  );
  return { onClose, onSave };
}

describe('edit dialogs close guard', () => {
  it('closes straight away when nothing changed', () => {
    const { onClose } = setup();

    fireEvent.click(screen.getByText('cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('asks before throwing away edits, and can keep editing', () => {
    const { onClose } = setup();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new text' } });
    fireEvent.click(screen.getByText('cancel'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('discardPrompt')).toBeTruthy();

    fireEvent.click(screen.getByText('keepEditing'));
    expect(screen.queryByText('discardPrompt')).toBeNull();

    fireEvent.click(screen.getByText('cancel'));
    fireEvent.click(screen.getByText('discard'));
    expect(onClose).toHaveBeenCalled();
  });
});
