import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { matches } from './lib/scrollMotion'
import { FadeUp } from './FadeUp'

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const EYEBROW = 'Service 02 — PR & Founder Reputation'
const TITLE = 'People search your name before they sign anything.'
const SUBTITLE = 'Founder narrative. Earned press. Public record.'
const DESCRIPTION =
  'We shape what they find — founder narrative, earned press, and a public record that holds up on the first click.'

const TITLE_WORDS = TITLE.split(' ')

/** The site's entrance curve — the same one Capabilities.tsx uses. */
const EASE = [0.22, 1, 0.36, 1] as const

// ---------------------------------------------------------------------------
// Media
//
// The delivered asset, untouched, as `src`. The srcSet entries are the
// same image through Cloudinary's format/quality negotiation at a few
// widths — no crop, no colour transform — so a phone doesn't download a
// 1.4MB 1586px PNG. Intrinsic size is declared on the element so the
// space is reserved before it loads and the section never jumps.
// ---------------------------------------------------------------------------

const CLOUDINARY_UPLOAD = 'https://res.cloudinary.com/dpjdnoqii/image/upload'
const IMAGE_PATH = 'v1789885243/ChatGPT_Image_Sep_20_2026_11_46_37_AM_pe0wvg.png'
const IMAGE_SRC = `${CLOUDINARY_UPLOAD}/${IMAGE_PATH}`
const IMAGE_SRCSET = [640, 960, 1280, 1586]
  .map((w) => `${CLOUDINARY_UPLOAD}/f_auto,q_auto,w_${w}/${IMAGE_PATH} ${w}w`)
  .join(', ')
const IMAGE_SIZES = '(min-width: 768px) min(84vw, 1344px), calc(100vw - 40px)'
const IMAGE_WIDTH = 1586
const IMAGE_HEIGHT = 992
const IMAGE_ALT = 'BrandWorks PR and founder reputation editorial search and press composition'

// ---------------------------------------------------------------------------
// Type — the Videography/Photography recipes, reused verbatim so this
// section reads as the same publication: Instrument Serif for display,
// Inter for labels and copy, #111 on white with the site's muted tone
// for secondary text.
// ---------------------------------------------------------------------------

const EYEBROW_CLASS =
  'font-inter text-[11px] leading-[1.4] font-medium tracking-[0.16em] text-[rgba(17,17,17,0.55)] uppercase md:text-xs'
const TITLE_CLASS =
  'font-instrument text-[clamp(46px,6.5vw,104px)] leading-[0.94] font-normal tracking-[-0.03em] text-[#111]'
const SUBTITLE_CLASS =
  'font-instrument text-[clamp(20px,2vw,30px)] leading-[1.15] font-normal tracking-[-0.02em] text-[#111]'
const DESCRIPTION_CLASS =
  'font-inter text-base leading-[1.6] text-[rgba(17,17,17,0.55)] md:text-lg'

// ---------------------------------------------------------------------------
// Motion
//
// Two travel scales: the full editorial rise on desktop, a shorter one
// on phones where the same distance reads as a lurch. `matches` is the
// same media-query helper the other scroll sections use.
// ---------------------------------------------------------------------------

function useDesktop() {
  const query = '(min-width: 768px)'
  const [desktop, setDesktop] = useState(() => matches(query))

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(query)
    const onChange = () => setDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return desktop
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function PRReputation() {
  const desktop = useDesktop()
  const reduce = useReducedMotion()
  /** Travel distance: the desktop value, or its shorter mobile pair. */
  const rise = (far: number, near: number) => (desktop ? far : near)

  return (
    <section
      id="pr-founder-reputation"
      aria-labelledby="pr-reputation-heading"
      // `isolate` + `relative` put this section on its own stacking
      // context above anything the previous section left pinned: the
      // Videography stage is `sticky` inside its own runway, so it has
      // already released by the time this white panel scrolls up, and
      // it can never paint over this content.
      className="relative isolate z-10 w-full overflow-hidden bg-white text-[#111] md:min-h-screen"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col px-5 pt-[88px] pb-12 md:justify-center md:px-12 md:pt-[12vh] md:pb-[10vh]">
        {/* ---- Stage 1: the reputation image ---- */}
        {/* The reveal runs on this wrapper, never on the <img>, so the
           picture itself is never scaled, clipped or tinted — only the
           window it arrives through. */}
        <motion.div
          className="mx-auto w-full md:w-[min(84vw,100%)]"
          initial={reduce ? false : { opacity: 0, y: rise(80, 24), scale: 0.96, clipPath: 'inset(12% 0% 12% 0%)' }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.15, ease: EASE }}
        >
          <img
            src={IMAGE_SRC}
            srcSet={IMAGE_SRCSET}
            sizes={IMAGE_SIZES}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            alt={IMAGE_ALT}
            loading="lazy"
            decoding="async"
            className="block h-auto w-full object-contain"
          />
        </motion.div>

        {/* ---- Stage 2: the editorial statement ---- */}
        <div className="mt-12 md:mt-[7vh]">
          <FadeUp as="p" className={EYEBROW_CLASS} delay={0.1} duration={0.6} y={rise(18, 14)}>
            {EYEBROW}
          </FadeUp>

          <div className="mt-6 grid grid-cols-1 gap-y-8 md:mt-10 md:grid-cols-12 md:gap-x-6">
            <div className="md:col-span-7 lg:col-span-8">
              <h2
                id="pr-reputation-heading"
                // Each word rides up behind the container's own edge;
                // the bottom padding keeps descenders out of the mask.
                className={`${TITLE_CLASS} flex max-w-[900px] flex-wrap overflow-hidden pb-[0.12em]`}
                style={{ columnGap: '0.22em', rowGap: '0.04em' }}
              >
                {TITLE_WORDS.map((word, index) => (
                  <motion.span
                    key={`${word}-${index}`}
                    className="inline-block"
                    initial={reduce ? false : { opacity: 0, y: rise(38, 22) }}
                    whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.75, delay: 0.16 + index * 0.07, ease: EASE }}
                  >
                    {word}
                  </motion.span>
                ))}
              </h2>

              <FadeUp
                as="h3"
                className={`${SUBTITLE_CLASS} mt-6 max-w-[620px] md:mt-8`}
                delay={0.72}
                duration={0.7}
                y={rise(24, 20)}
              >
                {SUBTITLE}
              </FadeUp>
            </div>

            {/* Beside the heading from md up, beneath it below that. */}
            <FadeUp
              as="p"
              className={`${DESCRIPTION_CLASS} w-full md:col-span-5 md:max-w-[560px] md:self-end lg:col-span-4`}
              delay={0.86}
              duration={0.7}
              y={rise(24, 20)}
            >
              {DESCRIPTION}
            </FadeUp>
          </div>

          {/* The closing rule, drawn left to right. Its first segment is
             the one lime accent in the section — the same lime as the
             highlight inside the image. */}
          <motion.div
            aria-hidden="true"
            className="mt-12 flex h-px w-full md:mt-[8vh]"
            style={{ transformOrigin: 'left center' }}
            initial={reduce ? false : { scaleX: 0 }}
            whileInView={reduce ? undefined : { scaleX: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1, delay: 0.95, ease: EASE }}
          >
            <span className="bg-bw-lime block h-px w-[72px] shrink-0" />
            <span className="block h-px grow bg-black/[0.08]" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default PRReputation
