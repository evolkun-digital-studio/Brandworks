/**
 * The client IP for rate limiting, read safely behind a reverse proxy.
 *
 * Apache (mod_proxy) *appends* the address it saw to X-Forwarded-For, so the
 * header looks like `<anything the client sent>, <real client IP>`. The first
 * entry is attacker-controlled; only the last TRUSTED_PROXY_HOPS entries were
 * written by proxies we run. With one Apache hop (the default) the real client
 * is the last entry. Next.js only fills X-Forwarded-For when it is absent, so
 * it never adds an entry of its own behind a proxy.
 *
 * X-Real-IP is ignored: Apache does not set it, so it would pass through from
 * the client untouched.
 *
 * TRUSTED_PROXY_HOPS=0 means the app is reached directly; forwarding headers
 * are then ignored entirely and every caller shares the 'unknown' bucket
 * (Request objects do not expose the socket address).
 */
export function trustedProxyHops(source: NodeJS.ProcessEnv = process.env): number {
  const raw = source.TRUSTED_PROXY_HOPS?.trim()
  if (!raw) return 1
  const hops = Number(raw)
  return Number.isInteger(hops) && hops >= 0 ? hops : 1
}

export function clientIp(request: Pick<Request, 'headers'>, hops = trustedProxyHops()): string {
  if (hops === 0) return 'unknown'
  const chain = request.headers.get('x-forwarded-for')
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (!chain?.length) return 'unknown'
  // With more hops than entries the request skipped a proxy; fall back to the
  // left-most entry rather than trusting nothing.
  return chain[Math.max(0, chain.length - hops)]
}
