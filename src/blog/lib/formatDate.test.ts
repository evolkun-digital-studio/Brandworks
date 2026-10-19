import { describe, expect, it } from 'vitest'
import { formatBlogDate } from './formatDate'

describe('formatBlogDate', () => {
  it('formats blog dates deterministically in UTC', () => {
    expect(formatBlogDate('2026-09-01T00:30:00.000Z')).toBe('September 1, 2026')
    expect(formatBlogDate('2026-09-01T23:30:00.000Z')).toBe('September 1, 2026')
  })
})
