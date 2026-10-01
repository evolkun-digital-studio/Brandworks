import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { mediaUrl } from './media'
import './Services.css'

gsap.registerPlugin(ScrollTrigger)

const categories = [
  { image: mediaUrl('kyle-loftus-DqmXihYx5UE-unsplash.jpg'), label: 'Videography' },
  { image: mediaUrl('moisturizer mock up.png'), label: 'Photography' },
  { image: mediaUrl('ChatGPT Image Sep 30, 2026, 02_31_57 PM.png'), label: 'Social Media & Content Creation' },
  { image: mediaUrl('vcvcvcvcv.jpg'), label: 'PR & Founder Reputation' },
  { image: mediaUrl('seo.jpg'), label: 'Performance & SEO Marketing' },
  { image: mediaUrl('creative.jpg'), label: 'Graphics & Animation' },
]

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const section = sectionRef.current!
    const stage = stageRef.current!
    const cards = gsap.utils.toArray<HTMLElement>('.service-card', section)
    const mm = gsap.matchMedia()

    mm.add({
      desktop: '(min-width: 1024px)',
      tablet: '(min-width: 701px) and (max-width: 1023px)',
      mobile: '(max-width: 700px)',
      reduce: '(prefers-reduced-motion: reduce)',
    }, (context) => {
      // The default grid keeps all services readable without motion or JavaScript.
      if (context.conditions?.reduce) return
      const mobile = context.conditions?.mobile
      const tablet = context.conditions?.tablet
      gsap.set(section, { attr: { 'data-spatial': 'true' } })
      // Register transform ownership with the context so breakpoint/unmount cleanup
      // restores the static layout, including in React StrictMode.
      gsap.set(cards, { transform: 'translate3d(-50%, -50%, 0)' })
      const setters = cards.map(card => gsap.quickSetter(card, 'transform'))
      const playhead = { progress: 0 }
      let width = 1
      let spacing = 1
      const angle = mobile ? 14 : tablet ? 20 : 26
      const depth = mobile ? 65 : tablet ? 100 : 145

      const render = () => {
        const travel = playhead.progress * (cards.length - 1) * spacing
        setters.forEach((set, index) => {
          const x = index * spacing - travel
          const distance = gsap.utils.clamp(-1, 1, x / (width * 0.6))
          const curve = distance * distance
          set(`translate3d(calc(-50% + ${x}px), -50%, ${-depth * curve}px) rotateY(${-angle * distance}deg) scale(${1 - 0.13 * curve})`)
        })
      }
      const measure = () => {
        width = stage.clientWidth
        spacing = cards[0].offsetWidth + (mobile ? 18 : tablet ? 24 : 32)
        render()
      }
      measure()

      gsap.to(playhead, {
        progress: 1,
        ease: 'none',
        onUpdate: render,
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${Math.max((cards.length - 1) * spacing, window.innerHeight * 2.5)}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onRefreshInit: measure,
          onRefresh: render,
        },
      })
    })

    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="services-showcase relative w-full bg-white text-[#111]" aria-labelledby="services-heading">
      <header className="services-showcase__heading mx-auto flex w-full max-w-[760px] flex-col items-center px-[18px] text-center sm:px-6">
        <h2 id="services-heading" className="site-display max-w-full font-primary text-neutral-900">
          What we do
        </h2>
        <p className="site-copy mt-3 w-full max-w-[430px] px-1 text-center font-secondary text-[14px] leading-[1.5] text-neutral-600 sm:px-0 sm:text-[15px] min-[701px]:max-w-[460px] min-[701px]:text-[16px]">
          Bringing strategy, creativity and execution together to build brands that grow.
        </p>
      </header>
      <div ref={stageRef} className="services-stage">
        <ul className="services-ring" aria-label="BrandWorks services">
          {categories.map((category, index) => (
            <li key={category.label} className="service-card">
              <img src={category.image} alt="" width={600} height={800} loading={index === 0 ? 'eager' : 'lazy'} draggable={false} />
              <div className="service-card__overlay">
                <span className="font-secondary text-[14px] font-medium sm:text-[16px] lg:text-[18px]">{category.label}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
