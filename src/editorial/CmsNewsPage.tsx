import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from '../routing'
import { publicApiRequest, PublicApiError } from '../blog/api/client'
import type { PublicBlogDetail, PublicBlogListResult } from '../blog/api/types'
import PublicNewsIndex from '../next/PublicNewsIndex'
import PublicNewsArticle from '../next/PublicNewsArticle'
import { useEditorialMeta, useScrollToTop } from './head'
import { buildArticleSchemaGraph } from '../blog/lib/schema'
import { getEditorialIndexSchema } from './seo'

/** The Vite preview uses the same CMS APIs as the Next server-rendered pages. */
export default function CmsNewsPage({ article = false, manageMetadata = true }: { article?: boolean; manageMetadata?: boolean }) {
  const { slug = '' } = useParams()
  const [params] = useSearchParams()
  const page = params.get('page') ?? '1'
  const key = article ? `article:${slug}` : `list:${page}`
  const [state, setState] = useState<{ key: string; list?: PublicBlogListResult; post?: PublicBlogDetail; error?: string } | null>(null)
  useScrollToTop(`/news/${key}`)
  useEffect(() => {
    let alive = true
    const list = publicApiRequest<PublicBlogListResult>(`/news?page=${encodeURIComponent(article ? '1' : page)}&limit=20`)
    const detail = article ? publicApiRequest<{ blog: PublicBlogDetail }>(`/news/${encodeURIComponent(slug)}`) : Promise.resolve(null)
    Promise.all([list, detail]).then(([list, detail]) => {
      if (alive) setState({ key, list, post: detail?.blog })
    }).catch((error: unknown) => {
      if (alive) setState({ key, error: error instanceof PublicApiError && error.status === 404 ? 'This story is not available.' : 'We couldn’t load these stories. Please try again.' })
    })
    return () => { alive = false }
  }, [article, key, page, slug])
  const current = state?.key === key ? state : null
  const post = current?.post
  const error = current?.error
  useEditorialMeta(manageMetadata && !error ? {
    title: post ? `${post.seoTitle || post.title} | BRANDWORKS` : 'Newsroom | BRANDWORKS',
    description: post?.seoDescription || post?.excerpt || 'Campaigns, collaborations, productions and developments from across the studio.',
    path: article ? `/news/${slug}` : '/news', image: post?.ogImage || post?.coverImage,
    type: article ? 'article' : 'website',
    jsonLd: (origin) => post ? buildArticleSchemaGraph(post, { origin, siteName: 'BRANDWORKS' }) : getEditorialIndexSchema('news'),
  } : null)
  if (error) return <main className="ed-page"><div className="ed-container"><p role="alert">{error}</p><Link to="/news">Back to Newsroom</Link></div></main>
  if (!current?.list) return <main className="ed-page"><div className="ed-container"><p role="status">Loading stories…</p></div></main>
  return post ? <PublicNewsArticle post={post} related={current.list.items.filter((item) => item.slug !== post.slug).slice(0, 3)} /> : <PublicNewsIndex result={current.list} />
}
