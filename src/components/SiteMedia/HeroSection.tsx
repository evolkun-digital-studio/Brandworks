import 'server-only'

import Hero from '../Hero/Hero'
import { getSiteMedia } from '../../server/site-media/public'

/** Server half of the homepage hero: reads Media Manager › Hero (tag media-hero). */
export default async function HeroSection() {
  const media = await getSiteMedia('hero')
  return <Hero heroImage={media.main?.[0] ?? null} gridImages={media.photography ?? []} />
}
