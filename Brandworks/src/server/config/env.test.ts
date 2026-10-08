import { describe, expect, it } from 'vitest'
import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { requireMongoUri, resolvePublicOrigin } from './env'

describe('requireMongoUri', () => {
  it('requires a non-empty server-only MongoDB URI', () => {
    expect(() => requireMongoUri({} as NodeJS.ProcessEnv)).toThrow('MONGODB_URI is required')
    expect(() => requireMongoUri({ MONGODB_URI: '  ' } as NodeJS.ProcessEnv)).toThrow('MONGODB_URI is required')
  })

  it('returns the trimmed value without including it in validation errors', () => {
    expect(requireMongoUri({ MONGODB_URI: ' mongodb://localhost:27017/brandworks ' } as NodeJS.ProcessEnv))
      .toBe('mongodb://localhost:27017/brandworks')
  })
})

describe('resolvePublicOrigin',()=>{
  it('uses the configured public origin and normalizes it',()=>{
    expect(resolvePublicOrigin({NODE_ENV:'production',PUBLIC_ORIGIN:'https://site.example.test/'} as NodeJS.ProcessEnv)).toBe('https://site.example.test')
  })
  it('requires a configured production origin and rejects paths',()=>{
    expect(()=>resolvePublicOrigin({NODE_ENV:'production'} as NodeJS.ProcessEnv)).toThrow('PUBLIC_ORIGIN is required in production.')
    expect(()=>resolvePublicOrigin({NODE_ENV:'production',PUBLIC_ORIGIN:'https://site.example.test/path'} as NodeJS.ProcessEnv)).toThrow('must be an origin only')
  })
  it('mirrors the reference development fallback without assuming a production domain',()=>{
    expect(resolvePublicOrigin({NODE_ENV:'development'} as NodeJS.ProcessEnv)).toBe('http://localhost:5173')
  })
})
