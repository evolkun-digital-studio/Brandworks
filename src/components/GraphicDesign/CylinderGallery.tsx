import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import './GraphicDesign.css'

gsap.registerPlugin(ScrollTrigger)

export type GalleryProject = {
  image: string
  type: string
  title: string
    /** Width / height of the frame in the cylinder. */
  aspect: number
  /** 'contain' shows the whole image in its frame instead of cropping it. */
  fit?: 'contain'
  /** CSS object-position, for steering the crop; defaults to centre. */
  position?: string
  /** Frame colour behind a 'contain' image; defaults to the grey placeholder. */
  background?: string
  year?: string
}

/**
 * Desktop: the stage pins for 2–3 viewports and vertical scroll turns
 * the work around an invisible cylinder. Every card's angle comes from
 * its arc distance to the centre, so the centred piece sits flat and
 * forward while the rest rotate away, shrink and dim.
 */
function cylinder(section: HTMLElement) {
  const stage = section.querySelector<HTMLElement>('[data-cyl-stage]')
  const cards = gsap.utils.toArray<HTMLElement>('[data-cyl-card]', section)
  const captions = gsap.utils.toArray<HTMLElement>('[data-cyl-caption]', section)
  const veils = cards.map((card) => card.querySelector<HTMLElement>('[data-cyl-veil]'))
  if (!stage || !cards.length) return

  section.dataset.mode = 'cylinder'
  const aspects = cards.map((card) => Number(card.dataset.aspect) || 0.8)

  let width = 0
  let height = 0
  let radius = 1
  let arc: number[] = []
  let progress = 0
  let active = -1

  const measure = () => {
    width = stage.clientWidth
    height = stage.clientHeight
    radius = width * 0.95
    const baseHeight = gsap.utils.clamp(260, 540, height * 0.5)
    const maxWidth = width * 0.34
    const gap = width * 0.03
    let s = 0
    let previous = 0
    arc = cards.map((card, i) => {
      let h = baseHeight
      let w = h * aspects[i]
      if (w > maxWidth) {
        w = maxWidth
        h = w / aspects[i]
      }
      card.style.width = `${w}px`
      card.style.height = `${h}px`
      if (i > 0) s += previous / 2 + gap + w / 2
      previous = w
      return s
    })
  }

  const setActive = (next: number) => {
    if (next === active) return
    const previous = captions[active]
    if (previous) {
      gsap.to(previous, { yPercent: -100, autoAlpha: 0, duration: 0.45, ease: 'power3.in', overwrite: 'auto' })
    }
    const caption = captions[next]
    if (caption) {
      gsap.fromTo(
        caption,
        { yPercent: 100, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.65, delay: previous ? 0.12 : 0, ease: 'power3.out', overwrite: 'auto' },
      )
    }
    active = next
  }

  const render = () => {
    const now = progress * arc[arc.length - 1]
    let nearest = 0
    cards.forEach((card, i) => {
      const offset = arc[i] - now
      if (Math.abs(offset) < Math.abs(arc[nearest] - now)) nearest = i
      const theta = offset / radius
      const angle = Math.abs(theta)
      if (angle > 1.4) {
        card.style.visibility = 'hidden'
        return
      }
      const edge = Math.min(1, angle / 0.95)
      const focus = Math.max(0, 1 - angle / 0.3)
      const x = radius * Math.sin(theta)
      const z = radius * (Math.cos(theta) - 1) + 80 * focus
      card.style.visibility = ''
      veils[i]?.style.setProperty('opacity', (0.35 * edge).toFixed(3))
      card.style.transform =
        `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) ` +
        `rotateY(${theta.toFixed(4)}rad) scale(${(1 - 0.08 * edge).toFixed(3)})`
    })
    setActive(nearest)
  }

  gsap.set(captions, { autoAlpha: 0 })
  measure()

  ScrollTrigger.create({
    trigger: stage,
    pin: true,
    start: 'top top',
    end: () => `+=${window.innerHeight * gsap.utils.clamp(2, 3, cards.length * 0.28)}`,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      progress = self.progress
      render()
    },
    onRefresh: (self) => {
      measure()
      progress = self.progress
      render()
    },
  })

  render()

  return () => {
    delete section.dataset.mode
    gsap.killTweensOf(captions)
    gsap.set(captions, { clearProps: 'all' })
    cards.forEach((card) => {
      for (const prop of ['transform', 'visibility', 'width', 'height']) {
        card.style.removeProperty(prop)
      }
    })
    veils.forEach((veil) => veil?.style.removeProperty('opacity'))
  }
}

/** Mobile: a native swipe row whose cards turn slightly away from the centre. */
function swipe(section: HTMLElement) {
  const track = section.querySelector<HTMLElement>('[data-cyl-track]')
  const cards = gsap.utils.toArray<HTMLElement>('[data-cyl-card]', section)
  if (!track || !cards.length) return

  let frame = 0
  const render = () => {
    frame = 0
    const centre = track.scrollLeft + track.clientWidth / 2
    cards.forEach((card) => {
      const offset = (card.offsetLeft + card.offsetWidth / 2 - centre) / track.clientWidth
      const t = gsap.utils.clamp(-1, 1, offset)
      card.style.transform = `rotateY(${(t * 18).toFixed(2)}deg) scale(${(1 - Math.abs(t) * 0.06).toFixed(3)})`
    })
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render)
  }

  track.addEventListener('scroll', schedule, { passive: true })
  window.addEventListener('resize', schedule)
  render()

  return () => {
    cancelAnimationFrame(frame)
    track.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    cards.forEach((card) => card.style.removeProperty('transform'))
  }
}

export default function CylinderGallery({ projects }: { projects: GalleryProject[] }) {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      if (!section) return
      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => cylinder(section))
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => swipe(section))
      return () => mm.revert()
    },
    { scope: sectionRef, dependencies: [projects] },
  )

  return (
    <section
      ref={sectionRef}
      id="selected-work"
      className="cyl relative pb-[clamp(24px,3vw,48px)] pt-[clamp(40px,5vw,72px)]"
    >
      <div className="mx-auto w-full max-w-[1440px] px-[clamp(20px,5vw,80px)]"
      >
        <div data-section-intro className="grid gap-8">
          <div>
            <h2
              data-intro-child
              className="m-0 max-w-[720px] section-heading"
            >
              Client work. Studio work.
              <br />
              <span className="text-black/85">Same level of intent.</span>
            </h2>

            <p
              data-intro-child
              className="mt-7 max-w-[450px] text-[14px] leading-[1.7] text-black/55"
            >
              A changing collection of identities, campaigns, digital
              graphics, motion experiments and visual directions.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-[clamp(40px,5vw,72px)]">
        <div data-cyl-stage className="cyl__stage">
          <div data-cyl-track className="cyl__track">
            {projects.map((project) => (
              <article
                key={project.title}
                data-cyl-card
                data-aspect={project.aspect}
                className="cyl__card"
              >
                <div
                  data-tilt
                  className="cyl__media"
                  style={project.background ? { backgroundColor: project.background } : undefined}
                >
                  <img
                    data-tilt-inner
                    src={project.image}
                    alt={project.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className={`cyl__img${project.fit === 'contain' ? ' cyl__img--contain' : ''}`}
                    style={project.position ? { objectPosition: project.position } : undefined}
                  />

                  <span data-cyl-veil className="cyl__veil" aria-hidden="true" />

                  <div className="cyl__reveal" aria-hidden="true">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-white/70">
                      {project.type}
                    </span>
                    <span className="max-w-[90%] text-[clamp(18px,1.6vw,24px)] leading-[1] tracking-[-0.035em] [font-family:Grimblade,serif]">
                      {project.title}
                    </span>
                  </div>
                </div>

                <div className="cyl__meta">
                  <p className="m-0 flex justify-between gap-4 text-[9px] uppercase tracking-[0.14em] text-black/45">
                    <span>{project.type}</span>
                    {/* <span>{project.year}</span> */}
                  </p>
                  <h3 className="mb-0 mt-3 font-[400] text-[clamp(22px,2.4vw,30px)] leading-[0.98] tracking-[-0.04em] [font-family:Grimblade,serif]">
                    {project.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>

          <div className="cyl__captions" aria-hidden="true">
            {projects.map((project) => (
              <div key={project.title} data-cyl-caption className="cyl__caption">
                <p className="m-0 text-[clamp(22px,2vw,30px)] leading-[1] tracking-[-0.04em] [font-family:Grimblade,serif]">
                  {project.title}
                </p>
                <p className="m-0 mt-2 text-[9px] uppercase tracking-[0.14em] text-black/45">
                  {project.type} 
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
