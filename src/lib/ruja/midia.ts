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
