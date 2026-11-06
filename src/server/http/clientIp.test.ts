import { describe, expect, it } from 'vitest'
import { MAX_TRUSTED_PROXY_HOPS, UNKNOWN_CLIENT, clientIp, normalizeIp, rateLimitKey, trustedProxyHops } from './clientIp'

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) })
const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv

describe('trustedProxyHops — nothing is trusted unless configured', () => {
  it('defaults to 0 (no trusted proxy) when unset or blank, in every environment', () => {
    expect(trustedProxyHops(env({}))).toBe(0)
    expect(trustedProxyHops(env({ TRUSTED_PROXY_HOPS: '  ' }))).toBe(0)
    expect(trustedProxyHops(env({ NODE_ENV: 'production' }))).toBe(0)
  })

  it('accepts an explicit small integer', () => {
    expect(trustedProxyHops(env({ TRUSTED_PROXY_HOPS: '1' }))).toBe(1)
    expect(trustedProxyHops(env({ TRUSTED_PROXY_HOPS: '2' }))).toBe(2)
  })

  it('fails closed (0) on nonsense, negative, fractional or oversized values', () => {
    for (const value of ['abc', '-1', '1.5', '1e1', String(MAX_TRUSTED_PROXY_HOPS + 1), '1, 2']) {
      expect(trustedProxyHops(env({ TRUSTED_PROXY_HOPS: value })), value).toBe(0)
    }
  })
})

describe('clientIp — not spoofable through forwarding headers', () => {
  it('ignores X-Forwarded-For entirely when no proxy is trusted (direct access / unverified proxy)', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }), 0)).toBe(UNKNOWN_CLIENT)
  })

  it('never reads X-Real-IP, which Apache passes through from the client', () => {
    expect(clientIp(req({ 'x-real-ip': '9.9.9.9' }), 1)).toBe(UNKNOWN_CLIENT)
    expect(clientIp(req({ 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('behind one appending proxy, uses the entry the proxy appended, not the client-supplied first one', () => {
    // Client sent "X-Forwarded-For: 6.6.6.6"; Apache appended the real peer.
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('cannot be rotated by sending a fresh fake first entry on every request', () => {
    const a = clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }), 1)
    const b = clientIp(req({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3, 203.0.113.9' }), 1)
    expect(a).toBe('203.0.113.9')
    expect(b).toBe(a)
  })

  it('reads the right entry behind several trusted proxies', () => {
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 198.51.100.4, 10.0.0.2' }), 2)).toBe('198.51.100.4')
  })

  it('trusts nothing when the chain is shorter than the trusted hops (the request skipped a proxy)', () => {
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6' }), 2)).toBe(UNKNOWN_CLIENT)
    expect(clientIp(req({}), 1)).toBe(UNKNOWN_CLIENT)
  })

  it('rejects non-IP values in the trusted position instead of using them as a key', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9, not-an-ip' }), 1)).toBe(UNKNOWN_CLIENT)
    expect(clientIp(req({ 'x-forwarded-for': `203.0.113.9, ${'a'.repeat(5000)}` }), 1)).toBe(UNKNOWN_CLIENT)
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9, ' }), 1)).toBe(UNKNOWN_CLIENT)
  })
})

describe('normalizeIp', () => {
  it('normalises ports, brackets, case and IPv4-mapped IPv6 so one client is one key', () => {
    expect(normalizeIp('203.0.113.9:443')).toBe('203.0.113.9')
    expect(normalizeIp('[2001:DB8::1]:8443')).toBe('2001:db8::1')
    expect(normalizeIp('::ffff:203.0.113.9')).toBe('203.0.113.9')
    expect(normalizeIp('unknown')).toBeNull()
  })
})

describe('rateLimitKey', () => {
  it('groups IPv6 clients by /64 so rotating within one allocation does not reset a limit', () => {
    const a = rateLimitKey(req({ 'x-forwarded-for': '2001:db8:1:2::1' }), 1)
    const b = rateLimitKey(req({ 'x-forwarded-for': '2001:db8:1:2:ffff:ffff:ffff:fffe' }), 1)
    const other = rateLimitKey(req({ 'x-forwarded-for': '2001:db8:1:3::1' }), 1)
    expect(a).toBe('2001:0db8:0001:0002::/64')
    expect(b).toBe(a)
    expect(other).not.toBe(a)
  })

  it('keys IPv4 clients by address and unknown clients by the shared bucket', () => {
    expect(rateLimitKey(req({ 'x-forwarded-for': '203.0.113.9' }), 1)).toBe('203.0.113.9')
    expect(rateLimitKey(req({ 'x-forwarded-for': '203.0.113.9' }), 0)).toBe(UNKNOWN_CLIENT)
  })
})
