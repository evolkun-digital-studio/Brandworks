import type { CSSProperties, ReactNode } from 'react'
import type { WebProject as WebProjectData, WebProjectImage } from '../../data/webDevelopment'

const pad = (n: number) => String(n).padStart(2, '0')

/** A line of text inside its own mask, so it can slide in and out of view. */
function Line({ children }: { children: ReactNode }) {
  return (
    <span className="wdr-line">
      <span className="wdr-line__inner">{children}</span>
    </span>
  )
}

function Img({ image, sizes, className }: { image: WebProjectImage; sizes: string; className: string }) {
  return (
    <img
      className={className}
      src={image.src}
      srcSet={image.srcSet}
      sizes={image.srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading="lazy"
      decoding="async"
      style={image.position ? { objectPosition: image.position } : undefined}
    />
  )
}

type Props = {
  project: WebProjectData
  index: number
  total: number
}

/**
 * One piece of work in the reel. The same markup serves both presentations:
 * stacked (phones, reduced motion) it's a kicker, a framed image and a
 * caption in normal flow; inside the pinned stage (`.is-cinematic`) every
 * article becomes a full-stage layer and WebDevelopment.tsx moves the
 * `.wdr-sheet` out of its `.wdr-mask` to uncover the next one beneath.
 *
 *   mask   – the frame; clip-path in the stage, rounded crop when stacked
 *   sheet  – the printed sheet that slides up and away
 *   art    – slightly oversized, so its drift/parallax never shows an edge
 *   hover  – the 1 → 1.015 hover scale lives here and nowhere else
 */
function WebProject({ project, index, total }: Props) {
  const { id, title, type, services, year, layout, image, secondary, url } = project
  const titleId = `wdr-project-${id}`

  return (
    <article
      className="wdr-project"
      data-layout={layout}
      aria-labelledby={titleId}
      style={{ '--wdr-z': total - index } as CSSProperties}
    >
      <p className="wdr-kicker">
        <Line>
          <span className="wdr-kicker__index">{pad(index + 1)}</span>
          <span className="wdr-kicker__total"> / {pad(total)}</span>
        </Line>
        <Line>{type}</Line>
      </p>

      <figure className="wdr-figure">
        <div className="wdr-mask">
          <div className="wdr-sheet">
            <div className="wdr-art">
              <div className="wdr-hover">
                {layout === 'spread' && secondary ? (
                  <>
                    <div className="wdr-spread__main">
                      <Img image={image} sizes="(min-width: 768px) 60vw, 88vw" className="wdr-img" />
                    </div>
                    <div className="wdr-spread__crop">
                      <Img image={secondary} sizes="(min-width: 768px) 18vw, 34vw" className="wdr-img" />
                    </div>
                  </>
                ) : (
                  <Img
                    image={image}
                    sizes={layout === 'bleed' ? '100vw' : '(min-width: 768px) 86vw, 100vw'}
                    className="wdr-img"
                  />
                )}
              </div>
            </div>
          </div>

          {url && (
            <a className="wdr-hit" href={url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" />
          )}
        </div>

        <figcaption className="wdr-meta">
          <div className="wdr-meta__main">
            <h3 id={titleId} className="wdr-title">
              <Line>{title}</Line>
            </h3>
            <p className="wdr-services">
              <Line>{services.join(' · ')}</Line>
            </p>
          </div>

          <div className="wdr-meta__side">
            <p className="wdr-year">
              <Line>{year}</Line>
            </p>
            {url && (
              <a className="wdr-view" href={url} target="_blank" rel="noopener noreferrer">
                <Line>
                  View project <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </Line>
              </a>
            )}
          </div>
        </figcaption>
      </figure>
    </article>
  )
}

export default WebProject
