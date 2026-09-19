// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LazyBackgroundVideo from './LazyBackgroundVideo'

/**
 * jsdom implements neither IntersectionObserver nor
 * HTMLMediaElement.play()/matchMedia, so all three are stubbed here
 * with small, fully-controlled fakes — activation is triggered
 * explicitly via `observer.trigger(...)`, never by real timing or
 * geometry, so nothing here is timing-brittle (Phase 11, Part 17).
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  observed: Element[] = []
  disconnected = false
  callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true
  }
  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

let playSpy: ReturnType<typeof vi.fn<() => Promise<void>>>

beforeEach(() => {
  MockIntersectionObserver.instances = []
  // @ts-expect-error -- test-only global stub, not a full IntersectionObserver implementation
  window.IntersectionObserver = MockIntersectionObserver
  playSpy = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  HTMLMediaElement.prototype.play = playSpy
  HTMLMediaElement.prototype.pause = vi.fn()
  mockMatchMedia(false)
})

function mount(props: Parameters<typeof LazyBackgroundVideo>[0]) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  let root!: Root
  act(() => {
    root = createRoot(container)
    root.render(<LazyBackgroundVideo {...props} />)
  })
  const video = container.querySelector('video')!
  return { container, root, video }
}

function cleanup(m: { container: HTMLElement; root: Root }) {
  act(() => m.root.unmount())
  m.container.remove()
}

let mounted: ReturnType<typeof mount> | null = null
afterEach(() => {
  if (mounted) cleanup(mounted)
  mounted = null
})

describe('priority (eager) video', () => {
  it('attaches src immediately and sets autoplay/preload="metadata" without waiting for intersection', () => {
    mounted = mount({ src: 'hero.mp4', priority: true })
    expect(mounted.video.getAttribute('src')).toBe('hero.mp4')
    expect(mounted.video.autoplay).toBe(true)
    expect(mounted.video.getAttribute('preload')).toBe('metadata')
  })

  it('retains muted and playsInline', () => {
    mounted = mount({ src: 'hero.mp4', priority: true })
    expect(mounted.video.muted).toBe(true)
    expect(mounted.video.playsInline).toBe(true)
  })

  it('is aria-hidden by default (purely decorative)', () => {
    mounted = mount({ src: 'hero.mp4', priority: true })
    expect(mounted.video.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('deferred (below-fold) video', () => {
  it('does not attach a src or request more than "none" before intersecting', () => {
    mounted = mount({ src: 'brand.mp4' })
    expect(mounted.video.getAttribute('src')).toBeNull()
    expect(mounted.video.getAttribute('preload')).toBe('none')
    expect(mounted.video.autoplay).toBe(false)
  })

  it('observes the video element for intersection', () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    expect(observer.observed).toContain(mounted.video)
  })

  it('attaches src and calls play() once intersection is reported', async () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    await act(async () => {
      observer.trigger(true)
    })
    expect(mounted.video.getAttribute('src')).toBe('brand.mp4')
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('retains muted and playsInline once activated', async () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    await act(async () => {
      observer.trigger(true)
    })
    expect(mounted.video.muted).toBe(true)
    expect(mounted.video.playsInline).toBe(true)
  })

  it('does not attach a src while not intersecting', () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    act(() => observer.trigger(false))
    expect(mounted.video.getAttribute('src')).toBeNull()
    expect(playSpy).not.toHaveBeenCalled()
  })

  it('never re-attaches or re-fetches the same src on a second intersection event', async () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    await act(async () => observer.trigger(true))
    await act(async () => observer.trigger(true))
    await act(async () => observer.trigger(false))
    await act(async () => observer.trigger(true))
    expect(mounted.video.getAttribute('src')).toBe('brand.mp4')
    // One activation -> one play() call; later intersection toggles
    // don't attach a fresh source or trigger another observer.
    expect(playSpy).toHaveBeenCalledTimes(1)
  })

  it('disconnects the observer once activated (no further observation needed)', async () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    await act(async () => observer.trigger(true))
    expect(observer.disconnected).toBe(true)
  })

  it('disconnects the observer on unmount before it ever activates', () => {
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    cleanup(mounted)
    mounted = null
    expect(observer.disconnected).toBe(true)
  })
})

describe('reduced motion', () => {
  it('a priority video does not autoplay immediately when prefers-reduced-motion is set', () => {
    mockMatchMedia(true)
    mounted = mount({ src: 'hero.mp4', priority: true })
    expect(mounted.video.autoplay).toBe(false)
    expect(mounted.video.getAttribute('src')).toBeNull()
  })

  it('once intersecting, a reduced-motion video attaches its src but never calls play()', async () => {
    mockMatchMedia(true)
    mounted = mount({ src: 'brand.mp4' })
    const observer = MockIntersectionObserver.instances.at(-1)!
    await act(async () => observer.trigger(true))
    expect(mounted.video.getAttribute('src')).toBe('brand.mp4')
    expect(playSpy).not.toHaveBeenCalled()
  })
})

describe('layout / CLS', () => {
  it('applies the given className to the video element regardless of activation state', () => {
    mounted = mount({ src: 'brand.mp4', className: 'aspect-video w-full' })
    expect(mounted.video.className).toBe('aspect-video w-full')
  })
})
