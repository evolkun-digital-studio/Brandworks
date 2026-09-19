import argon2 from 'argon2'

/**
 * Password hashing, isolated behind this module so the rest of the
 * codebase never touches the algorithm directly. Argon2id is the
 * current OWASP-recommended default for password hashing.
 */

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id })
}

export async function verifyPassword(
  hash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain)
  } catch {
    // A malformed/foreign hash should fail verification, not throw.
    return false
  }
}

const MIN_LENGTH = 10
const MAX_LENGTH = 128

/**
 * Server-side password policy. Deliberately simple (length + a letter
 * and a number) rather than an elaborate ruleset — the hashing
 * algorithm does the real security work.
 */
export function validatePassword(password: string): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.'
  }
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters long.`
  }
  if (password.length > MAX_LENGTH) {
    return `Password must be at most ${MAX_LENGTH} characters long.`
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.'
  }
  return null
}
