import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const publishDueScheduledBlogsMock = vi.fn()

vi.mock('../../repositories/blog.repository.js', () => ({
  publishDueScheduledBlogs: (now: Date) => publishDueScheduledBlogsMock(now),
}))

// A small, test-friendly interval (rather than the real default) so
// "recurring cycles use the configured interval" can be asserted
// without depending on whatever's actually in this machine's .env —
// and so this file itself proves the value comes from config/env.js,
// not a hardcoded constant inside scheduler.service.ts (Phase 15,
// Part 3/4).
const TEST_INTERVAL_MS = 5_000

vi.mock('../../config/env.js', () => ({
  env: { schedulerIntervalMs: TEST_INTERVAL_MS },
}))

const { startBlogScheduler, stopBlogScheduler } = await import('./scheduler.service.js')

beforeEach(() => {
  vi.useFakeTimers()
  publishDueScheduledBlogsMock.mockReset()
  publishDueScheduledBlogsMock.mockResolvedValue(0)
})

afterEach(() => {
  stopBlogScheduler()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('startBlogScheduler', () => {
  it('checks immediately on startup rather than waiting a full interval', async () => {
    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))
  })

  it('checks again after each configured interval', async () => {
    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(TEST_INTERVAL_MS)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(TEST_INTERVAL_MS)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(3)
  })

  it('does not fire early, before the configured interval has fully elapsed', async () => {
    startBlogScheduler()
    // Flushes the immediate startup call's pending microtask without
    // advancing the fake clock at all — vi.waitFor's own internal
    // polling would otherwise eat into the tight "-1ms" budget below.
    await vi.advanceTimersByTimeAsync(0)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(TEST_INTERVAL_MS - 1)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1)
  })

  it('is idempotent — calling it twice never runs two overlapping intervals', async () => {
    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))
    startBlogScheduler()

    await vi.advanceTimersByTimeAsync(TEST_INTERVAL_MS)
    // A second interval would have produced 3 calls (1 immediate +
    // one from each of two overlapping intervals) instead of 2.
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(2)
  })

  it('one failed cycle does not stop future cycles', async () => {
    publishDueScheduledBlogsMock.mockRejectedValueOnce(new Error('transient DB error'))
    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))

    await vi.advanceTimersByTimeAsync(TEST_INTERVAL_MS)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(2)
  })

  it('logs startup with the configured interval', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    startBlogScheduler()
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(`intervalMs=${TEST_INTERVAL_MS}`))
  })
})

describe('stopBlogScheduler', () => {
  it('stops further cycles', async () => {
    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))
    stopBlogScheduler()

    await vi.advanceTimersByTimeAsync(5 * TEST_INTERVAL_MS)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1)
  })

  it('is safe to call when nothing is running', () => {
    expect(() => stopBlogScheduler()).not.toThrow()
  })

  it('logs that it stopped', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    startBlogScheduler()
    logSpy.mockClear()
    stopBlogScheduler()
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('stopped'))
  })

  it('logs nothing when stopping something that was never running', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    stopBlogScheduler()
    expect(logSpy).not.toHaveBeenCalled()
  })
})

describe('cycle observability logging', () => {
  it('logs publishedCount and a duration when a cycle actually published something', async () => {
    publishDueScheduledBlogsMock.mockResolvedValueOnce(3)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))

    const cycleLog = logSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('cycle complete'),
    )
    expect(cycleLog?.[0]).toContain('publishedCount=3')
    expect(cycleLog?.[0]).toMatch(/durationMs=\d+/)
  })

  it('does not log a cycle-complete line when nothing was due (avoids noisy no-op logs)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))

    const cycleLog = logSpy.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('cycle complete'),
    )
    expect(cycleLog).toBeUndefined()
  })

  it('logs a failed cycle with a redacted message — never a raw MongoDB URI/credential', async () => {
    publishDueScheduledBlogsMock.mockRejectedValueOnce(
      new Error('connection failed: mongodb+srv://admin:s3cret@cluster0.example.mongodb.net/db'),
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    startBlogScheduler()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))

    const loggedText = errorSpy.mock.calls.flat().join(' ')
    expect(loggedText).toContain('cycle failed')
    expect(loggedText).toContain('[redacted]')
    expect(loggedText).not.toContain('s3cret')
    expect(loggedText).not.toContain('admin:s3cret')
  })

  it('a failed cycle never throws out of runOnce — the process keeps running', async () => {
    publishDueScheduledBlogsMock.mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => startBlogScheduler()).not.toThrow()
    await vi.waitFor(() => expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1))
  })
})

describe('the configured interval is genuinely read from env.ts, not hardcoded', () => {
  it('a differently-configured interval changes the actual recurring cadence', async () => {
    vi.resetModules()
    const DIFFERENT_INTERVAL_MS = 12_345
    vi.doMock('../../config/env.js', () => ({ env: { schedulerIntervalMs: DIFFERENT_INTERVAL_MS } }))
    vi.doMock('../../repositories/blog.repository.js', () => ({
      publishDueScheduledBlogs: (now: Date) => publishDueScheduledBlogsMock(now),
    }))

    const mod = await import('./scheduler.service.js')
    publishDueScheduledBlogsMock.mockClear()

    mod.startBlogScheduler()
    await vi.advanceTimersByTimeAsync(0)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(DIFFERENT_INTERVAL_MS - 1)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    expect(publishDueScheduledBlogsMock).toHaveBeenCalledTimes(2)

    mod.stopBlogScheduler()
  })
})
