// Next serves the APIs on the same origin, so its base stays empty.
// Vite temporarily injects its legacy API origin through the Vite-only
// runtime marker below while its reference implementation remains active.
declare const process: {
  readonly env: {
    readonly NEXT_PUBLIC_API_BASE_URL?: string
    readonly NEXT_PUBLIC_APP_RUNTIME?: string
  }
}

const configuredViteBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

// Trailing slashes are dropped for the legacy Vite adapter. In Next,
// this remains '' and callers use same-origin /api/... paths.
export const API_BASE_URL: string = process.env.NEXT_PUBLIC_APP_RUNTIME === 'vite'
  ? (configuredViteBaseUrl || '').replace(/\/+$/, '')
  : ''
