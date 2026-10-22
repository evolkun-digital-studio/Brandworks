/**
 * Fetches customer-typed URLs without letting them reach our own network
 * (SSRF). Every hop is normalised, its host resolved, and EVERY resolved
 * address checked against private, loopback, link-local, CGNAT, metadata and
 * reserved ranges. The connection is then pinned to the address we checked
 * (a custom `lookup`), so a DNS answer can't change between check and
 * connect. Redirects are followed by hand and re-checked.
 *
 * Kept free of `server-only` so it can be unit tested in plain node.
 */
import http from 'node:http'
import https from 'node:https'
import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP, type LookupFunction } from 'node:net'
import type { Readable } from 'node:stream'
import zlib from 'node:zlib'

export const USER_AGENT = 'BrandWorksSiteCheck/1.0 (+https://brandworks.me)'
export const TIMEOUT_MS = 8_000
export const MAX_BODY_BYTES = 1.5 * 1024 * 1024
export const MAX_REDIRECTS = 3

export type SafeFetchErrorCode = 'invalid' | 'blocked' | 'not-found' | 'redirects' | 'timeout' | 'network'

export class SafeFetchError extends Error {
  constructor(public readonly code: SafeFetchErrorCode, message: string) {
    super(message)
    this.name = 'SafeFetchError'
  }
}

/* -------------------------------------------------------------------------- */
/*  Address checks                                                            */
/* -------------------------------------------------------------------------- */

/** [network, prefix length] — private, loopback, link-local, CGNAT and reserved IPv4. */
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, incl. 169.254.169.254 cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, incl. 255.255.255.255 broadcast
]

function v4ToInt(ip: string): number {
  return ip.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0
}

function v4Blocked(ip: string): boolean {
  const value = v4ToInt(ip)
  return BLOCKED_V4.some(([net, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
    return (value & mask) === (v4ToInt(net) & mask)
  })
}

/** Eight 16-bit groups, or null if it isn't a parsable IPv6 address. */
function expandV6(ip: string): number[] | null {
  let address = ip.toLowerCase().split('%')[0]
  const dotted = address.match(/(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    const n = v4ToInt(dotted[1])
    address = `${address.slice(0, -dotted[1].length)}${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`
  }
  const [head, tail, extra] = address.split('::')
  if (extra !== undefined) return null
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const missing = 8 - left.length - right.length
  if (tail === undefined ? left.length !== 8 : missing < 0) return null
  const groups = [...left, ...Array(tail === undefined ? 0 : missing).fill('0'), ...right].map((g) => parseInt(g, 16))
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null
}

const embeddedV4 = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`

function v6Blocked(ip: string): boolean {
  const g = expandV6(ip)
  if (!g) return true
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0)
  if (zeros(0, 8)) return true // :: unspecified
  if (zeros(0, 7) && g[7] === 1) return true // ::1 loopback
  if (zeros(0, 5) && g[5] === 0xffff) return v4Blocked(embeddedV4(g[6], g[7])) // IPv4-mapped
  if (zeros(0, 6)) return v4Blocked(embeddedV4(g[6], g[7])) // IPv4-compatible (deprecated)
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) return v4Blocked(embeddedV4(g[6], g[7])) // NAT64
  if (g[0] === 0x2002) return v4Blocked(embeddedV4(g[1], g[2])) // 6to4
  if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7 unique local (incl. fd00:ec2::254 metadata)
  if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((g[0] & 0xffc0) === 0xfec0) return true // fec0::/10 site-local (deprecated)
  if ((g[0] & 0xff00) === 0xff00) return true // multicast
  if (g[0] === 0x2001 && (g[1] === 0x0db8 || g[1] === 0)) return true // documentation, Teredo
  if (g[0] === 0x0100 && zeros(1, 4)) return true // discard-only
  return false
}

/** True for any address a customer URL must never make us connect to. */
export function isBlockedAddress(ip: string): boolean {
  const bare = ip.replace(/^\[|\]$/g, '')
  const family = isIP(bare)
  if (family === 4) return v4Blocked(bare)
  if (family === 6) return v6Blocked(bare)
  return true
}

function isBlockedHostname(host: string): boolean {
  const bare = host.replace(/^\[|\]$/g, '')
  if (isIP(bare)) return isBlockedAddress(bare)
  if (bare === 'localhost' || bare.endsWith('.localhost')) return true
  if (bare.endsWith('.local') || bare.endsWith('.internal') || bare.endsWith('.home.arpa')) return true
  // Single-label names ("intranet", "router") only resolve on private networks.
  return !bare.includes('.')
}

/* -------------------------------------------------------------------------- */
/*  URL normalisation and host checks                                         */
/* -------------------------------------------------------------------------- */

/**
 * Adds https:// when missing, lowercases the host, strips the hash, and
 * rejects anything that isn't http(s) on port 80/443 or names a private host.
 */
export function normaliseUrl(input: string): URL {
  const raw = input.trim()
  if (!raw || raw.length > 2048) throw new SafeFetchError('invalid', 'Enter a website address.')
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new SafeFetchError('invalid', 'That doesn’t look like a web address.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SafeFetchError('invalid', 'Only http and https addresses can be checked.')
  }
  if (url.username || url.password) throw new SafeFetchError('invalid', 'Addresses with a username or password can’t be checked.')
  if (url.port && url.port !== '80' && url.port !== '443') {
    throw new SafeFetchError('invalid', 'Only standard web ports (80 and 443) can be checked.')
  }
  url.hash = ''
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!url.hostname || isBlockedHostname(url.hostname)) {
    throw new SafeFetchError('blocked', 'That address points to a private network and can’t be checked.')
  }
  return url
}

/** The cache key for a site: its host without a leading "www.". */
export function domainOf(url: URL): string {
  return url.hostname.replace(/^www\./, '')
}

export type Resolver = (hostname: string) => Promise<string[]>

export const resolveHost: Resolver = async (hostname) =>
  (await dnsLookup(hostname, { all: true, verbatim: true })).map((a) => a.address)

/** Resolves the host and fails if ANY address is non-public. Returns the addresses. */
export async function assertPublicHost(hostname: string, resolve: Resolver = resolveHost): Promise<string[]> {
  const bare = hostname.replace(/^\[|\]$/g, '')
  if (isIP(bare)) {
    if (isBlockedAddress(bare)) throw new SafeFetchError('blocked', 'That address points to a private network and can’t be checked.')
    return [bare]
  }
  let addresses: string[]
  try {
    addresses = await resolve(bare)
  } catch {
    throw new SafeFetchError('not-found', 'We couldn’t find that website.')
  }
  if (addresses.length === 0) throw new SafeFetchError('not-found', 'We couldn’t find that website.')
  if (addresses.some(isBlockedAddress)) {
    throw new SafeFetchError('blocked', 'That address points to a private network and can’t be checked.')
  }
  return addresses
}

/** Normalises and checks a customer URL without fetching it (used before starting a scan). */
export async function validatePublicUrl(input: string, resolve: Resolver = resolveHost): Promise<URL> {
  const url = normaliseUrl(input)
  await assertPublicHost(url.hostname, resolve)
  return url
}

/* -------------------------------------------------------------------------- */
/*  Transport                                                                 */
/* -------------------------------------------------------------------------- */

export type HopResponse = { status: number; headers: Record<string, string>; body: Uint8Array; truncated: boolean }
/** Makes one request to `url`, connecting only to the already-checked `address`. */
export type Transport = (url: URL, address: string, signal: AbortSignal, maxBytes: number) => Promise<HopResponse>

const REDIRECTS = new Set([301, 302, 303, 307, 308])

/** Reads a stream up to `maxBytes`, then stops (and flags it) rather than buffering more. */
export function readCapped(stream: Readable, maxBytes: number): Promise<{ body: Uint8Array; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let done = false
    const finish = (truncated: boolean) => {
      if (done) return
      done = true
      resolve({ body: Buffer.concat(chunks, Math.min(size, maxBytes)), truncated })
    }
    stream.on('data', (chunk: Buffer) => {
      if (done) return
      chunks.push(chunk)
      size += chunk.length
      if (size > maxBytes) {
        finish(true)
        stream.destroy()
      }
    })
    stream.on('end', () => finish(false))
    stream.on('error', (error) => { if (!done) { done = true; reject(error) } })
  })
}

function decoded(res: http.IncomingMessage): Readable {
  switch (String(res.headers['content-encoding'] ?? '').toLowerCase()) {
    case 'gzip': return res.pipe(zlib.createGunzip())
    case 'deflate': return res.pipe(zlib.createInflate())
    case 'br': return res.pipe(zlib.createBrotliDecompress())
    default: return res
  }
}

export const nodeTransport: Transport = (url, address, signal, maxBytes) =>
  new Promise((resolve, reject) => {
    const family = isIP(address)
    // Pin the socket to the address we validated, whatever DNS says now.
    const lookup = ((_host: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) => {
      if (options?.all) callback(null, [{ address, family }])
      else callback(null, address, family)
    }) as unknown as LookupFunction
    const client = url.protocol === 'https:' ? https : http
    const req = client.request(
      {
        protocol: url.protocol,
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port: url.port || undefined,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        lookup,
        signal,
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
          'accept-encoding': 'gzip, deflate, br',
        },
      },
      (res) => {
        const headers: Record<string, string> = {}
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : v
        const status = res.statusCode ?? 0
        if (REDIRECTS.has(status)) {
          res.resume()
          resolve({ status, headers, body: new Uint8Array(), truncated: false })
          return
        }
        readCapped(decoded(res), maxBytes).then(({ body, truncated }) => resolve({ status, headers, body, truncated }), reject)
      },
    )
    req.on('error', reject)
    req.end()
  })

/* -------------------------------------------------------------------------- */
/*  safeFetch                                                                 */
/* -------------------------------------------------------------------------- */

export type SafeResponse = {
  /** The final URL after redirects. */
  url: string
  status: number
  headers: Record<string, string>
  text: string
  truncated: boolean
  redirects: string[]
  elapsedMs: number
}

export type SafeFetchOptions = {
  resolve?: Resolver
  transport?: Transport
  timeoutMs?: number
  maxBytes?: number
}

export async function safeFetch(input: string | URL, options: SafeFetchOptions = {}): Promise<SafeResponse> {
  const { resolve = resolveHost, transport = nodeTransport, timeoutMs = TIMEOUT_MS, maxBytes = MAX_BODY_BYTES } = options
  const started = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const redirects: string[] = []
  try {
    let current = normaliseUrl(typeof input === 'string' ? input : input.href)
    for (;;) {
      const [address] = await assertPublicHost(current.hostname, resolve)
      const hop = await Promise.race([
        transport(current, address, controller.signal, maxBytes),
        new Promise<never>((_, reject) => {
          if (controller.signal.aborted) reject(new SafeFetchError('timeout', 'The website took too long to respond.'))
          controller.signal.addEventListener('abort', () => reject(new SafeFetchError('timeout', 'The website took too long to respond.')), { once: true })
        }),
      ])
      const location = hop.headers.location
      if (REDIRECTS.has(hop.status) && location) {
        if (redirects.length >= MAX_REDIRECTS) throw new SafeFetchError('redirects', 'The website redirected too many times.')
        let next: URL
        try { next = new URL(location, current) } catch { throw new SafeFetchError('invalid', 'The website redirected to an invalid address.') }
        current = normaliseUrl(next.href)
        redirects.push(current.href)
        continue
      }
      return {
        url: current.href,
        status: hop.status,
        headers: hop.headers,
        text: new TextDecoder('utf-8').decode(hop.body),
        truncated: hop.truncated,
        redirects,
        elapsedMs: Math.round(performance.now() - started),
      }
    }
  } catch (error) {
    if (error instanceof SafeFetchError) throw error
    if (controller.signal.aborted) throw new SafeFetchError('timeout', 'The website took too long to respond.')
    throw new SafeFetchError('network', 'We couldn’t connect to that website.')
  } finally {
    clearTimeout(timer)
  }
}
