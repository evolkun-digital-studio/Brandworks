import { useRef, useMemo } from 'react'
import {
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

  // Get 5 random photos for the showcase
  const showcasePhotos = useMemo(() => {
    const shuffled = [...allPhotos].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 5)
  }, [])

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // Photo index changes at different scroll points
  const photoOpacities = [
    useTransform(scrollYProgress, [0, 0.12, 0.2, 0.25], [1, 1, 0.5, 0]),      // Photo 0
    useTransform(scrollYProgress, [0.15, 0.25, 0.35, 0.4], [0, 1, 1, 0.5]),    // Photo 1
    useTransform(scrollYProgress, [0.3, 0.4, 0.5, 0.55], [0, 1, 1, 0.5]),      // Photo 2
    useTransform(scrollYProgress, [0.45, 0.55, 0.65, 0.7], [0, 1, 1, 0.5]),    // Photo 3
    useTransform(scrollYProgress, [0.6, 0.7, 0.8, 0.85], [0, 1, 1, 0.5]),      // Photo 4
  ]

  // Start as the tiny central photo, pause there for a beat, then expand slowly
  const mediaScale = useTransform(
    scrollYProgress,
    [0, 0.04, 0.12, 0.25, 0.55, 1],
    [0.018, 0.035, 0.14, 0.23, 1.02, 1.02],
  )
  const mediaOpacity = useTransform(
    scrollYProgress,
    [0, 0.03, 0.06, 0.12],
    [0, 0.4, 0.7, 1]
  )
  const mediaRadius = useTransform(
    scrollYProgress,
    [0.17, 0.35, 0.52],
    [18, 12, 0]
  )

  // Title scale and position - extended for longer scroll
  const titleScale = useTransform(scrollYProgress, [0, 0.55, 0.75], [1, 0.99, 1.025])
  const titleY = useTransform(scrollYProgress, [0, 0.5, 0.7], ['0vh', '0vh', '-2.2vh'])

  // Text separation animation - "Our" moves left, "Photography" moves right
  const theX = useTransform(scrollYProgress, [0, 0.25, 0.55], ['0%', '-25vw', '-55vw'])
  const workX = useTransform(scrollYProgress, [0, 0.25, 0.55], ['0%', '25vw', '55vw'])
  const textSeparationOpacity = useTransform(scrollYProgress, [0, 0.2, 0.65, 1], [1, 1, 0.3, 0])

  // A white hand-off removes the hard cut when the sticky reveal releases
  const whiteOutOpacity = useTransform(scrollYProgress, [0.92, 1], [0, 1])
  const microCopyOpacity = useTransform(scrollYProgress, [0.05, 0.2, 0.4], [0, 1, 0])

  if (prefersReducedMotion) {
    return (
      <div className="bg-white px-4 pt-14 sm:pt-20" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-screen-lg flex-col items-center">
          <div
            className="text-center text-[clamp(58px,13vw,150px)] leading-[0.82] font-thin tracking-[-0.065em] text-[#111] uppercase"
            style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
          >
            Our Photography
          </div>
          <div className="mt-8 aspect-video w-full overflow-hidden rounded-lg bg-neutral-100 sm:mt-10">
            <img src={showcasePhotos[0]} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={runwayRef} className="relative h-[700vh] bg-white" aria-hidden="true">
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
      Our
    </motion.span>

    <motion.span
      className="font-normal"
      style={{ x: workX }}
      transition={{ type: "spring", damping: 35, stiffness: 70, mass: 1.1, duration: 1 }}
    >
      Photography
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
          {showcasePhotos.map((photo, idx) => (
            <motion.div
              key={photo}
              className="absolute inset-0"
              style={{ opacity: photoOpacities[idx] }}
            >
              <img
                src={photo}
                alt=""
                className="h-full w-full select-none object-cover"
                draggable={false}
              />
            </motion.div>
          ))}

          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between p-5 text-[10px] font-medium tracking-[0.16em] text-white/75 uppercase sm:p-7"
            style={{ opacity: microCopyOpacity }}
          >
            <span>Our Photography</span>
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
