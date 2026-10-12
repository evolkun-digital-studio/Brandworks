declare const process: {
  readonly env: {
    readonly NEXT_PUBLIC_MEDIA_BASE_URL?: string
  }
}

/**
 * Next replaces this public value directly. Vite maps its existing
 * VITE_MEDIA_BASE_URL value to the same expression in vite.config.ts.
 */
export const MEDIA_BASE_URL_OVERRIDE = process.env.NEXT_PUBLIC_MEDIA_BASE_URL
