import type { NextRequest } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../src/server/admin/http'
import { createBlogForAdmin, listBlogsForAdmin } from '../../../../src/server/admin/blog'
import { badRequest } from '../../../../src/server/http/errors'
import { revalidatePublicBlogContent } from '../../../../src/server/seo/revalidate-public-blog'

export async function GET(request: NextRequest) {
  return withAdmin(request,async (actor)=>json(await listBlogsForAdmin(actor,new URL(request.url).searchParams)))
}
export async function POST(request: NextRequest) {
  return withAdmin(request,async (actor)=>{
    const body=await readJsonObject(request)
    if(typeof body.title!=='string'||typeof body.excerpt!=='string'||typeof body.content!=='string'||typeof body.coverImage!=='string'||typeof body.coverImageAlt!=='string') throw badRequest('title, excerpt, content, coverImage, and coverImageAlt are required.')
    for(const key of ['slug'] as const) if(body[key]!==undefined&&typeof body[key]!=='string') throw badRequest(`${key} must be text if provided.`)
    for(const key of ['seoTitle','seoDescription'] as const) if(body[key]!==undefined&&body[key]!==null&&typeof body[key]!=='string') throw badRequest(`${key} must be text if provided.`)
    if(body.publishedAt!==undefined&&body.publishedAt!==null&&typeof body.publishedAt!=='string') throw badRequest('publishedAt must be a date string if provided.')
    const blog = await createBlogForAdmin(actor,body)
    revalidatePublicBlogContent()
    return json({blog},201)
  })
}
