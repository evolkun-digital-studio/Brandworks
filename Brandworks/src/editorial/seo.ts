import { blogPosts, newsPosts } from './data'
import type { EditorialKind, EditorialPost } from './types'

export const editorialIndexMetadata = {
  blog: {
    title: 'Journal | BRANDWORKS',
    description: 'Perspectives from across strategy, creative production, search, social, reputation and digital growth.',
    path: '/blog',
  },
  news: {
    title: 'Newsroom | BRANDWORKS',
    description: 'Campaigns, collaborations, productions and developments from across the studio.',
    path: '/news',
  },
} as const

export function getEditorialPost(kind: EditorialKind, slug: string): EditorialPost | undefined {
  const posts = kind === 'blog' ? blogPosts : newsPosts
  return posts.find((post) => post.slug === slug)
}

export function getEditorialArticleSchema(kind: EditorialKind, post: EditorialPost) {
  const canonical = `https://brandworks.me/${kind}/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': kind === 'blog' ? 'BlogPosting' : 'NewsArticle',
    headline: post.title,
    description: post.excerpt,
    image: `${post.image}?auto=format&fit=crop&w=1600&q=80`,
    datePublished: post.date,
    dateModified: post.date,
    articleSection: post.category,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'BrandWorks', url: 'https://brandworks.me' },
    mainEntityOfPage: canonical,
  }
}

export function getEditorialIndexSchema(kind: EditorialKind) {
  const metadata = editorialIndexMetadata[kind]
  return {
    '@context': 'https://schema.org',
    '@type': kind === 'blog' ? 'Blog' : 'CollectionPage',
    name: kind === 'blog' ? 'BrandWorks Journal' : 'BrandWorks Newsroom',
    description: metadata.description,
    url: `https://brandworks.me${metadata.path}`,
    publisher: { '@type': 'Organization', name: 'BrandWorks', url: 'https://brandworks.me' },
  }
}

export function serializeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
