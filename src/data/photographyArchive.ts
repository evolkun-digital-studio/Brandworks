/**
 * Photography archive for /services/photography. Every frame lives in
 * src/assets/photography as `<file>-720.jpg` + `<file>-1600.jpg` (long edge),
 * so the page never pulls multi-megabyte originals from the media bucket.
 * To add a shoot: export both sizes, add a frame below, then place it.
 */
import { photographyLarge as large, photographySmall as small, photographyXLarge as xlarge } from './photographyAssetManifest'

export type ArchiveFrame = {
  /** Tiny hover caption, e.g. "Product / Still life". */
  label: string
  alt: string
  /** Natural size of the -1600 file. */
  width: number
  height: number
  srcSet: string
  src: string
  /** The 720px file, used as the WebGL texture for small slots. */
  thumb: string
  /** Focal point for object-position when a slot crops the frame. */
  focus?: string
}

function frame(file: string, label: string, alt: string, width: number, height: number, focus?: string): ArchiveFrame {
  const s = small[`../assets/photography/${file}-720.jpg`]
  const l = large[`../assets/photography/${file}-1600.jpg`]
  const xl = xlarge[`../assets/photography/${file}-2400.jpg`]
  const sw = Math.round((720 * width) / Math.max(width, height))
  const srcSet = [`${s} ${sw}w`, `${l} ${width}w`, xl && `${xl} ${Math.round((width * 2400) / Math.max(width, height))}w`]
    .filter(Boolean).join(', ')
  return { label, alt, width, height, src: l, thumb: s, srcSet, focus }
}

export const frames = {
  cowboy: frame('photo7', 'Editorial / Portrait', 'Man in a cowboy hat and white tank top beside a horse', 960, 1200),
  motion: frame('photo15', 'Editorial / Movement', 'Monochrome figure bending forward with blurred movement', 1200, 673, '35% 50%'),
  eye: frame('eye-light', 'Detail / Light', 'Close crop of eyes crossed by a band of warm light', 1535, 862),
  bottle: frame('photo4', 'Product / Still life', 'White pump bottle lit softly against a charcoal background', 1200, 1200),
  balance: frame('photo13', 'Still life / Set', 'White spheres on geometric plinths with orange and blue panels', 1200, 904),
  coconut: frame('photo3', 'Food & drink / Campaign', 'Woman in sunglasses drinking from a green coconut water can against blue', 736, 1104),
  film: frame('film-reels', 'Detail / Archive', 'Vintage film reels and cameras arranged on a wall', 1600, 1067),
  wave: frame('photo11', 'Experimental / Portrait', 'Teal portrait with horizontal waves distorting the face', 904, 1200),
  reader: frame('reader', 'Lifestyle / Editorial', 'Person reading a broadsheet against a wall papered with newsprint', 1067, 1600),
  studio: frame('studio', 'Studio / Interior', 'Dark photography studio with lighting stands and a single chair', 1600, 1067),
  spectrum: frame('photo12', 'Light study', 'Vertical bands of multicoloured light emerging from black', 1200, 904),
  lovegen: frame('lovegen', 'Experimental / Portrait', 'Model in wide light-wash cargo jeans holding a cream Lovegen T-shirt up in front of her face', 1067, 1600),
  orange: frame('photo8', 'Experimental / Portrait', 'Portrait in teal with orange motion streaks across the face', 904, 1200),
  trophy: frame('trophy', 'Product / Still life', 'Gold trophy on a black base against a pale grey wall', 1600, 1067),
  tube: frame('photo5', 'Product / Beauty', 'Black skincare tube on a textured stone pedestal', 967, 1200),
  afterimage: frame('photo6', 'Experimental / Portrait', 'Profile portrait dissolved into bright silver points of light', 1200, 800),
  visor: frame('photo9', 'Fashion / Campaign', 'Man wearing a metallic visor surrounded by flowing teal fabric', 904, 1200),
  desk: frame('window-desk', 'Interior / Workspace', 'Desk by a shuttered window with a lamp, plants and a laptop', 1600, 1067),
  street: frame('street', 'Street / City', 'Traveller hailing a cab on a city street beside a suitcase', 1200, 1600),
  can: frame('photo2', 'Product / Drinks', 'Silver drinks can suspended in a sports net against black', 736, 980),
  dusk: frame('dusk-camera', 'Behind the lens', 'Photographer framing a shot of the sea at dusk', 1067, 1600),
  hand: frame('photo10', 'Product / Beauty', 'Hand holding a dark cosmetic tube against warm daylight', 960, 1200),
  sphere: frame('photo14', 'Still life / Glass', 'Clear glass sphere drawn in soft shadow on pale paper', 1200, 904),
  denim: frame('denim', 'Fashion / Lookbook', 'Model in wide cargo jeans holding a white T-shirt against a pale wall', 1067, 1600),
  jellystar: frame('jellystar', 'Brand / Campaign', 'Jellystar streetwear campaign: woman in a white hooded top with a chrome star logo beside the headline Not Just Clothes', 1536, 1024),
  arcade: frame('arcade', 'or', 'Empty monochrome shopping arcade receding to a vanishing point', 1600, 1067),
  dropper: frame('dropper', 'Product / Beauty', 'Glass dropper releasing a drop of serum onto a pale surface', 1280, 1600),
  lotion: frame('lotion', 'Brand / Beauty', 'Fingers holding a dab of white lotion beside a Softly bottle against blue sky', 1280, 1600),
  jeansPocket: frame('jeans-pocket', 'Fashion / Product', 'Back pocket of black jeans with a star print and the Jellystar logo', 1080, 1350),
  shoulder: frame('shoulder', 'Brand / Beauty', 'Bare shoulder in soft light with the Softly script logo', 1131, 1600),
  trackBottle: frame('track-bottle', 'Sport / Product', 'Runner on a red track holding a white Falk bottle', 1080, 1350),
  cafeNapkin: frame('cafe-napkin', 'Brand / Food & drink', 'Soko café napkin beside iced coffee and pastries', 1312, 1199),
  cafeCards: frame('cafe-cards', 'Brand / Stationery', 'Soko café business cards in front of a tray of croissants', 1122, 1402),
} satisfies Record<string, ArchiveFrame>

export type FrameKey = keyof typeof frames

/**
 * Desktop wall on a 24-column grid of square row units: [column, colSpan,
 * row, rowSpan]. Spans roughly follow each frame's ratio, and the empty cells
 * are deliberate. `depth` is the scroll parallax in yPercent (negative drifts
 * against the scroll), `drift` an optional horizontal drift in px.
 */
export type WallPlacement = {
  key: FrameKey
  at: [column: number, colSpan: number, row: number, rowSpan: number]
  depth: number
  drift?: number
  /** Spans both columns on mobile. */
  wide?: boolean
}

export const wallIntro: [number, number, number, number] = [1, 7, 1, 3]

export const wall: WallPlacement[] = [
  { key: 'cowboy', at: [8, 5, 1, 6], depth: 3, wide: true },
  { key: 'motion', at: [13, 8, 1, 4], depth: -2, drift: -8 },
  { key: 'wave', at: [21, 4, 1, 5], depth: 4 },
  { key: 'eye', at: [1, 5, 4, 3], depth: -5 },
  { key: 'film', at: [13, 5, 5, 3], depth: 5, drift: 6 },
  { key: 'trophy', at: [18, 3, 5, 3], depth: -6 },
  { key: 'coconut', at: [8, 4, 7, 6], depth: -4 },
  { key: 'bottle', at: [1, 3, 7, 3], depth: 6 },
  { key: 'balance', at: [4, 4, 7, 3], depth: -3, wide: true },
  { key: 'tube', at: [21, 4, 6, 5], depth: -3 },
  { key: 'studio', at: [12, 9, 8, 5], depth: 2, drift: -8, wide: true },
  { key: 'reader', at: [1, 4, 10, 6], depth: 3 },
  { key: 'spectrum', at: [5, 3, 10, 3], depth: -6 },
  { key: 'can', at: [21, 4, 11, 6], depth: 4 },
  { key: 'orange', at: [5, 4, 13, 5], depth: 4 },
  { key: 'afterimage', at: [9, 6, 13, 4], depth: -3, drift: 6, wide: true },
  { key: 'desk', at: [15, 6, 13, 3], depth: 5 },
  { key: 'visor', at: [15, 6, 16, 7], depth: -2, wide: true },
  { key: 'street', at: [1, 4, 16, 7], depth: -4 },
  { key: 'dusk', at: [21, 4, 17, 6], depth: 3 },
  { key: 'hand', at: [5, 4, 18, 5], depth: -5 },
  { key: 'sphere', at: [9, 6, 17, 6], depth: 3, wide: true },
]

/**
 * Spherical hero (WebGL, mouse-driven screens): the photographs line the
 * inside of a sphere around the viewer. Three 120 degree sectors share one
 * 30 x 22 grid of 4 degree cells (the middle one mirrored vertically). The
 * first holds each archive frame once; the other two reshuffle them and swap
 * most of the repeats for seven further frames.
 * A frame always stays in the same column group, so its copies sit 120
 * degrees apart and never share the screen.
 */
export const sphereGrid = { sectorColumns: 30, sectors: 3, rows: 22, cellDegrees: 4 }

const sectorSlots: [column: number, colSpan: number, row: number, rowSpan: number][] = [
  [1, 5, 1, 7], [1, 5, 8, 8], [1, 5, 16, 7], [6, 6, 1, 3], [6, 6, 4, 3],
  [6, 6, 7, 4], [6, 6, 11, 4], [6, 6, 15, 4], [6, 6, 19, 4], [12, 4, 1, 4],
  [12, 4, 5, 5], [12, 4, 10, 6], [12, 4, 16, 3], [12, 4, 19, 4], [16, 4, 1, 7],
  [16, 4, 8, 8], [16, 4, 16, 7], [20, 5, 1, 9], [20, 5, 10, 5], [20, 5, 15, 8],
  [25, 6, 1, 4], [25, 6, 5, 3], [25, 6, 8, 4], [25, 6, 12, 4], [25, 6, 16, 4],
  [25, 6, 20, 3],
]

/** Frame per slot, one list per sector; slot order follows `sectorSlots`. */
const sectorFrames: FrameKey[][] = [
  [
    'denim', 'reader', 'dusk', 'desk', 'eye', 'afterimage', 'studio',
    'film', 'balance', 'cowboy', 'hand', 'coconut', 'sphere', 'tube',
    'wave', 'street', 'can', 'orange', 'bottle', 'visor', 'cafeCards',
    'motion', 'spectrum', 'jellystar', 'trophy', 'arcade',
  ],
  [
    'reader', 'jeansPocket', 'denim', 'afterimage', 'eye', 'desk', 'film',
    'balance', 'cafeNapkin', 'dropper', 'lotion', 'coconut', 'sphere', 'hand',
    'street', 'shoulder', 'wave', 'visor', 'trackBottle', 'orange', 'cafeCards',
    'motion', 'jellystar', 'arcade', 'spectrum', 'trophy',
  ],
  [
    'dusk', 'jeansPocket', 'reader', 'eye', 'desk', 'film', 'afterimage',
    'studio', 'cafeNapkin', 'dropper', 'lotion', 'tube', 'sphere', 'cowboy',
    'can', 'shoulder', 'street', 'orange', 'bottle', 'trackBottle', 'cafeCards',
    'spectrum', 'arcade', 'trophy', 'jellystar', 'motion',
  ],
]

export type SphereTile = {
  id: string
  key: FrameKey
  /** Column across the full turn (1-based, 90 columns), row from the top. */
  at: [column: number, colSpan: number, row: number, rowSpan: number]
  /** Resting depth, -0.5 (back) to 0.55 (front). */
  z: number
}

export const sphereTiles: SphereTile[] = sectorFrames.flatMap((keys, sector) =>
  sectorSlots.map(([c, cs, r, rs], index) => {
    const row = sector === 1 ? sphereGrid.rows - (r - 1 + rs) + 1 : r
    return {
      id: `${keys[index]}-${sector}`,
      key: keys[index],
      at: [c + sector * sphereGrid.sectorColumns, cs, row, rs],
      z: -0.5 + (((index * 37 + sector * 11) % 21) / 20) * 1.05,
    }
  }))

/**
 * Art-directed closing masonry. The lane widths are tuned against these
 * natural aspect ratios, so all three desktop edges finish together without
 * fixed heights or placeholder space. These frames extend the archive rather
 * than repeating the photographs already used in the DOM wall above.
 */
export const closingColumns: FrameKey[][] = [
  ['jeansPocket', 'dropper'],
  ['shoulder', 'lotion', 'arcade', 'cafeNapkin'],
  ['trackBottle', 'cafeCards', 'jellystar'],
]
