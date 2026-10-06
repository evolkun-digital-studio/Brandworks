import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { socialContact } from '../../data/socialMediaPage'
import './SocialEnding.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function SocialContact() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // portrait and card rise into the pink screen on two speeds, the card settling at a tilt
      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: 0.6 },
      })
      tl.from('.bwsm-contact__photo', { yPercent: 40, rotate: -4, ease: 'none' }, 0)
        .from('.bwsm-contact__card', { yPercent: 70, rotate: 10, ease: 'none' }, 0)
    })
    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bwsm-contact" aria-labelledby="bwsm-contact-title">
      <div className="bwsm-contact__stage">
        <img className="bwsm-contact__photo" src={socialContact.image} alt="" loading="lazy" draggable={false} />
        <div className="bwsm-contact__card">
          <p>{socialContact.label}</p>
          <h2 id="bwsm-contact-title">{socialContact.heading}</h2>
          <p>{socialContact.copy}</p>
          <Link to={socialContact.to}>{socialContact.cta}</Link>
        </div>
      </div>
      <div className="bwsm-contact__word" aria-hidden="true"><span>Brandworks</span></div>
    </section>
  )
}
