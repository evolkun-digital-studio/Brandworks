'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import type { StaticImageData } from 'next/image'
import type { Variants } from 'motion/react'
import teamPortrait from '../../assets/about/team-04.webp'
import redPortrait from '../../assets/photography/hero-red-portrait-1200.webp'
import lavenderPortrait from '../../assets/photography/Top-Down Lavender Hijab Editorial Portrait.png'
import handsPortrait from '../../assets/photography/hero-hands-portrait-1200.webp'
import './Testimonials.css'

type Testimonial = {
  id: string
  quote: string
  name: string
  designation: string
  company: string
  image: StaticImageData
  imageAlt: string
}

// Placeholder attribution: swap in approved client names, roles, companies
// and portraits before publishing.
const testimonials: Testimonial[] = [
  {
    id: 'client-placeholder-01',
    quote:
      'Brandworks didn’t just design our logo, they gave our brand a real personality.',
    name: '[Client Name]',
    designation: '[Role]',
    company: '[Company]',
    image: teamPortrait,
    imageAlt: 'Portrait of a Brandworks client',
  },
  {
    id: 'client-placeholder-02',
    quote:
      'Our new website by Brandworks doubled our enquiries within the first month.',
    name: '[Client Name]',
    designation: '[Role]',
    company: '[Company]',
    image: redPortrait,
    imageAlt: 'Portrait of a Brandworks client',
  },
  {
    id: 'client-placeholder-03',
    quote:
      'From strategy to visuals, Brandworks made the whole rebrand feel effortless.',
    name: '[Client Name]',
    designation: '[Role]',
    company: '[Company]',
    image: lavenderPortrait,
    imageAlt: 'Portrait of a Brandworks client',
  },
  {
    id: 'client-placeholder-04',
    quote:
      'Fast, sharp and genuinely creative. Brandworks gets it right the first time.',
    name: '[Client Name]',
    designation: '[Role]',
    company: '[Company]',
    image: handsPortrait,
    imageAlt: 'Portrait of a Brandworks client framing the camera with her hands',
  },
]

const EASE = [0.22, 1, 0.36, 1] as const

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
}

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 35, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.7, ease: EASE },
  },
}

export default function Testimonials() {
  const reduceMotion = useReducedMotion()
  const reveal = reduceMotion
    ? { initial: false as const, animate: 'visible' as const }
    : {
        initial: 'hidden' as const,
        whileInView: 'visible' as const,
        viewport: { once: true, amount: 0.2 },
      }

  return (
    <section className="testimonials" aria-labelledby="testimonials-heading">
      <div className="testimonials-shell">
        <motion.header
          className="testimonials-header"
          variants={headerVariants}
          {...reveal}
        >
          <h2 id="testimonials-heading" className="site-display testimonials-title capitalize">
            What clients say.
          </h2>
          <p className="site-copy testimonials-intro">
            Feedback from people we have worked with.
          </p>
        </motion.header>

        <motion.ul
          className="testimonials-grid"
          aria-label="Client testimonials"
          tabIndex={0}
          variants={gridVariants}
          {...reveal}
        >
          {testimonials.map((item) => (
            <motion.li
              key={item.id}
              className="testimonials-cell"
              variants={cardVariants}
            >
              <figure className="testimonial-card">
                <span className="testimonial-mark" aria-hidden="true">
                  &ldquo;
                </span>

                <blockquote className="testimonial-quote">
                  <p>{item.quote}</p>
                </blockquote>

                <div className="testimonial-photo-wrap">
                  <Image
                    src={item.image}
                    alt={item.imageAlt}
                    fill
                    sizes="(max-width: 639px) 85vw, (max-width: 1199px) 48vw, 360px"
                    className="testimonial-photo"
                  />
                  <figcaption className="testimonial-client">
                    <span className="testimonial-name">{item.name}</span>
                    <span className="testimonial-role">
                      {item.designation},
                      <br />
                      {item.company}
                    </span>
                  </figcaption>
                </div>
              </figure>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}
