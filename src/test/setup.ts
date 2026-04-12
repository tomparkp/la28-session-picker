import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  window.scrollTo(0, 0)
})

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  writable: true,
  value: (query: string) => ({
    matches: getQueryMatch(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, 'scrollTo', {
  configurable: true,
  writable: true,
  value: (xOrOptions: number | ScrollToOptions, y?: number) => {
    const top = typeof xOrOptions === 'object' ? (xOrOptions.top ?? 0) : (y ?? 0)

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: top,
    })
    Object.defineProperty(window, 'pageYOffset', {
      configurable: true,
      writable: true,
      value: top,
    })
  },
})

Object.defineProperty(window, 'scrollY', {
  configurable: true,
  writable: true,
  value: 0,
})

Object.defineProperty(window, 'pageYOffset', {
  configurable: true,
  writable: true,
  value: 0,
})

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    const rect = target.getBoundingClientRect()
    this.callback(
      [
        {
          target,
          contentRect: rect,
          borderBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
          contentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
          devicePixelContentBoxSize: [{ blockSize: rect.height, inlineSize: rect.width }],
        } as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    )
  }

  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
})

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value() {
    const top = -window.scrollY

    return {
      width: 1024,
      height: 60,
      top,
      right: 1024,
      bottom: top + 60,
      left: 0,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }
  },
})

function getQueryMatch(query: string) {
  const maxWidth = query.match(/\(max-width:\s*(\d+)px\)/)
  if (maxWidth) return window.innerWidth <= Number(maxWidth[1])

  const minWidth = query.match(/\(min-width:\s*(\d+)px\)/)
  if (minWidth) return window.innerWidth >= Number(minWidth[1])

  return false
}
