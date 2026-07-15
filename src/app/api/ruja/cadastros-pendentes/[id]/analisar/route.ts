import { NextRequest, NextResponse } from 'next/server'
import { assertCadastroDepartment, requireCadastroManager, RujaAccessError } from '@/lib/ruja/server-access'

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { admin, user, profile } = await requireCadastroManager()
    const { data: cadastro } = await admin.from('ruja_cadastros_pendentes').select('*').eq('id', id).single()
    if (!cadastro) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    assertCadastroDepartment(profile.role, profile.departamento_id, cadastro.departamento_id)
    if (cadastro.status !== 'pendente') return NextResponse.json({ ok: true, status: cadastro.status })

    const { error: updateError } = await admin.from('ruja_cadastros_pendentes').update({ status: 'em_analise', updated_at: new Date().toISOString() }).eq('id', cadastro.id).eq('status', 'pendente')
    if (updateError) throw updateError
    await Promise.all([
      admin.from('ruja_cadastro_acoes').insert({ cadastro_id: cadastro.id, acao: 'cadastro_em_analise', usuario_id: user.id, departamento_id: cadastro.departamento_id, dados_antes: { status: 'pendente' }, dados_depois: { status: 'em_analise' } }),
      admin.from('ruja_audit_logs').insert({ usuario_id: user.id, acao: 'cadastro_em_analise', tabela: 'ruja_cadastros_pendentes', registro_id: cadastro.id, dados_antes: { status: 'pendente' }, dados_depois: { status: 'em_analise', departamento_id: cadastro.departamento_id } }),
    ])
    return NextResponse.json({ ok: true, status: 'em_analise' })
  } catch (error) {
    if (error instanceof RujaAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[analisar cadastro]', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
