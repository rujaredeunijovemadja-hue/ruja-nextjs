import { createClient } from '@supabase/supabase-js'

// ⚠️  NUNCA importar este arquivo em componentes 'use client'
// ⚠️  NUNCA usar NEXT_PUBLIC_ para SUPABASE_SERVICE_ROLE_KEY
// Este módulo só executa no servidor (API Routes)

let _adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (_adminClient) return _adminClient

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceKey) {
    throw new Error(
      '[RUJA] SUPABASE_SERVICE_ROLE_KEY não configurada. ' +
      'Adicione esta variável no Vercel (sem prefixo NEXT_PUBLIC_).'
    )
  }
  if (!url) {
    throw new Error('[RUJA] NEXT_PUBLIC_SUPABASE_URL não configurada.')
  }

  _adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  })

  return _adminClient
}

// Alias para compatibilidade
export const supabaseAdmin = {
  get auth()    { return getSupabaseAdmin().auth },
  get from()    { return getSupabaseAdmin().from.bind(getSupabaseAdmin()) },
  get storage() { return getSupabaseAdmin().storage },
}
