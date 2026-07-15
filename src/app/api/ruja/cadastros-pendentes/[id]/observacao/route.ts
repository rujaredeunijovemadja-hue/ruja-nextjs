import { NextRequest, NextResponse } from 'next/server'
import { cleanText } from '@/lib/ruja/cadastro-publico'
import { assertCadastroDepartment, requireCadastroManager, RujaAccessError } from '@/lib/ruja/server-access'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { admin, user, profile } = await requireCadastroManager()
    const body = await request.json().catch(() => null)
    const observacao = cleanText(body?.observacao, 1000)
    const { data: cadastro } = await admin.from('ruja_cadastros_pendentes').select('id,departamento_id,observacao_administrativa').eq('id', id).single()
    if (!cadastro) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    assertCadastroDepartment(profile.role, profile.departamento_id, cadastro.departamento_id)

    const { error } = await admin.from('ruja_cadastros_pendentes')
      .update({ observacao_administrativa: observacao || null, updated_at: new Date().toISOString() })
      .eq('id', cadastro.id)
    if (error) throw error
    await admin.from('ruja_audit_logs').insert({
      usuario_id: user.id,
      acao: 'observacao_cadastro_atualizada',
      tabela: 'ruja_cadastros_pendentes',
      registro_id: cadastro.id,
      dados_antes: { observacao_administrativa: cadastro.observacao_administrativa },
      dados_depois: { observacao_administrativa: observacao || null },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RujaAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[observação cadastro]', error)
    return NextResponse.json({ error: 'Erro ao salvar observação.' }, { status: 500 })
  }
}
