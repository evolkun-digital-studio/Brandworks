/**
 * Measures the wordmark so the SVG that masks photography into it can be
 * cropped to the glyphs' real ink bounds (not the font's em box, which
 * would leave the word floating off-centre) and split into one image
 * column per letter.
 *
 * Every glyph gets an explicit x position (SVG <text x="x0 x1 …">), taken
 * from canvas pen advances plus the tracking below. Canvas and SVG share
 * the font engine, so the clip path, the solid fill and the photo columns
 * all sit on exactly the same coordinates — and tracking never depends on
 * CSS letter-spacing support in either.
 */

/** The site's display face — the one the hero headline is set in. */
export const WORD_FONT_STACK = `Grimblade, 'Helvetica Neue', Arial, sans-serif`
/** Used only if Grimblade hasn't arrived in time, so it can never swap in mid-animation. */
export const WORD_FALLBACK_STACK = `'Helvetica Neue', Arial, sans-serif`
export const WORD_FONT_SIZE = 200
/** Matches .hero-title's -0.01em. */
const TRACKING = -0.01 * WORD_FONT_SIZE

export type WordGlyph = { x: number; width: number }
export type WordGeometry = {
  text: string
  family: string
  width: number
  height: number
  /** Pen position of each character. */
  xs: number[]
  baseline: number
  /** One image column per character, covering the word edge to edge. */
  glyphs: WordGlyph[]
}

/** Fallback proportions, used only if canvas metrics are unavailable. */
function estimate(text: string, family: string): WordGeometry {
  const height = WORD_FONT_SIZE * 0.74
  const advance = WORD_FONT_SIZE * 0.56
  const xs = Array.from(text, (_, i) => i * advance)
  return {
    text,
    family,
    width: text.length * advance,
    height,
    xs,
    baseline: height,
    glyphs: xs.map((x) => ({ x, width: advance })),
  }
}

export function measureWord(text: string, family: string): WordGeometry {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return estimate(text, family)
  ctx.font = `400 ${WORD_FONT_SIZE}px ${family}`

  const m = ctx.measureText(text)
  const n = text.length
  const height = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
  const width = m.actualBoundingBoxLeft + m.actualBoundingBoxRight + (n - 1) * TRACKING
  if (!width || !height) return estimate(text, family)

  // Pen positions: canvas advances (kerning included) plus tracking,
  // shifted so the ink starts exactly at x = 0.
  const origin = m.actualBoundingBoxLeft
  const xs = Array.from(text, (_, i) => origin + ctx.measureText(text.slice(0, i)).width + i * TRACKING)

  // Columns split at each pen position; the outer two stretch to the ink
  // bounds so overhangs are always covered.
  const glyphs = xs.map((x, i) => {
    const start = i === 0 ? 0 : x
    const end = i === n - 1 ? width : xs[i + 1]
    return { x: start, width: end - start }
  })

  return { text, family, width, height, xs, baseline: m.actualBoundingBoxAscent, glyphs }
}

/**
 * Rasterises the word's shape once, at the size it will be displayed and
 * at device resolution, for use as a CSS mask over the photo layer. It
 * draws every glyph at the same pen positions the solid SVG text uses,
 * so the masked photographs and the solid wordmark cover exactly the
 * same shapes. Returns null if canvas is unavailable.
 */
export function renderWordMask(geometry: WordGeometry, cssWidth: number): string | null {
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const scale = (cssWidth * dpr) / geometry.width
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(geometry.width * scale))
  canvas.height = Math.max(1, Math.round(geometry.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.font = `400 ${WORD_FONT_SIZE * scale}px ${geometry.family}`
  ctx.fillStyle = '#000'
  Array.from(geometry.text).forEach((char, i) => ctx.fillText(char, geometry.xs[i] * scale, geometry.baseline * scale))
  return canvas.toDataURL('image/png')
}
