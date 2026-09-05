import { describe, expect, it } from 'vitest'
import { getUserDisplayName } from './user'

describe('getUserDisplayName', () => {
  it('prefers preferred_name when available', () => {
    const user = {
      email: 'ana@example.com',
      user_metadata: {
        full_name: 'Ana Carolina Silva',
        preferred_name: 'Aninha',
      },
    }
    expect(getUserDisplayName(user)).toBe('Aninha')
  })

  it('falls back to full_name or name when preferred_name is not filled', () => {
    const user = {
      email: 'ana@example.com',
      user_metadata: {
        full_name: 'Ana Carolina Silva',
      },
    }
    expect(getUserDisplayName(user)).toBe('Ana Carolina Silva')
  })

  it('falls back to email when user has no metadata (email-only login)', () => {
    const user = {
      email: 'ana@example.com',
      user_metadata: {},
    }
    expect(getUserDisplayName(user)).toBe('ana@example.com')
  })

  it('returns empty string when user is null or undefined', () => {
    expect(getUserDisplayName(null)).toBe('')
    expect(getUserDisplayName(undefined)).toBe('')
  })
})
