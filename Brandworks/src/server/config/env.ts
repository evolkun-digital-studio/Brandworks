import 'server-only'

/** Read only when a database connection is first requested. Never include the value in an error. */
export function requireMongoUri(source: NodeJS.ProcessEnv = process.env): string {
  const uri = source.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required for database access.')
  return uri
}

/** JWT signing material is server-only and is read lazily by auth code. */
export function requireJwtSecret(source: NodeJS.ProcessEnv = process.env): string {
  const secret = source.JWT_SECRET?.trim()
  if (!secret) throw new Error('JWT_SECRET is required for admin authentication.')
  return secret
}

export function jwtExpiresIn(source: NodeJS.ProcessEnv = process.env): string {
  return source.JWT_EXPIRES_IN?.trim() || '8h'
}

/** Mirrors the reference backend's origin selection without guessing a production domain. */
export function resolvePublicOrigin(source: NodeJS.ProcessEnv = process.env): string {
  const production = (source.NODE_ENV || 'development') === 'production'
  const configured = source.PUBLIC_ORIGIN?.trim()
  if (!configured && production) throw new Error('PUBLIC_ORIGIN is required in production.')
  const fallback = source.FRONTEND_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173'
  const raw = configured || fallback
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('PUBLIC_ORIGIN must be a valid absolute URL.') }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('PUBLIC_ORIGIN must use http or https.')
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error('PUBLIC_ORIGIN must be an origin only, with no path, query string, or fragment.')
  }
  return url.origin
}
