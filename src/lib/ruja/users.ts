import { createClient } from '../supabase/client'

export interface RujaProfile {
  id:           string
  nome:         string
  email:        string
  role:         'lider_supremo' | 'admin' | 'lider_departamento' | 'voluntario'
  departamento: string
  ativo:        boolean
  criado_em:    string
  atualizado_em:string
}

export const ROLE_LABELS: Record<RujaProfile['role'], string> = {
  lider_supremo:      '👑 Líder Supremo',
  admin:              '🔑 Administrador',
  lider_departamento: '⭐ Líder de Departamento',
  voluntario:         '🙋 Voluntário',
}

export async function fetchProfiles(): Promise<RujaProfile[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_profiles')
    .select('*')
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as RujaProfile[]
}

export async function fetchMyProfile(): Promise<RujaProfile | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await sb
    .from('ruja_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return (data as RujaProfile) ?? null
}

export async function createUser(payload: {
  nome:         string
  email:        string
  senha?:       string
  role:         RujaProfile['role']
  departamento?: string
}): Promise<{
  ok:              boolean
  usuario?:        { id: string; email: string; nome: string; role: string }
  senhaTemporaria?: string
  error?:          string
}> {
  const res = await fetch('/api/ruja/users/create', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  return res.json()
}
