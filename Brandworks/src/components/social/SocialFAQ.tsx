import { useId, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { socialFaq } from '../../data/socialMediaPage'
import './SocialEnding.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export default function SocialFAQ() {
  const sectionRef = useRef<HTMLElement>(null)
  const baseId = useId()
  const [open, setOpen] = useState<number | null>(null)

  useGSAP(() => {
    const section = sectionRef.current
    if (!section) return
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // title lines slide up out of their masks, then the rows follow
      gsap.from('.bwsm-faq__title span', {
        yPercent: 110, stagger: 0.09, ease: 'power3.out', duration: 1,
        scrollTrigger: { trigger: section, start: 'top 65%' },
      })
      gsap.from('.bwsm-faq__item', {
        y: 36, opacity: 0, stagger: 0.07, ease: 'power2.out', duration: 0.8,
        scrollTrigger: { trigger: section, start: 'top 55%' },
      })
    })
    return () => mm.revert()
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} className="bwsm-faq" aria-labelledby="bwsm-faq-title">
      <h2 id="bwsm-faq-title" className="bwsm-faq__title">
        <b><span>Small</span></b><b><span>questions,</span></b><b className="is-soft"><span>big</span></b><b className="is-soft"><span>answers</span></b>
      </h2>
      <ul className="bwsm-faq__list">
        {socialFaq.map(([question, answer], index) => {
          const isOpen = open === index
          return (
            <li key={question} className={`bwsm-faq__item${isOpen ? ' is-open' : ''}`}>
              <h3>
                <button
                  type="button"
                  id={`${baseId}-q${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`${baseId}-a${index}`}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span>{question}</span>
                  <i aria-hidden="true" />
                </button>
              </h3>
              <div id={`${baseId}-a${index}`} role="region" aria-labelledby={`${baseId}-q${index}`} className="bwsm-faq__answer">
                <div><p>{answer}</p></div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
