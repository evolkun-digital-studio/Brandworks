import BlogIndex from './BlogIndex'
import NewsIndex from './NewsIndex'
import ArticlePage from './ArticlePage'
import type { EditorialKind } from './types'
import './Editorial.css'

export function EditorialIndexPage({ kind, manageMetadata = true }: { kind: EditorialKind; manageMetadata?: boolean }) {
  return kind === 'blog' ? <BlogIndex manageMetadata={manageMetadata} /> : <NewsIndex manageMetadata={manageMetadata} />
}

export function EditorialArticlePage({ kind, manageMetadata = true }: { kind: EditorialKind; manageMetadata?: boolean }) {
  return <ArticlePage kind={kind} manageMetadata={manageMetadata} />
}
