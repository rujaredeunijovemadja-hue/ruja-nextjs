import { NextRequest, NextResponse } from 'next/server'
import { assertCadastroDepartment, requireCadastroManager, RujaAccessError } from '@/lib/ruja/server-access'

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { admin, profile } = await requireCadastroManager()
    const { data: cadastro } = await admin.from('ruja_cadastros_pendentes').select('departamento_id,foto_path').eq('id', id).single()
    if (!cadastro?.foto_path) return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })
    assertCadastroDepartment(profile.role, profile.departamento_id, cadastro.departamento_id)
    const { data, error } = await admin.storage.from('ruja-cadastros-pendentes').createSignedUrl(cadastro.foto_path, 300)
    if (error || !data?.signedUrl) throw error
    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    if (error instanceof RujaAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[foto cadastro]', error)
    return NextResponse.json({ error: 'Erro ao abrir foto.' }, { status: 500 })
  }
}
