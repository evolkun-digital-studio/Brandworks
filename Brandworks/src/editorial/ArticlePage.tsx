import type { ReactNode } from 'react'
import { Link, useParams } from '../routing'
import { useNoIndexPage } from '../lib/useNoIndexPage'
import { blogPosts, newsPosts, serviceLinks } from './data'
import { EditorialImage } from './EditorialImage'
import { Arrow, Meta, NewsRow, QuietCta, Reveal, StoryCard } from './components'
import { categorySlug, hrefFor } from './format'
import { useEditorialMeta, useScrollToTop } from './head'
import type { ArticleBlock, EditorialKind, EditorialPost } from './types'

const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g

/** Plain text with `[label](href)` links; site paths route client-side. */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(LINK_PATTERN)) {
    const [whole, label, href] = match
    const index = match.index ?? 0
    if (index > last) parts.push(text.slice(last, index))
    parts.push(
      href.startsWith('/') ? (
        <Link key={index} to={href}>
          {label}
        </Link>
      ) : (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ),
    )
    last = index + whole.length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

function Block({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case 'p':
      return (
        <p>
          <Inline text={block.text} />
        </p>
      )
    case 'h2':
      return <h2>{block.text}</h2>
    case 'h3':
      return <h3>{block.text}</h3>
    case 'quote':
      return (
        <blockquote>
          <p>
            <Inline text={block.text} />
          </p>
          {block.cite && <footer>{block.cite}</footer>}
        </blockquote>
      )
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul'
      return (
        <List>
          {block.items.map((item) => (
            <li key={item}>
              <Inline text={item} />
            </li>
          ))}
        </List>
      )
    }
    case 'image': {
      const size = block.size ?? 'normal'
      return (
        <figure className={`ed-figure ed-figure--${size}`}>
          <EditorialImage
            src={block.src}
            alt={block.alt}
            sizes={size === 'full' ? '100vw' : size === 'wide' ? '(min-width: 1200px) 1120px, 100vw' : '(min-width: 800px) 720px, 100vw'}
          />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      )
    }
  }
}

function MissingArticle({ kind }: { kind: EditorialKind }) {
  const section = kind === 'blog' ? 'Journal' : 'Newsroom'
  useNoIndexPage(`Story Not Found | BRANDWORKS`, true)
  return (
    <main className="ed-page">
      <div className="ed-container ed-missing">
        <p className="ed-kicker">{section}</p>
        <h1 className="ed-intro__title">This story isn’t available.</h1>
        <p className="ed-intro__dek">It may have moved, or the link may be incomplete.</p>
        <Link className="ed-textlink" to={`/${kind}`}>
          Back to the {section}
          <Arrow />
        </Link>
      </div>
    </main>
  )
}

/**
 * Up to three other stories, never repeating the "next" link below
 * them. Journal: same category first; Newsroom: newest first.
 */
function relatedFor(kind: EditorialKind, post: EditorialPost, next: EditorialPost, sorted: EditorialPost[]): EditorialPost[] {
  const others = sorted.filter((p) => p !== post && p !== next)
  if (kind === 'news') return others.slice(0, 3)
  return [...others.filter((p) => p.category === post.category), ...others.filter((p) => p.category !== post.category)].slice(0, 3)
}

function ArticlePage({ kind, manageMetadata = true }: { kind: EditorialKind; manageMetadata?: boolean }) {
  const { slug = '' } = useParams()
  useScrollToTop(`${kind}/${slug}`)

  const sorted = [...(kind === 'blog' ? blogPosts : newsPosts)].sort((a, b) => b.date.localeCompare(a.date))
  const index = sorted.findIndex((p) => p.slug === slug)
  const post = index === -1 ? null : sorted[index]
  const section = kind === 'blog' ? 'Journal' : 'Newsroom'

  useEditorialMeta(
    manageMetadata && post ? {
      title: `${post.title} | BRANDWORKS`,
      description: post.excerpt,
      path: hrefFor(kind, post),
      image: `${post.image}?auto=format&fit=crop&w=1200&h=630&q=80`,
      type: 'article',
      jsonLd: (origin, canonical) => ({
        '@context': 'https://schema.org',
        '@type': kind === 'blog' ? 'BlogPosting' : 'NewsArticle',
        headline: post.title,
        description: post.excerpt,
        image: `${post.image}?auto=format&fit=crop&w=1600&q=80`,
        datePublished: post.date,
        dateModified: post.date,
        articleSection: post.category,
        author: { '@type': 'Organization', name: post.author },
        publisher: { '@type': 'Organization', name: 'BrandWorks', url: origin },
        mainEntityOfPage: canonical,
      }),
    } : null,
  )

  if (!post) return <MissingArticle kind={kind} />

  // "Next" walks back through the archive, wrapping to the newest.
  const next = sorted[(index + 1) % sorted.length]
  const related = relatedFor(kind, post, next, sorted)
  const service = kind === 'blog' ? serviceLinks[post.category] : undefined

  return (
    <main className="ed-page ed-page--article">
      <article>
        <div className="ed-article">
          <Link className="ed-back" to={`/${kind}`}>
            <Arrow direction="left" />
            Back to {section}
          </Link>

          <header className="ed-article__head">
            {kind === 'blog' ? (
              <Link className="ed-kicker ed-kicker--link" to={`/blog?category=${categorySlug(post.category)}`}>
                {post.category}
              </Link>
            ) : (
              <p className="ed-kicker">{post.category}</p>
            )}
            <h1 className="ed-article__title">{post.title}</h1>
            <p className="ed-article__lead">{post.excerpt}</p>
            <Meta post={post} kind={kind} withAuthor />
          </header>

          <figure className="ed-figure ed-figure--wide ed-article__hero">
            <EditorialImage src={post.image} alt={post.imageAlt} priority sizes="(min-width: 1200px) 1120px, 100vw" />
            {post.imageCaption && <figcaption>{post.imageCaption}</figcaption>}
          </figure>

          <div className="ed-prose">
            {post.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </div>

          {service && (
            <div className="ed-article__foot">
              <Link className="ed-kicker ed-kicker--link" to={`/blog?category=${categorySlug(post.category)}`}>
                More on {post.category}
              </Link>
              <Link className="ed-textlink" to={service.href}>
                {service.label}
                <Arrow />
              </Link>
            </div>
          )}
        </div>
      </article>

      <div className="ed-container">
        {related.length > 0 && (
          <Reveal as="section" className="ed-related" aria-labelledby="ed-related-heading">
            <div className="ed-section-head">
              <h2 id="ed-related-heading" className="ed-section-title">
                {kind === 'blog' ? 'Related reading' : 'More from the Newsroom'}
              </h2>
            </div>
            {kind === 'blog' ? (
              <div className="ed-grid ed-grid--related">
                {related.map((p) => (
                  <StoryCard key={p.slug} post={p} compact />
                ))}
              </div>
            ) : (
              <ol className="ed-news__list ed-news__list--related">
                {related.map((p) => (
                  <li key={p.slug}>
                    <NewsRow post={p} />
                  </li>
                ))}
              </ol>
            )}
          </Reveal>
        )}

        {next && next !== post && (
          <Reveal as="nav" className="ed-next" aria-label={kind === 'blog' ? 'Next article' : 'Next story'}>
            <Link to={hrefFor(kind, next)} className="ed-next__link">
              <span className="ed-kicker">{kind === 'blog' ? 'Next article' : 'Next story'}</span>
              <span className="ed-next__title">{next.title}</span>
              <Arrow />
            </Link>
          </Reveal>
        )}

        {kind === 'blog' ? (
          <QuietCta
            text="Building a brand that needs clearer direction?"
            label="Talk to BrandWorks"
            href="mailto:hello@brandworks.com"
          />
        ) : (
          <QuietCta
            text="Press and media enquiries."
            label="hello@brandworks.com"
            href="mailto:hello@brandworks.com?subject=Press%20enquiry"
          />
        )}
      </div>
    </main>
  )
}

export default ArticlePage
