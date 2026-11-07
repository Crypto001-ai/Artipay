import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  try {
    const currentFetch = window.fetch ? window.fetch.bind(window) : undefined;
    if (currentFetch) {
      Object.defineProperty(window, 'fetch', {
        value: currentFetch,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // Ignore if already configured
  }

  (window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
  (window as unknown as { global: Window }).global = window;
}

if (typeof globalThis !== 'undefined') {
  (globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}
