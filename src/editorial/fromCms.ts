import type { PublicBlogListItem } from '../blog/api/types'
import type { EditorialPost } from './types'

/** Keeps the established editorial presentation independent of CMS storage. */
export function editorialPostFromCms(post: PublicBlogListItem): EditorialPost {
  return {
    slug: post.slug, title: post.title, excerpt: post.excerpt,
    category: post.category ?? '', image: post.coverImage, imageAlt: post.coverImageAlt,
    author: post.authorName, date: post.publishedAt.slice(0, 10), body: [],
  }
}
