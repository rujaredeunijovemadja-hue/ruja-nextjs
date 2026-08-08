import { createClient } from '@/lib/supabase/client'

export interface EbdClass { id: string; plataforma_id: string; nome: string; faixa_etaria: string; descricao: string; professor_id: string | null; ativo: boolean }
export interface EbdTeacher { id: string; plataforma_id: string; nome: string; contato: string; ativo: boolean }
export interface EbdStudent { id: string; plataforma_id: string; classe_id: string; nome: string; contato: string; ativo: boolean }
export interface EbdPresence { aluno_id: string; presente: boolean; observacao: string }
export interface EbdMaterial { id: string; licao_id: string; nome: string; storage_path: string; mime_type: string | null; signed_url?: string }
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

export async function fetchEbdStudents(platformId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_ebd_alunos').select('*').eq('plataforma_id', platformId).eq('ativo', true).order('nome')
  if (error) throw error
  return (data ?? []) as EbdStudent[]
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

export async function createEbdStudent(input: { plataforma_id: string; classe_id: string; nome: string; contato: string }) {
  const sb = createClient()
  const { error } = await sb.from('ruja_ebd_alunos').insert(input)
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

export async function fetchEbdAttendance(lessonId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_ebd_presencas').select('aluno_id,presente,observacao').eq('licao_id', lessonId)
  if (error) throw error
  return (data ?? []) as EbdPresence[]
}

export async function saveEbdAttendance(input: { plataforma_id: string; licao_id: string; presentes: string[] }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error: deleteError } = await sb.from('ruja_ebd_presencas').delete().eq('licao_id', input.licao_id)
  if (deleteError) throw deleteError
  if (!input.presentes.length) return
  const { error } = await sb.from('ruja_ebd_presencas').insert(input.presentes.map(aluno_id => ({
    plataforma_id: input.plataforma_id,
    licao_id: input.licao_id,
    aluno_id,
    presente: true,
    registrado_por: user.id,
  })))
  if (error) throw error
}

export async function fetchEbdMaterials(lessonId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_ebd_materiais').select('*').eq('licao_id', lessonId).order('created_at', { ascending: false })
  if (error) throw error
  return Promise.all(((data ?? []) as EbdMaterial[]).map(async material => {
    const { data: signed } = await sb.storage.from('ruja-ebd-materiais').createSignedUrl(material.storage_path, 3600)
    return { ...material, signed_url: signed?.signedUrl }
  }))
}

export async function uploadEbdMaterial(platformId: string, lessonId: string, file: File) {
  if (file.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 50 MB.')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-') || 'material'
  const path = `${platformId}/${lessonId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await sb.storage.from('ruja-ebd-materiais').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  const { error } = await sb.from('ruja_ebd_materiais').insert({ plataforma_id: platformId, licao_id: lessonId, nome: file.name, storage_path: path, mime_type: file.type || null, uploaded_by: user.id })
  if (error) { await sb.storage.from('ruja-ebd-materiais').remove([path]); throw error }
}
