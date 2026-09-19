import { useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'motion/react'

// Import temporary editorial photography
import Photo1 from '/src/Photo/Photo1.jpg'
import Photo2 from '/src/Photo/Photo2.jpg'
import Photo3 from '/src/Photo/Photo3.jpg'
import Photo4 from '/src/Photo/Photo4.png'
import Photo5 from '/src/Photo/Photo5.png'
import Photo6 from '/src/Photo/Photo6.png'

// TEMPORARY TRANSITION IMAGES
// Six premium editorial photographs for the showcase.
// Replace these with final BrandWorks project photography.
const TEMP_PHOTOGRAPHY_IMAGES = [
  Photo1,  // Photo 1: enters from bottom
  Photo2,  // Photo 2: enters from bottom
  Photo3,  // Photo 3: enters from right
  Photo4,  // Photo 4: enters from right
  Photo5,  // Photo 5: enters from bottom
  Photo6,  // Photo 6: enters from bottom
]

/**
 * PHOTOGRAPHY Showcase Transition
 *
 * Six editorial photographs enter sequentially with directional reveals:
 * Up, Up, Right, Right, Up, Up
 *
 * Long scroll experience (540vh) with intentional holds and smooth transitions.
 * No carousel UI, no cards—pure editorial image choreography.
 *
 * Scroll Timeline:
 * 0.00–0.08: PHOTOGRAPHY title
 * 0.08–0.18: Photo 1 reveals from bottom
 * 0.18–0.30: Photo 1 holds, subtle motion
 * 0.30–0.40: Photo 2 pushes from bottom
 * 0.40–0.52: Photo 2 holds, subtle motion
 * 0.52–0.62: Photo 3 pushes from right
 * 0.62–0.72: Photo 3 holds
 * 0.72–0.80: Photo 4 pushes from right
 * 0.80–0.88: Photo 4 holds
 * 0.88–0.94: Photo 5 pushes from bottom
 * 0.94–1.00: Photo 6 pushes from bottom, leads to portfolio
 */
function WorkReveal() {
  const runwayRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false

  const { scrollYProgress } = useScroll({
    target: runwayRef,
    offset: ['start start', 'end end'],
  })

  // TITLE PHASE
  const titleOpacity = useTransform(scrollYProgress, [0, 0.08, 0.18], [1, 1, 0.3])

  // PHOTO 1 - enters from bottom
  const photo1ClipPath = useTransform(scrollYProgress, [0.08, 0.18], ['inset(100% 0 0 0)', 'inset(0 0 0 0)'])
  const photo1Opacity = useTransform(scrollYProgress, [0.08, 0.18, 0.30, 0.40], [0, 1, 1, 0.8])
  const photo1Scale = useTransform(scrollYProgress, [0.18, 0.30], [1.05, 1])
  const photo1Y = useTransform(scrollYProgress, [0.18, 0.30], ['2%', '-1%'])

  // PHOTO 2 - enters from bottom, pushes photo 1 up
  const photo2ClipPath = useTransform(scrollYProgress, [0.30, 0.40], ['inset(100% 0 0 0)', 'inset(0 0 0 0)'])
  const photo2Opacity = useTransform(scrollYProgress, [0.30, 0.40, 0.52, 0.62], [0, 1, 1, 0.8])
  const photo2Y = useTransform(scrollYProgress, [0.30, 0.40, 0.52], ['-100vh', '0vh', '-40vh'])
  const photo2Scale = useTransform(scrollYProgress, [0.40, 0.52], [1.04, 1])

  // PHOTO 3 - enters from right
  const photo3ClipPath = useTransform(scrollYProgress, [0.52, 0.62], ['inset(0 100% 0 0)', 'inset(0 0 0 0)'])
  const photo3Opacity = useTransform(scrollYProgress, [0.52, 0.62, 0.72, 0.80], [0, 1, 1, 0.8])
  const photo3Y = useTransform(scrollYProgress, [0.52, 0.62, 0.72], ['-80vh', '-40vh', '-80vh'])

  // PHOTO 4 - enters from right
  const photo4ClipPath = useTransform(scrollYProgress, [0.72, 0.80], ['inset(0 100% 0 0)', 'inset(0 0 0 0)'])
  const photo4Opacity = useTransform(scrollYProgress, [0.72, 0.80, 0.88, 0.94], [0, 1, 1, 0.8])
  const photo4Y = useTransform(scrollYProgress, [0.72, 0.80, 0.88], ['-60vh', '-20vh', '-60vh'])

  // PHOTO 5 - enters from bottom
  const photo5ClipPath = useTransform(scrollYProgress, [0.88, 0.94], ['inset(100% 0 0 0)', 'inset(0 0 0 0)'])
  const photo5Opacity = useTransform(scrollYProgress, [0.88, 0.94, 1], [0, 1, 1])
  const photo5Y = useTransform(scrollYProgress, [0.88, 0.94], ['-100vh', '-50vh'])

  // PHOTO 6 - enters from bottom, leads to portfolio
  const photo6ClipPath = useTransform(scrollYProgress, [0.94, 1], ['inset(100% 0 0 0)', 'inset(0 0 0 0)'])
  const photo6Y = useTransform(scrollYProgress, [0.94, 1], ['-100vh', '-80vh'])

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
      {/* LONG SCROLL RUNWAY */}
      <div ref={runwayRef} className="relative h-[540vh] bg-white">
        {/* STICKY VIEWPORT */}
        <div className="sticky top-0 h-screen overflow-hidden bg-white flex items-center justify-center">
          {/* PHOTOGRAPHY TITLE */}
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{ opacity: titleOpacity }}
          >
            <div
              className="text-center text-[clamp(90px,11.5vw,190px)] leading-[0.82] font-bold tracking-[-0.055em] text-[#111] uppercase pointer-events-none"
              style={{ fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif" }}
            >
              Photography
            </div>
          </motion.div>

          {/* IMAGE SHOWCASE CONTAINER */}
          <div className="absolute inset-0 z-0">
            {/* PHOTO 1 - Bottom Entry */}
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: photo1Opacity,
                clipPath: photo1ClipPath,
                willChange: 'transform, clip-path',
              }}
            >
              <motion.div
                className="w-full h-full"
                style={{
                  scale: photo1Scale,
                  y: photo1Y,
                }}
              >
                <img
                  src={TEMP_PHOTOGRAPHY_IMAGES[0]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>

            {/* PHOTO 2 - Bottom Entry, Pushes Photo 1 Up */}
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: photo2Opacity,
                clipPath: photo2ClipPath,
                y: photo2Y,
                willChange: 'transform, clip-path',
              }}
            >
              <motion.div
                className="w-full h-full"
                style={{
                  scale: photo2Scale,
                }}
              >
                <img
                  src={TEMP_PHOTOGRAPHY_IMAGES[1]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </motion.div>

            {/* PHOTO 3 - Right Entry */}
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: photo3Opacity,
                clipPath: photo3ClipPath,
                y: photo3Y,
                willChange: 'transform, clip-path',
              }}
            >
              <img
                src={TEMP_PHOTOGRAPHY_IMAGES[2]}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* PHOTO 4 - Right Entry */}
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: photo4Opacity,
                clipPath: photo4ClipPath,
                y: photo4Y,
                willChange: 'transform, clip-path',
              }}
            >
              <img
                src={TEMP_PHOTOGRAPHY_IMAGES[3]}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* PHOTO 5 - Bottom Entry */}
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: photo5Opacity,
                clipPath: photo5ClipPath,
                y: photo5Y,
                willChange: 'transform, clip-path',
              }}
            >
              <img
                src={TEMP_PHOTOGRAPHY_IMAGES[4]}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* PHOTO 6 - Bottom Entry, Leads to Portfolio */}
            <motion.div
              className="absolute inset-0"
              style={{
                opacity: 1,
                clipPath: photo6ClipPath,
                y: photo6Y,
                willChange: 'transform, clip-path',
              }}
            >
              <img
                src={TEMP_PHOTOGRAPHY_IMAGES[5]}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* PORTFOLIO SECTION - Normal document flow */}
      <div className="relative z-0 bg-white px-4 py-20 sm:px-[2vw] sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { title: 'Aerolink', image: TEMP_PHOTOGRAPHY_IMAGES[0] },
              { title: 'Riaaj Vintage', image: TEMP_PHOTOGRAPHY_IMAGES[1] },
              { title: 'Delhi-6', image: TEMP_PHOTOGRAPHY_IMAGES[2] },
              { title: 'Brand Project', image: TEMP_PHOTOGRAPHY_IMAGES[3] },
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
