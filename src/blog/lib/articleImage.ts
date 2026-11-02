/**
 * The image vocabulary shared by the admin editor, the stored article HTML and
 * the public renderer. Layout lives in constrained data attributes on <figure>;
 * only the renderers turn those values into CSS custom properties, so stored
 * content never needs an inline style.
 */

declare const process: { readonly env: { readonly NEXT_PUBLIC_APP_RUNTIME?: string } }

export const IMAGE_ALIGNS = ['left', 'center', 'right', 'full'] as const
export const IMAGE_WRAPS = ['left', 'right'] as const
export type ImageAlign = (typeof IMAGE_ALIGNS)[number]
export type ImageWrap = (typeof IMAGE_WRAPS)[number]

export const MIN_IMAGE_WIDTH = 10
export const IMAGE_WIDTH_PATTERN = /^(?:[1-9]\d|100)$/
export const IMAGE_RATIO_PATTERN = /^\d{1,2}(?:\.\d{1,3})?$/
export const IMAGE_DIMENSION_PATTERN = /^[1-9]\d{0,4}$/

/** Width as a whole percentage of the article column, or null when absent or invalid. */
export function parseImageWidth(value: unknown): number | null {
  if (typeof value !== 'string' || !IMAGE_WIDTH_PATTERN.test(value)) return null
  return Number(value)
}

/** Width ÷ height, set only after a free (Shift) resize changes the image's shape. */
export function parseImageRatio(value: unknown): number | null {
  if (typeof value !== 'string' || !IMAGE_RATIO_PATTERN.test(value)) return null
  const ratio = Number(value)
  return ratio >= 0.05 && ratio <= 20 ? ratio : null
}

export function imageFigureVars(width: number | null, ratio: number | null): Record<string, string> {
  const vars: Record<string, string> = {}
  if (width !== null) vars['--rc-image-width'] = `${width}%`
  if (ratio !== null) vars['--rc-image-ratio'] = String(ratio)
  return vars
}

const MEDIA_PATH = /^(?:https?:\/\/[^/]+)?(\/api\/media\/[a-z0-9]+)$/i
const SOURCE_WIDTHS = [384, 640, 1080, 1200, 1920] as const
const ARTICLE_COLUMN = 760

/**
 * A responsive srcset for images served from the media library, using the same
 * Next optimizer as the admin previews. External images and SVGs are left alone.
 */
export function imageSources(
  src: string,
  widthPercent: number | null,
  // The legacy Vite build has no image optimizer to point at.
  runtime = process.env.NEXT_PUBLIC_APP_RUNTIME,
): { srcSet: string; sizes: string } | null {
  if (runtime === 'vite') return null
  const path = MEDIA_PATH.exec(src)?.[1]
  if (!path) return null
  const srcSet = SOURCE_WIDTHS.map((width) => `/_next/image?url=${encodeURIComponent(path)}&w=${width}&q=75 ${width}w`).join(', ')
  const rendered = Math.round((ARTICLE_COLUMN * (widthPercent ?? 100)) / 100)
  return { srcSet, sizes: `(max-width: 680px) 100vw, ${rendered}px` }
}
