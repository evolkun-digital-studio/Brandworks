import 'server-only'

import { badRequest, conflict, forbidden, notFound } from '../http/errors'
import type { AdminDocument } from './types'
import type { AdminBlogDocument, AdminBlogStatus, AdminReviewStatus } from './blog-types'
import { toAdminBlogResponse } from './blog-types'
import { validateStructuredBlogFields } from './blog-validation'
import {
  countAdminScheduledBlogs, createAdminBlog, findAdminBlog, findAdminBlogBySlug,
  patchAdminBlog, queryAdminBlogs, restoreAdminBlog, softDeleteAdminBlog,
  updateAdminBlogSchedule, updateAdminBlogStatus,
  updateAdminBlogReview,
} from '../repositories/admin-blog.repository'
import { activityFor } from './activity'
import {
  createAdminBlogRevision,
  findAdminBlogRevision,
  listAdminBlogRevisions,
  compareAdminBlogRevisions,
} from '../repositories/admin-blog-revisions.repository'
import { upsertBlogSlugRedirect } from '../repositories/blog-redirects.repository'

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
  const rawSort = params.get('sort') ?? undefined
  const validSorts = ['updated_desc', 'published_desc', 'title_asc', 'scheduled_asc'] as const
  if (rawSort && !validSorts.includes(rawSort as typeof validSorts[number])) throw badRequest(`Sort must be one of: ${validSorts.join(', ')}.`)
  const result = await queryAdminBlogs({ status: rawStatus as AdminBlogStatus|undefined, scheduled, includeDeleted, search: params.get('search')?.trim() || undefined, sort: rawSort as typeof validSorts[number] | undefined, page, limit })
  return { items: result.items.map(mapBlog), page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages }
}

export async function scheduledBlogCount() { return countAdminScheduledBlogs() }

export async function createBlogForAdmin(actor: AdminDocument, input: Record<string, unknown>) {
  const title = requiredText(input.title,'Title',200)
  const requestedAuthorName = optionalText(input.authorName,'Editor name')
  const authorName = requestedAuthorName === undefined ? actor.username : requiredText(requestedAuthorName,'Editor name',100).trim()
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
    title, slug, excerpt, content, coverImage, coverImageAlt, authorName, authorId: actor._id,
    status:'draft', publishedAt, scheduledAt:null, deletedAt:null, seoTitle,
    reviewStatus: 'draft', reviewNote: null, reviewedBy: null, reviewedAt: null,
    seoDescription, coverImageTitle:null, coverImageCaption:null,
    coverImageDescription:null, category:null, tags:[], aiSummary:null, keyTakeaways:[], aiContext:null,
    entitySeo:null, faq:[], expertQuote:null, callouts:[], focusKeyword:null, secondaryKeywords:[],
    canonicalUrl:null, robotsIndex:true, ogTitle:null, ogDescription:null, ogImage:null,
    twitterCard:null, breadcrumbEnabled:true, customMetaTags:[],
  }
  Object.assign(doc,validateStructuredBlogFields(input))
  try {
    const created = await createAdminBlog(doc as Omit<AdminBlogDocument,'_id'|'createdAt'|'updatedAt'>)
    await activityFor(actor, { action: 'created', entityType: 'blog', entityId: created._id.toHexString(), entityTitle: created.title, metadata: {} })
    return mapBlog(created)
  }
  catch (error) { if (isDuplicate(error)) throw conflict('That slug is already in use.'); throw error }
}

export async function updateBlogForAdmin(actor: AdminDocument, id: string, input: Record<string, unknown>) {
  assertId(id)
  const old = await findAdminBlog(id)
  if (!old) throw notFound('Blog post not found.')
  const patch: Record<string, unknown> = {}
  for (const [key,max] of [['title',200],['excerpt',500],['content',100000],['coverImageAlt',300]] as const) {
    const value = optionalText(input[key],key)
    if (value !== undefined) patch[key] = requiredText(value,key,max)
  }
  const authorName = optionalText(input.authorName,'Editor name')
  if (authorName !== undefined) patch.authorName = requiredText(authorName,'Editor name',100).trim()
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
  if (old.reviewStatus === 'approved' && Object.keys(patch).length > 0) patch.reviewStatus = 'draft'
  try {
    const updated = await patchAdminBlog(id,patch)
    if (!updated) throw notFound('Blog post not found.')
    await createAdminBlogRevision(old, actor._id)
    if (old.slug !== updated.slug) {
      await upsertBlogSlugRedirect({
        fromSlug: old.slug,
        toSlug: updated.slug,
        blogId: updated._id,
        createdAt: new Date(),
      })
    }
    await activityFor(actor, { action: 'updated', entityType: 'blog', entityId: updated._id.toHexString(), entityTitle: updated.title, metadata: {} })
    return mapBlog(updated)
  } catch (error) { if (isDuplicate(error)) throw conflict('That slug is already in use.'); throw error }
}

export async function getBlogRevisions(actor: AdminDocument, id: string) {
  assertId(id)
  const blog = await findAdminBlog(id, true)
  if (!blog) throw notFound('Blog post not found.')
  if (blog.deletedAt && actor.role !== 'admin') throw forbidden('Only admins can perform this action.')
  return (await listAdminBlogRevisions(blog._id)).map((revision) => ({
    id: revision._id.toHexString(),
    blogId: revision.blogId.toHexString(),
    title: revision.snapshot.title,
    status: revision.snapshot.status,
    createdAt: revision.createdAt.toISOString(),
    authorName: revision.authorName,
  }))
}

export async function compareBlogRevisions(actor: AdminDocument, id: string, leftId: string, rightId: string) {
  assertId(id)
  assertAdmin(actor)
  const comparison = await compareAdminBlogRevisions(id, leftId, rightId)
  if (!comparison) throw notFound('One or both revisions were not found.')
  return comparison
}

export async function restoreBlogRevision(actor: AdminDocument, id: string, revisionId: string) {
  assertAdmin(actor)
  assertId(id)
  const blog = await findAdminBlog(id)
  if (!blog) throw notFound('Blog post not found.')
  const revision = await findAdminBlogRevision(id, revisionId)
  if (!revision) throw notFound('Revision not found.')
  const snapshot = revision.snapshot
  await createAdminBlogRevision(blog, actor._id)
  const restored = await patchAdminBlog(id, {
    title: snapshot.title,
    slug: snapshot.slug,
    excerpt: snapshot.excerpt,
    content: snapshot.content,
    coverImage: snapshot.coverImage,
    coverImageAlt: snapshot.coverImageAlt,
    seoTitle: snapshot.seoTitle,
    seoDescription: snapshot.seoDescription,
    coverImageTitle: snapshot.coverImageTitle ?? null,
    coverImageCaption: snapshot.coverImageCaption ?? null,
    coverImageDescription: snapshot.coverImageDescription ?? null,
    category: snapshot.category ?? null,
    tags: snapshot.tags ?? [],
    aiSummary: snapshot.aiSummary ?? null,
    keyTakeaways: snapshot.keyTakeaways ?? [],
    aiContext: snapshot.aiContext ?? null,
    entitySeo: snapshot.entitySeo ?? null,
    faq: snapshot.faq ?? [],
    expertQuote: snapshot.expertQuote ?? null,
    callouts: snapshot.callouts ?? [],
    focusKeyword: snapshot.focusKeyword ?? null,
    secondaryKeywords: snapshot.secondaryKeywords ?? [],
    canonicalUrl: snapshot.canonicalUrl ?? null,
    robotsIndex: snapshot.robotsIndex ?? true,
    ogTitle: snapshot.ogTitle ?? null,
    ogDescription: snapshot.ogDescription ?? null,
    ogImage: snapshot.ogImage ?? null,
    twitterCard: snapshot.twitterCard ?? null,
    breadcrumbEnabled: snapshot.breadcrumbEnabled ?? true,
    customMetaTags: snapshot.customMetaTags ?? [],
  })
  if (!restored) throw notFound('Blog post not found.')
  await activityFor(actor, { action: 'restored', entityType: 'blog', entityId: restored._id.toHexString(), entityTitle: restored.title, metadata: { source: 'revision' } })
  return mapBlog(restored)
}

export async function setBlogStatus(actor: AdminDocument, id: string, status: unknown) {
  assertAdmin(actor)
  assertId(id)
  if (typeof status !== 'string') throw badRequest('status is required.')
  if (!statuses.includes(status as AdminBlogStatus)) throw badRequest(`Status must be one of: ${statuses.join(', ')}.`)
  const old = await findAdminBlog(id)
  if (!old) throw notFound('Blog post not found.')
  const publishedAt = status === 'published' && old.publishedAt === null ? new Date() : old.publishedAt
  const updated = await updateAdminBlogStatus(id,status as AdminBlogStatus,publishedAt)
  if (!updated) throw notFound('Blog post not found.')
  await activityFor(actor, { action: status === 'published' ? 'published' : 'unpublished', entityType: 'blog', entityId: updated._id.toHexString(), entityTitle: updated.title, metadata: {} })
  return mapBlog(updated)
}

export async function scheduleBlog(actor: AdminDocument, id: string, raw: unknown) {
  assertAdmin(actor)
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
  await activityFor(actor, { action: 'scheduled', entityType: 'blog', entityId: updated._id.toHexString(), entityTitle: updated.title, metadata: { scheduledAt: when.toISOString() } })
  return mapBlog(updated)
}

export async function unscheduleBlog(actor: AdminDocument, id: string) {
  assertAdmin(actor)
  assertId(id); if (!await findAdminBlog(id)) throw notFound('Blog post not found.')
  const updated = await updateAdminBlogSchedule(id,null)
  if (!updated) throw notFound('Blog post not found.')
  await activityFor(actor, { action: 'unscheduled', entityType: 'blog', entityId: updated._id.toHexString(), entityTitle: updated.title, metadata: {} })
  return mapBlog(updated)
}

export async function deleteBlog(actor: AdminDocument, id: string) {
  assertAdmin(actor); assertId(id); if (!await findAdminBlog(id)) throw notFound('Blog post not found.')
  await softDeleteAdminBlog(id)
  await activityFor(actor, { action: 'archived', entityType: 'blog', entityId: id, entityTitle: null, metadata: {} })
}

export async function restoreBlog(actor: AdminDocument, id: string) {
  assertAdmin(actor); assertId(id)
  const old = await findAdminBlog(id,true)
  if (!old) throw notFound('Blog post not found.')
  const clearSchedule = Boolean(old.scheduledAt && old.scheduledAt.getTime() <= Date.now())
  const restored = await restoreAdminBlog(id,clearSchedule)
  if (!restored) throw notFound('Blog post not found.')
  await activityFor(actor, { action: 'restored', entityType: 'blog', entityId: restored._id.toHexString(), entityTitle: restored.title, metadata: { source: 'archive' } })
  return mapBlog(restored)
}

export async function updateBlogReview(actor: AdminDocument, id: string, rawStatus: unknown, rawNote: unknown) {
  assertId(id)
  const status = rawStatus as AdminReviewStatus
  const valid: AdminReviewStatus[] = ['draft', 'in_review', 'changes_requested', 'approved']
  if (!valid.includes(status)) throw badRequest(`Review status must be one of: ${valid.join(', ')}.`)
  const blog = await findAdminBlog(id)
  if (!blog) throw notFound('Blog post not found.')
  if (status === 'approved' || status === 'changes_requested') assertAdmin(actor)
  if (status === 'changes_requested' && (typeof rawNote !== 'string' || !rawNote.trim())) throw badRequest('A note is required when requesting changes.')
  const note = rawNote === null || rawNote === undefined ? null : typeof rawNote === 'string' ? rawNote.trim().slice(0, 1000) : null
  const updated = await updateAdminBlogReview(id, status, note, status === 'in_review' || status === 'draft' ? null : actor._id)
  if (!updated) throw notFound('Blog post not found.')
  const action = status === 'in_review' ? 'submitted_for_review' : status === 'approved' ? 'approved' : status === 'changes_requested' ? 'changes_requested' : 'updated'
  await activityFor(actor, { action, entityType: 'blog', entityId: updated._id.toHexString(), entityTitle: updated.title, metadata: note ? { note } : {} })
  return mapBlog(updated)
}

export async function hasBlogId(id: string) { return idPattern.test(id) && !!(await findAdminBlog(id,true)) }
