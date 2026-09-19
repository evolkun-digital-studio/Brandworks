import { describe, expect, it } from 'vitest'
import { validateScheduledAtInput } from './blogValidators.js'

/**
 * Scoped to validateScheduledAtInput only (Phase 14) — no other
 * validator in this file has tests yet; adding them is out of scope
 * for this phase.
 */
describe('validateScheduledAtInput', () => {
  it('accepts undefined/null as "no schedule"', () => {
    expect(validateScheduledAtInput(undefined)).toEqual({ value: null, error: null })
    expect(validateScheduledAtInput(null)).toEqual({ value: null, error: null })
  })

  it('accepts a well-formed future ISO-8601 timestamp', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    const result = validateScheduledAtInput(future)
    expect(result.error).toBeNull()
    expect(result.value?.toISOString()).toBe(future)
  })

  it('rejects a non-string value', () => {
    const result = validateScheduledAtInput(12345)
    expect(result.error).toContain('ISO-8601')
  })

  it('rejects a malformed / non-ISO date string', () => {
    const result = validateScheduledAtInput('next tuesday at 3pm')
    expect(result.error).toContain('ISO-8601')
  })

  it('rejects a locale-formatted date string', () => {
    const result = validateScheduledAtInput('10/01/2026, 3:00:00 PM')
    expect(result.error).toContain('ISO-8601')
  })

  it('rejects a syntactically-ISO-shaped but invalid date (e.g. month 13)', () => {
    const result = validateScheduledAtInput('2026-13-01T10:00:00Z')
    expect(result.error).not.toBeNull()
  })

  it('rejects a past timestamp', () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    const result = validateScheduledAtInput(past)
    expect(result.error).toContain('future')
  })

  it('rejects the current instant (not strictly in the future)', () => {
    const result = validateScheduledAtInput(new Date(Date.now()).toISOString())
    expect(result.error).toContain('future')
  })

  it('accepts a numeric offset instead of Z', () => {
    const future = new Date(Date.now() + 60_000)
    const withOffset = future.toISOString().replace('Z', '+00:00')
    const result = validateScheduledAtInput(withOffset)
    expect(result.error).toBeNull()
    expect(result.value?.getTime()).toBe(future.getTime())
  })

  it('stores a UTC instant regardless of the input offset — never a locale string', () => {
    // 10:00 in UTC+05:00 is 05:00 UTC.
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const yyyy = future.getUTCFullYear()
    const mm = String(future.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(future.getUTCDate()).padStart(2, '0')
    const input = `${yyyy}-${mm}-${dd}T10:00:00+05:00`
    const result = validateScheduledAtInput(input)
    expect(result.error).toBeNull()
    expect(result.value).toBeInstanceOf(Date)
    // 10:00+05:00 === 05:00 UTC, on the same calendar day.
    expect(result.value?.getUTCHours()).toBe(5)
  })

  it('empty string is treated as "no schedule", not an error', () => {
    expect(validateScheduledAtInput('   ')).toEqual({ value: null, error: null })
  })
})
