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
 * Vertical editorial reveal → portfolio morphing transition:
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
 * fullscreen image splits into 3 vertical panels
 * ↓
 * panels separate, images morph into actual projects
 * ↓
 * panels transform into portfolio layout
 * ↓
 * work portfolio appears seamlessly
 *
 * Creative transformation: fullscreen photography becomes the work portfolio.
 * No intermediate "Work with Impact" title screen.
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
    [0, 0.15, 0.35, 0.68],
    [
      'inset(48% 40% 48% 40%)',  // small square in center
      'inset(35% 35% 35% 35%)',  // larger square
      'inset(0 35% 0 35%)',       // vertical slit
      'inset(0 0 0 0)',           // full visible (fullscreen)
    ]
  )

  // Panel transforms: split fullscreen into 3 vertical sections
  // Panel 1 (left): moves up slightly
  const panel1Y = useTransform(scrollYProgress, [0.68, 0.92], ['0vh', '-14vh'])
  const panel1Scale = useTransform(scrollYProgress, [0.68, 0.92], [1, 1.015])
  const panel1Width = useTransform(scrollYProgress, [0.68, 0.92, 1], ['33.33%', '35%', '45%'])

  // Panel 2 (center): moves down slightly
  const panel2Y = useTransform(scrollYProgress, [0.68, 0.92], ['0vh', '14vh'])
  const panel2Scale = useTransform(scrollYProgress, [0.68, 0.92], [1.015, 1])
  const panel2Width = useTransform(scrollYProgress, [0.68, 0.92, 1], ['33.33%', '30%', '55%'])

  // Panel 3 (right): moves up slightly
  const panel3Y = useTransform(scrollYProgress, [0.68, 0.92], ['0vh', '-10vh'])
  const panel3Scale = useTransform(scrollYProgress, [0.68, 0.92], [1, 1.02])
  const panel3Width = useTransform(scrollYProgress, [0.68, 0.92, 1], ['33.33%', '35%', '40%'])

  // Panel clip paths: show different vertical sections of the fullscreen image
  // These create the 3-panel illusion of the same fullscreen image split
  const panel1ClipPath = useTransform(
    scrollYProgress,
    [0.68, 0.76, 0.92, 1],
    [
      'inset(0 66.67% 0 0)',    // left third
      'inset(0 66.67% 0 0)',    // still left third
      'inset(0 55% 0 0)',       // morph outward
      'inset(0 55% 0 0)',       // final position
    ]
  )

  const panel2ClipPath = useTransform(
    scrollYProgress,
    [0.68, 0.76, 0.92, 1],
    [
      'inset(0 33.33% 0 33.33%)',  // center third
      'inset(0 33.33% 0 33.33%)',  // still center
      'inset(0 22.5% 0 22.5%)',    // morph outward
      'inset(0 22.5% 0 22.5%)',    // final position
    ]
  )

  const panel3ClipPath = useTransform(
    scrollYProgress,
    [0.68, 0.76, 0.92, 1],
    [
      'inset(0 0 0 66.67%)',    // right third
      'inset(0 0 0 66.67%)',    // still right third
      'inset(0 0 0 60%)',       // morph outward
      'inset(0 0 0 60%)',       // final position
    ]
  )

  // Image morphing: crossfade from original photos to project images within panels
  // Panel 1 image opacity (fade out original, fade in project 1)
  const panel1OriginalOpacity = useTransform(scrollYProgress, [0.76, 0.84], [1, 0])
  const panel1ProjectOpacity = useTransform(scrollYProgress, [0.76, 0.84], [0, 1])

  // Panel 2 image opacity (fade out original, fade in project 2)
  const panel2OriginalOpacity = useTransform(scrollYProgress, [0.76, 0.84], [1, 0])
  const panel2ProjectOpacity = useTransform(scrollYProgress, [0.76, 0.84], [0, 1])

  // Panel 3 image opacity (fade out original, fade in project 3)
  const panel3OriginalOpacity = useTransform(scrollYProgress, [0.76, 0.84], [1, 0])
  const panel3ProjectOpacity = useTransform(scrollYProgress, [0.76, 0.84], [0, 1])

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
    <div ref={runwayRef} className="relative h-[650vh] bg-white">
      {/* PHOTOGRAPHY title - split vertically to react to expanding media */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-4 sm:px-[2vw]"
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

      {/* Vertical media container - editorial reveal to fullscreen */}
      <motion.div
        className="fixed inset-0 z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_rgba(0,0,0,0.05)]"
        style={{
          opacity: mediaOpacity,
          width: mediaWidth,
          height: mediaHeight,
          borderRadius: mediaRadius,
          clipPath: mediaClipPath,
          willChange: 'width, height, border-radius, clip-path',
          pointerEvents: 'none',
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

      {/* 3-PANEL MORPHING SECTION - transforms fullscreen image into portfolio */}
      <div className="fixed inset-0 z-30 flex overflow-hidden bg-white" style={{ pointerEvents: 'none' }}>
        {/* Panel 1 (Left) */}
        <motion.div
          className="flex-1 overflow-hidden"
          style={{
            width: panel1Width,
            y: panel1Y,
            scale: panel1Scale,
          }}
        >
          {/* Original photo section */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: panel1OriginalOpacity,
              clipPath: panel1ClipPath,
            }}
          >
            <div className="relative h-full w-full">
              {showcasePhotos.map((photo, idx) => (
                <motion.div
                  key={`panel1-orig-${photo}`}
                  className="absolute inset-0"
                  style={{ opacity: photoOpacities[idx] }}
                >
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Project 1 image replacement */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: panel1ProjectOpacity,
            }}
          >
            <img
              src={showcasePhotos[0]}
              alt="Project 1"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </motion.div>

        {/* Panel 2 (Center) */}
        <motion.div
          className="flex-1 overflow-hidden"
          style={{
            width: panel2Width,
            y: panel2Y,
            scale: panel2Scale,
          }}
        >
          {/* Original photo section */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: panel2OriginalOpacity,
              clipPath: panel2ClipPath,
            }}
          >
            <div className="relative h-full w-full">
              {showcasePhotos.map((photo, idx) => (
                <motion.div
                  key={`panel2-orig-${photo}`}
                  className="absolute inset-0"
                  style={{ opacity: photoOpacities[idx] }}
                >
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Project 2 image replacement */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: panel2ProjectOpacity,
            }}
          >
            <img
              src={showcasePhotos[1]}
              alt="Project 2"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </motion.div>

        {/* Panel 3 (Right) */}
        <motion.div
          className="flex-1 overflow-hidden"
          style={{
            width: panel3Width,
            y: panel3Y,
            scale: panel3Scale,
          }}
        >
          {/* Original photo section */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: panel3OriginalOpacity,
              clipPath: panel3ClipPath,
            }}
          >
            <div className="relative h-full w-full">
              {showcasePhotos.map((photo, idx) => (
                <motion.div
                  key={`panel3-orig-${photo}`}
                  className="absolute inset-0"
                  style={{ opacity: photoOpacities[idx] }}
                >
                  <img
                    src={photo}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Project 3 image replacement */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: panel3ProjectOpacity,
            }}
          >
            <img
              src={showcasePhotos[2]}
              alt="Project 3"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Portfolio section - appears directly after transition */}
      <div className="relative z-40 bg-white px-4 pt-32 pb-20 sm:px-[2vw] sm:pt-40 sm:pb-28">
        <div className="mx-auto w-full max-w-5xl">
          {/* Portfolio grid with staggered reveal */}
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { title: 'Aerolink', image: showcasePhotos[0] },
              { title: 'Riaaj Vintage', image: showcasePhotos[1] },
              { title: 'Delhi-6', image: showcasePhotos[2] },
              { title: 'Brand Project', image: showcasePhotos[0] },
            ].map((project, idx) => (
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
                className="group overflow-hidden rounded-2xl"
              >
                <div className="aspect-square overflow-hidden bg-neutral-100">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <h3
                    className="text-[16px] font-medium tracking-[-0.01em] text-[#111]"
                    style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
                  >
                    {project.title}
                  </h3>
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
