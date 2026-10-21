import Link from 'next/link'
import ArticleMarkdown from '../blog/components/ArticleMarkdown'
import BlogCard from '../blog/components/BlogCard'
import PublicArticleCover from '../blog/components/PublicArticleCover'
import { formatBlogDate } from '../blog/lib/formatDate'
import { buildToc, parseMarkdown } from '../lib/markdownMetrics'
import type { TocEntry } from '../lib/markdownMetrics'
import type { ExpertQuote, PublicBlogDetail, PublicBlogListItem } from '../blog/api/types'

function Breadcrumb({ title }: { title: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex w-full flex-wrap items-center gap-1.5 text-[12px] text-neutral-500">
      <Link href="/" className="transition-colors hover:text-neutral-900">Home</Link>
      <span aria-hidden="true">/</span>
      <Link href="/blog" className="transition-colors hover:text-neutral-900">Blog</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="truncate text-neutral-700">{title}</span>
    </nav>
  )
}

function TableOfContents({ toc }: { toc: TocEntry[] }) {
  if (toc.length < 2) return null
  return (
    <nav aria-label="Table of contents" className="my-10 w-full rounded-[12px] border border-neutral-200 bg-neutral-50 p-6">
      <h2 className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">On this page</h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {toc.map((entry) => <li key={entry.id} style={{ paddingLeft: `${(entry.level - 2) * 16}px` }}><a href={`#${entry.id}`} className="text-[14px] text-neutral-700 underline-offset-2 transition-colors hover:text-neutral-900 hover:underline">{entry.text}</a></li>)}
      </ul>
    </nav>
  )
}

function SummarySection({ summary }: { summary: string | null }) {
  if (!summary?.trim()) return null
  return <div className="my-8 w-full rounded-[12px] border border-neutral-200 bg-neutral-50 p-6"><h2 className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">Summary</h2><p className="mt-2 text-[15px] leading-[1.6] text-neutral-800">{summary}</p></div>
}

function KeyTakeaways({ items }: { items: string[] }) {
  const valid = items.filter((item) => item.trim())
  if (!valid.length) return null
  return <div className="my-8 w-full rounded-[12px] border border-neutral-200 bg-white p-6"><h2 className="text-[13px] font-semibold tracking-wide text-neutral-500 uppercase">Key Takeaways</h2><ul className="mt-3 flex flex-col gap-2">{valid.map((item, index) => <li key={index} className="flex gap-2.5 text-[15px] leading-[1.6] text-neutral-800"><span aria-hidden="true" className="mt-[2px] text-neutral-400">&bull;</span><span>{item}</span></li>)}</ul></div>
}

function FaqSection({ items }: { items: { question: string; answer: string }[] }) {
  const valid = items.filter((item) => item.question.trim() && item.answer.trim())
  if (!valid.length) return null
  return <section aria-labelledby="faq-heading" className="my-14 w-full border-t border-neutral-200 pt-10"><h2 id="faq-heading" className="text-[22px] font-bold tracking-tight text-neutral-900 uppercase">Frequently Asked Questions</h2><div className="mt-6 flex flex-col divide-y divide-neutral-100">{valid.map((item, index) => <details key={index} className="group py-4"><summary className="cursor-pointer list-none pr-8 text-[16px] font-semibold text-neutral-900 marker:hidden">{item.question}<span aria-hidden="true" className="float-right text-neutral-400 transition-transform group-open:rotate-45">+</span></summary><p className="mt-2 max-w-[680px] text-[15px] leading-[1.6] text-neutral-700">{item.answer}</p></details>)}</div></section>
}

function ExpertQuoteSection({ quote }: { quote: ExpertQuote | null }) {
  if (!quote?.quote.trim()) return null
  return <blockquote className="my-14 w-full border-l-2 border-neutral-900 py-2 pl-6"><p className="text-[18px] leading-[1.5] font-medium text-neutral-900">&ldquo;{quote.quote}&rdquo;</p><footer className="mt-3 text-[14px] text-neutral-600"><span className="font-medium text-neutral-900">{quote.personName}</span>{quote.role && <span>, {quote.role}</span>}{quote.organization && <span> &middot; {quote.organization}</span>}</footer></blockquote>
}

export default function PublicBlogArticle({ post, related }: { post: PublicBlogDetail; related: PublicBlogListItem[] }) {
  const toc = buildToc(parseMarkdown(post.content).headings)
  const showUpdated = post.updatedAt && new Date(post.updatedAt).toDateString() !== new Date(post.publishedAt).toDateString()

  return (
    <main className="flex flex-col items-center bg-white px-4 pt-12 pb-24 sm:pt-16">
      <article className="flex w-full max-w-[760px] flex-col items-start">
        {post.breadcrumbEnabled && <Breadcrumb title={post.title} />}
        <Link href="/blog" className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-900"><span aria-hidden="true">←</span> Back to Blog</Link>
        {post.category && <span className="mt-6 rounded-[4px] bg-neutral-100 px-2.5 py-1 text-[12px] font-medium tracking-wide text-neutral-600 uppercase">{post.category}</span>}
        <h1 className={`${post.category ? 'mt-3' : 'mt-6'} site-heading text-neutral-900 uppercase`}>{post.title}</h1>
        <p className="site-copy mt-4 text-neutral-600">{post.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-neutral-600"><span>Edited by <span className="font-medium text-neutral-900">{post.authorName}</span></span><span aria-hidden="true">&middot;</span><span>Published <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time></span>{showUpdated && <><span aria-hidden="true">&middot;</span><span>Updated <time dateTime={post.updatedAt}>{formatBlogDate(post.updatedAt)}</time></span></>}</div>
        {post.coverImage && <PublicArticleCover src={post.coverImage} alt={post.coverImageAlt} />}
        {post.coverImageCaption && <p className="mt-2 text-[13px] text-neutral-500">{post.coverImageCaption}</p>}
        <SummarySection summary={post.aiSummary} />
        <KeyTakeaways items={post.keyTakeaways} />
        <TableOfContents toc={toc} />
        <div className="mt-10 w-full"><ArticleMarkdown content={post.content} /></div>
        <FaqSection items={post.faq} />
        <ExpertQuoteSection quote={post.expertQuote} />
        <div className="mt-14 border-t border-neutral-200 pt-8"><Link href="/blog" className="flex w-fit items-center gap-1.5 text-[13px] font-medium text-neutral-600 transition-colors hover:text-neutral-900"><span aria-hidden="true">←</span> Back to Blog</Link></div>
      </article>
      {related.length > 0 && <section aria-labelledby="more-from-blog" className="mt-20 w-full max-w-[1280px] border-t border-neutral-200 pt-14"><h2 id="more-from-blog" className="text-[22px] font-bold tracking-tight text-neutral-900 uppercase">More from the blog</h2><div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <BlogCard key={item.id} post={item} />)}</div></section>}
    </main>
  )
}

