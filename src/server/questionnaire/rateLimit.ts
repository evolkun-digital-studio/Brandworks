/**
 * A small per-process sliding-window limiter, the same trade-off the admin
 * login limiter makes (see app/api/README.md): good enough to stop a single
 * client hammering the AI endpoint, not a shared limiter for multi-instance
 * deployments.
 */
import { clientIp } from '../http/clientIp'

const buckets = new Map<string, number[]>()
let lastSweep = 0

/** Proxy-aware client IP; see src/server/http/clientIp.ts for why not the first X-Forwarded-For entry. */
export function clientKey(request: Request): string {
  return clientIp(request)
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
