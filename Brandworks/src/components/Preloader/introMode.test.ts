// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Both modules keep per-page-load state at module scope, so each test
// imports a fresh copy.
async function freshIntroMode() {
  vi.resetModules()
  return import('./introMode')
}

function stubEnvironment({ reload = false, reducedMotion = false } = {}) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type: reload ? 'reload' : 'navigate' } as unknown as PerformanceEntry,
  ])
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => ({ matches: reducedMotion && query.includes('reduce'), media: query }) as MediaQueryList,
  )
}

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('resolveIntroMode — who sees which opening', () => {
  it('plays the full intro on the first load of a session', async () => {
    stubEnvironment()
    const { resolveIntroMode } = await freshIntroMode()
    expect(resolveIntroMode()).toBe('full')
  })

  it('plays only the brief transition on later loads in the same session', async () => {
    stubEnvironment()
    sessionStorage.setItem('bw:intro-seen', '1')
    const { resolveIntroMode } = await freshIntroMode()
    expect(resolveIntroMode()).toBe('brief')
  })

  it('replays the full intro on a reload, even if already seen', async () => {
    stubEnvironment({ reload: true })
    sessionStorage.setItem('bw:intro-seen', '1')
    const { resolveIntroMode } = await freshIntroMode()
    expect(resolveIntroMode()).toBe('full')
  })

  it('shows the static lockup for reduced motion, and nothing once seen', async () => {
    stubEnvironment({ reducedMotion: true, reload: true })
    const first = await freshIntroMode()
    expect(first.resolveIntroMode()).toBe('reduced')

    sessionStorage.setItem('bw:intro-seen', '1')
    const again = await freshIntroMode()
    expect(again.resolveIntroMode()).toBe('none')
  })

  it('never plays twice in one page load (e.g. returning from /admin)', async () => {
    stubEnvironment({ reload: true })
    const { markIntroPlayed, resolveIntroMode } = await freshIntroMode()
    markIntroPlayed()
    expect(resolveIntroMode()).toBe('none')
    expect(sessionStorage.getItem('bw:intro-seen')).toBe('1')
  })
})

describe('introGate — hand-over from the preloader to the page', () => {
  async function freshGate() {
    vi.resetModules()
    return import('../../lib/introGate')
  }

  it('runs listeners immediately when no preloader has armed it', async () => {
    const gate = await freshGate()
    const listener = vi.fn()
    gate.onIntroDone(listener)
    expect(gate.isIntroPending()).toBe(false)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('holds listeners while armed and releases them once on finish', async () => {
    const gate = await freshGate()
    const listener = vi.fn()
    gate.armIntro()
    gate.onIntroDone(listener)
    expect(listener).not.toHaveBeenCalled()
    gate.finishIntro()
    gate.finishIntro()
    expect(listener).toHaveBeenCalledOnce()
  })

  it('holds heavy page work until the preloader has fully gone, not just started leaving', async () => {
    const gate = await freshGate()
    const onReveal = vi.fn()
    const onSettled = vi.fn()
    gate.armIntro()
    gate.onIntroDone(onReveal)
    gate.onIntroSettled(onSettled)
    expect(gate.isIntroSettled()).toBe(false)

    gate.finishIntro()
    expect(onReveal).toHaveBeenCalledOnce()
    expect(onSettled).not.toHaveBeenCalled()

    gate.settleIntro()
    expect(onSettled).toHaveBeenCalledOnce()
    expect(gate.isIntroSettled()).toBe(true)
  })

  it('settling also reveals, for openings that skip straight to the end', async () => {
    const gate = await freshGate()
    const onReveal = vi.fn()
    gate.armIntro()
    gate.onIntroDone(onReveal)
    gate.settleIntro()
    expect(onReveal).toHaveBeenCalledOnce()
  })

  it('opens by itself if the preloader never finishes', async () => {
    vi.useFakeTimers()
    try {
      const gate = await freshGate()
      const listener = vi.fn()
      const settled = vi.fn()
      gate.armIntro()
      gate.onIntroDone(listener)
      gate.onIntroSettled(settled)
      vi.advanceTimersByTime(12000)
      expect(listener).toHaveBeenCalledOnce()
      expect(settled).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })
})
