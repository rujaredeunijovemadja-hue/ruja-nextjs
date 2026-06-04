// src/lib/ruja/users.ts
// ─── USUÁRIOS DO RUJA ─────────────────────────────────────────
// Alinhado com schema real: ruja_profiles usa created_at / updated_at
// e departamento_id (FK para ruja_departamentos).

import { createClient } from '../supabase/client'

export interface RujaProfile {
  id:               string
  nome:             string
  email:            string
  role:             'lider_supremo' | 'admin' | 'lider_departamento' | 'voluntario'
  departamento_id:  string | null   // FK para ruja_departamentos.id
  ativo:            boolean
  created_at:       string
  updated_at:       string
}

export const ROLE_LABELS: Record<RujaProfile['role'], string> = {
  lider_supremo:      '👑 Líder Supremo',
  admin:              '🔑 Administrador',
  lider_departamento: '⭐ Líder de Departamento',
  voluntario:         '🙋 Voluntário',
}

// ── Leitura ────────────────────────────────────────────────────
export async function fetchProfiles(): Promise<RujaProfile[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_profiles')
    .select('*')
    .order('created_at', { ascending: false })
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

// ── Criação ────────────────────────────────────────────────────
export async function createUser(payload: {
  nome:             string
  email:            string
  senha?:           string
  role:             RujaProfile['role']
  departamento_id?: string | null
}): Promise<{
  ok:               boolean
  usuario?:         { id: string; email: string; nome: string; role: string }
  senhaTemporaria?: string
  error?:           string
}> {
  const res = await fetch('/api/ruja/users/create', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  return res.json()
}

// ── Edição de perfil (cargo + departamento + ativo) ────────────
export async function updateProfile(payload: {
  id:              string
  role?:           RujaProfile['role']
  departamento_id?: string | null
  ativo?:          boolean
  nome?:           string
}): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/ruja/users/update', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  return res.json()
}
