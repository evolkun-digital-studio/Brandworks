import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * env.ts validates PUBLIC_ORIGIN eagerly at module load (Phase 9) so a
 * bad value fails the moment the server starts, not on the first
 * request that happens to need it. That eagerness is exactly what
 * makes it awkward to unit-test in-process — Node caches a module by
 * path, so importing env.ts a second time with different env vars in
 * the same test process would just return the already-evaluated
 * result. Each scenario below runs env.ts as its own fresh process
 * (via tsx) with a controlled environment instead, and asserts on the
 * real exit code / stderr — this is what "the server refuses to
 * start" actually looks like.
 */

const repoRoot = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..')
const envFile = path.resolve(repoRoot, 'src/config/env.ts')

const BASE_ENV = {
  ...process.env,
  MONGODB_URI: 'mongodb://example-not-real/db',
  JWT_SECRET: 'test-secret',
  PORT: '4001',
}

function run(overrides: Record<string, string | undefined>) {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    if (value !== undefined) env[key] = value
  }
  // Explicitly cleared keys (value undefined in overrides) must not
  // fall back to whatever the outer shell/.env happened to set.
  for (const key of Object.keys(overrides)) {
    if (overrides[key] === undefined) delete env[key]
  }
  return spawnSync('npx', ['tsx', envFile], { cwd: repoRoot, env, encoding: 'utf8' })
}

describe('env.ts — PUBLIC_ORIGIN validation', () => {
  it('starts cleanly with a valid, distinct PUBLIC_ORIGIN', () => {
    const result = run({ NODE_ENV: 'development', PUBLIC_ORIGIN: 'https://brandworks.com' })
    expect(result.status).toBe(0)
  })

  it('refuses to start when PUBLIC_ORIGIN equals this backend’s own localhost:PORT origin', () => {
    const result = run({ NODE_ENV: 'development', PUBLIC_ORIGIN: 'http://localhost:4001' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("must not be this backend's own origin")
  })

  it('refuses to start when PUBLIC_ORIGIN includes a path (e.g. /api)', () => {
    const result = run({ NODE_ENV: 'development', PUBLIC_ORIGIN: 'https://brandworks.com/api' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('must be an origin only, with no path')
  })

  it('refuses to start when PUBLIC_ORIGIN is not a valid absolute URL', () => {
    const result = run({ NODE_ENV: 'development', PUBLIC_ORIGIN: 'not-a-url' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('must be a valid absolute URL')
  })

  it('requires PUBLIC_ORIGIN explicitly in production — does not silently fall back', () => {
    const result = run({ NODE_ENV: 'production', PUBLIC_ORIGIN: undefined, FRONTEND_ORIGIN: undefined })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('PUBLIC_ORIGIN is required in production')
  })

  it('falls back to FRONTEND_ORIGIN in development when PUBLIC_ORIGIN is unset', () => {
    const result = run({
      NODE_ENV: 'development',
      PUBLIC_ORIGIN: undefined,
      FRONTEND_ORIGIN: 'http://localhost:5173',
    })
    expect(result.status).toBe(0)
  })
}, 30_000)

describe('env.ts — SCHEDULER_INTERVAL_MS validation (Phase 15)', () => {
  const VALID_ORIGIN = { NODE_ENV: 'development', PUBLIC_ORIGIN: 'https://brandworks.com' }

  it('starts cleanly and defaults to 60000 when unset — preserves Phase 14 behavior', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: undefined })
    expect(result.status).toBe(0)
  })

  it('accepts an explicitly configured valid value', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '30000' })
    expect(result.status).toBe(0)
  })

  it('refuses a non-integer value', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '30.5' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('SCHEDULER_INTERVAL_MS must be a whole number')
  })

  it('refuses a non-numeric value', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: 'soon' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('SCHEDULER_INTERVAL_MS must be a whole number')
  })

  it('refuses a value below the minimum (1000ms)', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '999' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('must be between 1000 and 3600000')
  })

  it('refuses a value above the maximum (1 hour)', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '3600001' })
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('must be between 1000 and 3600000')
  })

  it('accepts the exact minimum boundary (1000ms)', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '1000' })
    expect(result.status).toBe(0)
  })

  it('accepts the exact maximum boundary (3600000ms)', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '3600000' })
    expect(result.status).toBe(0)
  })

  it('refuses a negative value', () => {
    const result = run({ ...VALID_ORIGIN, SCHEDULER_INTERVAL_MS: '-1000' })
    expect(result.status).not.toBe(0)
  })
}, 30_000)
