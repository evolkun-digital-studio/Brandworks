export type EditorialKind = 'blog' | 'news'

export interface EditorialPost {
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  image: string
  imageAlt: string
  author: string
  date: string
  readingTime?: string
  featured?: boolean
  content: string[]
}
