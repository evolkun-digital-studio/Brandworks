import type { EditorialPost } from './types'
import { Masthead, NewsRow, QuietCta } from './components'
import { useEditorialMeta, useScrollToTop } from './head'

const DESCRIPTION = 'Campaigns, collaborations, productions and developments from across the studio.'

/**
 * A chronological press index rather than another grid: date,
 * category, headline and a small thumbnail per row, divided by rules.
 */
function NewsIndex({ manageMetadata = true, posts = [], pagination }: { manageMetadata?: boolean; posts?: EditorialPost[]; pagination?: React.ReactNode }) {
  useScrollToTop('/news')
  useEditorialMeta(manageMetadata ? {
    title: 'Newsroom | BRANDWORKS',
    description: DESCRIPTION,
    path: '/news',
    type: 'website',
    jsonLd: (origin, canonical) => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'BrandWorks Newsroom',
      description: DESCRIPTION,
      url: canonical,
      publisher: { '@type': 'Organization', name: 'BrandWorks', url: origin },
    }),
  } : null)


  return (
    <main className="ed-page">
      <div className="ed-container">
        <Masthead kind="news" />

        <header className="ed-intro">
          <h1 className="ed-intro__title">Inside BrandWorks.</h1>
          <p className="ed-intro__dek">{DESCRIPTION}</p>
        </header>

        <section className="ed-news" aria-labelledby="ed-news-heading">
          <h2 id="ed-news-heading" className="sr-only">
            All news
          </h2>
          <div className="ed-news__head" aria-hidden="true">
            <span>Date</span>
            <span>Category</span>
            <span>Story</span>
          </div>
          <ol className="ed-news__list">
            {posts.map((post) => (
              <li key={post.slug}>
                <NewsRow post={post} />
              </li>
            ))}
          </ol>
          {posts.length === 0 && <p className="ed-intro__dek" role="status">No newsroom updates published yet — check back soon.</p>}
          {pagination}
        </section>

        <QuietCta
          text="Press and media enquiries."
          label="socials@brandworks.me"
          href="mailto:socials@brandworks.me?subject=Press%20enquiry"
        />
      </div>
    </main>
  )
}

export default NewsIndex
