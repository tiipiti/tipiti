import type { User } from '@supabase/supabase-js'

export function getUserDisplayName(
  user?: Pick<User, 'email' | 'user_metadata'> | null,
): string {
  if (!user) return ''

  const preferredName = user.user_metadata?.preferred_name
  if (typeof preferredName === 'string' && preferredName.trim()) {
    return preferredName.trim()
  }

  const fullName = user.user_metadata?.full_name ?? user.user_metadata?.name
  if (typeof fullName === 'string' && fullName.trim()) {
    return fullName.trim()
  }

  return user.email ?? ''
}
