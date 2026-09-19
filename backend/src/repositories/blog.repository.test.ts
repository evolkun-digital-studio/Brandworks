import { describe, expect, it } from 'vitest'
import { buildDueScheduledFilter, buildDueScheduledPublishPipeline, buildFilter } from './blog.repository.js'

/**
 * Pure unit tests for buildFilter() — no MongoDB connection involved.
 * This is the actual query-construction logic the sitemap (Phase 9)
 * and every other blog query rely on; MongoDB's own documented query
 * semantics (equality, $lte, $ne) are trusted to execute whatever
 * shape this produces correctly, so testing the shape itself is what
 * matters here.
 */
describe('buildFilter', () => {
  it('filters by status', () => {
    expect(buildFilter({ status: 'published' })).toMatchObject({ status: 'published', deletedAt: null })
  })

  it('filters by an array of statuses via $in', () => {
    expect(buildFilter({ status: ['draft', 'unpublished'] })).toMatchObject({
      status: { $in: ['draft', 'unpublished'] },
    })
  })

  it('excludes soft-deleted documents by default', () => {
    expect(buildFilter({})).toEqual({ deletedAt: null })
  })

  it('includes soft-deleted documents when includeDeleted is true', () => {
    const filter = buildFilter({ includeDeleted: true })
    expect(filter.deletedAt).toBeUndefined()
  })

  it('applies publishedAtBefore as a $lte bound — excludes future-scheduled posts', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    expect(buildFilter({ publishedAtBefore: now })).toMatchObject({
      publishedAt: { $lte: now },
    })
  })

  it('excludeNoIndex adds a robotsIndex $ne false clause — keeps absent/true, excludes explicit false', () => {
    expect(buildFilter({ excludeNoIndex: true })).toMatchObject({
      robotsIndex: { $ne: false },
    })
  })

  it('omits the robotsIndex clause entirely when excludeNoIndex is not set', () => {
    const filter = buildFilter({ status: 'published' })
    expect(filter.robotsIndex).toBeUndefined()
  })

  it('composes the exact sitemap-eligibility filter shape: published + not-yet-future + not-deleted + not-noindex', () => {
    const now = new Date('2026-09-15T00:00:00.000Z')
    const filter = buildFilter({
      status: 'published',
      publishedAtBefore: now,
      includeDeleted: false,
      excludeNoIndex: true,
    })
    expect(filter).toEqual({
      status: 'published',
      publishedAt: { $lte: now },
      deletedAt: null,
      robotsIndex: { $ne: false },
    })
  })

  it('escapes regex metacharacters in a search term rather than passing it through raw', () => {
    const filter = buildFilter({ search: 'a.b*c' })
    const regex = filter.title as { $regex: string; $options: string }
    expect(regex.$regex).toBe('a\\.b\\*c')
    expect(regex.$options).toBe('i')
  })

  // Phase 16 — the "Scheduled" list/count filter's query-construction
  // half. See services/blog/blog.service.ts's listBlogPostsForAdmin/
  // countScheduledBlogPosts for how this composes with status=draft.
  it('scheduledAfter restricts to a real, future-of-the-given-instant scheduledAt', () => {
    const now = new Date('2026-09-15T10:00:00.000Z')
    const filter = buildFilter({ scheduledAfter: now })
    expect(filter.scheduledAt).toEqual({ $type: 'date', $gt: now })
  })

  it('scheduledAfter uses $type: "date" so a null scheduledAt (an ordinary, unscheduled draft) can never match — BSON sorts null before every date', () => {
    const filter = buildFilter({ scheduledAfter: new Date() })
    const clause = filter.scheduledAt as Record<string, unknown>
    expect(clause.$type).toBe('date')
  })

  it('scheduledAfter uses $gt, not $gte — a schedule exactly at "now" is not "upcoming"', () => {
    const now = new Date('2026-09-15T10:00:00.000Z')
    const filter = buildFilter({ scheduledAfter: now })
    const clause = filter.scheduledAt as { $gt: Date }
    expect(clause.$gt).toEqual(now)
    expect(clause).not.toHaveProperty('$gte')
  })

  it('composes scheduledAfter with status, includeDeleted, and search — the exact shape the Scheduled view needs', () => {
    const now = new Date('2026-09-15T10:00:00.000Z')
    const filter = buildFilter({ status: 'draft', scheduledAfter: now, includeDeleted: false, search: 'SEO' })
    expect(filter).toEqual({
      status: 'draft',
      scheduledAt: { $type: 'date', $gt: now },
      deletedAt: null,
      title: { $regex: 'SEO', $options: 'i' },
    })
  })

  it('omits the scheduledAt clause entirely when scheduledAfter is not set', () => {
    const filter = buildFilter({ status: 'draft' })
    expect(filter.scheduledAt).toBeUndefined()
  })
})

/**
 * Pure unit tests for the scheduled-publishing atomic-transition
 * pieces (Phase 15, Part 8) — same rationale as buildFilter above: no
 * live MongoDB connection needed to verify the exact shape of the
 * filter and pipeline publishDueScheduledBlogs sends, and MongoDB's
 * own documented $type/$lte/pipeline-$set semantics are trusted to
 * execute whatever shape this produces correctly. Live behavior
 * against a real database is covered separately by this phase's live
 * verification pass (see the Phase 15 report).
 */
describe('buildDueScheduledFilter', () => {
  it('matches only drafts with a real Date scheduledAt at or before "now", not deleted', () => {
    const now = new Date('2026-09-15T10:00:00.000Z')
    expect(buildDueScheduledFilter(now)).toEqual({
      status: 'draft',
      scheduledAt: { $type: 'date', $lte: now },
      deletedAt: null,
    })
  })

  it('uses $type: "date" specifically to rule out scheduledAt: null — BSON sorts null before every date, so a plain $lte would incorrectly match it', () => {
    const filter = buildDueScheduledFilter(new Date())
    const scheduledAtClause = filter.scheduledAt as Record<string, unknown>
    expect(scheduledAtClause.$type).toBe('date')
  })

  it('is due at exactly scheduledAt === now — uses $lte, not $lt', () => {
    const filter = buildDueScheduledFilter(new Date('2026-09-15T10:00:00.000Z'))
    const scheduledAtClause = filter.scheduledAt as { $lte: Date }
    expect(scheduledAtClause.$lte.toISOString()).toBe('2026-09-15T10:00:00.000Z')
  })

  it('only ever matches draft status — never published, unpublished, or any array of statuses', () => {
    const filter = buildDueScheduledFilter(new Date())
    expect(filter.status).toBe('draft')
  })

  it('always excludes deleted documents — deletedAt: null is not conditional here, unlike buildFilter’s includeDeleted', () => {
    const filter = buildDueScheduledFilter(new Date())
    expect(filter.deletedAt).toBeNull()
  })
})

describe('buildDueScheduledPublishPipeline', () => {
  it('sets publishedAt FROM the document’s own scheduledAt field — never a literal Date, never "now"', () => {
    const now = new Date('2026-09-15T10:00:07.000Z')
    const pipeline = buildDueScheduledPublishPipeline(now)
    const setStage = pipeline[0].$set as Record<string, unknown>
    expect(setStage.publishedAt).toBe('$scheduledAt')
    // Confirms the invariant by construction: the only way this could
    // equal `now` is if it were the literal value `now` — it isn't.
    expect(setStage.publishedAt).not.toBe(now)
  })

  it('transitions status to published and clears scheduledAt in the same stage', () => {
    const pipeline = buildDueScheduledPublishPipeline(new Date())
    const setStage = pipeline[0].$set as Record<string, unknown>
    expect(setStage.status).toBe('published')
    expect(setStage.scheduledAt).toBeNull()
  })

  it('sets updatedAt to the caller-provided "now", not a second, independent clock', () => {
    const now = new Date('2026-09-15T10:00:07.000Z')
    const pipeline = buildDueScheduledPublishPipeline(now)
    const setStage = pipeline[0].$set as Record<string, unknown>
    expect(setStage.updatedAt).toBe(now)
  })

  it('is a single-stage pipeline — one atomic $set, not a multi-step sequence', () => {
    const pipeline = buildDueScheduledPublishPipeline(new Date())
    expect(pipeline).toHaveLength(1)
  })
})
