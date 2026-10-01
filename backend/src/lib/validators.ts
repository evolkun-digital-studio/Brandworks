const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/
const EMAIL_LOGIN_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/
const MAX_EMAIL_LOGIN_LENGTH = 254

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
  const isUsername = USERNAME_PATTERN.test(normalized)
  const isEmailLogin =
    normalized.length <= MAX_EMAIL_LOGIN_LENGTH &&
    EMAIL_LOGIN_PATTERN.test(normalized)

  if (!isUsername && !isEmailLogin) {
    return 'Login ID must be a 3-32 character username or a valid email address.'
  }
  return null
}
