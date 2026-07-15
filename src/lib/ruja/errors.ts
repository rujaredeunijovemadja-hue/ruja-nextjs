interface SupabaseLikeError {
  code?: unknown
  message?: unknown
  details?: unknown
  hint?: unknown
}

export function getRujaErrorMessage(error: unknown, fallback = 'Erro desconhecido.'): string {
  if (error instanceof Error && error.message) return error.message
  if (!error || typeof error !== 'object') return fallback

  const supabaseError = error as SupabaseLikeError
  const message = typeof supabaseError.message === 'string' ? supabaseError.message : ''
  const details = typeof supabaseError.details === 'string' ? supabaseError.details : ''
  const hint = typeof supabaseError.hint === 'string' ? supabaseError.hint : ''
  const code = typeof supabaseError.code === 'string' ? supabaseError.code : ''
  const description = [message, details, hint].filter(Boolean).join(' - ')

  if (!description) return fallback
  return code ? `${description} (${code})` : description
}
