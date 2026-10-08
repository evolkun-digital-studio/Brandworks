import { badRequest } from '../http/errors'

const POSITIVE_INTEGER_PATTERN = /^[1-9][0-9]*$/
const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 9
const MAX_LIMIT = 30

function parsePositiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !POSITIVE_INTEGER_PATTERN.test(value)) {
    throw badRequest(`${field} must be a positive integer.`)
  }
  return Number(value)
}

function queryValue(params: URLSearchParams, name: string): unknown {
  const values = params.getAll(name)
  if (values.length === 0) return undefined
  return values.length === 1 ? values[0] : values
}

export interface PublicBlogPagination {
  page: number
  limit: number
}

export function parsePublicBlogPagination(params: URLSearchParams): PublicBlogPagination {
  const page = parsePositiveInteger(queryValue(params, 'page'), 'page') ?? DEFAULT_PAGE
  const requestedLimit = parsePositiveInteger(queryValue(params, 'limit'), 'limit') ?? DEFAULT_LIMIT
  return { page, limit: Math.min(requestedLimit, MAX_LIMIT) }
}
