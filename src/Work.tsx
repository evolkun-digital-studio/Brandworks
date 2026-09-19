import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const photographyImages = [
  'https://images.unsplash.com/photo-1495707902905-78189c7e58d1?w=1600&q=80',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=80',
  'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=1600&q=80',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1600&q=80',
  'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=1600&q=80',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1600&q=80',
]

function WorkReveal() {
  const sectionRef = useRef<HTMLElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])

  useGSAP(
    () => {
      if (!sectionRef.current || !sceneRef.current || !titleRef.current) return

      const photos = photoRefs.current.filter(Boolean)
      if (photos.length < 6) return

      // === SET INITIAL POSITIONS ===
      gsap.set(photos[0], {
        yPercent: 0,
        xPercent: 0,
        zIndex: 10,
      })

      gsap.set(photos[1], {
        yPercent: 100,
        xPercent: 0,
        zIndex: 20,
      })

      gsap.set(photos[2], {
        yPercent: 100,
        xPercent: 0,
        zIndex: 30,
      })

      gsap.set(photos[3], {
        yPercent: 0,
        xPercent: 100,
        zIndex: 40,
      })

      gsap.set(photos[4], {
        yPercent: 0,
        xPercent: 100,
        zIndex: 50,
      })

      gsap.set(photos[5], {
        yPercent: 100,
        xPercent: 0,
        zIndex: 60,
      })

      gsap.set(titleRef.current, {
        opacity: 1,
        yPercent: 0,
      })

      // === BUILD TIMELINE ===
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true,
          markers: false,
        },
      })

      // Title fade out after initial display
      tl.to(titleRef.current, {
        opacity: 0,
        yPercent: -20,
        duration: 1.5,
        ease: 'power2.inOut',
      })

      // Photo 1 initial hold
      tl.to({}, { duration: 0.8 })

      // Photo 2 — ENTERS FROM BOTTOM
      tl.to(
        photos[1],
        {
          yPercent: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        },
        '<'
      )

      // Hold Photo 2
      tl.to({}, { duration: 1 })

      // Photo 3 — ENTERS FROM BOTTOM
      tl.to(
        photos[2],
        {
          yPercent: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        },
        '<'
      )

      // Hold Photo 3
      tl.to({}, { duration: 1 })

      // Photo 4 — ENTERS FROM RIGHT
      tl.to(
        photos[3],
        {
          xPercent: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        },
        '<'
      )

      // Hold Photo 4
      tl.to({}, { duration: 1 })

      // Photo 5 — ENTERS FROM RIGHT
      tl.to(
        photos[4],
        {
          xPercent: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        },
        '<'
      )

      // Hold Photo 5
      tl.to({}, { duration: 1 })

      // Photo 6 — ENTERS FROM BOTTOM
      tl.to(
        photos[5],
        {
          yPercent: 0,
          duration: 1.5,
          ease: 'power3.inOut',
        },
        '<'
      )

      // Final hold on Photo 6
      tl.to({}, { duration: 1.5 })

      // === FINAL TRANSITION: MOVE ENTIRE SCENE UP ===
      tl.to(
        sceneRef.current,
        {
          yPercent: -100,
          duration: 1.5,
          ease: 'power3.inOut',
        },
        '<'
      )

      return () => {
        if (tl.scrollTrigger) {
          tl.scrollTrigger.kill()
        }
        tl.kill()
      }
    },
    { scope: sectionRef }
  )

  return (
    <div>
      {/* 600VH SCROLL RUNWAY */}
      <section ref={sectionRef} className="relative h-[600vh] bg-white">
        {/* STICKY VIEWPORT WITH OVERFLOW-HIDDEN */}
        <div
          ref={sceneRef}
          className="sticky top-0 h-screen overflow-hidden bg-white"
        >
          {/* PHOTOGRAPHY TITLE */}
          <div
            ref={titleRef}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div
              className="text-center text-[clamp(90px,11.5vw,190px)] leading-[0.82] font-bold tracking-[-0.055em] text-[#111] uppercase"
              style={{
                fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
              }}
            >
              Photography
            </div>
          </div>

          {/* IMAGE PANELS STACK */}
          {photographyImages.map((image, idx) => (
            <div
              key={idx}
              ref={(el) => {
                photoRefs.current[idx] = el
              }}
              className="absolute inset-0 h-full w-full overflow-hidden bg-white"
            >
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </section>

      {/* PORTFOLIO SECTION - Normal document flow */}
      {/* <div className="relative z-0 bg-white px-4 py-20 sm:px-[2vw] sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              { title: 'Aerolink', image: photographyImages[0] },
              { title: 'Riaaj Vintage', image: photographyImages[1] },
              { title: 'Delhi-6', image: photographyImages[2] },
              { title: 'Brand Project', image: photographyImages[3] },
            ].map((project, idx) => (
              <div key={idx} className="group">
                <div className="aspect-square overflow-hidden bg-neutral-100 rounded-2xl">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="pt-4">
                  <h3
                    className="text-[16px] font-medium tracking-[-0.01em] text-[#111]"
                    style={{
                      fontFamily: "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
                    }}
                  >
                    {project.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  )
}

function Work() {
  return (
    <section id="work" className="bg-white">
      <WorkReveal />
    </section>
  )
}

export default Work
