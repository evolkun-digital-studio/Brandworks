import { describe, expect, it } from 'vitest'
import { badRequest, errorResponse, notFound } from './errors'

describe('API error responses', () => {
  it('preserves known status codes and the JSON error envelope', async () => {
    const badInput = errorResponse(badRequest('page must be a positive integer.'))
    expect(badInput.status).toBe(400)
    expect(await badInput.json()).toEqual({ error: 'page must be a positive integer.' })

    expect(errorResponse(notFound('Blog post not found.')).status).toBe(404)
  })

  it('sanitizes unexpected database errors', async () => {
    const response = errorResponse(new Error('mongodb+srv://user:password@cluster/db'))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Something went wrong. Please try again.' })
  })
})
