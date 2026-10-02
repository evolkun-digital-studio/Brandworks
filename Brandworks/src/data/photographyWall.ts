const thumbnails = import.meta.glob<string>('../assets/photography/*-720.jpg', { eager: true, import: 'default' })
const originals = import.meta.glob<string>('../assets/photography/*-1600.jpg', { eager: true, import: 'default' })

export type PhotographyProject = {
  id: string
  title: string
  category: string
  alt: string
  image: string
  hero: string
  width: number
  height: number
}

const frames = [
  ['Street identity', 'Brand imagery', 'Round shop sign mounted on a stone facade', 2958, 4096],
  ['Caught in motion', 'Product', 'Silver drinks can suspended in a sports net against black', 736, 980],
  ['A taste of summer', 'Campaign', 'Woman in sunglasses holding a green coconut water carton against blue', 736, 1104],
  ['Quiet form', 'Still life', 'White pump bottle lit softly against a charcoal background', 1200, 1200],
  ['Light & texture', 'Product', 'Black skincare tube on a textured stone pedestal', 967, 1200],
  ['Afterimage', 'Experimental portrait', 'Profile portrait dissolved into bright silver points of light', 1200, 800],
  ['Western light', 'Editorial', 'Man in a cowboy hat and white tank top beside a horse', 960, 1200],
  ['Passing colour', 'Experimental portrait', 'Portrait in teal with orange motion streaks across the face', 904, 1200],
  ['Future frequency', 'Editorial', 'Man wearing a metallic visor surrounded by flowing teal fabric', 904, 1200],
  ['Held to the light', 'Product', 'Hand holding a dark cosmetic tube against warm daylight', 960, 1200],
  ['Signal / noise', 'Experimental portrait', 'Teal portrait with horizontal waves distorting the face', 904, 1200],
  ['Spectrum', 'Light study', 'Vertical bands of multicoloured light emerging from black', 1200, 904],
  ['Balance', 'Still life', 'White egg forms on geometric plinths with orange and blue panels', 1200, 904],
  ['Transparent matter', 'Still life', 'Clear sculptural glass disc on a pale stone surface', 1200, 904],
  ['A moment between', 'Editorial', 'Monochrome figure bending forward with blurred movement', 1200, 673],
] as const

export const photographyProjects: PhotographyProject[] = frames.map(([title, category, alt, width, height], index) => ({
  id: `frame-${index + 1}`,
  title,
  category,
  alt,
  width,
  height,
  image: thumbnails[`../assets/photography/photo${index + 1}-720.jpg`],
  hero: originals[`../assets/photography/photo${index + 1}-1600.jpg`],
}))

export const photographyRows = [
  { frames: [6, 1, 5, 3, 8], widths: [29, 19, 32, 21, 29], shift: -7, tilt: -0.35 },
  { frames: [9, 12, 7, 13, 2], widths: [19, 32, 24, 31, 24], shift: 6, tilt: 0.2 },
  { frames: [14, 4, 10, 0, 11], widths: [33, 22, 25, 20, 30], shift: -9, tilt: -0.15 },
  { frames: [8, 5, 2, 6, 13], widths: [23, 33, 22, 25, 27], shift: 4, tilt: 0.3 },
  { frames: [7, 11, 3, 14, 1], widths: [23, 31, 21, 33, 22], shift: -6, tilt: -0.2 },
]
