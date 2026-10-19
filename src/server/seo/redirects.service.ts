import 'server-only'

import { badRequest, conflict, notFound } from '../http/errors'
import type { AdminDocument } from '../admin/types'
import { findBlogSlugRedirect, deleteBlogSlugRedirect, listBlogSlugRedirects, upsertBlogSlugRedirect } from '../repositories/blog-redirects.repository'
import { findBlogBySlug } from '../repositories/blog.repository'

function slug(value: unknown, field: string) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim())) throw badRequest(`${field} must be a lowercase slug.`)
  return value.trim()
}

export async function listRedirects() {
  const redirects = await listBlogSlugRedirects()
  return redirects.map((redirect) => ({ fromSlug: redirect.fromSlug, toSlug: redirect.toSlug, createdAt: redirect.createdAt.toISOString() }))
}

export async function createRedirect(_actor: AdminDocument, input: Record<string, unknown>) {
  const fromSlug = slug(input.fromSlug, 'fromSlug')
  const toSlug = slug(input.toSlug, 'toSlug')
  if (fromSlug === toSlug) throw badRequest('A redirect must point to a different slug.')
  const target = await findBlogBySlug(toSlug)
  if (!target || target.status !== 'published' || target.deletedAt !== null) throw notFound('The destination must be an existing published article slug.')
  const existing = await findBlogSlugRedirect(fromSlug)
  if (existing && existing.toSlug !== toSlug) throw conflict('That source slug already redirects somewhere else.')
  await upsertBlogSlugRedirect({ fromSlug, toSlug, blogId: target._id, createdAt: existing?.createdAt ?? new Date() })
  return { fromSlug, toSlug }
}

export async function removeRedirect(fromSlug: string) {
  const source = slug(fromSlug, 'fromSlug')
  if (!await deleteBlogSlugRedirect(source)) throw notFound('Redirect not found.')
}
