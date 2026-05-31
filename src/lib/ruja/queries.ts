// ─── QUERIES CENTRALIZADAS DO SUPABASE ────────────────────────
// Toda comunicação com o banco passa por aqui.
// Migração de: upsertJovem, deleteJovem, upsertLider, etc.

import { createClient } from '../supabase/client'
import type {
  Jovem, Lider, Departamento, Frequencia,
  Recuperacao, HistoricoMensal, Regras, Metas, LiderSupremo
} from './types'

// ── JOVENS ────────────────────────────────────────────────────
export async function fetchJovens(): Promise<Jovem[]> {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_jovens').select('*').order('nome')
  if (error) throw error
  return (data ?? []) as Jovem[]
}

export async function upsertJovem(jovem: Partial<Jovem> & { id: string }): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_jovens').upsert({
    ...jovem,
    atualizado_em: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteJovem(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_jovens').delete().eq('id', id)
  if (error) throw error
}

// ── LÍDERES ───────────────────────────────────────────────────
export async function fetchLideres(): Promise<Lider[]> {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_lideres').select('*').order('nome')
  if (error) throw error
  return (data ?? []) as Lider[]
}

export async function upsertLider(lider: Partial<Lider> & { id: string }): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_lideres').upsert({
    ...lider,
    atualizado_em: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteLider(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_lideres').delete().eq('id', id)
  if (error) throw error
}

// ── DEPARTAMENTOS ─────────────────────────────────────────────
export async function fetchDepartamentos(): Promise<Departamento[]> {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_departamentos').select('*').order('nome')
  if (error) throw error
  return (data ?? []) as Departamento[]
}

export async function upsertDepartamento(d: Partial<Departamento> & { id: string }): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_departamentos').upsert({
    ...d,
    atualizado_em: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteDepartamento(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_departamentos').delete().eq('id', id)
  if (error) throw error
}

// ── FREQUÊNCIAS ───────────────────────────────────────────────
export async function fetchFrequencias(): Promise<Frequencia[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_frequencias')
    .select('*')
    .order('data', { ascending: false })
  if (error) throw error
  return (data ?? []) as Frequencia[]
}

export async function upsertFrequencias(freqs: Frequencia[]): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_frequencias').upsert(freqs, { onConflict: 'id' })
  if (error) throw error
}

// ── RECUPERAÇÕES ──────────────────────────────────────────────
export async function fetchRecuperacoes(): Promise<Recuperacao[]> {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_recuperacoes').select('*').order('criado_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as Recuperacao[]
}

export async function upsertRecuperacao(r: Partial<Recuperacao> & { id: string }): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_recuperacoes').upsert({
    ...r,
    atualizado_em: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteRecuperacao(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_recuperacoes').delete().eq('id', id)
  if (error) throw error
}

// ── HISTÓRICO MENSAL ──────────────────────────────────────────
export async function fetchHistoricoMensal(): Promise<HistoricoMensal[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_historico_mensal')
    .select('*')
    .order('mes')
  if (error) throw error
  return (data ?? []) as HistoricoMensal[]
}

export async function upsertSnapshot(snap: Omit<HistoricoMensal, 'id'>): Promise<void> {
  const sb = createClient()
  const { error } = await sb
    .from('ruja_historico_mensal')
    .upsert(snap, { onConflict: 'mes' })
  if (error) throw error
}

// ── CONFIGURAÇÕES ─────────────────────────────────────────────
export async function fetchConfig<T>(chave: string): Promise<T | null> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_configuracoes')
    .select('valor_json')
    .eq('chave', chave)
    .single()
  if (error) return null
  return data?.valor_json as T
}

export async function saveConfig(chave: string, valor_json: unknown): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_configuracoes').upsert(
    { chave, valor_json, atualizado_em: new Date().toISOString() },
    { onConflict: 'chave' }
  )
  if (error) throw error
}

export async function fetchRegras(): Promise<Regras | null> {
  return fetchConfig<Regras>('regras')
}

export async function fetchMetas(): Promise<Metas | null> {
  return fetchConfig<Metas>('metas')
}

export async function fetchLiderSupremo(): Promise<LiderSupremo | null> {
  return fetchConfig<LiderSupremo>('lider_supremo')
}

// ── AUDITORIA ─────────────────────────────────────────────────
export async function auditLog(
  acao: string,
  tabela: string,
  registroId: string,
  dadosAntes?: unknown,
  dadosDepois?: unknown
): Promise<void> {
  try {
    const sb = createClient()
    const { data: { session } } = await sb.auth.getSession()
    await sb.from('ruja_audit_logs').insert({
      usuario_id:   session?.user?.id ?? null,
      acao,
      tabela,
      registro_id:  registroId,
      dados_antes:  dadosAntes ?? null,
      dados_depois: dadosDepois ?? null,
    })
  } catch (_) { /* silencioso */ }
}

// ── ATUALIZAR STATUS DO JOVEM ─────────────────────────────────
export async function updateJovemStatus(id: string, status: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb
    .from('ruja_jovens')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
