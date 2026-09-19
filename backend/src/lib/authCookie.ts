import type { Response } from 'express'
import { isProduction } from '../config/env.js'

/**
 * The admin session token is stored in an httpOnly cookie rather than
 * in localStorage/sessionStorage so client-side JavaScript (and by
 * extension a successful XSS payload) can never read it directly.
 * `sameSite: 'lax'` stops it being attached to cross-site state-changing
 * requests (CSRF), and `secure` is enforced once the app runs over HTTPS.
 */
export const ADMIN_COOKIE_NAME = 'admin_session'

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8 hours, matches the default JWT expiry

export function setAdminSessionCookie(res: Response, token: string) {
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  })
}

export function clearAdminSessionCookie(res: Response) {
  res.clearCookie(ADMIN_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  })
}
