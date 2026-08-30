// src/lib/ruja/fixos.ts
// ─── EVENTOS FIXOS E MISSÕES FIXAS (templates recorrentes) ────────────
// RLS (is_ruja_admin()) já restringe leitura/escrita a lider_supremo e
// administrador -- não precisa de checagem de papel aqui, o Postgres
// garante. O worker "Paulo" (ruja-automation, no servidor) lê estas
// tabelas e gera as ocorrências reais em ruja_eventos_frequencia e
// ruja_missoes -- este arquivo só cuida do CRUD do template.

import { createClient } from '@/lib/supabase/client'

export type Recorrencia = 'semanal' | 'mensal'

export interface EventoFixo {
  id: string
  nome: string
  tipo: string
  recorrencia: Recorrencia
  dia_semana: number | null
  dia_mes: number | null
  hora_inicio: string
  hora_termino: string | null
  local: string | null
  descricao: string | null
  departamento_id: string | null
  departamentos_envolvidos: string[]
  lider_responsavel_id: string | null
  ativo: boolean
  created_at: string
}

export interface MissaoFixa {
  id: string
  plataforma_id: string
  departamento_id: string | null
  titulo: string
  descricao: string
  alvo_tipo: 'jovem' | 'lider' | 'usuario'
  alvo_id: string | null
  alvo_nome: string
  alvo_usuario_id: string | null
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
  recorrencia: Recorrencia
  dia_semana: number | null
  dia_mes: number | null
  prazo_dias: number
  ativo: boolean
  created_at: string
}

export async function fetchEventosFixos() {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_eventos_fixos').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as EventoFixo[]
}

export async function criarEventoFixo(input: Omit<EventoFixo, 'id' | 'ativo' | 'created_at'>) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_eventos_fixos').insert({ ...input, criado_por: user.id })
  if (error) throw error
}

export async function alternarEventoFixo(id: string, ativo: boolean) {
  const sb = createClient()
  const { error } = await sb.from('ruja_eventos_fixos').update({ ativo, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function excluirEventoFixo(id: string) {
  const sb = createClient()
  const { error } = await sb.from('ruja_eventos_fixos').delete().eq('id', id)
  if (error) throw error
}

export async function fetchMissoesFixas() {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_missoes_fixas').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MissaoFixa[]
}

export async function criarMissaoFixa(input: Omit<MissaoFixa, 'id' | 'ativo' | 'created_at'>) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_missoes_fixas').insert({ ...input, criado_por: user.id })
  if (error) throw error
}

export async function alternarMissaoFixa(id: string, ativo: boolean) {
  const sb = createClient()
  const { error } = await sb.from('ruja_missoes_fixas').update({ ativo, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function excluirMissaoFixa(id: string) {
  const sb = createClient()
  const { error } = await sb.from('ruja_missoes_fixas').delete().eq('id', id)
  if (error) throw error
}
