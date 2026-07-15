import { NextRequest, NextResponse } from 'next/server'
import { cleanText } from '@/lib/ruja/cadastro-publico'
import { assertCadastroDepartment, requireCadastroManager, RujaAccessError } from '@/lib/ruja/server-access'

const ALLOWED_FIELDS = new Set(['nome', 'data_nascimento', 'telefone', 'email', 'foto', 'departamento', 'responsavel', 'endereco', 'batismo', 'outro'])

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { admin, user, profile } = await requireCadastroManager()
    const body = await request.json().catch(() => null)
    const motivo = cleanText(body?.motivo, 600)
    const campos = Array.isArray(body?.campos)
      ? [...new Set(body.campos.map((item: unknown) => cleanText(item, 30)).filter((item: string) => ALLOWED_FIELDS.has(item)))].slice(0, 10)
      : []
    if (motivo.length < 3 || campos.length === 0) {
      return NextResponse.json({ error: 'Selecione o campo e descreva a correção necessária.' }, { status: 400 })
    }

    const { data: cadastro } = await admin.from('ruja_cadastros_pendentes').select('*').eq('id', id).single()
    if (!cadastro) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    assertCadastroDepartment(profile.role, profile.departamento_id, cadastro.departamento_id)
    if (['aprovado', 'rejeitado'].includes(cadastro.status)) return NextResponse.json({ error: 'Cadastro já finalizado.' }, { status: 409 })

    const now = new Date().toISOString()
    const { error: updateError } = await admin.from('ruja_cadastros_pendentes').update({
      status: 'correcao_solicitada', solicitacao_correcao: motivo,
      campos_correcao: campos, updated_at: now,
    }).eq('id', cadastro.id)
    if (updateError) throw updateError
    await Promise.all([
      admin.from('ruja_cadastro_acoes').insert({ cadastro_id: cadastro.id, acao: 'correcao_solicitada', usuario_id: user.id, departamento_id: cadastro.departamento_id, motivo, dados_antes: { status: cadastro.status }, dados_depois: { status: 'correcao_solicitada', campos } }),
      admin.from('ruja_audit_logs').insert({ usuario_id: user.id, acao: 'correcao_solicitada', tabela: 'ruja_cadastros_pendentes', registro_id: cadastro.id, dados_antes: { status: cadastro.status }, dados_depois: { status: 'correcao_solicitada', campos, motivo } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RujaAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[solicitar correção]', error)
    return NextResponse.json({ error: 'Erro interno ao solicitar correção.' }, { status: 500 })
  }
}
