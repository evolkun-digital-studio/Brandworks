/**
 * Normalizes bundler-managed asset imports without changing their runtime URL.
 * Vite returns a string; Next.js returns an object for supported image formats.
 */
export type BundledAsset = string | { readonly src: string }

export function assetUrl(asset: BundledAsset): string {
  return typeof asset === 'string' ? asset : asset.src
}
