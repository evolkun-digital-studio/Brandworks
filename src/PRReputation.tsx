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
    '(min-width: 1440px) 1050px, (min-width: 1024px) 72vw, (min-width: 768px) 66vw, calc(100vw - 40px)',
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
      className="relative overflow-hidden bg-white py-14 text-[#111] sm:py-16 md:py-20 lg:py-24 xl:py-28 2xl:py-32"
    >
      <SectionContainer>
        {/* SECTION META */}
         

        {/* MANIFESTO */}
        <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-12 sm:gap-8 md:mt-14 md:grid-cols-12 md:items-end md:gap-6 lg:mt-16 lg:gap-8 xl:mt-20 xl:gap-10">
          <motion.div
            {...reveal}
            variants={rise(28, 0.04)}
            className="md:col-span-8 lg:col-span-8"
          >
            <h2
              id="pr-reputation-heading"
              className="max-w-[1050px] font-primary text-[clamp(2.5rem,6.2vw,3rem)] leading-[0.9] tracking-[-0.055em] sm:leading-[0.88] md:tracking-[-0.06em] lg:leading-[0.86]"
            >
              People don&apos;t trust logos.
              <br />
              <span className="">
                They trust meaning.
              </span>
            </h2>
          </motion.div> 
        </div>

        {/* EDITORIAL MEDIA */}
        <div className="relative mt-10 sm:mt-12 md:mt-16 lg:mt-20 xl:mt-24">
          <div className="grid grid-cols-1 gap-7 sm:gap-8 md:grid-cols-12 md:items-stretch md:gap-5 lg:gap-7 xl:gap-8">
            {/* IMAGE */}
            <motion.figure
              {...reveal}
              variants={IMAGE_REVEAL}
              className="relative min-w-0 md:col-span-8 lg:col-span-9"
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
                  className="aspect-[4/3] h-full w-full object-cover transition-transform duration-1000 ease-out sm:aspect-[16/10] md:aspect-[4/3] lg:aspect-[16/10] lg:hover:scale-[1.012]"
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent" />
              </div>
            </motion.figure>

            {/* POINTS */}
            <motion.aside
              {...reveal}
              variants={rise(22, 0.08)}
              className="flex min-w-0 flex-col justify-end md:col-span-4 lg:col-span-3"
            >
              <div className="">
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
                    className="group grid grid-cols-[28px_1fr] gap-3 border-b border-black/10 py-4 sm:grid-cols-[32px_1fr] sm:py-5 md:grid-cols-[30px_1fr] md:gap-2.5 md:py-4 lg:grid-cols-[36px_1fr] lg:gap-3 lg:py-5 xl:py-6"
                  >
                    <span className="pt-[2px] font-primary text-[8px] uppercase tracking-[0.15em] text-black/28 transition-colors duration-300 group-hover:text-black/55 sm:text-[9px]">
                      0{index + 1}
                    </span>

                    <p className="text-[15px] leading-[1.22] tracking-[-0.02em] text-black/72 transition-colors duration-300 group-hover:text-black sm:text-[16px] md:text-[15px] lg:text-[17px] xl:text-[18px]">
                      {point}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          </div>
        </div>

        {/* CLOSING STATEMENT */}
        <motion.div
          {...reveal}
          variants={rise(22, 0.05)}
          className="mt-5 grid grid-cols-1 gap-6 pt-5 sm:mt-14 sm:pt-6 md:mt-16 md:grid-cols-12 md:gap-6 lg:mt-18 lg:gap-8 xl:mt-18" > 

          <div className="md:col-span-9">
            <p className="max-w-[1050px] text-[clamp(1.2rem,4.4vw,1.5rem)] font-medium leading-[0.96] tracking-[-0.045em] sm:leading-[0.94] md:tracking-[-0.05em]">
              Technology can distribute content.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>
              <span className="">
                Only people create meaning.
              </span>
            </p>
          </div>
        </motion.div>
      </SectionContainer>
    </section>
  )
}