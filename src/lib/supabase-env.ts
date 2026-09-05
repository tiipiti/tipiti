export const requireSupabaseEnv = (
  url: string | undefined,
  publishableKey: string | undefined,
) => {
  if (!url) throw new Error('VITE_SUPABASE_URL is required')
  if (!publishableKey) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY is required')

  return { url, publishableKey }
}
