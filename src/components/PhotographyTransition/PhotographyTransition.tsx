import { useRef } from 'react'
import type { CSSProperties } from 'react'
import { preload } from 'react-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { useGSAP } from '@gsap/react'
import { TRANSITION_MOTION, TRANSITION_TIMELINE, TYPOGRAPHY_STAGES } from '../../data/photographyTransition'
import type { TypographyStage } from '../../data/photographyTransition'

gsap.registerPlugin(ScrollTrigger, CustomEase)

const REVEAL_EASE = CustomEase.create('bw-reveal', TRANSITION_MOTION.textEase)
const FINAL = TYPOGRAPHY_STAGES[TYPOGRAPHY_STAGES.length - 1]

// The bridge from Featured Work into Photography. A tall section holds a
// sticky, full-bleed stage; one scrubbed timeline builds the statement a
// word at a time, each word arriving with its own photograph:
//
//   PERCEPTION picture (already there) → PERCEPTION rises
//   crossfade to BECOMES picture       → BECOMES rises beneath it
//   crossfade to REALITY picture       → REALITY rises; the statement holds
//
// The stylesheet alone describes the finished frame — every word in place
// over the REALITY picture — which is exactly what reduced motion shows.
// The timeline only exists where motion is welcome.

/** ImageKit delivery: resized to `w`, AVIF or WebP by the browser's Accept. */
const deliver = (url: string, w: number) => `${url}?tr=w-${w},f-auto,q-72`

function imageSources(stage: TypographyStage) {
  const widths = [...TRANSITION_MOTION.srcWidths.filter((w) => w < stage.width), stage.width]
  return {
    src: deliver(stage.image, Math.min(1280, stage.width)),
    srcSet: widths.map((w) => `${deliver(stage.image, w)} ${w}w`).join(', '),
    // Cover-fit: in a tall viewport the picture is drawn wider than the
    // screen, by the viewport height times its aspect ratio.
    sizes: `max(100vw, calc(100vh * ${(stage.width / stage.height).toFixed(3)}))`,
  }
}

function PhotographyTransition() {
  const sectionRef = useRef<HTMLElement>(null)

  const first = imageSources(TYPOGRAPHY_STAGES[0])
  // Fetched ahead, at low priority: this section is well below the fold and
  // must not compete with what the first screen needs.
  preload(first.src, { as: 'image', imageSrcSet: first.srcSet, imageSizes: first.sizes, fetchPriority: 'low' })

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return
      const mm = gsap.matchMedia()

      mm.add({ motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 767px)' }, (context) => {
        const { motion, mobile } = context.conditions as { motion: boolean; mobile: boolean }
        if (!motion) return

        const q = gsap.utils.selector(section)
        const images = q('.pt-image') as HTMLElement[]
        const words = q('.pt-word') as HTMLElement[]
        const shade = q('.pt-shade')[0] as HTMLElement
        const t = TRANSITION_TIMELINE
        const m = TRANSITION_MOTION

        // Opening frame: the first picture, no words yet.
        gsap.set(images.slice(1), { autoAlpha: 0 })
        gsap.set(words, { yPercent: m.textFrom, autoAlpha: 0 })
        gsap.set(shade, { opacity: TYPOGRAPHY_STAGES[0].shade })
        // Phones skip the slow scale: a full-screen transform on every frame
        // is the costliest part of the sequence and the least noticed there.
        if (!mobile) gsap.set(images, { scale: m.imageScaleFrom })

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: mobile ? m.scrub.mobile : m.scrub.desktop,
            invalidateOnRefresh: true,
          },
        })

        TYPOGRAPHY_STAGES.forEach((stage, i) => {
          const [imageIn, imageSet] = t.stages[i].image
          const [textIn, textSet] = t.stages[i].text

          if (i > 0) {
            // The new picture fades up over the old one, which stays fully
            // opaque beneath it — so the page never shows through — and is
            // only dropped once it is completely covered.
            tl.to(images[i], { autoAlpha: 1, duration: imageSet - imageIn, ease: 'power1.inOut' }, imageIn)
            tl.to(shade, { opacity: stage.shade, duration: imageSet - imageIn }, imageIn)
            tl.set(images[i - 1], { autoAlpha: 0 }, imageSet)
          }
          if (!mobile) tl.to(images[i], { scale: 1, duration: t.settle }, imageIn)

          tl.to(words[i], { yPercent: 0, autoAlpha: 1, duration: textSet - textIn, ease: REVEAL_EASE }, textIn)
        })

        // Pin the timeline's length to exactly 1, so its time *is* scroll progress.
        tl.set({}, {}, 1)
      })

      return () => mm.revert()
    },
    { scope: sectionRef },
  )

  return (
    <section ref={sectionRef} className="typography-transition">
      <div className="typography-transition__sticky">
        <div className="pt-backgrounds">
          {TYPOGRAPHY_STAGES.map((stage, i) => (
            <img
              key={stage.id}
              className="pt-image"
              {...imageSources(stage)}
              alt={stage.alt}
              width={stage.width}
              height={stage.height}
              // All three sit in the same sticky frame, so the lazy ones are
              // requested together with the first, well before they show.
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              style={{ '--pos-desktop': stage.position.desktop, '--pos-mobile': stage.position.mobile } as CSSProperties}
            />
          ))}
          <div className="pt-shade" style={{ opacity: FINAL.shade }} />
        </div>

        {/* One statement, read as one sentence; drawn as three lines, each
           rising through its own mask. */}
        <p className="pt-copy">
          {TYPOGRAPHY_STAGES.map((stage) => (
            <span key={stage.id} className="pt-line">
              <span className="pt-word">{stage.text}</span>
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

export default PhotographyTransition
