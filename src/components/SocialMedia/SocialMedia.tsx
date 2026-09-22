import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { SectionContainer, SectionDescription, SectionHeading, SectionLabel } from '../../SectionPrimitives'
import { SOCIAL_REELS, SOCIAL_SECTION } from '../../data/socialMedia'
import SocialPhone from './SocialPhone'
import ReelFeed from './ReelFeed'
import './SocialMedia.css'

gsap.registerPlugin(ScrollTrigger, SplitText)

const EASE = 'power3.out'

/**
 * Social Media: one strong idea — a large phone playing the reels, floating
 * over the lime pattern, with the copy set as an editorial block to its
 * left. All motion is GSAP + ScrollTrigger; Lenis drives the real window
 * scroll, so the triggers need no proxy.
 *   - the pattern drifts a touch slower than the page (scrubbed parallax);
 *   - the phone rises and settles from 0.94 → 1 as it scrolls in (scrubbed);
 *   - the label, heading and description reveal once, line by line, from
 *     behind a mask (SplitText re-splits on resize and font load).
 * With reduced motion none of this runs; everything is simply in place.
 */
function SocialMedia() {
  const sectionRef = useRef<HTMLElement>(null)
  const { label, heading, description, phoneLabel } = SOCIAL_SECTION

  useGSAP(
    () => {
      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const section = sectionRef.current
        if (!section) return

        gsap.fromTo(
          '.social-pattern__layer',
          { yPercent: -5 },
          {
            yPercent: 5,
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        )

        gsap.fromTo(
          '.social-stage__phone',
          { y: 90, scale: 0.94 },
          {
            y: 0,
            scale: 1,
            ease: 'none',
            scrollTrigger: { trigger: '.social-stage', start: 'top bottom', end: 'center center', scrub: true },
          },
        )

        const copyTrigger = { trigger: '.social-copy', start: 'top 78%', once: true }

        gsap.from('.social-label', { autoAlpha: 0, y: 14, duration: 0.8, ease: EASE, scrollTrigger: copyTrigger })

        const lines = (target: string, delay: number, stagger: number) =>
          SplitText.create(target, {
            type: 'lines',
            mask: 'lines',
            linesClass: 'social-line',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.1,
                delay,
                stagger,
                ease: EASE,
                scrollTrigger: copyTrigger,
              }),
          })

        lines('.social-heading', 0.08, 0.09)
        lines('.social-description', 0.3, 0.06)
      })
    },
    { scope: sectionRef },
  )

  return (
    <section ref={sectionRef} id="social-media" aria-labelledby="social-media-heading" className="social-section">
      <div className="social-pattern" aria-hidden="true">
        <div className="social-pattern__layer" />
      </div>

      <SectionContainer className="social-layout">
        <div className="social-copy">
          <SectionLabel className="social-label">{label}</SectionLabel>
          <SectionHeading id="social-media-heading" className="social-heading">
            {heading}
          </SectionHeading>
          <SectionDescription className="social-description">{description}</SectionDescription>
        </div>

        <div className="social-stage">
          <div className="social-stage__phone">
            <SocialPhone>
              <ReelFeed reels={SOCIAL_REELS} label={phoneLabel} />
            </SocialPhone>
          </div>
        </div>
      </SectionContainer>
    </section>
  )
}

export default SocialMedia
