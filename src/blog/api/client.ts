// Same base URL / env var as src/admin/api/client.ts — one backend,
// one config source. Unlike the admin client, this never sends
// credentials: these endpoints require no auth and shouldn't carry
// the admin session cookie even if one happens to exist in the browser.
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:4001'

export class PublicApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'PublicApiError'
    this.status = status
  }
}

/** Thin fetch wrapper for the public blog API — no credentials, GET only. */
export async function publicApiRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api${path}`)

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
    throw new PublicApiError(res.status, message)
  }

  return data as T
}
