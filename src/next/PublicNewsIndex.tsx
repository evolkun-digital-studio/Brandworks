'use client'

import { Link } from '../routing'
import NewsIndex from '../editorial/NewsIndex'
import { editorialPostFromCms } from '../editorial/fromCms'
import type { PublicBlogListResult } from '../blog/api/types'
import '../editorial/Editorial.css'

export default function PublicNewsIndex({ result }: { result: PublicBlogListResult }) {
  return <NewsIndex manageMetadata={false} posts={result.items.map(editorialPostFromCms)} pagination={
    result.totalPages > 1 ? (
      <nav aria-label="Newsroom pagination" className="mt-14 flex items-center justify-between gap-4">
        {result.page > 1 ? <Link className="ed-textlink" to={result.page === 2 ? '/news' : `/news?page=${result.page - 1}`}>Previous</Link> : <span />}
        <span className="ed-meta">Page {result.page} of {result.totalPages}</span>
        {result.page < result.totalPages ? <Link className="ed-textlink" to={`/news?page=${result.page + 1}`}>Next</Link> : <span />}
      </nav>
    ) : null
  } />
}
