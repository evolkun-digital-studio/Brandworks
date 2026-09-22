import { motion, useReducedMotion } from 'motion/react'
import { FadeUp } from './FadeUp'
import LazyBackgroundVideo from './LazyBackgroundVideo'
import { trackEvent } from './analytics/analytics'
import { AnalyticsEvents } from './analytics/events'

const industries = [
  {
    name: 'Real Estate',
    description:
      'We help real estate brands communicate their vision, value and unique offerings through clear strategy, compelling creative direction and digital experiences that inspire confidence and generate interest.',
    video:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4',
  },
]

/** The site's entrance curve — the same one Capabilities.tsx uses. */
const EASE = [0.22, 1, 0.36, 1] as const

function Industries() {
  const reduce = useReducedMotion()

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden bg-white px-[18px] py-20 min-[900px]:px-12 min-[900px]:py-[clamp(72px,9vw,140px)]">
      <h2 className="site-display max-w-[900px] text-neutral-900">
        Industries We Work With
      </h2>

      <p className="site-copy mt-4 max-w-[620px] text-neutral-600">
        Every industry has a different story. We help brands build clear,
        relevant and meaningful experiences across diverse sectors.
      </p>

      {industries.map((industry) => (
        <div
          key={industry.name}
          // Text column ~38%, film ~54%, the rest spent on the gap. The
          // brief's 520px floor on the film is left off deliberately: it
          // only ever binds between 900 and ~1050px, where it would take
          // the text column down to ~212px. The ratio alone already
          // lands on 36/56 once there is room for the floor to matter.
          className="mt-14 grid w-full grid-cols-1 items-center gap-10 min-[900px]:mt-16 min-[900px]:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] min-[900px]:gap-[clamp(56px,8vw,130px)]"
        >
          <div className="flex flex-col items-start text-left">
            <FadeUp
              as="h3"
              className="text-[26px] leading-[1.2] font-semibold tracking-[-0.02em] text-neutral-900"
              y={32}
              duration={0.75}
              amount={0.25}
            >
              {industry.name}
            </FadeUp>

            <FadeUp
              as="p"
              className="site-copy mt-6 max-w-[560px] leading-[1.6] text-neutral-700"
              y={32}
              duration={0.75}
              delay={0.1}
              amount={0.25}
            >
              {industry.description}
            </FadeUp>

            <FadeUp className="mt-8" y={32} duration={0.75} delay={0.2} amount={0.25}>
              <a
                href="#"
                onClick={() => trackEvent({ name: AnalyticsEvents.serviceCtaClick, params: { industry: industry.name } })}
                className="group inline-block text-[14px] font-medium text-neutral-900"
              >
                {/* Underlined at rest; on hover the rule wipes out to the
                   right while a second one follows it in from the left. */}
                <span className="relative inline-block overflow-hidden pb-1">
                  View Case Study
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-full motion-reduce:transition-none"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 h-px w-full -translate-x-full bg-current transition-transform delay-100 duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 motion-reduce:transition-none"
                  />
                </span>
              </a>
            </FadeUp>
          </div>

          {/* The reveal runs on the wrapper, never on the film element
             itself, so the picture is never scaled or clipped — only
             the window it arrives through.
             The fixed 16:10 ratio means the row's height is settled
             before a single byte of video arrives. */}
          <motion.div
            className="aspect-[16/10] w-full overflow-hidden rounded-[12px] min-[900px]:rounded-[16px]"
            initial={reduce ? false : { opacity: 0, y: 48, scale: 0.97, clipPath: 'inset(8% 0% 8% 0%)' }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1, delay: 0.12, ease: EASE }}
          >
            <LazyBackgroundVideo
              src={industry.video}
              ariaLabel={`BrandWorks ${industry.name.toLowerCase()} case study video`}
              className="block h-full w-full object-cover object-center"
            />
          </motion.div>
        </div>
      ))}
    </section>
  )
}

export default Industries
