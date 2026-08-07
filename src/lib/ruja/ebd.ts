import { createClient } from '@/lib/supabase/client'

export interface EbdClass { id: string; plataforma_id: string; nome: string; faixa_etaria: string; descricao: string; professor_id: string | null; ativo: boolean }
export interface EbdTeacher { id: string; plataforma_id: string; nome: string; contato: string; ativo: boolean }
export interface EbdLesson { id: string; plataforma_id: string; classe_id: string; titulo: string; data: string | null; status: 'planejada' | 'ministrada' | 'cancelada'; observacao: string }

export async function fetchEbdClasses(platformId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_ebd_classes').select('*').eq('plataforma_id', platformId).eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []) as EbdClass[]
}

export async function fetchEbdLessons(platformId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_ebd_licoes').select('*').eq('plataforma_id', platformId).order('data', { ascending: false })
  if (error) throw error
  return (data ?? []) as EbdLesson[]
}

export async function fetchEbdTeachers(platformId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_ebd_professores').select('*').eq('plataforma_id', platformId).eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []) as EbdTeacher[]
}

export async function createEbdClass(input: { plataforma_id: string; nome: string; faixa_etaria: string; descricao: string; professor_id: string | null }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_ebd_classes').insert({ ...input, created_by: user.id })
  if (error) throw error
}

export async function createEbdTeacher(input: { plataforma_id: string; nome: string; contato: string }) {
  const sb = createClient()
  const { error } = await sb.from('ruja_ebd_professores').insert(input)
  if (error) throw error
}

export async function createEbdLesson(input: { plataforma_id: string; classe_id: string; titulo: string; data: string | null }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_ebd_licoes').insert({ ...input, created_by: user.id })
  if (error) throw error
}

export async function updateEbdLessonStatus(id: string, status: EbdLesson['status']) {
  const sb = createClient()
  const { error } = await sb.from('ruja_ebd_licoes').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
