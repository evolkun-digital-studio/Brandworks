import { motion, useReducedMotion } from 'motion/react'
import type { SocialFloater } from '../../data/socialMedia'
import './SocialFloaters.css'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The four supporting pieces around the phone. Each arrives once, after the
 * phone (the outer element), then drifts on a slow CSS bob (the inner one) —
 * two elements so the two motions never fight over `transform`. Decorative
 * to the composition, so hidden from assistive tech; the section copy
 * carries the message.
 */
function SocialFloaters({ floaters, delay = 0.35 }: { floaters: SocialFloater[]; delay?: number }) {
  const reduce = useReducedMotion()

  return (
    <div className="social-floaters" aria-hidden="true">
      {floaters.map((floater, index) => (
        <motion.div
          key={floater.id}
          className={`social-floater social-floater--${floater.position}`}
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, delay: delay + index * 0.1, ease: EASE }}
        >
          <div className="social-floater__bob">
            {floater.kind === 'image' ? (
              <figure className="social-floater__media">
                <img src={floater.image} alt="" width={420} height={525} loading="lazy" decoding="async" />
                <figcaption>
                  <span className="social-floater__label">{floater.label}</span>
                  {floater.text && <span className="social-floater__text">{floater.text}</span>}
                </figcaption>
              </figure>
            ) : (
              <div className="social-floater__card">
                <span className="social-floater__label">{floater.label}</span>
                <span className="social-floater__text">{floater.text}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default SocialFloaters
