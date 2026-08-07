import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

async function requireSupreme() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Response('Não autenticado.', { status: 401 })
  const admin = getSupabaseAdmin() as AdminClient
  const { data: profile } = await admin.from('ruja_profiles').select('role,ativo').eq('id', user.id).single()
  if (!profile?.ativo || profile.role !== 'lider_supremo') throw new Response('Permissão negada.', { status: 403 })
  return admin
}

export async function GET() {
  try {
    const admin = await requireSupreme()
    const [{ data: plataformas, error: platformError }, { data: modules, error: moduleError }] = await Promise.all([
      admin.from('ruja_plataformas').select('id,nome,slug,descricao,icone,cor,ativo,ordem').order('ordem'),
      admin.from('ruja_plataforma_modulos').select('plataforma_id,ativo,ordem,modulo:ruja_modulos(chave,nome,descricao)'),
    ])
    if (platformError || moduleError) return NextResponse.json({ error: 'Migration de plataformas ainda não aplicada.' }, { status: 503 })
    return NextResponse.json({ plataformas: plataformas ?? [], modulos: modules ?? [] })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSupreme()
    const body = await request.json().catch(() => null)
    if (!body?.id || typeof body.ativo !== 'boolean') return NextResponse.json({ error: 'ID e status são obrigatórios.' }, { status: 400 })
    const { error } = await admin.from('ruja_plataformas').update({ ativo: body.ativo, ordem: body.ordem, updated_at: new Date().toISOString() }).eq('id', body.id)
    if (error) return NextResponse.json({ error: 'Não foi possível atualizar a plataforma.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
