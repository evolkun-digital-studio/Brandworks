import 'server-only'

import { badRequest, conflict, forbidden, notFound } from '../http/errors'
import type { AdminDocument } from './types'
import type { AdminBlogDocument, AdminBlogStatus } from './blog-types'
import { toAdminBlogResponse } from './blog-types'
import { validateStructuredBlogFields } from './blog-validation'
import {
  countAdminScheduledBlogs, createAdminBlog, findAdminBlog, findAdminBlogBySlug,
  patchAdminBlog, queryAdminBlogs, restoreAdminBlog, softDeleteAdminBlog,
  updateAdminBlogSchedule, updateAdminBlogStatus,
} from '../repositories/admin-blog.repository'

const idPattern = /^[a-f\d]{24}$/i
const statuses: AdminBlogStatus[] = ['draft', 'published', 'unpublished']
function isDuplicate(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && (error as {code?:number}).code === 11000 }
function assertAdmin(admin: AdminDocument) { if (admin.role !== 'admin') throw forbidden('Only admins can perform this action.') }
function assertId(id: string) { if (!idPattern.test(id)) throw badRequest('Invalid blog id.') }
function requiredText(value: unknown, name: string, max: number) {
  if (typeof value !== 'string') throw badRequest(`${name} is required.`)
  if (!value.trim()) throw badRequest(`${name} is required.`)
  if (value.length > max) throw badRequest(`${name} must be at most ${max} characters.`)
  return value
}
function optionalText(value: unknown, name: string, nullable = false) {
  if (value === undefined) return undefined
  if (nullable && value === null) return null
  if (typeof value !== 'string') throw badRequest(`${name} must be text if provided.`)
  return value
}
function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-+|-+$/g,'')
}
function validateSlug(value: string) {
  const slug = slugify(value)
  if (!slug) throw badRequest('Slug could not be generated from the given title — please provide one.')
  if (slug.length > 200) throw badRequest('Slug must be at most 200 characters.')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw badRequest('Slug must contain only lowercase letters, numbers, and hyphens.')
  return slug
}
function mapBlog(doc: AdminBlogDocument) { return toAdminBlogResponse(doc) }

export async function getBlogForAdmin(actor: AdminDocument, id: string) {
  assertId(id)
  const doc = await findAdminBlog(id, true)
  if (!doc) throw notFound('Blog post not found.')
  if (doc.deletedAt && actor.role !== 'admin') throw forbidden('Only admins can perform this action.')
  return mapBlog(doc)
}

export async function listBlogsForAdmin(actor: AdminDocument, params: URLSearchParams) {
  const rawStatus = params.get('status') ?? undefined
  const scheduled = params.get('scheduled') === 'true'
  const includeDeleted = params.get('includeDeleted') === 'true'
  if (includeDeleted) assertAdmin(actor)
  if (scheduled && rawStatus) throw badRequest('scheduled and status cannot both be specified.')
  if (rawStatus && !statuses.includes(rawStatus as AdminBlogStatus)) throw badRequest(`Status must be one of: ${statuses.join(', ')}.`)
  const pageN = Number(params.get('page'))
  const limitN = Number(params.get('limit'))
  const page = Number.isFinite(pageN) && pageN > 0 ? Math.floor(pageN) : 1
  const limit = Number.isFinite(limitN) && limitN > 0 ? Math.min(Math.floor(limitN),100) : 10
  const result = await queryAdminBlogs({ status: rawStatus as AdminBlogStatus|undefined, scheduled, includeDeleted, search: params.get('search')?.trim() || undefined, page, limit })
  return { items: result.items.map(mapBlog), page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
}

export async function scheduledBlogCount() { return countAdminScheduledBlogs() }

export async function createBlogForAdmin(actor: AdminDocument, input: Record<string, unknown>) {
  const title = requiredText(input.title,'Title',200)
  const excerpt = requiredText(input.excerpt,'Excerpt',500)
  const content = requiredText(input.content,'Content',100000)
  const coverImage = requiredText(input.coverImage,'Cover image',Number.MAX_SAFE_INTEGER)
  try { if (!['http:','https:'].includes(new URL(coverImage).protocol)) throw new Error() } catch { throw badRequest('Cover image must be a valid URL.') }
  const coverImageAlt = requiredText(input.coverImageAlt,'Cover image alt text',300)
  const seoTitle=optionalText(input.seoTitle,'seoTitle',true)??null
  const seoDescription=optionalText(input.seoDescription,'seoDescription',true)??null
  if(seoTitle&&seoTitle.length>200)throw badRequest('SEO title must be at most 200 characters.')
  if(seoDescription&&seoDescription.length>300)throw badRequest('SEO description must be at most 300 characters.')
  const inputSlug=optionalText(input.slug,'slug')
  const slug = validateSlug(inputSlug && inputSlug.trim() ? inputSlug : title)
  if (await findAdminBlogBySlug(slug)) throw conflict('That slug is already in use.')
  if (input.publishedAt !== undefined && input.publishedAt !== null && typeof input.publishedAt !== 'string') throw badRequest('publishedAt must be a date string if provided.')
  let publishedAt: Date|null = null
  if (typeof input.publishedAt === 'string' && input.publishedAt.trim()) {
    publishedAt = new Date(input.publishedAt)
    if (Number.isNaN(publishedAt.getTime())) throw badRequest('Publish date is not a valid date.')
  }
  const doc: Record<string, unknown> = {
    title, slug, excerpt, content, coverImage, coverImageAlt, authorName: actor.username, authorId: actor._id,
    status:'draft', publishedAt, scheduledAt:null, deletedAt:null, seoTitle,
    seoDescription, coverImageTitle:null, coverImageCaption:null,
    coverImageDescription:null, category:null, tags:[], aiSummary:null, keyTakeaways:[], aiContext:null,
    entitySeo:null, faq:[], expertQuote:null, callouts:[], focusKeyword:null, secondaryKeywords:[],
    canonicalUrl:null, robotsIndex:true, ogTitle:null, ogDescription:null, ogImage:null,
    twitterCard:null, breadcrumbEnabled:true, customMetaTags:[],
  }
  Object.assign(doc,validateStructuredBlogFields(input))
  try { return mapBlog(await createAdminBlog(doc as Omit<AdminBlogDocument,'_id'|'createdAt'|'updatedAt'>)) }
  catch (error) { if (isDuplicate(error)) throw conflict('That slug is already in use.'); throw error }
}

export async function updateBlogForAdmin(id: string, input: Record<string, unknown>) {
  assertId(id)
  const old = await findAdminBlog(id)
  if (!old) throw notFound('Blog post not found.')
  const patch: Record<string, unknown> = {}
  for (const [key,max] of [['title',200],['excerpt',500],['content',100000],['coverImageAlt',300]] as const) {
    const value = optionalText(input[key],key)
    if (value !== undefined) patch[key] = requiredText(value,key,max)
  }
  const coverImage=optionalText(input.coverImage,'coverImage')
  if(coverImage!==undefined){if(!coverImage.trim())throw badRequest('Cover image is required.');try{if(!['http:','https:'].includes(new URL(coverImage).protocol))throw new Error()}catch{throw badRequest('Cover image must be a valid URL.')}patch.coverImage=coverImage}
  for (const [key,max,label] of [['seoTitle',200,'SEO title'],['seoDescription',300,'SEO description']] as const) {
    const value=optionalText(input[key],key,true)
    if(value!==undefined){if(typeof value==='string'&&value.length>max)throw badRequest(`${label} must be at most ${max} characters.`);patch[key]=value}
  }
  if (input.slug !== undefined) {
    if (typeof input.slug !== 'string') throw badRequest('slug must be text if provided.')
    const slug = validateSlug(input.slug)
    const existing = await findAdminBlogBySlug(slug)
    if (existing && !existing._id.equals(old._id)) throw conflict('That slug is already in use.')
    if (slug !== old.slug) patch.slug = slug
  }
  Object.assign(patch,validateStructuredBlogFields(input))
  try {
    const updated = await patchAdminBlog(id,patch)
    if (!updated) throw notFound('Blog post not found.')
    return mapBlog(updated)
  } catch (error) { if (isDuplicate(error)) throw conflict('That slug is already in use.'); throw error }
}

export async function setBlogStatus(id: string, status: unknown) {
  assertId(id)
  if (typeof status !== 'string') throw badRequest('status is required.')
  if (!statuses.includes(status as AdminBlogStatus)) throw badRequest(`Status must be one of: ${statuses.join(', ')}.`)
  const old = await findAdminBlog(id)
  if (!old) throw notFound('Blog post not found.')
  const publishedAt = status === 'published' && old.publishedAt === null ? new Date() : old.publishedAt
  const updated = await updateAdminBlogStatus(id,status as AdminBlogStatus,publishedAt)
  if (!updated) throw notFound('Blog post not found.')
  return mapBlog(updated)
}

export async function scheduleBlog(id: string, raw: unknown) {
  assertId(id)
  const old = await findAdminBlog(id)
  if (!old) throw notFound('Blog post not found.')
  if (old.status === 'published') throw badRequest('This post is already published. Unpublish it first if you want to schedule a future republish.')
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(raw.trim())) throw badRequest('Scheduled date must be an explicit ISO-8601 timestamp (e.g. 2026-10-01T10:00:00Z).')
  const when = new Date(raw)
  if (Number.isNaN(when.getTime())) throw badRequest('Scheduled date is not a valid date.')
  if (when.getTime() <= Date.now()) throw badRequest('Scheduled date must be in the future.')
  const updated = await updateAdminBlogSchedule(id,when,true)
  if (!updated) throw notFound('Blog post not found.')
  return mapBlog(updated)
}

export async function unscheduleBlog(id: string) {
  assertId(id); if (!await findAdminBlog(id)) throw notFound('Blog post not found.')
  const updated = await updateAdminBlogSchedule(id,null)
  if (!updated) throw notFound('Blog post not found.')
  return mapBlog(updated)
}

export async function deleteBlog(actor: AdminDocument, id: string) {
  assertAdmin(actor); assertId(id); if (!await findAdminBlog(id)) throw notFound('Blog post not found.')
  await softDeleteAdminBlog(id)
}

export async function restoreBlog(actor: AdminDocument, id: string) {
  assertAdmin(actor); assertId(id)
  const old = await findAdminBlog(id,true)
  if (!old) throw notFound('Blog post not found.')
  const clearSchedule = Boolean(old.scheduledAt && old.scheduledAt.getTime() <= Date.now())
  const restored = await restoreAdminBlog(id,clearSchedule)
  if (!restored) throw notFound('Blog post not found.')
  return mapBlog(restored)
}

export async function hasBlogId(id: string) { return idPattern.test(id) && !!(await findAdminBlog(id,true)) }
