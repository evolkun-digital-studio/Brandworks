import { describe, expect, it } from 'vitest'
import { parsePublicBlogPagination } from './blog'

describe('parsePublicBlogPagination', () => {
  it('uses the existing page and limit defaults', () => {
    expect(parsePublicBlogPagination(new URLSearchParams())).toEqual({ page: 1, limit: 9 })
  })

  it('preserves requested page and clamps limit to 30', () => {
    expect(parsePublicBlogPagination(new URLSearchParams('page=4&limit=90')))
      .toEqual({ page: 4, limit: 30 })
  })

  it.each(['0', '-1', '01', '1.5', '+1', '1e2'])('rejects non-positive-integer form %s', (value) => {
    expect(() => parsePublicBlogPagination(new URLSearchParams(`page=${encodeURIComponent(value)}`)))
      .toThrow('page must be a positive integer.')
  })

  it('rejects duplicate parameters like Express query arrays', () => {
    expect(() => parsePublicBlogPagination(new URLSearchParams('limit=3&limit=5')))
      .toThrow('limit must be a positive integer.')
  })
})
