// Every frame on /services/photography, for Media Manager. Kept free of
// image imports so the admin and the API can read it. The keys match
// `frames` in photographyArchive.ts; usedIn says where the frame appears.

export type PhotographyFramePlacement = 'wall' | 'sphere' | 'pair' | 'closing'

export interface PhotographyFrameSlot {
  key: string
  /** The current photograph's description, used as the slot name. */
  alt: string
  shape: 'portrait' | 'landscape' | 'square'
  usedIn: PhotographyFramePlacement[]
}

export const PHOTOGRAPHY_FRAME_SLOTS: PhotographyFrameSlot[] = [
  { key: 'cowboy', alt: "Man in a cowboy hat and white tank top beside a horse", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'motion', alt: "Monochrome figure bending forward with blurred movement", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'eye', alt: "Close crop of eyes crossed by a band of warm light", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'bottle', alt: "White pump bottle lit softly against a charcoal background", shape: 'square', usedIn: ['wall','sphere'] },
  { key: 'balance', alt: "White spheres on geometric plinths with orange and blue panels", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'coconut', alt: "Woman in sunglasses drinking from a green coconut water can against blue", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'film', alt: "Vintage film reels and cameras arranged on a wall", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'wave', alt: "Teal portrait with horizontal waves distorting the face", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'reader', alt: "Person reading a broadsheet against a wall papered with newsprint", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'studio', alt: "Dark photography studio with lighting stands and a single chair", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'spectrum', alt: "Vertical bands of multicoloured light emerging from black", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'lovegen', alt: "Model in wide light-wash cargo jeans holding a cream Lovegen T-shirt up in front of her face", shape: 'portrait', usedIn: ['pair'] },
  { key: 'orange', alt: "Portrait in teal with orange motion streaks across the face", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'trophy', alt: "Gold trophy on a black base against a pale grey wall", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'tube', alt: "Black skincare tube on a textured stone pedestal", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'afterimage', alt: "Profile portrait dissolved into bright silver points of light", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'visor', alt: "Man wearing a metallic visor surrounded by flowing teal fabric", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'desk', alt: "Desk by a shuttered window with a lamp, plants and a laptop", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'street', alt: "Traveller hailing a cab on a city street beside a suitcase", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'can', alt: "Silver drinks can suspended in a sports net against black", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'dusk', alt: "Photographer framing a shot of the sea at dusk", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'hand', alt: "Hand holding a dark cosmetic tube against warm daylight", shape: 'portrait', usedIn: ['wall','sphere'] },
  { key: 'sphere', alt: "Clear glass sphere drawn in soft shadow on pale paper", shape: 'landscape', usedIn: ['wall','sphere'] },
  { key: 'denim', alt: "Model in wide cargo jeans holding a white T-shirt against a pale wall", shape: 'portrait', usedIn: ['sphere','pair'] },
  { key: 'jellystar', alt: "Jellystar streetwear campaign: woman in a white hooded top with a chrome star logo beside the headline Not Just Clothes", shape: 'landscape', usedIn: ['sphere','closing'] },
  { key: 'arcade', alt: "Empty monochrome shopping arcade receding to a vanishing point", shape: 'landscape', usedIn: ['sphere','closing'] },
  { key: 'dropper', alt: "Glass dropper releasing a drop of serum onto a pale surface", shape: 'portrait', usedIn: ['sphere','closing'] },
  { key: 'lotion', alt: "Fingers holding a dab of white lotion beside a Softly bottle against blue sky", shape: 'portrait', usedIn: ['sphere','closing'] },
  { key: 'jeansPocket', alt: "Back pocket of black jeans with a star print and the Jellystar logo", shape: 'portrait', usedIn: ['sphere','closing'] },
  { key: 'shoulder', alt: "Bare shoulder in soft light with the Softly script logo", shape: 'portrait', usedIn: ['sphere','closing'] },
  { key: 'trackBottle', alt: "Runner on a red track holding a white Falk bottle", shape: 'portrait', usedIn: ['sphere','closing'] },
  { key: 'cafeNapkin', alt: "Soko café napkin beside iced coffee and pastries", shape: 'square', usedIn: ['sphere','closing'] },
  { key: 'cafeCards', alt: "Soko café business cards in front of a tray of croissants", shape: 'portrait', usedIn: ['sphere','closing'] },
]
