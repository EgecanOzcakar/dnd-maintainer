import { render } from '@testing-library/react';
import { toast } from 'sonner';

const h = vi.hoisted(() => ({
  needRefresh: true,
  updateServiceWorker: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [h.needRefresh],
    updateServiceWorker: h.updateServiceWorker,
  }),
}));

import { PWAUpdatePrompt } from './PWAUpdatePrompt';

describe('PWAUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.needRefresh = true;
  });

  it('shows a reload toast when a new version is precached', () => {
    render(<PWAUpdatePrompt />);
    expect(toast).toHaveBeenCalledWith(
      'pwa.updateAvailable',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'pwa.reload' }),
      })
    );
  });

  it('reloads via the service worker when the action is clicked', () => {
    render(<PWAUpdatePrompt />);
    const opts = vi.mocked(toast).mock.calls[0][1] as unknown as {
      action: { onClick: () => void };
    };
    opts.action.onClick();
    expect(h.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('stays silent when there is no update', () => {
    h.needRefresh = false;
    render(<PWAUpdatePrompt />);
    expect(toast).not.toHaveBeenCalled();
  });
});
