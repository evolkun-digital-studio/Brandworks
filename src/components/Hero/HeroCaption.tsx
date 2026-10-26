import { useEffect, useState } from 'react'
import type { HeroServiceId } from '../../data/heroServices'
import { heroServices, HERO_SERVICE_ORDER } from '../../data/heroServices'
import { isIntroPending, onIntroDone } from '../../lib/introGate'

/**
 * The headline and description for every service, stacked in one grid cell
 * and bottom-aligned, so the block is always as tall as the tallest service
 * and the capsules below it never move. Switching cross-fades: the incoming
 * pane fades up while the outgoing one fades out, so there is never a blank
 * frame. Only the active pane carries the page's <h1>.
 */
function HeroCaption({ activeId, reducedMotion }: { activeId: HeroServiceId; reducedMotion: boolean }) {
  // First load under the opening preloader: the copy waits below and rises
  // as the preloader lifts away.
  const [waiting, setWaiting] = useState(false)
  useEffect(() => {
    if (reducedMotion || !isIntroPending()) return
    setWaiting(true)
    return onIntroDone(() => window.setTimeout(() => setWaiting(false), 300))
  }, [reducedMotion])

  return (
    <div className={`hero-caption ${waiting ? 'is-waiting' : ''}`} aria-live="polite">
      {HERO_SERVICE_ORDER.map((id) => {
        const service = heroServices[id]
        const active = id === activeId
        const Title = active ? 'h1' : 'p'
        return (
          <div key={id} data-id={id} className={`hero-caption__pane ${active ? 'is-active' : ''}`} aria-hidden={!active}>
            {service.eyebrow && (
              <span className="hero-mask">
                <span className="hero-caption__eyebrow">{service.eyebrow}</span>
              </span>
            )}
            <Title id={active ? 'hero-heading' : undefined} className="hero-mask hero-mask--title">
              <span className="hero-title">{service.headline}</span>
            </Title>
            <span className="hero-mask">
              <span className="hero-description">{service.text}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default HeroCaption
