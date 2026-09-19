// Base URL of the backend API. Not a secret — just config — so it's
// fine as a VITE_ variable; server-side secrets (JWT_SECRET,
// MONGODB_URI) live only in backend/.env and are never exposed here.
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4001'

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
