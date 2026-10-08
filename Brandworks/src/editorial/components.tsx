import { createElement, useEffect, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Link, NavLink } from '../routing'
import { EditorialImage } from './EditorialImage'
import { formatDate, hrefFor, readingTime } from './format'
import type { EditorialKind, EditorialPost } from './types'

export function Arrow({ direction = 'right' }: { direction?: 'right' | 'left' }) {
  return (
    <svg className="ed-arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={direction === 'right' ? 'M2.5 8h11M9.5 4l4 4-4 4' : 'M13.5 8h-11M6.5 4l-4 4 4 4'}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Fades a block up once, the first time it nears the viewport. Only
 * used below the fold; the intro and featured story render immediately.
 * With reduced motion the CSS shows it in place with no transition.
 */
export function Reveal({
  as = 'div',
  className = '',
  children,
  ...rest
}: { as?: 'div' | 'section' | 'aside' | 'nav'; children: ReactNode } & HTMLAttributes<HTMLElement>) {
  // A callback ref keeps the observed node in state rather than reading
  // a ref object during render.
  const [node, setNode] = useState<HTMLElement | null>(null)
  // Keep the server markup and the first client render identical. The
  // observer below reveals the block after hydration when it enters view.
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!node || shown) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -6% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, shown])

  return createElement(as, { ref: setNode, className: `ed-reveal ${shown ? 'is-shown' : ''} ${className}`, ...rest }, children)
}

/** Publication name on the left, Journal / Newsroom switch on the right. */
export function Masthead({ kind }: { kind: EditorialKind }) {
  return (
    <div className="ed-masthead">
      <p className="ed-masthead__title">{kind === 'blog' ? 'BrandWorks Journal' : 'BrandWorks Newsroom'}</p>
      <nav aria-label="Journal and Newsroom" className="ed-masthead__nav">
        <NavLink to="/blog" end>
          Journal
        </NavLink>
        <NavLink to="/news" end>
          Newsroom
        </NavLink>
      </nav>
    </div>
  )
}

export function Meta({ post, kind, withAuthor = false }: { post: EditorialPost; kind: EditorialKind; withAuthor?: boolean }) {
  return (
    <p className="ed-meta">
      {withAuthor && <span>{post.author}</span>}
      <time dateTime={post.date}>{formatDate(post.date)}</time>
      {kind === 'blog' && <span>{readingTime(post)}</span>}
    </p>
  )
}

/** Image, category, headline, excerpt, meta. No container. */
export function StoryCard({
  post,
  kind = 'blog',
  compact = false,
  headingLevel = 3,
}: {
  post: EditorialPost
  kind?: EditorialKind
  /** Related-reading variant: image, category and headline only. */
  compact?: boolean
  headingLevel?: 2 | 3
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className={`ed-card ${compact ? 'ed-card--compact' : ''}`}>
      <EditorialImage
        src={post.image}
        alt=""
        sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
      />
      <div className="ed-card__body">
        <p className="ed-kicker">{post.category}</p>
        <Heading className="ed-card__title">
          <Link to={hrefFor(kind, post)} className="ed-stretch">
            {post.title}
          </Link>
        </Heading>
        {!compact && (
          <>
            <p className="ed-card__excerpt">{post.excerpt}</p>
            <Meta post={post} kind={kind} />
          </>
        )}
      </div>
    </article>
  )
}

/** Horizontal thumbnail + text, for the secondary story list. */
export function CompactStory({ post, kind = 'blog' }: { post: EditorialPost; kind?: EditorialKind }) {
  return (
    <article className="ed-compact">
      <EditorialImage src={post.image} alt="" sizes="(min-width: 768px) 168px, 112px" />
      <div>
        <p className="ed-kicker">{post.category}</p>
        <h3 className="ed-compact__title">
          <Link to={hrefFor(kind, post)} className="ed-stretch">
            {post.title}
          </Link>
        </h3>
        <p className="ed-compact__excerpt">{post.excerpt}</p>
        <Meta post={post} kind={kind} />
      </div>
    </article>
  )
}

/** One line of the Newsroom index: date, category, headline, thumbnail. */
export function NewsRow({ post, headingLevel = 3 }: { post: EditorialPost; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <article className="ed-news-row">
      <div className="ed-news-row__meta">
        <time dateTime={post.date} className="ed-news-row__date">
          {formatDate(post.date, 'short')}
        </time>
        <p className="ed-kicker">{post.category}</p>
      </div>
      <div className="ed-news-row__story">
        <Heading className="ed-news-row__title">
          <Link to={hrefFor('news', post)} className="ed-stretch">
            {post.title}
          </Link>
          <Arrow />
        </Heading>
        <p className="ed-news-row__excerpt">{post.excerpt}</p>
      </div>
      <EditorialImage src={post.image} alt="" sizes="(min-width: 768px) 152px, 104px" />
    </article>
  )
}

/** A single line and a text link. No card, no banner. */
export function QuietCta({ text, label, href }: { text: string; label: string; href: string }) {
  return (
    <Reveal as="aside" className="ed-cta" aria-label="Contact BrandWorks">
      <p className="ed-cta__text">{text}</p>
      <a className="ed-textlink" href={href}>
        {label}
        <Arrow />
      </a>
    </Reveal>
  )
}
