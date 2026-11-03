import { Home } from '../../src/Home'
import HeroSection from '../../src/components/SiteMedia/HeroSection'
import PhotographySection from '../../src/components/SiteMedia/PhotographySection'

// Server component: the Media Manager sections read the database here and
// hand their images to the interactive (client) homepage.
export default function Page() {
  return <Home manageDocumentHead={false} hero={<HeroSection />} photography={<PhotographySection />} />
}
