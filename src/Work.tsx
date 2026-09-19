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
 * Vertical editorial reveal for Photography → Work transition:
 *
 * PHOTOGRAPHY (centered title)
 * ↓
 * small VERTICAL media window appears (3:5 aspect ratio)
 * ↓
 * media expands vertically through typography
 * ↓
 * media reaches tall editorial frame (90%+ viewport height)
 * ↓
 * media expands horizontally into fullscreen
 * ↓
 * fullscreen image lifts upward as curtain
 * ↓
 * WORK WITH IMPACT revealed underneath
 *
 * Two-stage motion: vertical opening → horizontal release
 * Creates cinematic, fashion-film inspired transition
 *
 * Native scroll is still in control. Motion only reads scroll progress, so it
 * works with the site's existing Lenis setup and does not add scroll-jacking.
 */
function WorkReveal() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false

  // Get 3 strong photos for the transition
  const showcasePhotos = useMemo(() => {
    const shuffled = [...allPhotos].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }, [])

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // Timing progression:
  // 0.00–0.15: PHOTOGRAPHY + small vertical visual
  // 0.15–0.35: media expands mainly vertically
  // 0.35–0.55: media reaches almost full viewport height
  // 0.55–0.78: width begins expanding horizontally
  // 0.78–0.88: image becomes 100vw × 100vh
  // 0.88–1.00: vertical curtain reveals Work with impact

  // Photo crossfades with 3 images
  const photoOpacities = [
    useTransform(scrollYProgress, [0, 0.15, 0.35, 0.48], [1, 1, 0.8, 0]),      // Photo 0
    useTransform(scrollYProgress, [0.35, 0.48, 0.65, 0.75], [0, 1, 1, 0.3]),    // Photo 1
    useTransform(scrollYProgress, [0.63, 0.75, 0.88, 0.95], [0, 1, 1, 0.5]),    // Photo 2
  ]

  // VERTICAL STAGE (0–0.55): grow height primarily
  // Start: 12vw × 35vh → 24vw × 92vh
  const mediaWidth = useTransform(
    scrollYProgress,
    [0, 0.08, 0.15, 0.35, 0.55, 0.78, 1],
    ['3.5vw', '6vw', '12vw', '18vw', '24vw', '70vw', '100vw'],
  )

  const mediaHeight = useTransform(
    scrollYProgress,
    [0, 0.08, 0.15, 0.35, 0.55, 0.78, 1],
    ['18vh', '22vh', '35vh', '60vh', '92vh', '100vh', '100vh'],
  )

  // Media stays fully opaque throughout
  const mediaOpacity = useTransform(
    scrollYProgress,
    [0, 0.06, 0.12, 1],
    [0, 0.5, 1, 1]
  )

  // Border radius transitions smoothly
  // Vertical frame: 6px → fullscreen: 0px
  const mediaRadius = useTransform(
    scrollYProgress,
    [0.12, 0.35, 0.55, 0.78, 0.88],
    [6, 5, 4, 2, 0]
  )

  // Typography reacts to vertical expansion
  // Upper text moves up, lower text moves down as media grows vertically
  const typographyUpperY = useTransform(
    scrollYProgress,
    [0, 0.35, 0.55],
    ['0px', '-40px', '-80px']
  )

  const typographyLowerY = useTransform(
    scrollYProgress,
    [0, 0.35, 0.55],
    ['0px', '40px', '80px']
  )

  const typographyOpacity = useTransform(
    scrollYProgress,
    [0, 0.55, 0.75],
    [1, 0.8, 0]
  )

  // Vertical clip-path for editorial reveal
  // Starts as thin horizontal slice, expands vertically
  const mediaClipPath = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.88, 1],
    [
      'inset(48% 40% 48% 40%)',  // small square in center
      'inset(35% 35% 35% 35%)',  // larger square
      'inset(0 35% 0 35%)',       // vertical slit
      'inset(0 0 0 0)',           // full visible
      'inset(0 0 100% 0)',        // reveal upward for Work section
    ]
  )

  // Subtle vertical image movement
  // Photo 1: subtle scale up and vertical pan
  const photo1Scale = useTransform(scrollYProgress, [0.35, 0.48], [1, 1.04])
  const photo1Y = useTransform(scrollYProgress, [0.35, 0.48], ['2%', '-2%'])

  // Photo 2: subtle scale and vertical pan
  const photo2Scale = useTransform(scrollYProgress, [0.48, 0.63], [1.035, 1])
  const photo2Y = useTransform(scrollYProgress, [0.48, 0.63], ['-1%', '1.5%'])

  // Photo 3: subtle vertical motion
  const photo3Scale = useTransform(scrollYProgress, [0.63, 0.78], [1.03, 1])
  const photo3Y = useTransform(scrollYProgress, [0.63, 0.78], ['1%', '-1%'])

  if (prefersReducedMotion) {
    return (
      <div className="bg-white px-4 pt-14 sm:pt-20" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
          <div
            className="text-center text-[clamp(90px,12vw,190px)] leading-[0.82] font-thin tracking-[-0.055em] text-[#111] uppercase"
            style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
          >
            Photography
          </div>
          <div className="mt-12 w-[clamp(180px,12vw,240px)] overflow-hidden rounded-lg bg-neutral-100 sm:mt-14" style={{ aspectRatio: '3/5' }}>
            <img src={showcasePhotos[0]} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={runwayRef} className="relative h-[700vh] bg-white" aria-hidden="true">
      <div className="sticky top-0 h-screen overflow-hidden bg-white">
        {/* PHOTOGRAPHY title - split vertically to react to expanding media */}
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-4 sm:px-[2vw]"
          style={{ opacity: typographyOpacity }}
        >
          {/* Upper portion of text */}
          <motion.div
            className="text-center text-[clamp(90px,12vw,190px)] leading-[0.82] font-thin tracking-[-0.055em] text-[#111] uppercase"
            style={{
              fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
              y: typographyUpperY,
            }}
          >
            Photo
          </motion.div>

          {/* Lower portion of text */}
          <motion.div
            className="text-center text-[clamp(90px,12vw,190px)] leading-[0.82] font-thin tracking-[-0.055em] text-[#111] uppercase"
            style={{
              fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
              y: typographyLowerY,
            }}
          >
            graphy
          </motion.div>
        </motion.div>

        {/* Vertical media container - editorial reveal */}
        <motion.div
          className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
          style={{
            opacity: mediaOpacity,
            width: mediaWidth,
            height: mediaHeight,
            borderRadius: mediaRadius,
            clipPath: mediaClipPath,
            willChange: 'width, height, border-radius, clip-path',
          }}
        >
          {/* Photo container with subtle vertical movement */}
          <div className="relative h-full w-full">
            {showcasePhotos.map((photo, idx) => (
              <motion.div
                key={photo}
                className="absolute inset-0"
                style={{
                  opacity: photoOpacities[idx],
                  scale: idx === 0 ? photo1Scale : idx === 1 ? photo2Scale : idx === 2 ? photo3Scale : 1,
                  y: idx === 0 ? photo1Y : idx === 1 ? photo2Y : idx === 2 ? photo3Y : 0,
                }}
              >
                <img
                  src={photo}
                  alt=""
                  className="h-full w-full select-none object-cover"
                  draggable={false}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Work section placeholder - will be revealed as media clips upward */}
      <div className="relative z-0 bg-white px-4 py-20 sm:px-[2vw] sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            viewport={{ once: true, margin: '0px 0px -100px 0px' }}
            className="mb-16 text-center"
          >
            <div className="mb-4 text-[13px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              What We Do
            </div>
            <h2
              className="text-[clamp(42px,8vw,72px)] leading-[1.1] font-thin tracking-[-0.03em] text-[#111]"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Work with Impact
            </h2>
          </motion.div>

          {/* Placeholder grid for work projects */}
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  ease: 'easeOut',
                  delay: idx * 0.08,
                }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="aspect-square overflow-hidden rounded-2xl bg-neutral-100"
              >
                <div className="h-full w-full flex items-center justify-center text-neutral-400 font-medium">
                  Project {idx}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
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
