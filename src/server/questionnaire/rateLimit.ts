/**
 * A small per-process sliding-window limiter, the same trade-off the admin
 * login limiter makes (see app/api/README.md): good enough to stop a single
 * client hammering the AI endpoint, not a shared limiter for multi-instance
 * deployments.
 */
const buckets = new Map<string, number[]>()
let lastSweep = 0

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** Records a hit and reports whether it is within `limit` per `windowMs`. */
export function allow(scope: string, key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (now - lastSweep > windowMs) {
    for (const [k, hits] of buckets) if (!hits.some((t) => now - t < windowMs)) buckets.delete(k)
    lastSweep = now
  }
  const id = `${scope}:${key}`
  const recent = (buckets.get(id) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    buckets.set(id, recent)
    return false
  }
  recent.push(now)
  buckets.set(id, recent)
  return true
}
