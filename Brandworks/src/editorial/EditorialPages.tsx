import BlogIndex from './BlogIndex'
import NewsIndex from './NewsIndex'
import ArticlePage from './ArticlePage'
import type { EditorialKind } from './types'
import './Editorial.css'

export function EditorialIndexPage({ kind }: { kind: EditorialKind }) {
  return kind === 'blog' ? <BlogIndex /> : <NewsIndex />
}

export function EditorialArticlePage({ kind }: { kind: EditorialKind }) {
  return <ArticlePage kind={kind} />
}
