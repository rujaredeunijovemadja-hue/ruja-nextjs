import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any
const ROLES = ['owner', 'admin', 'gestor', 'editor', 'operador', 'visualizador'] as const

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
    const [{ data: plataformas, error: platformError }, { data: acessos, error: accessError }] = await Promise.all([
      admin.from('ruja_plataformas').select('id,nome,slug,icone,ativo').eq('ativo', true).order('ordem'),
      admin.from('ruja_usuario_plataformas').select('user_id,plataforma_id,role,departamento_id,ativo'),
    ])
    if (platformError || accessError) return NextResponse.json({ error: 'Migration de plataformas ainda não aplicada.' }, { status: 503 })
    return NextResponse.json({ plataformas: plataformas ?? [], acessos: acessos ?? [] })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSupreme()
    const body = await request.json().catch(() => null)
    if (!body?.user_id || !body?.plataforma_id) return NextResponse.json({ error: 'Usuário e plataforma são obrigatórios.' }, { status: 400 })
    if (!ROLES.includes(body.role)) return NextResponse.json({ error: 'Papel de plataforma inválido.' }, { status: 400 })

    const { data: platform } = await admin.from('ruja_plataformas').select('id,slug').eq('id', body.plataforma_id).eq('ativo', true).single()
    if (!platform) return NextResponse.json({ error: 'Plataforma não encontrada.' }, { status: 404 })
    if (platform.slug === 'nexus' && body.ativo === false) return NextResponse.json({ error: 'O acesso Nexus não pode ser removido.' }, { status: 400 })

    const { error } = await admin.from('ruja_usuario_plataformas').upsert({
      user_id: body.user_id,
      plataforma_id: body.plataforma_id,
      role: body.role,
      departamento_id: body.departamento_id ?? null,
      ativo: body.ativo !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,plataforma_id' })
    if (error) return NextResponse.json({ error: 'Não foi possível atualizar o acesso.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Response) return error
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
