import { useEffect } from 'react'
import { useLocation } from './routing'
import {
  removeLinkTag,
  removeMetaTag,
  setDocumentTitle,
  setLinkTag,
  setMetaTag,
} from './blog/lib/documentHead'
import Hero from './components/Hero/Hero'
import HomeIntroStatement from './components/HomeIntroStatement'
import BrandStatement from './components/HumanLedBrandIntelligence'
import Services from './components/Service/Services'
import About from './components/About'
import Photography from './components/Photography'
import Work from './components/WorkWithImpact'
import Videography from './components/Videography'
import GraphicsMotionExperience from './components/GraphicsMotion/GraphicsMotionExperience'
import PRReputation from './components/PrReputation'
import SocialMedia from './components/SocialMedia/SocialMedia'
import WebDevelopment from './components/WebDevelopment/WebDevelopment'
import Capabilities from './components/Capabilities'
import Results from './components/Results'
import FAQs from './components/Faq/FAQs'
import Industries from './components/Industries'
import Testimonials from './components/Testimonial/Testimonials'
import WebsiteSectionProps from './components/Seo'
import { onIntroSettled } from './lib/introGate'

// Kept section-for-section from the Vite homepage so both routers render
// the same page composition and route-specific effects.
const HOME_DESCRIPTION =
  'We help brands build a stronger presence through strategic brand identity, social media, content, marketing, development and SEO.'

export function Home({ manageDocumentHead = true }: { manageDocumentHead?: boolean } = {}) {
  useEffect(() => {
    if (!manageDocumentHead) return

    setDocumentTitle('BRANDWORKS')
    setMetaTag('name', 'description', HOME_DESCRIPTION)
    setLinkTag('canonical', `${window.location.origin}/`)

    return () => {
      removeMetaTag('name', 'description')
      removeLinkTag('canonical')
    }
  }, [manageDocumentHead])

  const { hash } = useLocation()
  useEffect(() => {
    // The compatibility router's external-store snapshot can initially be
    // empty on a hard App Router load with a fragment. Read the browser URL
    // here as well, after hydration, so the initial fragment is not missed.
    const targetHash = hash || window.location.hash
    if (!targetHash) return
    let frame = 0
    const unsubscribe = onIntroSettled(() => {
      frame = window.requestAnimationFrame(() => {
        document
          .getElementById(decodeURIComponent(targetHash.slice(1)))
          ?.scrollIntoView({ block: 'start' })
      })
    })
    return () => {
      unsubscribe()
      window.cancelAnimationFrame(frame)
    }
  }, [hash])

  return (
    <main>
      <Hero />
      <HomeIntroStatement />
      {/* <BrandStatement /> */}
      <Services />
      {/* <BrandIntelligence /> */}
      <About />
      <Work />
      {/* <PhotographyTransition /> */}
      <Photography />
      <Videography />
      <GraphicsMotionExperience />
      <PRReputation />
      <SocialMedia />
      {/* <WebDevelopment /> */}
      {/* <Photography /> */}
      <WebsiteSectionProps />
      <Capabilities />
      <Results />
      <Industries />
      <FAQs />
      {/* <Blog /> */}
      <Testimonials />
    </main>
  )
}
