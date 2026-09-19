import { useRef } from 'react'
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'

// Import all photos
import Photo1 from '/src/Photo/Photo1.jpg'
import Photo2 from '/src/Photo/Photo2.jpg'
import Photo3 from '/src/Photo/Photo3.jpg'
import Photo4 from '/src/Photo/Photo4.png'
import Photo5 from '/src/Photo/Photo5.png'
import Photo6 from '/src/Photo/Photo6.png'
import Photo7 from '/src/Photo/Photo7.png'
import Photo8 from '/src/Photo/Photo8.png'
import Photo9 from '/src/Photo/Photo9.png'
import Photo10 from '/src/Photo/Photo10.png'
import Photo11 from '/src/Photo/Photo11.png'
import Photo12 from '/src/Photo/Photo12.png'
import Photo13 from '/src/Photo/Photo13.png'
import Photo14 from '/src/Photo/Photo14.png'
import Photo15 from '/src/Photo/Photo15.png'
import Photo16 from '/src/Photo/Photo16.png'

const allPhotos = [Photo1, Photo2, Photo3, Photo4, Photo5, Photo6, Photo7, Photo8, Photo9, Photo10, Photo11, Photo12, Photo13, Photo14, Photo15, Photo16]

const getRandomPhotos = (count: number) => {
  const shuffled = [...allPhotos].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

const services = [
  {
    id: 1,
    title: 'Videography',
    description: 'Concept-led films and moving brand stories.',
    demos: getRandomPhotos(3).map((photo, i) => ({ image: photo, label: `Shot ${i + 1}` })),
  },
  {
    id: 2,
    title: 'Photography',
    description: 'Distinctive imagery shaped around the brand\'s visual language.',
    demos: getRandomPhotos(3).map((photo, i) => ({ image: photo, label: `Portrait ${i + 1}` })),
  },
  {
    id: 3,
    title: 'PR',
    description: 'Stories worth telling, placed where they can matter.',
    demos: getRandomPhotos(3).map((photo, i) => ({ image: photo, label: `Coverage ${i + 1}` })),
  },
  {
    id: 4,
    title: 'Founder Reputation Management',
    description: 'Build a credible public presence around the people behind the brand.',
    demos: getRandomPhotos(3).map((photo, i) => ({ image: photo, label: `Portrait ${i + 1}` })),
  },
  {
    id: 5,
    title: 'Performance & SEO Marketing',
    description: 'Connect creative thinking with discovery, demand and measurable growth.',
    demos: getRandomPhotos(3).map((photo, i) => ({ image: photo, label: `Campaign ${i + 1}` })),
  },
  {
    id: 6,
    title: 'Graphics & Animation',
    description: 'Turn brand systems into expressive visual and motion communication.',
    demos: getRandomPhotos(3).map((photo, i) => ({ image: photo, label: `Design ${i + 1}` })),
  },
]

const CAMERA_MOVES = [
  { x: ['0%', '-1.35%'], y: ['0%', '-0.35%'], scale: [1.025, 1.075] },
  { x: ['-0.8%', '0.7%'], y: ['0.35%', '-0.65%'], scale: [1.06, 1.025] },
  { x: ['0.55%', '-0.45%'], y: ['-0.5%', '0.45%'], scale: [1.02, 1.07] },
  { x: ['-0.6%', '0.6%'], y: ['0%', '-0.45%'], scale: [1.055, 1.02] },
  { x: ['0.4%', '-0.8%'], y: ['0.45%', '-0.25%'], scale: [1.02, 1.065] },
] as const

/**
 * Cycles through service demos with smooth image transitions.
 * Each service has 2-3 demo images that rotate as you scroll through.
 */
function WorkImpactMediaSequence({
  reducedMotion,
  currentService,
  currentDemo,
}: {
  reducedMotion: boolean
  currentService: typeof services[0]
  currentDemo: typeof services[0]['demos'][0]
}) {
  const camera = CAMERA_MOVES[
    (services.indexOf(currentService) * currentService.demos.length + currentService.demos.indexOf(currentDemo)) %
      CAMERA_MOVES.length
  ]

  return (
    <div className="absolute inset-0 overflow-hidden bg-neutral-950" aria-hidden="true">
      <AnimatePresence initial={false} mode="sync">
        <motion.img
          key={currentDemo.image}
          src={currentDemo.image}
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
          initial={reducedMotion ? false : { opacity: 0, scale: camera.scale[0], x: camera.x[0], y: camera.y[0] }}
          animate={
            reducedMotion
              ? { opacity: 1, scale: 1, x: '0%', y: '0%' }
              : {
                  opacity: 1,
                  scale: camera.scale[1],
                  x: camera.x[1],
                  y: camera.y[1],
                }
          }
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{
            opacity: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
            scale: { duration: 3.6, ease: [0.25, 0.46, 0.45, 0.94] },
            x: { duration: 3.6, ease: [0.25, 0.46, 0.45, 0.94] },
            y: { duration: 3.6, ease: [0.25, 0.46, 0.45, 0.94] },
          }}
        />
      </AnimatePresence>

      {/* Very light treatment to make crossfades feel like one continuous film. */}
      <div className="pointer-events-none absolute inset-0 bg-black/4" />
    </div>
  )
}

/**
 * Reference-inspired entrance for Work:
 * THE WORK -> tiny moving visual -> visual expands through the type ->
 * full-viewport image -> clean white hand-off to the existing section.
 *
 * Native scroll is still in control. Motion only reads scroll progress, so it
 * works with the site's existing Lenis setup and does not add scroll-jacking.
 */
function WorkReveal() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false
  const activeServiceIndex = 0
  const activeDemoIndex = 0

  const currentService = services[activeServiceIndex]
  const currentDemo = currentService.demos[activeDemoIndex]

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // Start as the tiny central "video" seen in the reference, pause there for
  // a beat, then let the work physically take over the viewport.
  const mediaScale = useTransform(
    scrollYProgress,
    [0, 0.06, 0.2, 0.38, 0.78, 1],
    [0.018, 0.035, 0.14, 0.23, 1.02, 1.02],
  )
  const mediaOpacity = useTransform(
    scrollYProgress,
    [0, 0.04, 0.08, 0.15],
    [0, 0.4, 0.7, 1]
  )
  const mediaRadius = useTransform(
    scrollYProgress,
    [0.24, 0.48, 0.72],
    [18, 12, 0]
  )

  // Title scale and position
  const titleScale = useTransform(scrollYProgress, [0, 0.68, 0.88], [1, 0.99, 1.025])
  const titleY = useTransform(scrollYProgress, [0, 0.62, 0.86], ['0vh', '0vh', '-2.2vh'])

  // Text separation animation - "The" moves left, "Work" moves right
  const theX = useTransform(scrollYProgress, [0, 0.4, 0.8], ['0%', '-15vw', '-35vw'])
  const workX = useTransform(scrollYProgress, [0, 0.4, 0.8], ['0%', '15vw', '35vw'])
  const textSeparationOpacity = useTransform(scrollYProgress, [0, 0.35, 0.75, 1], [1, 1, 0.3, 0])

  // A white hand-off removes the hard cut when the sticky reveal releases and
  // the original Work-with-impact content starts immediately afterwards.
  const whiteOutOpacity = useTransform(scrollYProgress, [0.9, 1], [0, 1])
  const microCopyOpacity = useTransform(scrollYProgress, [0.08, 0.28, 0.56], [0, 1, 0])

  if (prefersReducedMotion) {
    return (
      <div className="bg-white px-4 pt-14 sm:pt-20" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-screen-lg flex-col items-center">
          <div
            className="text-center text-[clamp(58px,13vw,150px)] leading-[0.82] font-thin tracking-[-0.065em] text-[#111] uppercase"
            style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
          >
            What We Do
          </div>
          <div className="mt-8 aspect-video w-full overflow-hidden rounded-lg bg-neutral-100 sm:mt-10">
            <img src={services[0].demos[0].image} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={runwayRef} className="relative h-[500vh] bg-white" aria-hidden="true">
      <div className="sticky top-0 h-screen overflow-hidden bg-white">
        <motion.div
  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
  style={{ opacity: textSeparationOpacity, scale: titleScale, y: titleY }}
>
  <div
    className="flex items-center justify-center gap-[clamp(14px,2.2vw,38px)] px-4 text-[clamp(58px,10.6vw,178px)] leading-[0.78] tracking-[-0.07em] text-[#111] uppercase sm:px-[4vw]"
    style={{
      fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
    }}
  >
    <motion.span
      className="font-bold"
      style={{ x: theX }}
      transition={{ type: "spring", damping: 35, stiffness: 70, mass: 1.1, duration: 1 }}
    >
      What
    </motion.span>

    <motion.span
      className="font-normal"
      style={{ x: workX }}
      transition={{ type: "spring", damping: 35, stiffness: 70, mass: 1.1, duration: 1 }}
    >
      We Do
    </motion.span>
  </div>
</motion.div>

        <motion.div
          className="absolute inset-0 z-20 overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
          style={{
            opacity: mediaOpacity,
            scale: mediaScale,
            borderRadius: mediaRadius,
            transformOrigin: '50% 50%',
            willChange: 'transform, opacity, border-radius',
          }}
        >
          <WorkImpactMediaSequence reducedMotion={false} currentService={currentService} currentDemo={currentDemo} />

          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-5 text-[10px] font-medium tracking-[0.16em] text-white/75 uppercase sm:p-7"
            style={{ opacity: microCopyOpacity }}
          >
            <span>{currentService.title}</span>
            <span>Brandworks / 2026</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 z-30 bg-white"
          style={{ opacity: whiteOutOpacity }}
        />
      </div>
    </div>
  )
}

 

function Work() {
  return (
    <section id="work" aria-labelledby="work-with-impact-heading" className="bg-white">
      <WorkReveal /> 
    </section>
  )
}

export default Work
