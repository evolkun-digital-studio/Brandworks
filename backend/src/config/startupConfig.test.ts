import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * assertStartupConfig() is what server.ts runs before accepting a
 * request. env.ts evaluates at import, so each scenario stubs the
 * environment first and then imports a fresh copy of the module.
 */

const PRODUCTION = {
  NODE_ENV: 'production',
  PUBLIC_ORIGIN: 'https://brandworks.com',
  FRONTEND_ORIGIN: 'https://brandworks.com',
  MONGODB_URI: 'mongodb://example-not-real/db',
  JWT_SECRET: 'a'.repeat(48),
}

async function load(vars: Record<string, string>) {
  vi.resetModules()
  // Empty rather than deleted: env.ts treats the two the same, and a
  // developer's own backend/.env can't refill a variable that is set.
  for (const name of Object.keys(PRODUCTION)) vi.stubEnv(name, '')
  for (const [name, value] of Object.entries(vars)) vi.stubEnv(name, value)
  return (await import('./env.js')).assertStartupConfig
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('assertStartupConfig', () => {
  it('passes with no warnings for a complete https production configuration', async () => {
    const assertStartupConfig = await load(PRODUCTION)
    expect(assertStartupConfig()).toEqual([])
  })

  it('refuses to start without JWT_SECRET — not only on the first login', async () => {
    const assertStartupConfig = await load({ ...PRODUCTION, JWT_SECRET: '' })
    expect(() => assertStartupConfig()).toThrow('Missing required environment variable: JWT_SECRET')
  })

  it('refuses to start without MONGODB_URI', async () => {
    const assertStartupConfig = await load({ ...PRODUCTION, MONGODB_URI: '' })
    expect(() => assertStartupConfig()).toThrow('Missing required environment variable: MONGODB_URI')
  })

  it('refuses the localhost CORS default in production', async () => {
    const assertStartupConfig = await load({ ...PRODUCTION, FRONTEND_ORIGIN: '' })
    expect(() => assertStartupConfig()).toThrow('FRONTEND_ORIGIN is required in production')
  })

  it('does not require FRONTEND_ORIGIN in development', async () => {
    const assertStartupConfig = await load({ ...PRODUCTION, NODE_ENV: 'development', FRONTEND_ORIGIN: '' })
    expect(assertStartupConfig()).toEqual([])
  })

  it('warns about a plain-http origin in production', async () => {
    const assertStartupConfig = await load({ ...PRODUCTION, FRONTEND_ORIGIN: 'http://brandworks.com' })
    expect(assertStartupConfig()).toEqual([expect.stringContaining('http://brandworks.com is not an https:// origin')])
  })

  it('warns about a short JWT secret without ever printing it', async () => {
    const assertStartupConfig = await load({ ...PRODUCTION, JWT_SECRET: 'short-secret' })
    const warnings = assertStartupConfig()
    expect(warnings).toEqual([expect.stringContaining('JWT_SECRET is shorter than 32 characters')])
    expect(warnings.join(' ')).not.toContain('short-secret')
  })
})
