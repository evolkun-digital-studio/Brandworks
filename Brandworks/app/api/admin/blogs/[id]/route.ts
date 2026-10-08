import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { withAdmin, readJsonObject, json } from '../../../../../src/server/admin/http'
import { deleteBlog, getBlogForAdmin, updateBlogForAdmin } from '../../../../../src/server/admin/blog'

type Context = {params:Promise<{id:string}>}
export async function GET(request: NextRequest, context: Context) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;return json({blog:await getBlogForAdmin(actor,id)})})
}
export async function PUT(request: NextRequest, context: Context) {
  return withAdmin(request,async ()=>{const {id}=await context.params;return json({blog:await updateBlogForAdmin(id,await readJsonObject(request))})})
}
export async function DELETE(request: NextRequest, context: Context) {
  return withAdmin(request,async (actor)=>{const {id}=await context.params;await deleteBlog(actor,id);return new NextResponse(null,{status:204})})
}
