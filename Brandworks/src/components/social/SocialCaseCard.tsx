import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { socialCaseOfMonth } from '../../data/socialMediaPage'
import './SocialEnding.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** Olive "case of the month" card pinned bottom-right for the whole page; it leaves when the contact ending arrives. */
export default function SocialCaseCard({ image }: { image: string }) {
  const ref = useRef<HTMLElement>(null)
  const drag = useRef({ startY: 0, active: false })
  const [hidden, setHidden] = useState(false)

  // swipe down to tuck the card away (only its handle stays); tap or swipe up to bring it back
  const hiddenY = () => (ref.current ? ref.current.offsetHeight - 34 : 0)
  const settle = (hide: boolean) => {
    setHidden(hide)
    gsap.to(ref.current, { y: hide ? hiddenY() : 0, duration: 0.55, ease: 'power3.out' })
  }
  const onDown = (e: ReactPointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('a')) return
    drag.current = { startY: e.clientY, active: true }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current.active) return
    const dy = e.clientY - drag.current.startY
    const base = hidden ? hiddenY() : 0
    gsap.set(ref.current, { y: Math.min(hiddenY(), Math.max(0, base + dy)) })
  }
  const onUp = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current.active) return
    drag.current.active = false
    const dy = e.clientY - drag.current.startY
    if (Math.abs(dy) < 6) settle(false)
    else settle(hidden ? dy > -50 : dy > 50)
  }
  useGSAP(() => {
    const el = ref.current
    if (!el) return
    const mm = gsap.matchMedia()
    mm.add('(min-width: 900px)', () => {
      gsap.from(el, { yPercent: 120, duration: 1.2, delay: 0.9, ease: 'expo.out' })
      const contact = document.querySelector('.bwsm-contact')
      if (!contact) return
      ScrollTrigger.create({
        trigger: contact,
        start: 'top 85%',
        onEnter: () => gsap.to(el, { yPercent: 130, duration: 0.6, ease: 'power3.in' }),
        onLeaveBack: () => gsap.to(el, { yPercent: 0, duration: 0.6, ease: 'power3.out' }),
      })
    })
    return () => mm.revert()
  }, { scope: ref })

  return (
    <aside ref={ref} className={`bwsm-case${hidden ? ' is-hidden' : ''}`} aria-label={socialCaseOfMonth.label} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <button type="button" className="bwsm-case__bar" aria-label={hidden ? 'Show case of the month' : 'Hide case of the month'} aria-expanded={!hidden} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); settle(!hidden) } }} />
      <img src={image} alt="" loading="lazy" draggable={false} />
      <div>
        <small>{socialCaseOfMonth.label}</small>
        <strong>{socialCaseOfMonth.title}</strong>
        <ul>{socialCaseOfMonth.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        <Link to={socialCaseOfMonth.to}>{socialCaseOfMonth.cta}</Link>
      </div>
    </aside>
  )
}
