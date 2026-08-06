import { createClient } from '@/lib/supabase/client'

export type MidiaStatus = 'solicitada' | 'planejada' | 'em_producao' | 'em_revisao' | 'aprovada' | 'entregue' | 'cancelada'
export type MidiaPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'

export interface MidiaSolicitacao {
  id: string
  plataforma_id: string
  titulo: string
  descricao: string
  tipo: string
  prioridade: MidiaPrioridade
  status: MidiaStatus
  solicitante_id: string
  responsavel_id: string | null
  prazo: string | null
  created_at: string
  updated_at: string
}

export interface MidiaTarefa {
  id: string
  solicitacao_id: string
  plataforma_id: string
  titulo: string
  descricao: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  prazo: string | null
  created_at: string
}

export interface MidiaAprovacao {
  id: string
  solicitacao_id: string
  status: 'pendente' | 'aprovada' | 'rejeitada'
  comentario: string
  created_at: string
}

export interface MidiaArquivo {
  id: string
  solicitacao_id: string
  plataforma_id: string
  nome: string
  storage_path: string
  mime_type: string | null
  created_at: string
  signed_url?: string
}

export const MIDIA_STATUS: Array<{ value: MidiaStatus; label: string }> = [
  { value: 'solicitada', label: 'Solicitada' },
  { value: 'planejada', label: 'Planejada' },
  { value: 'em_producao', label: 'Em produção' },
  { value: 'em_revisao', label: 'Em revisão' },
  { value: 'aprovada', label: 'Aprovada' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelada', label: 'Cancelada' },
]

export const MIDIA_TIPOS = ['arte', 'video', 'texto', 'cobertura', 'social', 'outro'] as const

export async function fetchMidiaSolicitacoes(platformId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_midia_solicitacoes')
    .select('*')
    .eq('plataforma_id', platformId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MidiaSolicitacao[]
}

export async function criarMidiaSolicitacao(input: {
  plataforma_id: string
  titulo: string
  descricao: string
  tipo: string
  prioridade: MidiaPrioridade
  prazo: string | null
}) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_midia_solicitacoes').insert({ ...input, solicitante_id: user.id })
  if (error) throw error
}

export async function atualizarMidiaStatus(id: string, status: MidiaStatus) {
  const sb = createClient()
  const { error } = await sb
    .from('ruja_midia_solicitacoes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function fetchMidiaTarefas(solicitacaoId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_midia_tarefas').select('*').eq('solicitacao_id', solicitacaoId).order('created_at')
  if (error) throw error
  return (data ?? []) as MidiaTarefa[]
}

export async function criarMidiaTarefa(input: { plataforma_id: string; solicitacao_id: string; titulo: string }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_midia_tarefas').insert({ ...input, created_by: user.id })
  if (error) throw error
}

export async function atualizarMidiaTarefa(id: string, status: MidiaTarefa['status']) {
  const sb = createClient()
  const { error } = await sb.from('ruja_midia_tarefas').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function fetchMidiaAprovacao(solicitacaoId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_midia_aprovacoes').select('*').eq('solicitacao_id', solicitacaoId).order('created_at', { ascending: false }).limit(1)
  if (error) throw error
  return ((data ?? [])[0] ?? null) as MidiaAprovacao | null
}

export async function registrarMidiaAprovacao(input: { plataforma_id: string; solicitacao_id: string; status: 'aprovada' | 'rejeitada'; comentario: string }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_midia_aprovacoes').insert({ ...input, aprovador_id: user.id })
  if (error) throw error
  await atualizarMidiaStatus(input.solicitacao_id, input.status === 'aprovada' ? 'aprovada' : 'em_producao')
}

export async function fetchMidiaArquivos(solicitacaoId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_midia_arquivos').select('*').eq('solicitacao_id', solicitacaoId).order('created_at', { ascending: false })
  if (error) throw error
  const arquivos = (data ?? []) as MidiaArquivo[]
  return Promise.all(arquivos.map(async arquivo => {
    const { data: signed } = await sb.storage.from('ruja-midia-arquivos').createSignedUrl(arquivo.storage_path, 60 * 60)
    return { ...arquivo, signed_url: signed?.signedUrl }
  }))
}

export async function uploadMidiaArquivo(platformId: string, solicitacaoId: string, file: File) {
  if (file.size > 50 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 50 MB.')
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'arquivo'
  const path = `${platformId}/${solicitacaoId}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await sb.storage.from('ruja-midia-arquivos').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  const { error: rowError } = await sb.from('ruja_midia_arquivos').insert({
    plataforma_id: platformId,
    solicitacao_id: solicitacaoId,
    nome: file.name,
    storage_path: path,
    mime_type: file.type || null,
    uploaded_by: user.id,
  })
  if (rowError) {
    await sb.storage.from('ruja-midia-arquivos').remove([path])
    throw rowError
  }
}

export async function removeMidiaArquivo(arquivo: MidiaArquivo) {
  const sb = createClient()
  const { error } = await sb.from('ruja_midia_arquivos').delete().eq('id', arquivo.id)
  if (error) throw error
  await sb.storage.from('ruja-midia-arquivos').remove([arquivo.storage_path])
}
