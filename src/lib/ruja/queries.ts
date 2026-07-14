// ─── QUERIES CENTRALIZADAS DO SUPABASE ────────────────────────

import { createClient } from '../supabase/client'
import type {
  Jovem, Lider, Departamento, Frequencia, EventoFrequencia, EventoFrequenciaInput,
  Recuperacao, HistoricoMensal, Regras, Metas, LiderSupremo, CadastroPendente
} from './types'
import { activeOfficialDepartments, departmentSlug, isOfficialDepartmentSlug } from './departments'

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

export async function fetchDepartamentos(): Promise<Departamento[]> {
  const sb = createClient()
  const { data, error } = await sb.from('ruja_departamentos').select('*').order('nome')
  if (error) throw error
  return activeOfficialDepartments((data ?? []) as Departamento[])
}

export async function upsertDepartamento(d: Partial<Departamento> & { id: string }): Promise<void> {
  const slug = d.slug ?? (d.nome ? departmentSlug({ nome: d.nome }) : undefined)
  if (slug && !isOfficialDepartmentSlug(slug)) {
    throw new Error('A estrutura oficial atual permite apenas Teens e Simply.')
  }
  const sb = createClient()
  const { error } = await sb.from('ruja_departamentos').upsert({
    ...d,
    slug,
    ativo: d.ativo ?? true,
    atualizado_em: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteDepartamento(id: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb
    .from('ruja_departamentos')
    .update({ ativo: false, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function fetchCadastrosPendentes(): Promise<CadastroPendente[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_cadastros_pendentes')
    .select('*, departamento:ruja_departamentos(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CadastroPendente[]
}

export async function aprovarCadastroPendente(cadastro: CadastroPendente): Promise<void> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const departamento = cadastro.departamento?.nome ?? ''

  if (!departamento) throw new Error('Cadastro sem departamento válido.')

  const jovemId = `cad_${cadastro.id}`
  const { error: jovemError } = await sb.from('ruja_jovens').upsert({
    id: jovemId,
    nome: cadastro.nome,
    contato: cadastro.telefone,
    instagram: '',
    endereco: '',
    departamento,
    lider: '',
    status: 'Em Risco',
    entrada: new Date().toISOString().slice(0, 10),
    batizado: 'nao',
    data_batismo: '',
    data_nasc: cadastro.data_nascimento,
    obs: cadastro.observacoes,
    foto_path: cadastro.foto_path ?? '',
    foto_url: '',
    idade: 0,
    atualizado_em: new Date().toISOString(),
  })
  if (jovemError) throw jovemError

  const { error } = await sb
    .from('ruja_cadastros_pendentes')
    .update({
      status: 'aprovado',
      aprovado_por: session?.user?.id ?? null,
      aprovado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', cadastro.id)
  if (error) throw error
}

export async function rejeitarCadastroPendente(id: string, motivo: string): Promise<void> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const { error } = await sb
    .from('ruja_cadastros_pendentes')
    .update({
      status: 'rejeitado',
      rejeitado_por: session?.user?.id ?? null,
      rejeitado_em: new Date().toISOString(),
      motivo_rejeicao: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

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

export async function fetchEventosFrequencia(): Promise<EventoFrequencia[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('ruja_eventos_frequencia')
    .select('*, participantes:ruja_eventos_participantes(*)')
    .order('data', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) {
    if (String(error.message).includes('ruja_eventos_frequencia')) return []
    throw error
  }
  return (data ?? []) as EventoFrequencia[]
}

export async function criarEventoFrequencia(input: EventoFrequenciaInput): Promise<string> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  if (!session?.user?.id) throw new Error('Sessão expirada. Faça login novamente.')

  const { data: evento, error } = await sb
    .from('ruja_eventos_frequencia')
    .insert({
      nome: input.nome.trim(),
      data: input.data,
      departamento_id: input.departamento_id,
      lider_responsavel_id: input.lider_responsavel_id,
      tipo: input.tipo,
      observacao: input.observacao,
      created_by: session.user.id,
    })
    .select('*')
    .single()
  if (error) throw error

  const eventoId = evento.id as string
  if (input.participantes.length) {
    const { error: participantesError } = await sb
      .from('ruja_eventos_participantes')
      .insert(input.participantes.map(p => ({
        evento_id: eventoId,
        jovem_id: p.jovem_id,
        presente: true,
        observacao: p.observacao ?? null,
        registrado_por: session.user.id,
      })))
    if (participantesError) throw participantesError
  }

  await auditLog('criar_evento_frequencia', 'ruja_eventos_frequencia', eventoId, null, input)
  return eventoId
}

export async function atualizarEventoFrequencia(
  eventoId: string,
  input: EventoFrequenciaInput,
  antes?: EventoFrequencia | null
): Promise<void> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  if (!session?.user?.id) throw new Error('Sessão expirada. Faça login novamente.')

  const { error } = await sb
    .from('ruja_eventos_frequencia')
    .update({
      nome: input.nome.trim(),
      data: input.data,
      departamento_id: input.departamento_id,
      lider_responsavel_id: input.lider_responsavel_id,
      tipo: input.tipo,
      observacao: input.observacao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventoId)
  if (error) throw error

  const atuais = antes?.participantes ?? []
  const desejados = new Set(input.participantes.map(p => p.jovem_id))
  const atuaisIds = new Set(atuais.map(p => p.jovem_id))
  const remover = atuais.filter(p => !desejados.has(p.jovem_id))
  const adicionar = input.participantes.filter(p => !atuaisIds.has(p.jovem_id))
  const manter = input.participantes.filter(p => atuaisIds.has(p.jovem_id))

  if (remover.length) {
    const { error: removeError } = await sb
      .from('ruja_eventos_participantes')
      .delete()
      .eq('evento_id', eventoId)
      .in('jovem_id', remover.map(p => p.jovem_id))
    if (removeError) throw removeError
    await Promise.all(remover.map(p =>
      auditLog('remover_participante', 'ruja_eventos_participantes', p.id, p, null)
    ))
  }

  if (adicionar.length) {
    const { error: addError } = await sb
      .from('ruja_eventos_participantes')
      .upsert(adicionar.map(p => ({
        evento_id: eventoId,
        jovem_id: p.jovem_id,
        presente: true,
        observacao: p.observacao ?? null,
        registrado_por: session.user.id,
      })), { onConflict: 'evento_id,jovem_id' })
    if (addError) throw addError
    await Promise.all(adicionar.map(p =>
      auditLog('adicionar_participante', 'ruja_eventos_participantes', `${eventoId}:${p.jovem_id}`, null, p)
    ))
  }

  if (manter.length) {
    await Promise.all(manter.map(async p => {
      const atual = atuais.find(a => a.jovem_id === p.jovem_id)
      if ((atual?.observacao ?? '') === (p.observacao ?? '')) return
      const { error: obsError } = await sb
        .from('ruja_eventos_participantes')
        .update({ observacao: p.observacao ?? null, updated_at: new Date().toISOString() })
        .eq('evento_id', eventoId)
        .eq('jovem_id', p.jovem_id)
      if (obsError) throw obsError
    }))
  }

  await auditLog('editar_evento_frequencia', 'ruja_eventos_frequencia', eventoId, antes, input)
}

export async function excluirEventoFrequencia(evento: EventoFrequencia): Promise<void> {
  const sb = createClient()
  const { error } = await sb.from('ruja_eventos_frequencia').delete().eq('id', evento.id)
  if (error) throw error
  await auditLog('excluir_evento_frequencia', 'ruja_eventos_frequencia', evento.id, evento, null)
}

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
  } catch { /* silencioso */ }
}

export async function updateJovemStatus(id: string, status: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb
    .from('ruja_jovens')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
