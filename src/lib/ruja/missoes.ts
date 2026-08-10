import { createClient } from '@/lib/supabase/client'

export type MissaoTarget = 'jovem' | 'lider' | 'usuario'
export type MissaoStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
export type MissaoPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'

export interface Missao {
  id: string
  plataforma_id: string
  departamento_id: string | null
  titulo: string
  descricao: string
  alvo_tipo: MissaoTarget
  alvo_id: string | null
  alvo_nome: string
  alvo_usuario_id: string | null
  status: MissaoStatus
  prioridade: MissaoPrioridade
  progresso: number
  prazo: string | null
  criado_por: string
  created_at: string
  updated_at: string
}
export interface MissaoAtualizacao { id: string; missao_id: string; usuario_id: string; status: MissaoStatus; progresso: number; comentario: string; created_at: string }

export async function fetchMissoes(platformId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_missoes').select('*').eq('plataforma_id', platformId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Missao[]
}

export async function criarMissao(input: {
  plataforma_id: string
  departamento_id: string | null
  titulo: string
  descricao: string
  alvo_tipo: MissaoTarget
  alvo_id: string | null
  alvo_nome: string
  alvo_usuario_id?: string | null
  prioridade: MissaoPrioridade
  prazo: string | null
}) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_missoes').insert({ ...input, criado_por: user.id })
  if (error) throw error
}

export async function atualizarMissao(id: string, status: MissaoStatus, progresso: number, comentario = '') {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error: historyError } = await sb.from('ruja_missoes_atualizacoes').insert({ missao_id: id, usuario_id: user.id, status, progresso, comentario })
  if (historyError) throw historyError
  const { error } = await sb.from('ruja_missoes').update({ status, progresso, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function fetchMissaoHistorico(id: string) {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_missoes_atualizacoes').select('*').eq('missao_id', id).order('created_at', { ascending: false }).limit(20)
  if (error) throw error
  return (data ?? []) as MissaoAtualizacao[]
}
