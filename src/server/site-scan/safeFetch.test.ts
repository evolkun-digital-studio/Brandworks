import { Readable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'
import {
  MAX_REDIRECTS,
  SafeFetchError,
  USER_AGENT,
  assertPublicHost,
  domainOf,
  isBlockedAddress,
  normaliseUrl,
  stripTrackingParams,
  readCapped,
  safeFetch,
  validatePublicUrl,
  type HopResponse,
  type Transport,
} from './safeFetch'

const PUBLIC_IP = '93.184.215.14'
const publicDns = vi.fn(async () => [PUBLIC_IP])

const page = (status: number, headers: Record<string, string> = {}, text = ''): HopResponse => ({
  status,
  headers,
  body: new TextEncoder().encode(text),
  truncated: false,
})

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
    return undefined
  } catch (error) {
    return error instanceof SafeFetchError ? error.code : 'other'
  }
}

describe('normaliseUrl', () => {
  it('adds https://, lowercases the host and strips the hash', () => {
    const url = normaliseUrl('  BrandWorks.ME/Work?x=1#top ')
    expect(url.href).toBe('https://brandworks.me/Work?x=1')
    expect(domainOf(normaliseUrl('https://www.chaico.in'))).toBe('chaico.in')
  })

  it('allows only http/https on ports 80 and 443', () => {
    expect(normaliseUrl('http://chaico.in:80').href).toBe('http://chaico.in/')
    expect(normaliseUrl('https://chaico.in:443').href).toBe('https://chaico.in/')
    for (const bad of ['ftp://chaico.in', 'file:///etc/passwd', 'javascript:alert(1)', 'https://chaico.in:8080', 'https://user:pw@chaico.in', '']) {
      expect(() => normaliseUrl(bad), bad).toThrow(SafeFetchError)
    }
  })

  it.each([
    'http://127.0.0.1',
    'http://127.8.9.10',
    'http://2130706433', // 127.0.0.1 as a decimal
    'http://0x7f000001', // 127.0.0.1 as hex
    'http://10.0.0.5',
    'http://172.16.0.1',
    'http://172.31.255.255',
    'http://192.168.1.1',
    'http://169.254.169.254/latest/meta-data/',
    'http://169.254.10.10',
    'http://100.64.0.1',
    'http://100.127.255.255',
    'http://0.0.0.0',
    'http://255.255.255.255',
    'http://[::1]',
    'http://[::]',
    'http://[fc00::1]',
    'http://[fd00:ec2::254]',
    'http://[fe80::1]',
    'http://[::ffff:127.0.0.1]',
    'http://[::ffff:169.254.169.254]',
    'http://localhost',
    'http://LOCALHOST:80',
    'http://app.localhost',
    'http://printer.local',
    'http://metadata.google.internal',
    'http://intranet',
  ])('blocks %s', (url) => {
    expect(() => normaliseUrl(url)).toThrow(SafeFetchError)
  })
})

describe('isBlockedAddress', () => {
  it('blocks private, loopback, link-local, CGNAT and reserved ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.5.5', '192.168.0.1', '169.254.169.254', '100.64.0.1', '0.1.2.3', '::1', 'fc00::1', 'fe80::abcd', '::ffff:10.0.0.1', '64:ff9b::a00:1', '2002:7f00:1::']) {
      expect(isBlockedAddress(ip), ip).toBe(true)
    }
  })

  it('lets public addresses through, including neighbours of the blocked ranges', () => {
    for (const ip of [PUBLIC_IP, '172.32.0.1', '172.15.255.255', '100.128.0.1', '11.0.0.1', '2606:4700::6810:84e5', '::ffff:93.184.215.14']) {
      expect(isBlockedAddress(ip), ip).toBe(false)
    }
  })

  it('treats anything unparsable as blocked', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true)
  })
})

describe('assertPublicHost', () => {
  it('blocks a public-looking name that resolves to a private address', async () => {
    expect(await codeOf(assertPublicHost('sneaky.example', async () => ['10.0.0.7']))).toBe('blocked')
  })

  it('blocks when ANY resolved address is private (DNS round-robin trick)', async () => {
    expect(await codeOf(assertPublicHost('mixed.example', async () => [PUBLIC_IP, '127.0.0.1']))).toBe('blocked')
    expect(await codeOf(assertPublicHost('mixed6.example', async () => [PUBLIC_IP, '::1']))).toBe('blocked')
  })

  it('reports unknown hosts', async () => {
    expect(await codeOf(assertPublicHost('nope.example', async () => { throw new Error('ENOTFOUND') }))).toBe('not-found')
    expect(await codeOf(assertPublicHost('empty.example', async () => []))).toBe('not-found')
  })

  it('validatePublicUrl runs both checks', async () => {
    expect((await validatePublicUrl('chaico.in', publicDns)).href).toBe('https://chaico.in/')
    expect(await codeOf(validatePublicUrl('http://169.254.169.254', publicDns))).toBe('blocked')
  })
})

describe('tracking parameters', () => {
  const clean = (url: string) => stripTrackingParams(new URL(url)).href

  it('strips every tracking parameter', () => {
    for (const param of ['_gl=1*abc', '_ga=2.1', 'utm_source=x', 'utm_medium=y', 'UTM_Campaign=z', 'gclid=a', 'fbclid=b', 'msclkid=c', 'mc_cid=d', 'mc_eid=e', 'igshid=f', 'ref=g']) {
      expect(clean(`https://chaico.in/?${param}`), param).toBe('https://chaico.in/')
    }
  })

  it('keeps every other parameter, exactly as written', () => {
    expect(clean('https://chaico.in/shop?utm_source=x&id=5&fbclid=y&q=a%20b+c')).toBe('https://chaico.in/shop?id=5&q=a%20b+c')
    expect(clean('https://chaico.in/?reference=1&prefix_ref=2&utm=3')).toBe('https://chaico.in/?reference=1&prefix_ref=2&utm=3')
    expect(clean('https://chaico.in/about')).toBe('https://chaico.in/about')
  })

  it('cleans the address a scan starts from, without leaving its domain', async () => {
    const url = await validatePublicUrl('elements.envato.com/?_gl=1*xyz', async () => ['93.184.215.14'])
    expect(url.href).toBe('https://elements.envato.com/')
    expect(domainOf(url)).toBe('elements.envato.com')
  })

  it('leaves the address alone on a redirect hop', async () => {
    const seen: string[] = []
    const transport = vi.fn<Transport>(async (url) => {
      seen.push(url.href)
      return url.search
        ? { status: 200, headers: {}, body: new Uint8Array(), truncated: false }
        : { status: 302, headers: { location: '/?ref=needed' }, body: new Uint8Array(), truncated: false }
    })
    await safeFetch('https://chaico.in/', { resolve: async () => ['93.184.215.14'], transport })
    expect(seen).toEqual(['https://chaico.in/', 'https://chaico.in/?ref=needed'])
  })
})

describe('safeFetch methods and redirects', () => {
  it('sends HEAD when asked, re-checking every hop the same way, and reports each hop’s status', async () => {
    const transport = vi.fn<Transport>(async (url) => (url.pathname === '/a'
      ? { status: 301, headers: { location: '/b' }, body: new Uint8Array(), truncated: false }
      : { status: 200, headers: {}, body: new Uint8Array(), truncated: false }))
    const res = await safeFetch('https://chaico.in/a', { resolve: async () => ['93.184.215.14'], transport, method: 'HEAD' })
    expect(transport.mock.calls.map((call) => call[4])).toEqual(['HEAD', 'HEAD'])
    expect(res).toMatchObject({ status: 200, redirects: ['https://chaico.in/b'], redirectStatuses: [301] })
  })

  it('defaults to GET, and refuses a private address for HEAD too', async () => {
    const transport = vi.fn<Transport>(async () => ({ status: 200, headers: {}, body: new Uint8Array(), truncated: false }))
    await safeFetch('https://chaico.in/', { resolve: async () => ['93.184.215.14'], transport })
    expect(transport.mock.calls[0][4]).toBe('GET')
    transport.mockClear()
    await expect(safeFetch('https://chaico.in/', { resolve: async () => ['10.0.0.5'], transport, method: 'HEAD' })).rejects.toMatchObject({ code: 'blocked' })
    expect(transport).not.toHaveBeenCalled()
  })
})

describe('safeFetch', () => {
  it('connects only to the checked address and returns the page', async () => {
    const transport = vi.fn<Transport>(async () => page(200, { 'content-type': 'text/html' }, '<title>Hi</title>'))
    const res = await safeFetch('chaico.in', { resolve: publicDns, transport })
    expect(res).toMatchObject({ url: 'https://chaico.in/', status: 200, text: '<title>Hi</title>', redirects: [] })
    expect(transport.mock.calls[0][1]).toBe(PUBLIC_IP)
  })

  it('follows a relative redirect and re-checks the new hop', async () => {
    const transport = vi.fn<Transport>()
      .mockResolvedValueOnce(page(301, { location: '/home' }))
      .mockResolvedValueOnce(page(200, {}, 'ok'))
    const resolve = vi.fn(async () => [PUBLIC_IP])
    const res = await safeFetch('https://chaico.in', { resolve, transport })
    expect(res.url).toBe('https://chaico.in/home')
    expect(resolve).toHaveBeenCalledTimes(2)
  })

  it('blocks a redirect to a private IP literal (cloud metadata)', async () => {
    const transport = vi.fn<Transport>(async () => page(302, { location: 'http://169.254.169.254/latest/meta-data/' }))
    expect(await codeOf(safeFetch('https://chaico.in', { resolve: publicDns, transport }))).toBe('blocked')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('blocks a redirect to a name that resolves privately', async () => {
    const transport = vi.fn<Transport>(async () => page(307, { location: 'https://internal-admin.example/' }))
    const resolve = vi.fn(async (host: string) => (host === 'internal-admin.example' ? ['192.168.0.10'] : [PUBLIC_IP]))
    expect(await codeOf(safeFetch('https://chaico.in', { resolve, transport }))).toBe('blocked')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('blocks a redirect to localhost and to a non-web scheme', async () => {
    const toLocalhost = vi.fn<Transport>(async () => page(301, { location: 'http://localhost/admin' }))
    expect(await codeOf(safeFetch('https://chaico.in', { resolve: publicDns, transport: toLocalhost }))).toBe('blocked')
    const toFile = vi.fn<Transport>(async () => page(301, { location: 'file:///etc/passwd' }))
    expect(await codeOf(safeFetch('https://chaico.in', { resolve: publicDns, transport: toFile }))).toBe('invalid')
  })

  it(`stops after ${MAX_REDIRECTS} redirects`, async () => {
    let n = 0
    const transport = vi.fn<Transport>(async () => page(301, { location: `/hop-${++n}` }))
    expect(await codeOf(safeFetch('https://chaico.in', { resolve: publicDns, transport }))).toBe('redirects')
    expect(transport).toHaveBeenCalledTimes(MAX_REDIRECTS + 1)
  })

  it('times out', async () => {
    const hang: Transport = () => new Promise(() => undefined)
    expect(await codeOf(safeFetch('https://chaico.in', { resolve: publicDns, transport: hang, timeoutMs: 20 }))).toBe('timeout')
  })

  it('wraps network failures', async () => {
    const failing: Transport = async () => { throw new Error('ECONNRESET') }
    expect(await codeOf(safeFetch('https://chaico.in', { resolve: publicDns, transport: failing }))).toBe('network')
  })

  it('identifies itself with the BrandWorks user agent', () => {
    expect(USER_AGENT).toBe('BrandWorksSiteCheck/1.0 (+https://brandworks.me)')
  })
})

describe('readCapped', () => {
  it('stops reading past the byte cap and flags truncation', async () => {
    const stream = Readable.from([Buffer.alloc(600, 'a'), Buffer.alloc(600, 'b'), Buffer.alloc(600, 'c')])
    const { body, truncated } = await readCapped(stream, 1000)
    expect(truncated).toBe(true)
    expect(body.length).toBe(1000)
  })

  it('reads small bodies whole', async () => {
    const { body, truncated } = await readCapped(Readable.from([Buffer.from('hello')]), 1000)
    expect(truncated).toBe(false)
    expect(Buffer.from(body).toString()).toBe('hello')
  })
})
