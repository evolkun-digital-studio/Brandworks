const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/

/**
 * Normalizes a submitted username/login ID for storage and lookup.
 * Lowercased so uniqueness (and the unique index) can't be bypassed
 * by case alone (e.g. "Admin" vs "admin").
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

/**
 * Server-side username policy — this is the only validation that
 * matters; any client-side check is a convenience, not a guarantee.
 */
export function validateUsername(username: string): string | null {
  if (typeof username !== 'string' || username.trim().length === 0) {
    return 'Username is required.'
  }
  const normalized = normalizeUsername(username)
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Username must be 3-32 characters and may only contain lowercase letters, numbers, dots, underscores, and hyphens.'
  }
  return null
}
