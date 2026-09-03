import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, RujaAccessError } from '@/lib/ruja/server-access'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const CAMPOS_MESCLAVEIS = ['endereco', 'instagram', 'obs', 'departamento', 'lider', 'contato', 'status', 'data_batismo'] as const

/**
 * Mescla N registros de ruja_jovens duplicados em um só ("manter").
 * Ordem deliberada: reatribui todo histórico primeiro, só apaga os
 * registros perdedores por último -- se algo falhar no meio, o pior
 * cenário é sobra de linha duplicada (recuperável), nunca perda de dado.
 */
export async function POST(request: NextRequest) {
  try {
    const { admin, user } = await requireAdmin()
    const body = await request.json()
    const manterId = String(body?.manter_id ?? '')
    const removerIds: string[] = Array.isArray(body?.remover_ids) ? body.remover_ids.map(String) : []

    if (!manterId) return NextResponse.json({ error: 'manter_id é obrigatório.' }, { status: 400 })
    if (!removerIds.length) return NextResponse.json({ error: 'remover_ids não pode ser vazio.' }, { status: 400 })
    if (removerIds.includes(manterId)) {
      return NextResponse.json({ error: 'manter_id não pode estar em remover_ids.' }, { status: 400 })
    }

    const { data: registros, error: fetchError } = await admin
      .from('ruja_jovens')
      .select('*')
      .in('id', [manterId, ...removerIds])
    if (fetchError) throw fetchError
    const manter = registros?.find((r) => r.id === manterId)
    if (!manter) return NextResponse.json({ error: 'Registro a manter não encontrado.' }, { status: 404 })
    const encontrados = new Set((registros ?? []).map((r) => r.id))
    const faltando = removerIds.filter((id) => !encontrados.has(id))
    if (faltando.length) {
      return NextResponse.json({ error: `Registro(s) não encontrado(s): ${faltando.join(', ')}` }, { status: 404 })
    }

    await reatribuirHistorico(admin, manterId, removerIds)

    const atualizacoes: Record<string, unknown> = {}
    for (const campo of CAMPOS_MESCLAVEIS) {
      if (manter[campo]) continue
      const doador = registros?.find((r) => r.id !== manterId && r[campo])
      if (doador) atualizacoes[campo] = doador[campo]
    }
    if (!manter.foto_path && !manter.foto_url) {
      const doadorFoto = registros?.find((r) => r.id !== manterId && (r.foto_path || r.foto_url))
      if (doadorFoto) {
        atualizacoes.foto_path = doadorFoto.foto_path
        atualizacoes.foto_url = doadorFoto.foto_url
      }
    }
    if (Object.keys(atualizacoes).length) {
      const { error: updateError } = await admin.from('ruja_jovens').update(atualizacoes).eq('id', manterId)
      if (updateError) throw updateError
    }

    const { error: deleteError } = await admin.from('ruja_jovens').delete().in('id', removerIds)
    if (deleteError) throw deleteError

    await admin.from('ruja_audit_logs').insert({
      usuario_id: user.id,
      acao: 'jovens_duplicatas_mesclados',
      tabela: 'ruja_jovens',
      registro_id: manterId,
      dados_depois: { manter_id: manterId, remover_ids: removerIds, campos_preenchidos: atualizacoes },
    })

    return NextResponse.json({ ok: true, manter_id: manterId, removidos: removerIds, campos_preenchidos: Object.keys(atualizacoes) })
  } catch (error) {
    if (error instanceof RujaAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('[jovens/duplicatas/mesclar]', error)
    return NextResponse.json({ error: 'Não foi possível mesclar agora.' }, { status: 500 })
  }
}

async function reatribuirHistorico(admin: SupabaseClient, manterId: string, removerIds: string[]) {
  const { error: freqError } = await admin.from('ruja_frequencias').update({ jovem_id: manterId }).in('jovem_id', removerIds)
  if (freqError) throw freqError

  const { error: recError } = await admin.from('ruja_recuperacoes').update({ jovem_id: manterId }).in('jovem_id', removerIds)
  if (recError) throw recError

  const { error: acoesError } = await admin.from('ruja_cadastro_acoes').update({ jovem_id: manterId }).in('jovem_id', removerIds)
  if (acoesError) throw acoesError

  const { error: cadastroError } = await admin.from('ruja_cadastros_pendentes').update({ jovem_id_criado: manterId }).in('jovem_id_criado', removerIds)
  if (cadastroError) throw cadastroError

  const { error: missaoError } = await admin.from('ruja_missoes').update({ alvo_id: manterId }).eq('alvo_tipo', 'jovem').in('alvo_id', removerIds)
  if (missaoError) throw missaoError

  // ruja_eventos_participantes tem unique(jovem_id, evento_id) -- se o
  // "manter" já tem presença registrada no mesmo evento que um "remover",
  // reatribuir causaria conflito. Nesse caso descarta a linha do perdedor
  // (o "manter" já tem o registro de presença daquele evento).
  const { data: doManter } = await admin.from('ruja_eventos_participantes').select('evento_id').eq('jovem_id', manterId)
  const eventosDoManter = new Set((doManter ?? []).map((r) => r.evento_id))

  const { data: doRemover } = await admin.from('ruja_eventos_participantes').select('id,evento_id').in('jovem_id', removerIds)
  const paraReatribuir: string[] = []
  const paraApagar: string[] = []
  for (const linha of doRemover ?? []) {
    if (eventosDoManter.has(linha.evento_id)) paraApagar.push(linha.id)
    else paraReatribuir.push(linha.id)
  }
  if (paraReatribuir.length) {
    const { error } = await admin.from('ruja_eventos_participantes').update({ jovem_id: manterId }).in('id', paraReatribuir)
    if (error) throw error
  }
  if (paraApagar.length) {
    const { error } = await admin.from('ruja_eventos_participantes').delete().in('id', paraApagar)
    if (error) throw error
  }
}
