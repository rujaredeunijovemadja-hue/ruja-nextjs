import type { DepartmentScope } from './departments'

export type RujaRole =
  | 'lider_supremo'
  | 'administrador'
  | 'lider_departamento'
  | 'voluntario'
  | 'visualizador'

export interface RujaAccessProfile {
  id: string
  nome: string
  email: string
  role: RujaRole
  departamento_id: string | null
  ativo: boolean
}

export type RujaCapability =
  | 'manage_global'
  | 'manage_department'
  | 'register_attendance'
  | 'approve_pending'
  | 'manage_users'

export function normalizeRujaRole(role: string): RujaRole {
  return role === 'admin' ? 'administrador' : role as RujaRole
}

export function departmentScopeFor(profile: RujaAccessProfile): DepartmentScope {
  if (profile.role === 'lider_supremo' || profile.role === 'administrador') return 'all'
  return profile.departamento_id === 'simply' ? 'simply' : 'teens'
}

export function hasCapability(profile: RujaAccessProfile, capability: RujaCapability): boolean {
  if (!profile.ativo) return false
  const global = profile.role === 'lider_supremo' || profile.role === 'administrador'
  if (capability === 'manage_global') return global
  if (capability === 'manage_users') return profile.role === 'lider_supremo'
  if (capability === 'approve_pending') return global || profile.role === 'lider_departamento'
  if (capability === 'register_attendance') {
    return global || profile.role === 'lider_departamento' || profile.role === 'voluntario'
  }
  return global || profile.role === 'lider_departamento'
}
