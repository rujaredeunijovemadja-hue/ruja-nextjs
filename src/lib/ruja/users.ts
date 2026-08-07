// src/lib/ruja/users.ts
// ─── USUÁRIOS DO RUJA ─────────────────────────────────────────
// Alinhado com schema real: ruja_profiles usa created_at / updated_at
// e departamento_id (FK para ruja_departamentos).

import { createClient } from '../supabase/client'
import { normalizeRujaRole, type RujaRole } from './access'

export interface RujaProfile {
  id:               string
  nome:             string
  email:            string
  role:             RujaRole
  departamento_id:  string | null   // FK para ruja_departamentos.id
  ativo:            boolean
  created_at:       string
  updated_at:       string
}

export type PlatformRole = 'owner' | 'admin' | 'gestor' | 'editor' | 'operador' | 'visualizador'
export interface RujaPlatformOption { id: string; nome: string; slug: string; icone: string | null; ativo: boolean }
export interface RujaPlatformMembership { user_id: string; plataforma_id: string; role: PlatformRole; departamento_id: string | null; ativo: boolean }

export const ROLE_LABELS: Record<RujaProfile['role'], string> = {
  lider_supremo:      '👑 Líder Supremo',
  administrador:      '🔑 Administrador',
  lider_departamento: '⭐ Líder de Departamento',
  voluntario:         '🙋 Voluntário',
  visualizador:       '👁 Visualizador',
}

// ── Leitura ────────────────────────────────────────────────────
export async function fetchProfiles(): Promise<RujaProfile[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(profile => ({
    ...profile,
    role: normalizeRujaRole(profile.role),
  })) as RujaProfile[]
}

export async function fetchMyProfile(): Promise<RujaProfile | null> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data, error } = await sb
    .from('ruja_profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error) throw error
  return data ? ({ ...data, role: normalizeRujaRole(data.role) } as RujaProfile) : null
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

export async function fetchPlatformAccess(): Promise<{ plataformas: RujaPlatformOption[]; acessos: RujaPlatformMembership[] }> {
  const response = await fetch('/api/ruja/users/platforms')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar acessos de plataformas.')
  return data
}

export async function updatePlatformAccess(payload: {
  user_id: string
  plataforma_id: string
  role: PlatformRole
  departamento_id?: string | null
  ativo: boolean
}) {
  const response = await fetch('/api/ruja/users/platforms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Não foi possível atualizar o acesso.')
  return data as { ok: boolean }
}
