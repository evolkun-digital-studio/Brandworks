// Official Evolkun website, linked from the Technology page ("Technology by
// Evolkun", "Visit Evolkun"). Set VITE_EVOLKUN_URL to the real address —
// it is deliberately not guessed here. Only an absolute http(s) URL is
// accepted; anything else leaves EVOLKUN_URL empty, and the links render
// as plain text until it is configured.
declare const process: { readonly env: { readonly NEXT_PUBLIC_EVOLKUN_URL?: string } }

const configured = process.env.NEXT_PUBLIC_EVOLKUN_URL?.trim() ?? ''

function absoluteHttpUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

export const EVOLKUN_URL: string = absoluteHttpUrl(configured)
