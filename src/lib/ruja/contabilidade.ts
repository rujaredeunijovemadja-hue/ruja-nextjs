import { createClient } from '@/lib/supabase/client'

export type LancamentoTipo = 'entrada' | 'saida'
export type LancamentoStatus = 'pendente' | 'aprovado' | 'rejeitado'
export interface Lancamento { id: string; plataforma_id: string; tipo: LancamentoTipo; categoria: string; descricao: string; valor: number; data: string; status: LancamentoStatus; observacao: string }

export async function fetchLancamentos(platformId: string) {
  const { data, error } = await createClient().from('ruja_contabilidade_lancamentos').select('*').eq('plataforma_id', platformId).order('data', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Lancamento[]
}

export async function createLancamento(input: { plataforma_id: string; tipo: LancamentoTipo; categoria: string; descricao: string; valor: number; data: string }) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_contabilidade_lancamentos').insert({ ...input, criado_por: user.id })
  if (error) throw error
}

export async function updateLancamentoStatus(id: string, status: Exclude<LancamentoStatus, 'pendente'>) {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Sessão expirada. Faça login novamente.')
  const { error } = await sb.from('ruja_contabilidade_lancamentos').update({ status, aprovado_por: user.id, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
