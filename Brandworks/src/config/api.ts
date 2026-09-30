// Base URL of the backend API — the one place the frontend reads it;
// src/admin/api/client.ts and src/blog/api/client.ts both import it
// from here. Not a secret — just config — so it's fine as a VITE_
// variable; server-side secrets (JWT_SECRET, MONGODB_URI) live only in
// the backend's .env and are never exposed here.
//
// http://localhost:4001 is a development-only fallback. The
// `import.meta.env.DEV` guard is replaced with a literal `false` in a
// production build, so that branch — and the localhost URL with it —
// is removed from the production bundle entirely. A production build
// with VITE_API_BASE_URL unset therefore calls its own origin
// (`/api/...`) rather than a visitor's localhost.
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

// Trailing slashes are dropped so `https://api.example.com/` and
// `https://api.example.com` both produce `.../api/blogs`, never `//api`.
export const API_BASE_URL: string = (
  configuredBaseUrl || (import.meta.env.DEV ? 'http://localhost:4001' : '')
).replace(/\/+$/, '')
