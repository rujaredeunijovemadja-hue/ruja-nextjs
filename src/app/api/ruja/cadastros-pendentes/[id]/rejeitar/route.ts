import { NextRequest, NextResponse } from 'next/server'
import { cleanText } from '@/lib/ruja/cadastro-publico'
import { assertCadastroDepartment, requireCadastroManager, RujaAccessError } from '@/lib/ruja/server-access'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { admin, user, profile } = await requireCadastroManager()
    const body = await request.json().catch(() => null)
    const motivo = cleanText(body?.motivo, 500)
    if (motivo.length < 3) return NextResponse.json({ error: 'Informe o motivo da rejeição.' }, { status: 400 })

    const { data: cadastro } = await admin.from('ruja_cadastros_pendentes').select('*').eq('id', id).single()
    if (!cadastro) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    assertCadastroDepartment(profile.role, profile.departamento_id, cadastro.departamento_id)
    if (cadastro.status === 'aprovado') return NextResponse.json({ error: 'Cadastro já aprovado.' }, { status: 409 })

    const now = new Date().toISOString()
    const { error: updateError } = await admin.from('ruja_cadastros_pendentes').update({
      status: 'rejeitado', motivo_rejeicao: motivo, rejeitado_por: user.id,
      rejeitado_em: now, updated_at: now,
    }).eq('id', cadastro.id)
    if (updateError) throw updateError
    await record(admin, cadastro, user.id, 'cadastro_rejeitado', motivo, { status: 'rejeitado' })
    return NextResponse.json({ ok: true })
  } catch (error) { return routeError(error) }
}

async function record(admin: SupabaseClient, cadastro: { id: string; departamento_id: string; status: string }, userId: string, acao: string, motivo: string, depois: unknown) {
  await Promise.all([
    admin.from('ruja_cadastro_acoes').insert({ cadastro_id: cadastro.id, acao, usuario_id: userId, departamento_id: cadastro.departamento_id, motivo, dados_antes: { status: cadastro.status }, dados_depois: depois }),
    admin.from('ruja_audit_logs').insert({ usuario_id: userId, acao, tabela: 'ruja_cadastros_pendentes', registro_id: cadastro.id, dados_antes: { status: cadastro.status }, dados_depois: depois }),
  ])
}

function routeError(error: unknown) {
  if (error instanceof RujaAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('[rejeitar cadastro]', error)
  return NextResponse.json({ error: 'Erro interno ao rejeitar cadastro.' }, { status: 500 })
}
