import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

const photographyImages = [
  'https://images.unsplash.com/photo-1495707902905-78189c7e58d1?w=1600&q=85',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&q=85',
  'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=1600&q=85',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1600&q=85',
  'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=1600&q=85',
  'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1600&q=85',
]

type Direction = 'up' | 'right'

const transitionDirections: Direction[] = [
  'up',
  'up',
  'right',
  'right',
  'up',
  'up',
]

function PhotographyReveal() {
  const sectionRef = useRef<HTMLElement>(null)
  const sceneRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const exitRef = useRef<HTMLDivElement>(null)

  const panelRefs = useRef<(HTMLDivElement | null)[]>([])
  const imageRefs = useRef<(HTMLImageElement | null)[]>([])

  useGSAP(
    () => {
      if (
        !sectionRef.current ||
        !sceneRef.current ||
        !titleRef.current ||
        !exitRef.current
      ) {
        return
      }

      const panels = panelRefs.current.filter(
        (panel): panel is HTMLDivElement => Boolean(panel)
      )

      const images = imageRefs.current.filter(
        (image): image is HTMLImageElement => Boolean(image)
      )

      if (
        panels.length !== photographyImages.length ||
        images.length !== photographyImages.length
      ) {
        return
      }

      gsap.set(titleRef.current, {
        autoAlpha: 1,
        yPercent: 0,
        scale: 1,
      })

      gsap.set(exitRef.current, {
        yPercent: 100,
      })

      panels.forEach((panel, index) => {
        const direction = transitionDirections[index]

        if (direction === 'right') {
          gsap.set(panel, {
            clipPath: 'inset(0% 0% 0% 100%)',
            xPercent: 5,
            yPercent: 0,
            force3D: true,
          })

          gsap.set(images[index], {
            scale: 1.12,
            xPercent: 6,
            yPercent: 0,
            force3D: true,
          })
        } else {
          gsap.set(panel, {
            clipPath: 'inset(100% 0% 0% 0%)',
            xPercent: 0,
            yPercent: 5,
            force3D: true,
          })

          gsap.set(images[index], {
            scale: 1.12,
            xPercent: 0,
            yPercent: 6,
            force3D: true,
          })
        }
      })

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: sceneRef.current,
          start: 'top top',
          end: () =>
            `+=${window.innerHeight * (photographyImages.length * 1.65)}`,
          pin: true,
          pinSpacing: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          markers: false,
        },
      })

      timeline.to(
        titleRef.current,
        {
          scale: 1.02,
          duration: 0.55,
          ease: 'none',
        },
        0
      )

      panels.forEach((panel, index) => {
        const direction = transitionDirections[index]
        const start = 0.5 + index * 1.1
        const incomingImage = images[index]
        const outgoingImage = index > 0 ? images[index - 1] : null

        if (index === 0) {
          timeline.to(
            titleRef.current,
            {
              autoAlpha: 0,
              yPercent: -15,
              scale: 0.965,
              duration: 1,
              ease: 'power2.inOut',
            },
            start
          )
        }

        if (outgoingImage) {
          timeline.to(
            outgoingImage,
            {
              scale: 1.07,
              xPercent: direction === 'right' ? -3 : 0,
              yPercent: direction === 'up' ? -3 : 0,
              duration: 1.4,
              ease: 'none',
              force3D: true,
            },
            start
          )
        }

        timeline.to(
          panel,
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            xPercent: 0,
            yPercent: 0,
            duration: 1.35,
            ease: 'power3.inOut',
            force3D: true,
          },
          start
        )

        timeline.to(
          incomingImage,
          {
            scale: 1.015,
            xPercent: 0,
            yPercent: 0,
            duration: 1.5,
            ease: 'power2.out',
            force3D: true,
          },
          start
        )
      })

      const lastImage = images[images.length - 1]
      const finalStart = 0.5 + transitionDirections.length * 1.1

      timeline.to(
        lastImage,
        {
          scale: 1.055,
          yPercent: -1.5,
          duration: 0.9,
          ease: 'none',
          force3D: true,
        },
        finalStart
      )

      timeline.to(
        exitRef.current,
        {
          yPercent: 0,
          duration: 1,
          ease: 'power3.inOut',
        },
        finalStart + 0.45
      )

      return () => {
        timeline.scrollTrigger?.kill()
        timeline.kill()
      }
    },
    {
      scope: sectionRef,
    }
  )

  return (
    <section
      ref={sectionRef}
      className="relative isolate w-full bg-white"
    >
      <div
        ref={sceneRef}
        className="relative h-screen w-full overflow-hidden bg-white"
      >
        <div
          ref={titleRef}
          className="pointer-events-none absolute inset-0 z-[70] flex items-center justify-center overflow-hidden bg-white"
        >
          <h2
            className="px-5 text-center text-[clamp(68px,11.5vw,120px)] font-bold uppercase leading-[0.82] tracking-[-0.055em] text-[#111] will-change-transform"
            style={{
              fontFamily:
                "'Google Sans Flex', 'Helvetica Neue', Arial, sans-serif",
            }}
          >
            Photography
          </h2>
        </div>

        {photographyImages.map((image, index) => (
          <div
            key={`${image}-${index}`}
            ref={(element) => {
              panelRefs.current[index] = element
            }}
            className="absolute inset-0 h-full w-full overflow-hidden bg-[#111] will-change-[transform,clip-path]"
            style={{
              zIndex: 10 + index,
            }}
          >
            <img
              ref={(element) => {
                imageRefs.current[index] = element
              }}
              src={image}
              alt={`BrandWorks photography project ${index + 1}`}
              draggable={false}
              decoding="async"
              loading={index < 3 ? 'eager' : 'lazy'}
              onLoad={() => {
                ScrollTrigger.refresh()
              }}
              className="h-full w-full select-none object-cover will-change-transform"
            />
          </div>
        ))}

        <div
          ref={exitRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[90] bg-white will-change-transform"
        />
      </div>
    </section>
  )
}

function Photography() {
  return (
    <section
      id="photography"
      className="relative w-full bg-white"
    >
      <PhotographyReveal />
    </section>
  )
}

export default Photography
