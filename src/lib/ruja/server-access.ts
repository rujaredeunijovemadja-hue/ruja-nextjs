import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { normalizeRujaRole, type RujaRole } from './access'
import type { SupabaseClient } from '@supabase/supabase-js'

export class RujaAccessError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export async function requireCadastroManager() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new RujaAccessError('Não autenticado.', 401)

  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  const { data: profile } = await admin
    .from('ruja_profiles')
    .select('id,nome,role,departamento_id,ativo')
    .eq('id', user.id)
    .single()

  if (!profile?.ativo) throw new RujaAccessError('Conta inativa ou sem perfil.', 403)
  const role = normalizeRujaRole(profile.role) as RujaRole
  if (!['lider_supremo', 'administrador', 'lider_departamento'].includes(role)) {
    throw new RujaAccessError('Permissão negada.', 403)
  }
  if (role === 'lider_departamento' && !['teens', 'simply'].includes(profile.departamento_id ?? '')) {
    throw new RujaAccessError('Departamento do perfil inválido.', 403)
  }

  return { admin, user, profile: { ...profile, role } }
}

/**
 * Mesclar duplicatas de jovens é uma ação cross-departamento, destrutiva
 * (apaga registros) -- restrito a admin/lider_supremo, diferente de
 * requireCadastroManager() que também deixa lider_departamento passar.
 */
export async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new RujaAccessError('Não autenticado.', 401)

  const admin = getSupabaseAdmin() as unknown as SupabaseClient
  const { data: profile } = await admin
    .from('ruja_profiles')
    .select('id,nome,role,departamento_id,ativo')
    .eq('id', user.id)
    .single()

  if (!profile?.ativo) throw new RujaAccessError('Conta inativa ou sem perfil.', 403)
  const role = normalizeRujaRole(profile.role) as RujaRole
  if (!['lider_supremo', 'administrador'].includes(role)) {
    throw new RujaAccessError('Permissão negada.', 403)
  }

  return { admin, user, profile: { ...profile, role } }
}

export function assertCadastroDepartment(
  role: RujaRole,
  profileDepartment: string | null,
  cadastroDepartment: string
) {
  if (role === 'lider_departamento' && profileDepartment !== cadastroDepartment) {
    throw new RujaAccessError('Cadastro pertence a outro departamento.', 403)
  }
}
