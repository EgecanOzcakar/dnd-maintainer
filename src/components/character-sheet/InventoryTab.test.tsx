import { fireEvent, render, screen } from '@testing-library/react';
import { InventoryTab } from './InventoryTab';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  addMutate: vi.fn(),
  updateMutate: vi.fn(),
  removeMutate: vi.fn((_vars: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()),
  toast: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(mocks.toast, { success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/hooks/useInventoryMutations', () => ({
  useInventoryMutations: () => ({
    addItem: { mutate: mocks.addMutate },
    updateItem: { mutate: mocks.updateMutate },
    removeItem: { mutate: mocks.removeMutate },
    transferItem: { mutate: vi.fn() },
  }),
}));

vi.mock('@/hooks/useCharacters', () => ({
  useCharacters: () => ({
    data: [
      { id: 'c1', name: 'Grog', class: 'barbarian' },
      { id: 'c2', name: 'Vex', class: 'ranger' },
    ],
  }),
}));

const queryClient = new QueryClient();

function renderTab() {
  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryTab
        characterId="c1"
        campaignId="camp1"
        itemsData={[
          { id: 'item-1', item_id: 'longsword', quantity: 1, equipped: true },
          { id: 'item-2', item_id: 'dagger', quantity: 2, equipped: false },
        ]}
      />
    </QueryClientProvider>
  );
}

describe('InventoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders inventory items and weight correctly', () => {
    renderTab();

    expect(screen.getByText(/longsword/i)).toBeInTheDocument();
    expect(screen.getByText(/dagger/i)).toBeInTheDocument();
    expect(screen.getByText(/inventory.totalItems/i)).toBeInTheDocument();
  });

  it('names the equip toggle after the item and reflects the equipped state', () => {
    renderTab();

    const toggles = screen.getAllByRole('button', { pressed: true });
    expect(toggles.some((b) => b.getAttribute('aria-label') === 'inventory.unequipItem')).toBe(true);
    expect(screen.getAllByLabelText('inventory.equipItem')).toHaveLength(1);
  });

  it('only decreases quantity above 1 and never deletes through the minus button', () => {
    renderTab();

    const minus = screen.getAllByLabelText('inventory.decreaseQty');
    expect(minus[0]).toBeDisabled();
    fireEvent.click(minus[1]);
    expect(mocks.updateMutate).toHaveBeenCalledWith({ characterId: 'c1', id: 'item-2', quantity: 1 });
    expect(mocks.removeMutate).not.toHaveBeenCalled();
  });

  it('removes an item with a toast whose Undo puts it back', () => {
    renderTab();

    fireEvent.click(screen.getAllByLabelText('inventory.removeItemAria')[1]);
    expect(mocks.removeMutate).toHaveBeenCalled();
    const [, options] = mocks.toast.mock.calls[0] as [string, { action: { onClick: () => void } }];

    options.action.onClick();
    expect(mocks.addMutate).toHaveBeenCalledWith(
      expect.objectContaining({ characterId: 'c1', itemId: 'dagger', quantity: 2, equipped: false })
    );
  });
});
