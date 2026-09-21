import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { SectionContainer, SectionDescription, SectionHeading, SectionLabel } from './SectionPrimitives'

// ---------------------------------------------------------------------------
// Content
//
// The banner is the delivered asset, untouched, as `src`. The srcSet
// entries are the same image through Cloudinary's format/quality
// negotiation at a few widths — no crop, no colour transform — so a phone
// doesn't download a 1.4MB 1586px PNG. Intrinsic size is declared on the
// element so its space is reserved before it loads.
// ---------------------------------------------------------------------------

const CLOUDINARY_UPLOAD = 'https://res.cloudinary.com/dpjdnoqii/image/upload'
const IMAGE_PATH = 'v1789885243/ChatGPT_Image_Sep_20_2026_11_46_37_AM_pe0wvg.png'

const PR_SECTION = {
  label: 'PR & Founder Reputation',
  heading: 'People search your name before they sign anything.',
  description:
    'We shape what they find — founder narrative, earned press, and a public record that holds up on the first click.',
  /** Where this service sits in the BrandWorks sequence. */
  index: '02',
  pillars: ['Founder narrative', 'Earned press', 'Public record'],
  media: {
    src: `${CLOUDINARY_UPLOAD}/${IMAGE_PATH}`,
    srcSet: [640, 960, 1280, 1586]
      .map((w) => `${CLOUDINARY_UPLOAD}/f_auto,q_auto,w_${w}/${IMAGE_PATH} ${w}w`)
      .join(', '),
    // Container width less its gutters: 1312px at full size, ~92vw
    // between, the phone's 100vw less 2 × 18px below 768px.
    sizes: '(min-width: 1600px) 1312px, (min-width: 768px) 92vw, calc(100vw - 36px)',
    width: 1586,
    height: 992,
    alt: 'BrandWorks PR and founder reputation editorial composition: a search bar reading "your name" above founder features and press coverage',
  },
}

// ---------------------------------------------------------------------------
// Motion — one quiet entrance per block, triggered once.
// ---------------------------------------------------------------------------

const EASE = [0.22, 1, 0.36, 1] as const

const rise = (y: number, delay: number): Variants => ({
  hidden: { opacity: 0, y },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, delay, ease: EASE } },
})

const LABEL_MOTION = rise(12, 0)
const HEADING_MOTION = rise(28, 0.08)
const DESCRIPTION_MOTION = rise(20, 0.18)
const META_MOTION = rise(12, 0.26)

const RULE_MOTION: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE } },
}

const MEDIA_MOTION: Variants = {
  hidden: { opacity: 0, scale: 0.985 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.9, ease: EASE } },
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function PRReputation() {
  const reduce = useReducedMotion()
  // Reduced motion starts every block in its settled state, so nothing
  // moves and nothing waits on the viewport to appear.
  const reveal = {
    initial: reduce ? 'visible' : 'hidden',
    whileInView: 'visible',
    viewport: { once: true, amount: 0.2 },
  } as const
  const { label, heading, description, index, pillars, media } = PR_SECTION

  return (
    <section id="pr-founder-reputation" aria-labelledby="pr-reputation-heading" className="pr-section">
      <SectionContainer>
        <motion.header className="section-grid pr-header" {...reveal}>
          {/* The section's one lime accent opens the rule that heads it. */}
          <motion.div aria-hidden="true" className="pr-rule" variants={RULE_MOTION}>
            <span className="bg-bw-lime block h-px w-16 shrink-0" />
            <span className="block h-px grow bg-(--rule)" />
          </motion.div>

          <SectionLabel className="pr-label" variants={LABEL_MOTION}>
            {label}
          </SectionLabel>

          <div className="pr-copy">
            <SectionHeading id="pr-reputation-heading" className="pr-heading" variants={HEADING_MOTION}>
              {heading}
            </SectionHeading>
            <SectionDescription className="pr-description" variants={DESCRIPTION_MOTION}>
              {description}
            </SectionDescription>
          </div>

          <motion.div className="pr-meta" variants={META_MOTION}>
            <p className="section-label">
              <span className="sr-only">Service </span>
              {index}
            </p>
            <ul className="section-label" aria-label="What this service covers">
              {pillars.map((pillar) => (
                <li key={pillar}>{pillar}</li>
              ))}
            </ul>
          </motion.div>
        </motion.header>

        {/* Its own trigger: the banner sits well below the text, so a
           reveal tied to the header would finish before it is on screen. */}
        <motion.figure className="pr-media" variants={MEDIA_MOTION} {...reveal}>
          <img
            src={media.src}
            srcSet={media.srcSet}
            sizes={media.sizes}
            width={media.width}
            height={media.height}
            alt={media.alt}
            loading="lazy"
            decoding="async"
          />
        </motion.figure>
      </SectionContainer>
    </section>
  )
}

export default PRReputation
