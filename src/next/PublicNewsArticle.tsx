'use client'

import { Link } from '../routing'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownRehypePlugins } from '../blog/lib/markdownConfig'
import { articleImageComponents } from '../blog/components/ArticleImage'
import { Arrow, Meta, NewsRow, QuietCta, Reveal } from '../editorial/components'
import { EditorialImage } from '../editorial/EditorialImage'
import { editorialPostFromCms } from '../editorial/fromCms'
import type { PublicBlogDetail, PublicBlogListItem } from '../blog/api/types'
import '../editorial/Editorial.css'

export default function PublicNewsArticle({ post, related }: { post: PublicBlogDetail; related: PublicBlogListItem[] }) {
  const story = editorialPostFromCms(post)
  const next = related[0]
  return (
    <main className="ed-page ed-page--article">
      <article>
        <div className="ed-article">
          <Link className="ed-back" to="/news"><Arrow direction="left" />Back to Newsroom</Link>
          <header className="ed-article__head">
            <p className="ed-kicker">{post.category}</p>
            <h1 className="ed-article__title">{post.title}</h1>
            <p className="ed-article__lead">{post.excerpt}</p>
            <Meta post={story} kind="news" withAuthor />
          </header>
          <figure className="ed-figure ed-figure--wide ed-article__hero">
            <EditorialImage src={post.coverImage} alt={post.coverImageAlt} priority sizes="(min-width: 1200px) 1120px, 100vw" />
            {post.coverImageCaption && <figcaption>{post.coverImageCaption}</figcaption>}
          </figure>
          <div className="ed-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins} components={{
              ...articleImageComponents,
              h1: ({ children }) => <h2>{children}</h2>,
              a: ({ href, children }) => href?.startsWith('/') && !href.startsWith('//')
                ? <Link to={href}>{children}</Link>
                : <a href={href} rel="noopener noreferrer">{children}</a>,
            }}>{post.content}</ReactMarkdown>
            {post.faq.length > 0 && <section aria-label="Frequently asked questions">
              <h1>Frequently asked questions</h1>
              {post.faq.map((item, index) => <div key={index}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
            </section>}
            {post.expertQuote && <blockquote><p>{post.expertQuote.quote}</p><cite>{post.expertQuote.personName}{post.expertQuote.organization && `, ${post.expertQuote.organization}`}</cite></blockquote>}
          </div>
        </div>
      </article>
      <div className="ed-container">
        {related.length > 0 && (
          <Reveal as="section" className="ed-related" aria-labelledby="ed-related-heading">
            <div className="ed-section-head"><h1 id="ed-related-heading" className="ed-section-title">More from the Newsroom</h1></div>
            <ol className="ed-news__list ed-news__list--related">
              {related.map((item) => <li key={item.id}><NewsRow post={editorialPostFromCms(item)} /></li>)}
            </ol>
          </Reveal>
        )}
        {next && <Reveal as="nav" className="ed-next" aria-label="Next story">
          <Link to={`/news/${next.slug}`} className="ed-next__link"><span className="ed-kicker">Next story</span><span className="ed-next__title">{next.title}</span><Arrow /></Link>
        </Reveal>}
        <QuietCta text="Press and media enquiries." label="socials@brandworks.me" href="mailto:socials@brandworks.me?subject=Press%20enquiry" />
      </div>
    </main>
  )
}
