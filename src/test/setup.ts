import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  try {
    window.localStorage.clear()
  } catch {
    /* storage unavailable — tests that need it stub their own */
  }
})

/* jsdom implements none of these; the app uses them for responsive layout,
   lazy rendering and scroll-reveal. Stubs keep component tests honest about
   behaviour rather than crashing on missing browser APIs. */

if (typeof window !== 'undefined') {
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
    })
  }

  if (!window.ResizeObserver) {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub
  }

  if (!window.IntersectionObserver) {
    class IntersectionObserverStub {
      root = null
      rootMargin = ''
      thresholds: number[] = []
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
      IntersectionObserverStub
  }

  // scrollTo is used by route changes; jsdom throws "not implemented".
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
}
