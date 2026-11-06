import { isIP } from 'node:net'

/**
 * Client identity for rate limiting, read safely behind a reverse proxy.
 *
 * What the app can see: a Route Handler only gets the request headers, never
 * the socket address. The standalone Next server fills X-Forwarded-For with
 * the socket address only when the header is ABSENT (`??=` in
 * next/dist/server/base-server.js); a client-sent header is kept as is.
 *
 * So whether the header can be trusted depends entirely on what sits in
 * front of the app, which this code cannot detect:
 *
 *   - A proxy that APPENDS the address it saw (Apache mod_proxy_http with its
 *     default `ProxyAddHeaders On`) produces `<client-supplied…>, <real IP>`.
 *     Only the last TRUSTED_PROXY_HOPS entries were written by trusted proxies.
 *   - A proxy that passes the client's header through unchanged, or a port
 *     reachable without the proxy, makes every entry attacker-controlled.
 *
 * Therefore nothing is trusted by default. TRUSTED_PROXY_HOPS must be set
 * explicitly, to the number of appending proxies, after confirming the
 * production proxy configuration (docs/PRODUCTION_DEPLOYMENT.md). Until then
 * every client shares one 'unknown' bucket: rate limits stay enforced, just
 * not per client. X-Real-IP is never read: Apache does not set it, so it
 * would arrive straight from the client.
 */

export const UNKNOWN_CLIENT = 'unknown'
/** Upper bound for TRUSTED_PROXY_HOPS; anything larger is treated as a misconfiguration. */
export const MAX_TRUSTED_PROXY_HOPS = 5

let warned = false
function warnOnce(message: string) {
  if (warned || process.env.NODE_ENV === 'test') return
  warned = true
  console.warn(`[client-ip] ${message}`)
}

/** Number of trusted, appending proxies in front of the app. Unset or invalid → 0 (trust nothing). */
export function trustedProxyHops(source: NodeJS.ProcessEnv = process.env): number {
  const raw = source.TRUSTED_PROXY_HOPS?.trim()
  if (!raw) {
    if (source.NODE_ENV === 'production') {
      warnOnce('TRUSTED_PROXY_HOPS is not set: forwarding headers are ignored and all clients share one rate-limit bucket.')
    }
    return 0
  }
  if (!/^\d+$/.test(raw) || Number(raw) > MAX_TRUSTED_PROXY_HOPS) {
    warnOnce(`TRUSTED_PROXY_HOPS must be an integer from 0 to ${MAX_TRUSTED_PROXY_HOPS}; forwarding headers are ignored.`)
    return 0
  }
  return Number(raw)
}

/** A bare IPv4/IPv6 address, or null. Strips `[v6]`, `v4:port` and the IPv4-mapped IPv6 prefix. */
export function normalizeIp(value: string): string | null {
  let candidate = value.trim()
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(candidate)
  if (bracketed) candidate = bracketed[1]
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(candidate)) candidate = candidate.slice(0, candidate.lastIndexOf(':'))
  candidate = candidate.toLowerCase().replace(/^::ffff:(\d{1,3}(\.\d{1,3}){3})$/, '$1')
  return isIP(candidate) ? candidate : null
}

/**
 * The client address written by the outermost trusted proxy, or 'unknown'.
 * Never falls back to an entry left of the trusted ones: those are whatever
 * the client sent.
 */
export function clientIp(request: Pick<Request, 'headers'>, hops = trustedProxyHops()): string {
  if (hops <= 0) return UNKNOWN_CLIENT
  const chain = request.headers.get('x-forwarded-for')?.split(',').map((entry) => entry.trim()) ?? []
  // Fewer entries than trusted proxies: the request did not pass through all
  // of them (e.g. it reached the app port directly), so nothing is trusted.
  if (chain.length < hops) return UNKNOWN_CLIENT
  return normalizeIp(chain[chain.length - hops]) ?? UNKNOWN_CLIENT
}

/**
 * Rate-limit bucket for a client. IPv6 clients are grouped by /64, the
 * smallest block a single subscriber is normally given, so rotating
 * addresses inside one allocation does not reset a limit.
 */
export function rateLimitKey(request: Pick<Request, 'headers'>, hops = trustedProxyHops()): string {
  const ip = clientIp(request, hops)
  if (isIP(ip) !== 6) return ip
  return `${expandIpv6(ip).slice(0, 4).join(':')}::/64`
}

function expandIpv6(ip: string): string[] {
  const [head, tail = ''] = ip.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const missing = ip.includes('::') ? 8 - left.length - right.length : 0
  return [...left, ...Array(missing).fill('0'), ...right].map((group) => group.padStart(4, '0'))
}
