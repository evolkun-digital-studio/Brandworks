import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import type { HeroServiceId } from '../../data/heroServices'
import { heroServices } from '../../data/heroServices'

gsap.registerPlugin(useGSAP)

/**
 * The small copy that belongs to the active service. On a switch the
 * current lines slip up out of their masks, then the new ones rise in —
 * the only text in the hero that moves.
 */
function HeroCaption({ activeId, reducedMotion }: { activeId: HeroServiceId; reducedMotion: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [shownId, setShownId] = useState(activeId)
  const revealed = useRef(shownId)

  // Out: runs when the selection moves away from what's on screen.
  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>('[data-reveal]', rootRef.current)
      if (activeId === shownId) {
        // Switched back before the old copy finished leaving: bring it back.
        if (lines.some((line) => Number(gsap.getProperty(line, 'opacity')) < 1)) {
          gsap.killTweensOf(lines)
          gsap.to(lines, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power4.out' })
        }
        return
      }
      if (reducedMotion) {
        gsap.to(lines, { opacity: 0, duration: 0.15, onComplete: () => setShownId(activeId) })
        return
      }
      gsap.killTweensOf(lines)
      gsap.to(lines, {
        yPercent: -105,
        opacity: 0,
        duration: 0.32,
        ease: 'power2.in',
        stagger: 0.03,
        onComplete: () => setShownId(activeId),
      })
    },
    { dependencies: [activeId], scope: rootRef },
  )

  // In: runs once the new copy is in the DOM.
  useGSAP(
    () => {
      if (revealed.current === shownId) return
      revealed.current = shownId
      const lines = gsap.utils.toArray<HTMLElement>('[data-reveal]', rootRef.current)
      if (reducedMotion) {
        gsap.fromTo(lines, { opacity: 0, yPercent: 0 }, { opacity: 1, duration: 0.25 })
        return
      }
      gsap.fromTo(
        lines,
        { yPercent: 105, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power4.out', stagger: 0.06 },
      )
    },
    { dependencies: [shownId], scope: rootRef },
  )

  const service = heroServices[shownId]

  return (
    <div ref={rootRef} className="hero-caption" aria-live="polite">
      <span className="hero-mask">
        <span data-reveal className="hero-caption__eyebrow">
          {service.eyebrow}
        </span>
      </span>
      {service.title && (
        <span className="hero-mask">
          <span data-reveal className="hero-caption__title">
            {service.title}
          </span>
        </span>
      )}
      <span className="hero-mask">
        <span data-reveal className="hero-caption__text">
          {service.text}
        </span>
      </span>
    </div>
  )
}

export default HeroCaption
