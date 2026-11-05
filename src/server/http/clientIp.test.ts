import { describe, expect, it } from 'vitest'
import { clientIp, trustedProxyHops } from './clientIp'

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) })

describe('clientIp', () => {
  it('uses the entry Apache appended, not the spoofable first one', () => {
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('cannot be rotated by sending a fresh fake first entry each time', () => {
    const a = clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }), 1)
    const b = clientIp(req({ 'x-forwarded-for': '2.2.2.2, 203.0.113.9' }), 1)
    expect(a).toBe(b)
  })

  it('reads the right entry behind several trusted proxies', () => {
    expect(clientIp(req({ 'x-forwarded-for': 'spoof, 198.51.100.4, 10.0.0.2' }), 2)).toBe('198.51.100.4')
  })

  it('ignores X-Real-IP, which the client can set freely through Apache', () => {
    expect(clientIp(req({ 'x-real-ip': '9.9.9.9' }), 1)).toBe('unknown')
  })

  it('ignores forwarding headers entirely with zero trusted hops', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }), 0)).toBe('unknown')
  })

  it('defaults to one trusted hop and rejects nonsense values', () => {
    expect(trustedProxyHops({} as NodeJS.ProcessEnv)).toBe(1)
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: '2' } as unknown as NodeJS.ProcessEnv)).toBe(2)
    expect(trustedProxyHops({ TRUSTED_PROXY_HOPS: 'abc' } as unknown as NodeJS.ProcessEnv)).toBe(1)
  })
})
