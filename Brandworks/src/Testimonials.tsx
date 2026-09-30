import { motion, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import './Testimonials.css'

type Testimonial = {
  quote: string
  name: string
  role: string
  initials: string
  /** Optional portrait; the initials sit on the lime disc until one is supplied. */
  image?: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
    name: 'Mikle John',
    role: 'Marketing Director',
    initials: 'MJ',
  },
  {
    quote:
      'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
    name: 'Mikle John',
    role: 'Marketing Director',
    initials: 'MJ',
  },
  {
    quote:
      'The AI agents have taken a huge amount of repetitive work off our team, automating tasks that used to consume hours every day. Everything now feels noticeably faster, simpler, and far more organized, allowing our team to focus on higher-value work instead of manual processes.',
    name: 'Mikle John',
    role: 'Marketing Director',
    initials: 'MJ',
  },
]

/** The site's entrance curve — the same one Capabilities.tsx uses. */
const EASE = [0.22, 1, 0.36, 1] as const

// Line → heading → copy → cards, all driven by the section entering view.
const intro: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const rule: Variants = {
  hidden: { scaleX: 0 },
  visible: { scaleX: 1, transition: { duration: 0.6, ease: EASE } },
}

const rise: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

const grid: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.1 } },
}

function Testimonials() {
  const reduce = useReducedMotion()
  // With reduced motion everything renders in its final state.
  const reveal = reduce
    ? {}
    : { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.2 } }

  return (
    <section className="testimonials" aria-labelledby="testimonials-heading">
      <motion.header className="testimonials-header" variants={intro} {...reveal}>
        <motion.span className="testimonials-rule" variants={rule} aria-hidden="true" />

        <motion.h2 id="testimonials-heading" className="site-display testimonials-title" variants={rise}>
          What clients say<span className="testimonials-dot">.</span>
        </motion.h2>

        <motion.p className="site-copy testimonials-intro" variants={rise}>
          Feedback from people we have worked with.
        </motion.p>
      </motion.header>

      {testimonials.length > 0 && (
        <motion.ul className="testimonials-grid" variants={grid} {...reveal}>
          {testimonials.map((item, index) => (
            <motion.li key={`${item.name}-${index}`} className="testimonials-cell" variants={rise}>
              <figure className="testimonial-card">
                <span className="testimonial-mark" aria-hidden="true">
                  “
                </span>

                <blockquote className="testimonial-quote">
                  <p>“{item.quote}”</p>
                </blockquote>

                <span className="testimonial-divider" aria-hidden="true" />

                <figcaption className="testimonial-client">
                  <span className="testimonial-avatar" aria-hidden="true">
                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" decoding="async" />
                    ) : (
                      item.initials
                    )}
                  </span>

                  <span className="testimonial-meta">
                    <span className="testimonial-name">{item.name}</span>
                    <span className="testimonial-role">{item.role}</span>
                  </span>
                </figcaption>
              </figure>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  )
}

export default Testimonials
