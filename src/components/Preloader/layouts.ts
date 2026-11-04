/**
 * The cut list for the preloader, desktop and compact (≤767px). Boxes
 * are percentages of the viewport and are fixed in the markup — nothing
 * here is ever animated through layout. Images are indexes into the
 * pool from preloaderMedia.ts; every index listed is preloaded and
 * decoded before the timeline starts.
 *
 * Kept as data, separate from the GSAP choreography in timeline.ts, so
 * the edit can be re-cut without touching animation code. No frame is
 * full-bleed: white stays in shot the whole way through.
 */
export type Box = { x: number; y: number; w: number; h: number }

/** The edge a frame is uncovered from. */
export type Edge = 'top' | 'bottom' | 'left' | 'right'
export type ShotEntrance = Edge | 'slices'
export type Shot = { image: number; box: Box; enter: ShotEntrance }
/** A panel uncovers from `from`, then cuts through `images` in place. */
export type Panel = { box: Box; from: Edge; images: number[] }

/**
 * A thin strip of tiles running across the screen. `at` is its top and
 * `size` its height, both in %. `travel` is how far the track slides, as
 * % of its own length — keep it under the share of the track that
 * overhangs the viewport (~50% for 12 tiles of 16vw) or its end shows.
 */
export type Strip = { at: number; size: number; reverse: boolean; travel: number }

export type PreloaderLayout = {
  /** Which size the single frames use (lg exists only for the desktop shot images). */
  shotSize: 'lg' | 'md'
  shots: Shot[]
  panels: Panel[]
  strips: Strip[]
  slices: number
  stripTiles: number
}

export const WORDMARK = 'Brandworks.me'

export const DESKTOP_LAYOUT: PreloaderLayout = {
  shotSize: 'lg',
  shots: [
    { image: 0, box: { x: 35, y: 16, w: 30, h: 68 }, enter: 'bottom' },
    { image: 1, box: { x: 9, y: 14, w: 54, h: 66 }, enter: 'left' },
    { image: 2, box: { x: 55, y: 9, w: 31, h: 78 }, enter: 'top' },
    { image: 3, box: { x: 15, y: 11, w: 70, h: 76 }, enter: 'bottom' },
    { image: 4, box: { x: 25, y: 20, w: 50, h: 60 }, enter: 'left' },
    { image: 5, box: { x: 47, y: 11, w: 36, h: 76 }, enter: 'right' },
    { image: 7, box: { x: 11, y: 9, w: 78, h: 82 }, enter: 'slices' },
  ],
  // Two loose rows, nothing aligned to a common grid line:
  // [ tall ][  wide  ][ narrow ]
  //         [ sq ][   wide   ]
  panels: [
    { box: { x: 5, y: 9, w: 30, h: 54 }, from: 'top', images: [8, 9, 10] },
    { box: { x: 38, y: 21, w: 34, h: 31 }, from: 'left', images: [11, 12, 13] },
    { box: { x: 75, y: 6, w: 19, h: 42 }, from: 'bottom', images: [14, 15, 16] },
    { box: { x: 38, y: 57, w: 21, h: 35 }, from: 'right', images: [17, 18, 19] },
    { box: { x: 62, y: 52, w: 32, h: 39 }, from: 'top', images: [20, 21, 22] },
  ],
  strips: [
    { at: 15, size: 6, reverse: false, travel: 22 },
    { at: 79, size: 6, reverse: true, travel: 26 },
  ],
  slices: 5,
  stripTiles: 12,
}

/** Lighter: fewer frames, two panels, no sliced frame, shorter strips. */
export const COMPACT_LAYOUT: PreloaderLayout = {
  shotSize: 'md',
  shots: [
    { image: 0, box: { x: 14, y: 19, w: 72, h: 54 }, enter: 'bottom' },
    { image: 1, box: { x: 6, y: 24, w: 88, h: 42 }, enter: 'left' },
    { image: 2, box: { x: 12, y: 13, w: 76, h: 72 }, enter: 'top' },
    { image: 3, box: { x: 6, y: 14, w: 88, h: 70 }, enter: 'bottom' },
  ],
  panels: [
    { box: { x: 6, y: 9, w: 56, h: 38 }, from: 'top', images: [4, 5, 6] },
    { box: { x: 24, y: 51, w: 70, h: 34 }, from: 'bottom', images: [7, 8, 9] },
  ],
  strips: [
    { at: 20, size: 5.5, reverse: false, travel: 26 },
    { at: 74, size: 5.5, reverse: true, travel: 30 },
  ],
  slices: 4,
  stripTiles: 6,
}
