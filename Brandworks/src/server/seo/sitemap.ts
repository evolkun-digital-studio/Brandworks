import type { SitemapBlogProjection } from '../repositories/blog.repository'
import { listSitemapEligibleBlogs } from '../repositories/blog.repository'

export interface SitemapUrlEntry { loc: string; lastmod?: string }
const STATIC_PUBLIC_PATHS = ['/','/blog']

export function resolveSitemapLoc(post: Pick<SitemapBlogProjection,'slug'|'canonicalUrl'>, publicOrigin: string): string|null {
  const generated=`${publicOrigin}/blog/${post.slug}`
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

export async function buildSitemapEntries(publicOrigin:string){
  return composeSitemapEntries(await listSitemapEligibleBlogs(),publicOrigin)
}
