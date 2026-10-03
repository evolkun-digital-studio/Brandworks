// Official Evolkun website, linked from the Technology page ("Technology by
// Evolkun", "Visit Evolkun"). Set VITE_EVOLKUN_URL to the real address —
// it is deliberately not guessed here. Only an absolute http(s) URL is
// accepted; anything else leaves EVOLKUN_URL empty, and the links render
// as plain text until it is configured.
const configured = (import.meta.env.VITE_EVOLKUN_URL as string | undefined)?.trim() ?? ''

function absoluteHttpUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

export const EVOLKUN_URL: string = absoluteHttpUrl(configured)
