import { assetUrl } from '../lib/assetUrl'
import product from '../assets/social/campaign-still.webp'
import campaign from '../assets/social/campaign-action.jpg'
import portrait from '../assets/photography/hero-studio-fashion-480.webp'
import editorial from '../assets/photography/hero-red-portrait-480.webp'
import content from '../assets/social/content-still.webp'
import storytelling from '../assets/social/campaign-motion.jpg'
import behindScenes from '../assets/photography/hero-mountain-editorial-480.webp'
import ugc from '../assets/photography/hero-blue-bandana-480.webp'
import aerial from '../assets/social/campaign-aerial.jpg'

export type SocialReel = {
  id: string
  category: string
  /** Empty until verified footage is available; no request is made for missing media. */
  videoSrc: string
  posterSrc: string
  title?: string
  client?: string
  projectUrl?: string
  sample?: boolean
}

// All posters are existing local assets. Only the first entry has verified
// local footage: the BrandWorks showreel, explicitly presented as sample media.
// Replace videoSrc with a hosted MP4/WebM or a file in public/video/social/.
// Add actual titles/client names only when the corresponding work is verified.
export const socialReels: SocialReel[] = [
  { id: 'product-demo', category: 'Product Demo', videoSrc: '/video/ForWebsite.mp4', posterSrc: assetUrl(product), title: 'BrandWorks showreel', sample: true },
  { id: 'paid-ads', category: 'Paid Social Ads', videoSrc: '', posterSrc: assetUrl(campaign) },
  { id: 'testimonials', category: 'Client Testimonials', videoSrc: '', posterSrc: assetUrl(portrait) },
  { id: 'thought-leadership', category: 'Thought Leadership', videoSrc: '', posterSrc: assetUrl(editorial) },
  { id: 'explainers', category: 'Explainer Videos', videoSrc: '', posterSrc: assetUrl(content) },
  { id: 'brand-storytelling', category: 'Brand Storytelling', videoSrc: '', posterSrc: assetUrl(storytelling) },
  { id: 'behind-the-scenes', category: 'Behind the Scenes', videoSrc: '', posterSrc: assetUrl(behindScenes) },
  { id: 'ugc', category: 'UGC Content', videoSrc: '', posterSrc: assetUrl(ugc) },
  { id: 'social-campaigns', category: 'Social Media Campaigns', videoSrc: '', posterSrc: assetUrl(aerial) },
]
