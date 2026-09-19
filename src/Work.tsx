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
 * PHOTOGRAPHY-as-hero transition:
 *
 * The word PHOTOGRAPHY is the starting point.
 * Images appear INSIDE the letters via masking.
 * Letter zones stretch vertically, releasing photographic strips.
 * Each strip becomes a different BrandWorks project.
 * Strips move at different speeds and widen.
 * The central/strongest image dominates fullscreen.
 * Fullscreen lifts to reveal the portfolio beneath.
 *
 * Concept: "PHOTOGRAPHY literally becomes the work"
 *
 * Scroll-driven, no scroll-jacking.
 * Respects Lenis integration.
 */
function WorkReveal() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false

  // Get 3 project images
  const projectImages = useMemo(() => {
    const shuffled = [...allPhotos].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
  }, [])

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // 0.00–0.12: solid PHOTOGRAPHY text
  // 0.12–0.26: images appear inside letters
  // 0.26–0.42: zones stretch vertically
  // 0.42–0.57: 3 strips clearly visible, project crossfade
  // 0.57–0.72: strips move, reveal projects, widen
  // 0.72–0.84: side panels exit, center expands
  // 0.84–0.92: fullscreen single image
  // 0.92–1.00: fullscreen lifts, portfolio revealed

  // Interior photography inside letter zones (opacity reveals image inside masks)
  const letterPhotoOpacity = useTransform(scrollYProgress, [0.12, 0.26], [0, 1])

  // Left strip (PHOTO zone): extends upward, moves down
  const leftStripY = useTransform(scrollYProgress, [0.26, 0.57, 0.84], ['0vh', '12vh', '-20vh'])
  const leftStripHeight = useTransform(scrollYProgress, [0.26, 0.42, 0.72], ['15vh', '45vh', '100vh'])
  const leftStripWidth = useTransform(scrollYProgress, [0.26, 0.42, 0.72, 0.84], ['8vw', '18vw', '28vw', '0vw'])
  const leftStripOpacity = useTransform(scrollYProgress, [0.72, 0.84], [1, 0])
  const leftImageScale = useTransform(scrollYProgress, [0.42, 0.57], [1.03, 1])
  const leftImageY = useTransform(scrollYProgress, [0.42, 0.57], ['1%', '-1%'])
  const leftImageOpacity = useTransform(scrollYProgress, [0.42, 0.57], [0, 1])

  // Center strip (GRA zone): extends downward, stays centered, becomes fullscreen
  const centerStripY = useTransform(scrollYProgress, [0.26, 0.57, 0.84, 1], ['0vh', '-10vh', '0vh', '-100vh'])
  const centerStripHeight = useTransform(scrollYProgress, [0.26, 0.42, 0.72, 0.84], ['15vh', '50vh', '100vh', '100vh'])
  const centerStripWidth = useTransform(scrollYProgress, [0.26, 0.42, 0.72, 0.84, 1], ['8vw', '20vw', '32vw', '100vw', '100vw'])
  const centerImageScale = useTransform(scrollYProgress, [0.42, 0.57], [1, 1.04])
  const centerImageY = useTransform(scrollYProgress, [0.42, 0.57], ['-1%', '1%'])
  const centerImageOpacity = useTransform(scrollYProgress, [0.42, 0.57], [0, 1])

  // Right strip (PHY zone): extends upward, moves up
  const rightStripY = useTransform(scrollYProgress, [0.26, 0.57, 0.84], ['0vh', '-12vh', '20vh'])
  const rightStripHeight = useTransform(scrollYProgress, [0.26, 0.42, 0.72], ['15vh', '48vh', '100vh'])
  const rightStripWidth = useTransform(scrollYProgress, [0.26, 0.42, 0.72, 0.84], ['8vw', '19vw', '30vw', '0vw'])
  const rightStripOpacity = useTransform(scrollYProgress, [0.72, 0.84], [1, 0])
  const rightImageScale = useTransform(scrollYProgress, [0.42, 0.57], [1.025, 1])
  const rightImageX = useTransform(scrollYProgress, [0.42, 0.57], ['1%', '-1%'])
  const rightImageOpacity = useTransform(scrollYProgress, [0.42, 0.57], [0, 1])


  // Typography opacity (fades as photography dominates)
  const typographyOpacity = useTransform(scrollYProgress, [0, 0.26, 0.57], [1, 0.8, 0])

  if (prefersReducedMotion) {
    return (
      <div className="bg-white px-4 pt-20 sm:pt-28" aria-hidden="true">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center min-h-screen">
          <div
            className="text-center text-[clamp(90px,11.5vw,190px)] leading-[0.82] font-bold tracking-[-0.055em] text-[#111] uppercase"
            style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
          >
            Photography
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div ref={runwayRef} className="relative h-[320vh] bg-white">
        {/* STICKY VIEWPORT */}
        <div className="sticky top-0 h-screen overflow-hidden bg-white flex items-center justify-center">
          {/* HERO TYPOGRAPHY - Photography as starting point */}
          <motion.div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ opacity: typographyOpacity }}
          >
            <div
              className="text-center text-[clamp(90px,11.5vw,190px)] leading-[0.82] font-bold tracking-[-0.055em] text-[#111] uppercase"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Photography
            </div>
          </motion.div>

          {/* PHOTOGRAPHY INSIDE LETTER MASKS - Initial photography reveal */}
          <motion.div
            className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none"
            style={{ opacity: letterPhotoOpacity }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              {projectImages.map((photo, idx) => (
                <motion.div
                  key={`letter-photo-${idx}`}
                  className="absolute"
                  style={{
                    width: 'clamp(90px, 11.5vw, 190px)',
                    height: 'auto',
                    opacity: idx === 0 ? 1 : 0,
                  }}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* LEFT STRIP - PHOTO zone */}
          <motion.div
            className="absolute z-20 left-[15%] overflow-hidden bg-black"
            style={{
              y: leftStripY,
              height: leftStripHeight,
              width: leftStripWidth,
              opacity: leftStripOpacity,
            }}
          >
            <motion.div className="relative w-full h-full" style={{ scale: leftImageScale, y: leftImageY, opacity: leftImageOpacity }}>
              <img src={projectImages[0]} alt="" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* CENTER STRIP - GRA zone (becomes fullscreen) */}
          <motion.div
            className="absolute z-30 left-1/2 -translate-x-1/2 overflow-hidden bg-black"
            style={{
              y: centerStripY,
              height: centerStripHeight,
              width: centerStripWidth,
            }}
          >
            <motion.div className="relative w-full h-full" style={{ scale: centerImageScale, y: centerImageY, opacity: centerImageOpacity }}>
              <img src={projectImages[1]} alt="" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>

          {/* RIGHT STRIP - PHY zone */}
          <motion.div
            className="absolute z-20 right-[15%] overflow-hidden bg-black"
            style={{
              y: rightStripY,
              height: rightStripHeight,
              width: rightStripWidth,
              opacity: rightStripOpacity,
            }}
          >
            <motion.div className="relative w-full h-full" style={{ scale: rightImageScale, x: rightImageX, opacity: rightImageOpacity }}>
              <img src={projectImages[2]} alt="" className="w-full h-full object-cover" />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* PORTFOLIO SECTION - Normal document flow */}
      <div className="relative z-0 bg-white px-4 py-20 sm:px-[2vw] sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { title: 'Aerolink', image: projectImages[0] },
              { title: 'Riaaj Vintage', image: projectImages[1] },
              { title: 'Delhi-6', image: projectImages[2] },
              { title: 'Brand Project', image: projectImages[0] },
            ].map((project, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.08 }}
                viewport={{ once: true, margin: '0px 0px -80px 0px' }}
                className="group"
              >
                <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xl">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-[#111]" style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}>
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
