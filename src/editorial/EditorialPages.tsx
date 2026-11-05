import BlogPage from '../blog/pages/BlogPage'
import BlogDetailPage from '../blog/pages/BlogDetailPage'
import CmsNewsPage from './CmsNewsPage'
import type { EditorialKind } from './types'
import './Editorial.css'

export function EditorialIndexPage({ kind, manageMetadata = true }: { kind: EditorialKind; manageMetadata?: boolean }) {
  return kind === 'blog' ? <BlogPage /> : <CmsNewsPage manageMetadata={manageMetadata} />
}

export function EditorialArticlePage({ kind, manageMetadata = true }: { kind: EditorialKind; manageMetadata?: boolean }) {
  return kind === 'blog' ? <BlogDetailPage /> : <CmsNewsPage article manageMetadata={manageMetadata} />
}
