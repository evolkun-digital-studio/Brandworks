import { GRAPHICS_CARDS, GRAPHICS_SECTION } from '../../data/graphicsMotion'

import './GraphicsMotion.css'

/**
 * Graphic & Motion — four featured cards in one row.
 * No scroll-driven animation; only a subtle hover on each card.
 */
export default function GraphicsMotionExperience() {
  return (
    <section
      id="graphics-motion"
      aria-labelledby="graphics-motion-heading"
      className="gm-section"
    >
      <div className="gm-shell">
        <header className="gm-head">
          <h2 id="graphics-motion-heading" className="section-heading gm-heading">
            {GRAPHICS_SECTION.heading}
          </h2>
        </header>

        <ul className="gm-grid">
          {GRAPHICS_CARDS.map((card) => (
            <li key={card.id} className="gm-card">
              <div className="gm-card__media">
                <img
                  src={card.image}
                  width={card.width}
                  height={card.height}
                  alt={card.alt}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="gm-card__body">
                <h3 className="gm-card__title">{card.title}</h3>
                <p className="gm-card__text">{card.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
