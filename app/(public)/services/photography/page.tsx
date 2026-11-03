import PhotographyPage from '../../../../src/legacy-pages/services/PhotographyPage'
import { getSiteMedia } from '../../../../src/server/site-media/public'

// Server component: reads Media Manager › Photography page (tag
// media-photography-page) and hands the replacements to the interactive page.
export default async function Page() {
  return <PhotographyPage frameImages={await getSiteMedia('photography-page')} />
}
