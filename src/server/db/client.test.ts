import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./indexes', () => ({ ensureDatabaseIndexes: vi.fn() }))

import { serverSelectionTimeoutMs } from './client'

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe('serverSelectionTimeoutMs', () => {
  it('fails fast by default instead of the driver’s 30s', () => {
    expect(serverSelectionTimeoutMs(env({}))).toBe(10_000)
  })

  it('accepts an integer between 1s and 60s', () => {
    expect(serverSelectionTimeoutMs(env({ MONGODB_SERVER_SELECTION_TIMEOUT_MS: '5000' }))).toBe(5000)
  })

  it('ignores values that would disable or stretch the timeout', () => {
    for (const value of ['0', '999', '60001', 'abc', '-5', '1.5']) {
      expect(serverSelectionTimeoutMs(env({ MONGODB_SERVER_SELECTION_TIMEOUT_MS: value })), value).toBe(10_000)
    }
  })
})
