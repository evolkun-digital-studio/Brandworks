import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

/**
 * Admin session tokens. Kept intentionally minimal — the payload only
 * identifies *who*, never *what they're allowed to do*. Role/enabled
 * status are always re-checked against the database on every request
 * (see middleware/requireAuth.ts) so a token can't outlive a role
 * change, a disable, or a deletion.
 */
export interface AdminTokenPayload {
  sub: string
}

export function signAdminToken(adminId: string): string {
  const payload: AdminTokenPayload = { sub: adminId }
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

/** Returns the payload if the token is valid and unexpired, otherwise null. */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret)
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      typeof (decoded as { sub?: unknown }).sub === 'string'
    ) {
      return { sub: (decoded as { sub: string }).sub }
    }
    return null
  } catch {
    // Covers expired, malformed, and signature-mismatched tokens alike —
    // all of them just mean "not authenticated".
    return null
  }
}
