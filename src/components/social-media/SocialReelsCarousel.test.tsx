// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SocialReelsCarousel from './SocialReelsCarousel'
import type { SocialReel } from '../../data/socialReels'

const motion = vi.hoisted(() => ({ reduced: false }))
vi.mock('motion/react', () => ({ useReducedMotion: () => motion.reduced }))

const reels: SocialReel[] = [
  { id: 'one', category: 'Product Demo', videoSrc: '/one.mp4', posterSrc: '/one.webp' },
  { id: 'two', category: 'Paid Social Ads', videoSrc: '/two.mp4', posterSrc: '/two.webp' },
  { id: 'three', category: 'Client Testimonials', videoSrc: '', posterSrc: '/three.webp' },
]

let host: HTMLDivElement
let root: Root
let intersect: (entries: { isIntersecting: boolean }[]) => void
let play: ReturnType<typeof vi.spyOn>
let pause: ReturnType<typeof vi.spyOn>

async function mount(items = reels) {
  await act(async () => { root.render(<SocialReelsCarousel reels={items} />) })
}
async function show(visible = true) {
  await act(async () => { intersect([{ isIntersecting: visible }]) })
}
async function click(label: string) {
  const button = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
  expect(button).not.toBeNull()
  await act(async () => { button!.click() })
}
const videos = () => [...host.querySelectorAll('video')]

beforeEach(() => {
  vi.useFakeTimers()
  motion.reduced = false
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLVideoElement) {
    this.dispatchEvent(new Event('playing'))
    return Promise.resolve()
  })
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLVideoElement) {
    this.dispatchEvent(new Event('pause'))
  })
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersect) { intersect = callback }
    observe() {}
    disconnect() {}
  })
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() })
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Social reels media lifecycle', () => {
  it('requests no video before visibility, then plays only the active video muted', async () => {
    await mount()
    expect(videos().every((video) => !video.hasAttribute('src'))).toBe(true)
    expect(play).not.toHaveBeenCalled()
    await show()
    expect(videos()[0].getAttribute('src')).toBe('/one.mp4')
    expect(videos()[1].hasAttribute('src')).toBe(false)
    expect(videos()[0].muted).toBe(true)
    expect(play.mock.instances.every((video: HTMLVideoElement) => video === videos()[0])).toBe(true)
  })

  it('pauses and mutes the previous video when selection changes, and updates pagination', async () => {
    await mount()
    await show()
    await click('Unmute active reel')
    expect(videos()[0].muted).toBe(false)
    pause.mockClear()
    await click('Next reel')
    expect(pause.mock.instances).toContain(videos()[0])
    expect(videos()[0].muted).toBe(true)
    expect(videos()[1].getAttribute('src')).toBe('/two.mp4')
    expect(videos()[1].muted).toBe(true)
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 2')
  })

  it('pauses offscreen and when the browser tab is hidden, then resumes', async () => {
    await mount()
    await show()
    pause.mockClear()
    await show(false)
    expect(pause.mock.instances).toContain(videos()[0])
    play.mockClear()
    await show()
    expect(play).toHaveBeenCalled()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    pause.mockClear()
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    expect(pause.mock.instances).toContain(videos()[0])
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  })

  it('handles autoplay rejection and retries on a single press of the play control', async () => {
    play.mockRejectedValueOnce(new DOMException('Blocked', 'NotAllowedError'))
    await mount()
    await show()
    expect(host.textContent).toContain('Press play to watch')
    await click('Play active reel')
    expect(host.textContent).not.toContain('Press play to watch')
    expect(play.mock.calls.length).toBe(2)
  })

  it('keeps a poster fallback on video failure and never requests missing footage', async () => {
    await mount()
    await show()
    await act(async () => videos()[0].dispatchEvent(new Event('error')))
    expect(host.textContent).toContain('Video unavailable')
    expect(host.querySelector('.bw-reels__video.is-ready')).toBeNull()
    await click('Go to reel 3: Client Testimonials')
    expect(host.querySelectorAll('video')).toHaveLength(2)
    expect(host.textContent).toContain('Preview · reel coming soon')
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 3')
  })
})

describe('Social reels navigation', () => {
  it('advances at five seconds, pauses on hover, and resumes after leaving', async () => {
    await mount()
    await show()
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 2')
    const carousel = host.querySelector('.bw-reels__carousel')!
    await act(async () => carousel.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    await act(async () => { vi.advanceTimersByTime(15000) })
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 2')
    await act(async () => carousel.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })))
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 3')
  })

  it('supports keyboard selection, wrapping arrows, and an explicit autoplay toggle', async () => {
    await mount()
    await show()
    await click('Previous reel')
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 3')
    const viewport = host.querySelector('.bw-reels__viewport')!
    await act(async () => viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 1')
    await click('Pause carousel autoplay')
    await act(async () => { vi.advanceTimersByTime(20000) })
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 1')
  })

  it('respects reduced motion until the user explicitly starts a reel', async () => {
    motion.reduced = true
    await mount()
    await show()
    await act(async () => { vi.advanceTimersByTime(10000) })
    expect(play).not.toHaveBeenCalled()
    await click('Play active reel')
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('selects the snapped reel after native touch/trackpad scrolling', async () => {
    await mount()
    await show()
    const viewport = host.querySelector<HTMLElement>('.bw-reels__viewport')!
    Array.from(viewport.children).forEach((card, index) => {
      Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 120 })
    })
    viewport.scrollLeft = 120
    await act(async () => viewport.dispatchEvent(new Event('scroll')))
    await act(async () => { vi.advanceTimersByTime(150) })
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 2')
    expect(videos()[1].getAttribute('src')).toBe('/two.mp4')
  })

  it('supports mouse dragging without accidentally selecting the dragged card', async () => {
    await mount()
    await show()
    const viewport = host.querySelector<HTMLElement>('.bw-reels__viewport')!
    viewport.setPointerCapture = vi.fn()
    viewport.hasPointerCapture = vi.fn(() => true)
    viewport.releasePointerCapture = vi.fn()
    Array.from(viewport.children).forEach((card, index) => {
      Object.defineProperty(card, 'offsetLeft', { configurable: true, value: index * 120 })
    })
    const pointer = (type: string, x: number) => {
      const event = new MouseEvent(type, { bubbles: true, clientX: x, button: 0 })
      Object.defineProperties(event, { pointerType: { value: 'mouse' }, pointerId: { value: 1 } })
      return event
    }
    await act(async () => viewport.dispatchEvent(pointer('pointerdown', 300)))
    await act(async () => viewport.dispatchEvent(pointer('pointermove', 180)))
    expect(viewport.scrollLeft).toBe(120)
    expect(viewport.classList.contains('is-dragging')).toBe(true)
    await act(async () => viewport.dispatchEvent(pointer('pointerup', 180)))
    // Browsers synthesize a click after pointerup. It must not activate card 1.
    await click('Select Product Demo')
    await act(async () => { vi.advanceTimersByTime(150) })
    expect(host.querySelector('[aria-current="true"]')?.getAttribute('aria-label')).toContain('reel 2')
    expect(viewport.classList.contains('is-dragging')).toBe(false)
  })

  it('handles an empty collection and a single reel', async () => {
    await mount([])
    expect(host.querySelector('section')).toBeNull()
    await mount([reels[0]])
    expect(host.querySelector<HTMLButtonElement>('[aria-label="Next reel"]')?.disabled).toBe(true)
  })
})
