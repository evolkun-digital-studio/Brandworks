import type { SVGProps } from 'react'
import { LOGO_VIEWBOX, MARK_B, MARK_SPARKLE, MARK_W, WORD_BRAND, WORD_WORKS } from './logoPaths'

/**
 * The BrandWorks logo as inline SVG, one <g> per part, so each part can
 * be coloured, masked or animated on its own (the Preloader's liquid fill
 * depends on this). For a plain logo on the page, use <Logo /> instead:
 * it's an <img> of the same artwork and stays cached.
 *
 * ── Replacing the artwork ────────────────────────────────────────────
 * 1. Export the new logo from your design tool as SVG with every shape
 *    outlined (no live text) and no transforms on the paths.
 * 2. Put each shape's `d` attribute into the matching array in
 *    logoPaths.ts (MARK_B, MARK_W, MARK_SPARKLE, WORD_BRAND, WORD_WORKS).
 *    A part can hold any number of paths; an empty array is fine.
 * 3. Update LOGO_VIEWBOX to the new SVG's viewBox width and height.
 * 4. If the brand colours change, update LOGO_COLORS below, and replace
 *    public/BWorksLogo-01.svg (and -dark.svg) so the navbar <img> matches
 *    the inline copy exactly, or the preloader's handoff will show a seam.
 */

export type LogoPart = 'b' | 'w' | 'sparkle' | 'brand' | 'works'
export type LogoPalette = Record<LogoPart, string>

export const LOGO_PARTS: Record<LogoPart, readonly string[]> = {
  b: MARK_B,
  w: MARK_W,
  sparkle: MARK_SPARKLE,
  brand: WORD_BRAND,
  works: WORD_WORKS,
}

/** Draw order: the sparkle sits on top of the W. */
const ORDER: readonly LogoPart[] = ['w', 'b', 'sparkle', 'brand', 'works']

/** Exactly public/BWorksLogo-01.svg, the logo the navbar shows on dark grounds. */
export const LOGO_COLORS: LogoPalette = {
  b: '#cbfe00',
  w: '#48484a',
  sparkle: '#fefeff',
  brand: '#48484a',
  works: '#cbfe00',
}

/** public/BWorksLogo-dark.svg: one colour, for light grounds. */
export const LOGO_DARK: LogoPalette = {
  b: '#111111',
  w: '#111111',
  sparkle: '#111111',
  brand: '#111111',
  works: '#111111',
}

export const LOGO_VIEWBOX_STRING = `0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`

/** The parts as bare <g> groups, for use inside an <svg> you control (masks, layers). */
export function LogoParts({ palette }: { palette: LogoPalette }) {
  return (
    <>
      {ORDER.map((part) => (
        <g key={part} data-part={part} style={{ fill: palette[part] }}>
          {LOGO_PARTS[part].map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ))}
    </>
  )
}

type BrandWorksLogoProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'> & {
  palette?: LogoPalette
  title?: string
}

/** Standalone inline logo. Size it by width or height in CSS; the other side follows the viewBox. */
export default function BrandWorksLogo({ palette = LOGO_COLORS, title = 'BrandWorks', ...props }: BrandWorksLogoProps) {
  return (
    <svg viewBox={LOGO_VIEWBOX_STRING} role="img" aria-label={title} {...props}>
      <LogoParts palette={palette} />
    </svg>
  )
}
