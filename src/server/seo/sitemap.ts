import type { SitemapBlogProjection } from '../repositories/blog.repository'
import { listSitemapEligibleBlogs } from '../repositories/blog.repository'
import { contentPath } from '../../blog/contentType'

export interface SitemapUrlEntry { loc: string; lastmod?: string }
/**
 * Every indexable page under app/(public). Kept in step with the routes by
 * sitemap.test.ts, which fails when a page is added without being listed here
 * (or excluded on purpose in SITEMAP_EXCLUDED_PATHS).
 */
export const STATIC_PUBLIC_PATHS = [
  '/',
  '/about',
  '/work',
  '/services',
  '/services/brand-positioning-strategy',
  '/services/concept-creation',
  '/services/content-creation',
  '/services/graphic-design',
  '/services/photography',
  '/services/videography',
  '/services/social-media',
  '/services/pr-founder-reputation',
  '/services/performance-marketing',
  '/services/seo',
  '/services/technology',
  '/blog',
  '/news',
  '/contact',
  '/start-project',
  '/privacy-policy',
  '/terms-of-use',
  '/cookie-policy',
] as const

/** Public routes deliberately left out of the sitemap. */
export const SITEMAP_EXCLUDED_PATHS: readonly string[] = [
  '/services/social-club', // switched off: the route returns 404
]

export function resolveSitemapLoc(post: Pick<SitemapBlogProjection,'slug'|'canonicalUrl'|'contentType'>, publicOrigin: string): string|null {
  const generated=`${publicOrigin}${contentPath(post.contentType)}/${post.slug}`
  if(!post.canonicalUrl)return generated
  let canonical:URL
  try{canonical=new URL(post.canonicalUrl)}catch{return generated}
  if(canonical.origin!==publicOrigin)return null
  return canonical.toString()
}

export function composeSitemapEntries(posts:SitemapBlogProjection[],publicOrigin:string):SitemapUrlEntry[]{
  const seen=new Set<string>();const entries:SitemapUrlEntry[]=[]
  for(const path of STATIC_PUBLIC_PATHS){const loc=`${publicOrigin}${path}`;if(seen.has(loc))continue;seen.add(loc);entries.push({loc})}
  for(const post of posts){const loc=resolveSitemapLoc(post,publicOrigin);if(!loc||seen.has(loc))continue;seen.add(loc);entries.push({loc,lastmod:post.updatedAt.toISOString()})}
  return entries
}

export function escapeXmlText(value:string){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}

export function buildSitemapXml(entries:SitemapUrlEntry[]):string{
  const blocks=entries.map(entry=>{
    const lines=[`    <loc>${escapeXmlText(entry.loc)}</loc>`]
    if(entry.lastmod)lines.push(`    <lastmod>${escapeXmlText(entry.lastmod)}</lastmod>`)
    return `  <url>\n${lines.join('\n')}\n  </url>`
  })
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+(blocks.length?`${blocks.join('\n')}\n`:'')+'</urlset>\n'
}

/**
 * A database outage must not take the static pages out of the sitemap with
 * it: log the failure and serve the static entries alone until it recovers.
 */
/** Crawlers give up quickly; a slow database must not hold the sitemap (or a worker) open. */
export const SITEMAP_DB_TIMEOUT_MS=5000

export async function buildSitemapEntries(publicOrigin:string,timeoutMs=SITEMAP_DB_TIMEOUT_MS){
  let cmsPosts:SitemapBlogProjection[]=[]
  let timer:ReturnType<typeof setTimeout>|undefined
  try{
    cmsPosts=await Promise.race([
      listSitemapEligibleBlogs(),
      new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error(`timed out after ${timeoutMs}ms`)),timeoutMs)}),
    ])
  }catch(error){
    // Message only: driver errors can carry host names and connection details.
    console.error('[sitemap] blog posts unavailable, serving static pages only:',error instanceof Error?error.message:'unknown error')
  }finally{clearTimeout(timer)}
  return composeSitemapEntries(cmsPosts,publicOrigin)
}
