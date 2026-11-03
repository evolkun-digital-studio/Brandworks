import 'server-only'

import PhotographyEditorial from '../Photography/PhotographyEditorial'
import { getSiteMedia } from '../../server/site-media/public'

/** Server half of the photography row: reads Media Manager › Photography (tag media-photography). */
export default async function PhotographySection() {
  const media = await getSiteMedia('photography')
  return <PhotographyEditorial images={media.gallery ?? []} />
}
