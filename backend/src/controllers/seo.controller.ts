import type { Request, Response } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { buildSitemapXml } from '../lib/xml.js'
import { buildRobotsTxt } from '../lib/robots.js'
import { buildSitemapEntries } from '../services/sitemap.service.js'
import { env } from '../config/env.js'

/**
 * sitemap.xml is backed by a live MongoDB query (published/eligible
 * articles can change), so it gets a short, data-aware cache rather
 * than being cached indefinitely — 5 minutes, deliberately different
 * from the public blog API's own 60s (see controllers/blog.controller.ts):
 * a sitemap is fetched by crawlers on their own schedule, not on every
 * visitor pageview, so it can afford — and benefits from — a longer
 * window than a page a visitor might reload immediately after editing.
 */
const SITEMAP_CACHE_CONTROL = 'public, max-age=300'

/**
 * robots.txt has no database dependency at all — its content only
 * ever changes on deploy — so it can be cached considerably longer
 * than the sitemap without ever risking staleness that matters.
 */
const ROBOTS_CACHE_CONTROL = 'public, max-age=3600'

export const getSitemapXml = asyncHandler(async (_req: Request, res: Response) => {
  const entries = await buildSitemapEntries()
  const xml = buildSitemapXml(entries)

  res.set('Content-Type', 'application/xml; charset=utf-8')
  res.set('Cache-Control', SITEMAP_CACHE_CONTROL)
  res.status(200).send(xml)
})

export const getRobotsTxt = asyncHandler(async (_req: Request, res: Response) => {
  const body = buildRobotsTxt(env.publicOrigin)

  res.set('Content-Type', 'text/plain; charset=utf-8')
  res.set('Cache-Control', ROBOTS_CACHE_CONTROL)
  res.status(200).send(body)
})
