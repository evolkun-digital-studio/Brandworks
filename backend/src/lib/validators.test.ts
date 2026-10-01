import { describe, expect, it } from 'vitest'
import { normalizeUsername, validateUsername } from './validators.js'

describe('admin login ID validation', () => {
  it('accepts the existing username format', () => {
    expect(validateUsername('brandwork_admin')).toBeNull()
  })

  it('accepts and normalizes an email-style login ID', () => {
    expect(validateUsername(' Brandwork@Admin.com ')).toBeNull()
    expect(normalizeUsername(' Brandwork@Admin.com ')).toBe(
      'brandwork@admin.com',
    )
  })

  it.each(['admin@', '@admin.com', 'admin@example', 'admin@@example.com'])(
    'rejects malformed email-style login ID %s',
    (loginId) => {
      expect(validateUsername(loginId)).not.toBeNull()
    },
  )
})
