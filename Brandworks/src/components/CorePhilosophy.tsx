
'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './CorePhilosophy.module.css'

gsap.registerPlugin(ScrollTrigger)

const PRINCIPLES = [
  'Understand Before Building',
  'Solve, Do Not Decorate',
  'Build for the Next Stage',
  'Work as a Partner',
] as const

export default function CorePhilosophy() {
  const sectionRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const media = gsap.matchMedia()

      media.add(
        '(prefers-reduced-motion: no-preference)',
        () => {
          const heading = sectionRef.current?.querySelector(
            '[data-philosophy-heading]'
          )

          const rows = gsap.utils.toArray<HTMLElement>(
            '[data-philosophy-row]'
          )

          if (heading) {
            gsap.from(heading, {
              autoAlpha: 0,
              y: 24,
              duration: 0.9,
              ease: 'power3.out',
              clearProps: 'all',
              scrollTrigger: {
                trigger: heading,
                start: 'top 88%',
                once: true,
              },
            })
          }

          if (rows.length) {
            gsap.from(rows, {
              autoAlpha: 0,
              y: 18,
              duration: 0.75,
              stagger: 0.1,
              ease: 'power3.out',
              clearProps: 'all',
              scrollTrigger: {
                trigger: rows[0],
                start: 'top 88%',
                once: true,
              },
            })
          }
        }
      )

      return () => media.revert()
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="core-philosophy"
    >
      <div className={styles.inner}>
        <header
          className={styles.header}
          data-philosophy-heading
        >
          <p className={styles.eyebrow}>
            BrandWorks / Philosophy
          </p>

          <h2
            id="core-philosophy"
            className={styles.heading}
          >
            Good work begins with clear thinking.
          </h2>
        </header>

        <ul className={styles.list}>
          {PRINCIPLES.map((title) => (
            <li
              key={title}
              className={styles.row}
              data-philosophy-row
            >
              <h3 className={styles.name}>
                {title}
              </h3>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
