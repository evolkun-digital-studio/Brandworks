import { API_BASE_URL } from '../../config/api'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Thin fetch wrapper for the admin API. Always sends `credentials:
 * 'include'` so the httpOnly session cookie is attached — the token
 * itself is never touched or stored in JS on this side.
 */
export async function adminApiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/admin${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 204) {
    return undefined as T
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // No/invalid JSON body — fall through to status-based handling below.
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      `Request failed with status ${res.status}.`
    throw new ApiError(res.status, message)
  }

  return data as T
}

export async function adminApiFormRequest<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/admin${path}`, {
    method: 'POST', credentials: 'include', body: form,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null) as { error?: string } | null
  if (!res.ok) throw new ApiError(res.status, data?.error ?? `Request failed with status ${res.status}.`)
  return data as T
}
