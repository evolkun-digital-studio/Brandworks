import { motion, useReducedMotion } from 'motion/react'
import { FadeUp } from './FadeUp'
import LazyBackgroundVideo from './LazyBackgroundVideo'
import { trackEvent } from './analytics/analytics'
import { AnalyticsEvents } from './analytics/events'

const industries = [
  {
    name: 'Real Estate',
    description:
      'We work across identity, photography, film, web, search and campaigns to help developments and real estate companies present themselves clearly.',
    video:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4',
  },
]

const INDUSTRY_LIST = [
  'Real Estate',
  'Technology',
  'Hospitality',
  'Consumer',
  'Professional Services',
  'Healthcare',
  'Finance',
  'Lifestyle',
  'Founders',
]

/** The site's entrance curve — the same one Capabilities.tsx uses. */
const EASE = [0.22, 1, 0.36, 1] as const

function Industries() {
  const reduce = useReducedMotion()

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-col overflow-hidden bg-white px-[18px] py-20 min-[900px]:px-12 min-[900px]:py-[clamp(72px,9vw,140px)]">
      <h2 className="site-display max-w-[900px] text-neutral-900">
        Industries
      </h2>

      <p className="site-copy mt-4 max-w-[620px] text-neutral-600">
        The context changes. The work adapts with it.
      </p>

      <p className="mt-5 max-w-[900px] text-[12px] leading-[1.7] tracking-[0.01em] text-neutral-500 sm:text-[13px] md:text-[14px]">
        {INDUSTRY_LIST.join(' · ')}
      </p>

      {industries.map((industry) => (
        <div
          key={industry.name}
          className="mt-14 grid w-full grid-cols-1 items-center gap-10 min-[900px]:mt-16 min-[900px]:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] min-[900px]:gap-[clamp(56px,8vw,130px)]"
        >
          <div className="flex flex-col items-start text-left">
            <FadeUp
              as="p"
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500 sm:text-[11px]"
              y={24}
              duration={0.7}
              amount={0.25}
            >
              {industry.name}
            </FadeUp>

            <FadeUp
              as="h3"
              className="mt-4 max-w-[520px] text-[26px] leading-[1.2] tracking-[-0.02em] text-neutral-900 sm:text-[28px] md:text-[30px]"
              y={32}
              duration={0.75}
              delay={0.05}
              amount={0.25}
            >
              Brand and digital communication for property businesses.
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

            <FadeUp
              className="mt-8"
              y={32}
              duration={0.75}
              delay={0.2}
              amount={0.25}
            >
              <a
                href="#"
                onClick={() =>
                  trackEvent({
                    name: AnalyticsEvents.serviceCtaClick,
                    params: { industry: industry.name },
                  })
                }
                className="group inline-block text-[14px] font-medium text-neutral-900"
              >
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

          <motion.div
            className="aspect-[16/10] w-full overflow-hidden rounded-[12px] min-[900px]:rounded-[16px]"
            initial={
              reduce
                ? false
                : {
                    opacity: 0,
                    y: 48,
                    scale: 0.97,
                    clipPath: 'inset(8% 0% 8% 0%)',
                  }
            }
            whileInView={
              reduce
                ? undefined
                : {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    clipPath: 'inset(0% 0% 0% 0%)',
                  }
            }
            viewport={{ once: true, amount: 0.2 }}
            transition={{
              duration: 1,
              delay: 0.12,
              ease: EASE,
            }}
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