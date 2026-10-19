import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../../src/server/admin/http'
import { deleteBlog, getBlogForAdmin, updateBlogForAdmin } from '../../../../../src/server/admin/blog'
import { revalidatePublicBlogContent } from '../../../../../src/server/seo/revalidate-public-blog'

type Context = {params:Promise<{id:string}>}
export async function GET(request: NextRequest, context: Context) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;return json({blog:await getBlogForAdmin(actor,id)})})
}
export async function PUT(request: NextRequest, context: Context) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;const blog=await updateBlogForAdmin(actor,id,await readJsonObject(request));revalidatePublicBlogContent();return json({blog})})
}
export async function DELETE(request: NextRequest, context: Context) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;await deleteBlog(actor,id);revalidatePublicBlogContent();return new NextResponse(null,{status:204})})
}
