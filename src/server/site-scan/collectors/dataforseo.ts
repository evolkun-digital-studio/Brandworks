/**
 * Minimal DataForSEO v3 client: HTTP Basic auth, one task per Live call,
 * and their two-level status codes (20000 = OK at both the request and the
 * task level).
 */
import { envValue, type CollectorDeps } from '../types'

export const DATAFORSEO_BASE = 'https://api.dataforseo.com/v3'
const TIMEOUT_MS = 20_000

export function dataForSeoCredentials(deps: CollectorDeps): { login: string; password: string } | null {
  const login = envValue(deps, 'DATAFORSEO_LOGIN')
  const password = envValue(deps, 'DATAFORSEO_PASSWORD')
  return login && password ? { login, password } : null
}

type DfsResponse<T> = {
  status_code?: number
  status_message?: string
  tasks?: { status_code?: number; status_message?: string; result?: T[] | null }[]
}

/** Returns the first result object, or throws an Error whose message explains the failure. */
export async function dataForSeoLive<T>(
  path: string,
  task: Record<string, unknown>,
  credentials: { login: string; password: string },
  deps: CollectorDeps,
): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await (deps.fetch ?? fetch)(`${DATAFORSEO_BASE}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Basic ${Buffer.from(`${credentials.login}:${credentials.password}`).toString('base64')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify([task]),
    })
    if (!response.ok) throw new Error(`DataForSEO responded ${response.status}`)
    const body = (await response.json()) as DfsResponse<T>
    if (body.status_code !== 20000) throw new Error(`DataForSEO error ${body.status_code ?? '?'}: ${body.status_message ?? 'unknown'}`)
    const first = body.tasks?.[0]
    if (!first || first.status_code !== 20000) {
      throw new Error(`DataForSEO task error ${first?.status_code ?? '?'}: ${first?.status_message ?? 'no task returned'}`)
    }
    return first.result?.[0] ?? null
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('DataForSEO timed out')
    throw error instanceof Error ? error : new Error('DataForSEO request failed')
  } finally {
    clearTimeout(timer)
  }
}
