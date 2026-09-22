import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'

const EASE = [0.22, 1, 0.36, 1] as const

const revealUp = (delay = 0): Variants => ({
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      delay,
      ease: EASE,
    },
  },
})

const SERVICES = [
  {
    label: 'Content Direction',
    detail: 'What to say, how to say it, and what should stay memorable.',
  },
  {
    label: 'Social Media',
    detail: 'Consistent communication across the platforms that matter.',
  },
  {
    label: 'Brand Communication',
    detail: 'One clear voice across campaigns, launches and daily content.',
  },
]

export default function SocialMedia() {
  const reduceMotion = useReducedMotion()

  const reveal = {
    initial: reduceMotion ? 'visible' : 'hidden',
    whileInView: 'visible',
    viewport: {
      once: true,
      amount: 0.22,
    },
  } as const

  return (
    <section
      id="social-media"
      aria-labelledby="social-media-heading"
      className="py-16 text-[#111] md:py-20"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-12">
        {/* HEADER */}

        <motion.div
          {...reveal}
          variants={revealUp()}
          className="grid gap-5 border-t border-black/15 pt-5 md:grid-cols-12 md:items-start"
        >
          <div className="md:col-span-3">
            <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-[#B8FF3D]" />
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-black/45">
                Social Media / Content
              </span>
            </div>
          </div>

          <div className="md:col-span-7">
            <p className="max-w-[620px] text-[12px] leading-[1.55] text-black/45 md:text-[13px]">
              Communication that stays clear, consistent and recognisable.
            </p>
          </div>

          <div className="hidden justify-end md:col-span-2 md:flex">
            <span className="text-[10px] uppercase tracking-[0.18em] text-black/30">
              03
            </span>
          </div>
        </motion.div>

        {/* MAIN MESSAGE */}

        <div className="mt-12 grid gap-8 md:mt-14 md:grid-cols-12 md:gap-8">
          <motion.div
            {...reveal}
            variants={revealUp(0.04)}
            className="md:col-span-8"
          >
            <h2
              id="social-media-heading"
              className="
                max-w-[860px]
                text-[clamp(38px,4.7vw,42px)]
                font-medium
                leading-[0.96]
                tracking-[-0.045em]
              "
            >
              Brands don&apos;t grow because they speak more.
              <span className="mt-2 block text-black/40">
                They grow because people understand them.
              </span>
            </h2>
          </motion.div>

          <motion.div
            {...reveal}
            variants={revealUp(0.1)}
            className="flex items-end md:col-span-4"
          >
            <p className="max-w-[380px] text-[14px] leading-[1.6] text-black/55 md:text-[15px]">
              We turn positioning into a clear language that carries through
              content, campaigns and everyday communication.
            </p>
          </motion.div>
        </div>

        {/* SERVICE BAND */}

        <motion.div
          {...reveal}
          variants={revealUp(0.08)}
          className="mt-12 border-y border-black/15 md:mt-14"
        >
          {SERVICES.map((service, index) => (
            <div
              key={service.label}
              className="
                grid
                gap-3
                border-b
                border-black/10
                py-5
                last:border-b-0
                md:grid-cols-12
                md:items-center
                md:gap-6
              "
            >
              <div className="flex items-center gap-3 md:col-span-1">
                <span className="text-[9px] uppercase tracking-[0.16em] text-black/28">
                  0{index + 1}
                </span>
              </div>

              <div className="md:col-span-4">
                <h3 className="text-[18px] font-medium leading-[1.1] tracking-[-0.025em] md:text-[20px]">
                  {service.label}
                </h3>
              </div>

              <div className="md:col-span-6">
                <p className="max-w-[560px] text-[13px] leading-[1.55] text-black/50 md:text-[14px]">
                  {service.detail}
                </p>
              </div>

              <div className="hidden justify-end md:col-span-1 md:flex">
                <span className="text-[12px] text-black/25">
                  ↗
                </span>
              </div>
            </div>
          ))}
        </motion.div>

        {/* CLOSING */}

        <motion.div
          {...reveal}
          variants={revealUp(0.06)}
          className="mt-10 grid gap-5 md:mt-12 md:grid-cols-12 md:items-end"
        >
          <div className="md:col-span-3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-black/35">
              BrandWorks / Communication
            </span>
          </div>

          <div className="md:col-span-7">
            <p className="max-w-[640px] text-[clamp(24px,2.7vw,40px)] font-medium leading-[1] tracking-[-0.035em]">
              Clear enough to understand.
              <span className="text-black/38">
                {' '}Consistent enough to remember.
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
