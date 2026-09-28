import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { blogCategories, blogPosts } from './data'
import { EditorialImage } from './EditorialImage'
import { Arrow, CompactStory, Masthead, Meta, QuietCta, Reveal, StoryCard } from './components'
import { categorySlug, hrefFor } from './format'
import { useEditorialMeta, useScrollToTop } from './head'

const DESCRIPTION =
  'Perspectives from across strategy, creative production, search, social, reputation and digital growth.'
const LATEST_COUNT = 6

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="ed-search__icon">
      <circle cx="7" cy="7" r="4.75" stroke="currentColor" strokeWidth="1.3" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function BlogIndex() {
  useScrollToTop('/blog')
  useEditorialMeta({
    title: 'Journal | BRANDWORKS',
    description: DESCRIPTION,
    path: '/blog',
    type: 'website',
    jsonLd: (origin, canonical) => ({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'BrandWorks Journal',
      description: DESCRIPTION,
      url: canonical,
      publisher: { '@type': 'Organization', name: 'BrandWorks', url: origin },
    }),
  })

  const [params, setParams] = useSearchParams()
  const active = blogCategories.find((c) => categorySlug(c) === params.get('category')) ?? 'All'
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const isFiltered = active !== 'All' || q !== ''

  const sorted = useMemo(() => [...blogPosts].sort((a, b) => b.date.localeCompare(a.date)), [])
  const featured = sorted.find((p) => p.featured) ?? sorted[0]
  const rest = sorted.filter((p) => p !== featured)
  const results = sorted.filter(
    (p) =>
      (active === 'All' || p.category === active) &&
      (!q || `${p.title} ${p.excerpt} ${p.category}`.toLowerCase().includes(q)),
  )
  const gridPosts = isFiltered ? results : rest.slice(0, LATEST_COUNT)
  const morePosts = isFiltered ? [] : rest.slice(LATEST_COUNT)

  function selectCategory(category: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (category === 'All') next.delete('category')
        else next.set('category', categorySlug(category))
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  }

  const noun = results.length === 1 ? 'article' : 'articles'
  const summary = !isFiltered
    ? ''
    : results.length === 0
      ? `No articles match${q ? ` “${query.trim()}”` : ''}${active !== 'All' ? ` in ${active}` : ''}.`
      : `${results.length} ${noun}${active !== 'All' ? ` in ${active}` : ''}${q ? ` matching “${query.trim()}”` : ''}`

  return (
    <main className="ed-page">
      <div className="ed-container">
        <Masthead kind="blog" />

        <header className="ed-intro">
          <h1 className="ed-intro__title">Ideas on brands, reputation and growth.</h1>
          <p className="ed-intro__dek">{DESCRIPTION}</p>
        </header>

        <article className="ed-featured">
          <EditorialImage
            src={featured.image}
            alt={featured.imageAlt}
            priority
            sizes="(min-width: 1280px) 720px, (min-width: 900px) 60vw, 100vw"
          />
          <div className="ed-featured__body">
            <p className="ed-kicker">{featured.category}</p>
            <h2 className="ed-featured__title">
              <Link to={hrefFor('blog', featured)} className="ed-stretch">
                {featured.title}
              </Link>
            </h2>
            <p className="ed-featured__excerpt">{featured.excerpt}</p>
            <Meta post={featured} kind="blog" />
            <span className="ed-textlink ed-featured__more" aria-hidden="true">
              Read article
              <Arrow />
            </span>
          </div>
        </article>

        <section aria-labelledby="ed-latest-heading" className="ed-latest">
          <h2 id="ed-latest-heading" className="sr-only">
            Latest articles
          </h2>
          <div className="ed-toolbar">
            <div className="ed-filters" role="group" aria-label="Filter by category">
              {['All', ...blogCategories].map((category) => (
                <button
                  key={category}
                  type="button"
                  className="ed-filter"
                  aria-pressed={active === category}
                  onClick={() => selectCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <label className="ed-search">
              <SearchIcon />
              <span className="sr-only">Search the Journal</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the Journal"
                autoComplete="off"
              />
            </label>
          </div>

          <p className="ed-results" aria-live="polite">
            {summary}
            {isFiltered && results.length === 0 && (
              <>
                {' '}
                <button
                  type="button"
                  className="ed-results__reset"
                  onClick={() => {
                    setQuery('')
                    selectCategory('All')
                  }}
                >
                  Show all articles
                </button>
              </>
            )}
          </p>

          {gridPosts.length > 0 && (
            // Keyed on the filter so a change crossfades the new set in.
            <div className="ed-grid" key={`${active}|${q}`}>
              {gridPosts.map((post) => (
                <StoryCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </section>

        {morePosts.length > 0 && (
          <Reveal as="section" className="ed-more" aria-labelledby="ed-more-heading">
            <div className="ed-section-head">
              <h2 id="ed-more-heading" className="ed-section-title">
                More from the Journal
              </h2>
            </div>
            <ul className="ed-compact-list">
              {morePosts.map((post) => (
                <li key={post.slug}>
                  <CompactStory post={post} />
                </li>
              ))}
            </ul>
          </Reveal>
        )}

        <QuietCta
          text="Building a brand that needs clearer direction?"
          label="Talk to BrandWorks"
          href="mailto:hello@brandworks.com"
        />
      </div>
    </main>
  )
}

export default BlogIndex
