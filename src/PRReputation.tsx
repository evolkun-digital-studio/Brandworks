import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'

import { SectionContainer } from './SectionPrimitives'

const CLOUDINARY_UPLOAD =
  'https://res.cloudinary.com/dmzo1kt0d/image/upload'

const IMAGE_PATH =
  'v1789994866/ChatGPT_Image_Sep_21_2026_03_09_11_PM.webp'

const MEDIA = {
  src: `${CLOUDINARY_UPLOAD}/${IMAGE_PATH}`,
  srcSet: [640, 960, 1280, 1586]
    .map(
      (w) =>
        `${CLOUDINARY_UPLOAD}/f_auto,q_auto,w_${w}/${IMAGE_PATH} ${w}w`,
    )
    .join(', '),
  sizes:
    '(min-width: 1400px) 760px, (min-width: 768px) 58vw, calc(100vw - 40px)',
  width: 1586,
  height: 992,
  alt:
    'BrandWorks PR and founder reputation editorial composition with founder features and press coverage',
}

const POINTS = [
  'A founder with conviction.',
  'A purpose worth following.',
  'A story worth remembering.',
  'A message repeated consistently.',
]

const EASE = [0.22, 1, 0.36, 1] as const

const rise = (y = 24, delay = 0): Variants => ({
  hidden: {
    opacity: 0,
    y,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      delay,
      ease: EASE,
    },
  },
})

const IMAGE_REVEAL: Variants = {
  hidden: {
    opacity: 0,
    clipPath: 'inset(8% 0% 8% 0% round 0px)',
    scale: 0.985,
  },
  visible: {
    opacity: 1,
    clipPath: 'inset(0% 0% 0% 0% round 0px)',
    scale: 1,
    transition: {
      duration: 1,
      ease: EASE,
    },
  },
}

export default function PRReputation() {
  const reduce = useReducedMotion()

  const reveal = {
    initial: reduce ? 'visible' : 'hidden',
    whileInView: 'visible',
    viewport: {
      once: true,
      amount: 0.16,
    },
  } as const

  return (
    <section
      id="pr-founder-reputation"
      aria-labelledby="pr-reputation-heading"
      className="relative overflow-hidden py-16 text-[#111] md:py-24 lg:py-28"
    >
      <SectionContainer>
        {/* ----------------------------------------------------- */}
        {/* SECTION META                                          */}
        {/* ----------------------------------------------------- */}

        <motion.div
          {...reveal}
          variants={rise(10)}
          className="flex items-center gap-4 border-t border-black/15 pt-4"
        >
          <span className="h-px w-9 shrink-0 bg-bw-lime" />

          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-black/45 md:text-[10px]">
            PR & Founder Reputation
          </p>

          <span className="ml-auto text-[9px] uppercase tracking-[0.18em] text-black/30 md:text-[10px]">
            02
          </span>
        </motion.div>

        {/* ----------------------------------------------------- */}
        {/* MANIFESTO                                             */}
        {/* ----------------------------------------------------- */}

        <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-12 md:gap-6 lg:gap-10">
          <motion.div
            {...reveal}
            variants={rise(28, 0.04)}
            className="md:col-span-8"
          >
            <h2
              id="pr-reputation-heading"
              className="max-w-[980px] text-[clamp(3rem,6.9vw,3.5rem)] font-medium leading-[0.84] tracking-[-0.068em]"
            >
              People don&apos;t
             
              trust logos.
              <br />
              <span className="">
                They trust meaning.
              </span>
            </h2>
          </motion.div>

          <motion.div
            {...reveal}
            variants={rise(18, 0.12)}
            className="flex items-end md:col-span-4 md:pb-2"
          >
            <p className="max-w-[390px] text-[14px] leading-[1.55] text-black/55 md:text-[16px]">
              A business becomes memorable because people connect
              with something real.
            </p>
          </motion.div>
        </div>

        {/* ----------------------------------------------------- */}
        {/* EDITORIAL MEDIA STAGE                                  */}
        {/* ----------------------------------------------------- */}

        <div className="relative mt-14 md:mt-20 lg:mt-24">
          <div className="grid gap-8 md:grid-cols-12 md:items-stretch md:gap-6 lg:gap-8">
            {/* IMAGE */}

            <motion.figure
              {...reveal}
              variants={IMAGE_REVEAL}
              className="relative md:col-span-8 lg:col-span-9"
            >
              <div className="relative overflow-hidden bg-[#ddd]">
                <img
                  src={MEDIA.src}
                  srcSet={MEDIA.srcSet}
                  sizes={MEDIA.sizes}
                  width={MEDIA.width}
                  height={MEDIA.height}
                  alt={MEDIA.alt}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] h-full w-full object-cover transition-transform duration-1000 ease-out hover:scale-[1.012]"
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
              </div>
            </motion.figure>

            {/* POINTS */}

            <motion.aside
              {...reveal}
              variants={rise(22, 0.08)}
              className="flex flex-col justify-end md:col-span-4 lg:col-span-3"
            >
              <div className="border-t border-black/15">
                {POINTS.map((point, index) => (
                  <motion.div
                    key={point}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{
                      duration: 0.6,
                      delay: reduce ? 0 : index * 0.06,
                      ease: EASE,
                    }}
                    className="group grid grid-cols-[36px_1fr] gap-3 border-b border-black/10 py-5 md:py-6"
                  >
                    <span className="pt-[2px] text-[9px] uppercase tracking-[0.15em] text-black/28 transition-colors duration-300 group-hover:text-black/55">
                      0{index + 1}
                    </span>

                    <p className="text-[17px] leading-[1.22] tracking-[-0.02em] text-black/72 transition-colors duration-300 group-hover:text-black md:text-[18px]">
                      {point}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          </div>
        </div>

        {/* ----------------------------------------------------- */}
        {/* CLOSING STATEMENT                                      */}
        {/* ----------------------------------------------------- */}

        <motion.div
          {...reveal}
          variants={rise(22, 0.05)}
          className="mt-14 grid gap-8 border-t border-black/15 pt-6 md:mt-20 md:grid-cols-12 md:gap-6 lg:mt-24"
        >
          <div className="md:col-span-3">
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-black/38 md:text-[10px]">
              Reputation is built
            </p>
          </div>

          <div className="md:col-span-9">
            <p className="max-w-[1000px] text-[clamp(2.2rem,4.7vw,3.1rem)] font-medium leading-[0.94] tracking-[-0.052em]">
              Technology can distribute content.
              <br />
              <span className="   ">
                Only people create meaning.
              </span>
            </p>

            <div className="flex flex-wrap gap-x-8 gap-y-3 border-black/80 pt-4 text-[15px] font-medium uppercase tracking-[0.17em] text-black/38">
              <span>Founder narrative</span>
              <span>Earned press</span>
              <span>Public record</span>
            </div>
          </div>
        </motion.div>
      </SectionContainer>
    </section>
  )
}
