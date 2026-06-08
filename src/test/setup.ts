import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
});

if (!window.matchMedia) {
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
}

if (!window.scrollTo) {
    window.scrollTo = vi.fn();
}

if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => 'blob:test-url');
}

if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = vi.fn();
}

if (window.HTMLCanvasElement) {
    Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
        writable: true,
        value: vi.fn(() => null) as unknown as HTMLCanvasElement['getContext'],
    });
}

if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
        value: {
            ...globalThis.crypto,
            randomUUID: () => 'test-random-uuid',
        },
    });
}

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

class IntersectionObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return [];
    }
}

Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
});

Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: IntersectionObserverMock,
});
