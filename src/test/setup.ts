/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';

global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();

// jsdom doesn't implement matchMedia — provide a stub for ThemeProvider
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Polyfill localStorage to avoid clashes with Node.js built-in localStorage
if (typeof Storage !== 'undefined') {
  const store: Record<string, string> = {};
  Object.defineProperties(Storage.prototype, {
    getItem: {
      value(key: string) {
        return store[key] || null;
      },
      writable: true,
      configurable: true,
    },
    setItem: {
      value(key: string, value: string) {
        store[key] = String(value);
      },
      writable: true,
      configurable: true,
    },
    removeItem: {
      value(key: string) {
        delete store[key];
      },
      writable: true,
      configurable: true,
    },
    clear: {
      value() {
        for (const key of Object.keys(store)) {
          delete store[key];
        }
      },
      writable: true,
      configurable: true,
    },
    length: {
      get() {
        return Object.keys(store).length;
      },
      configurable: true,
    },
  });

  const mockStorage = Object.create(Storage.prototype);
  Object.defineProperty(global, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    configurable: true,
    writable: true,
  });
}
