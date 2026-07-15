// src/app/api/ruja/users/update/route.ts
// ─── API ROUTE: EDITAR USUÁRIO ────────────────────────────────
// Permite editar: role, departamento_id, ativo, nome.
// Apenas lider_supremo pode alterar cargos e status de outras contas.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }     from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

const ROLES_COM_PERMISSAO = ['lider_supremo'] as const
const ROLES_VALIDAS       = ['lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador'] as const

export async function PATCH(request: NextRequest) {
  let admin: AdminClient
  try {
    admin = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: 'Servidor não configurado.' }, { status: 503 })
  }

  try {
    // ── 1. Sessão ────────────────────────────────────────────
    const sb = await createClient()
    const { data: { user: caller } } = await sb.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    // ── 2. Permissão do caller ───────────────────────────────
    const { data: callerProfile } = await admin
      .from('ruja_profiles')
      .select('role, nome, ativo')
      .eq('id', caller.id)
      .single() as { data: { role: string; nome: string; ativo: boolean } | null }

    if (!callerProfile?.ativo) {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
    }
    if (!ROLES_COM_PERMISSAO.includes(callerProfile.role as typeof ROLES_COM_PERMISSAO[number])) {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
    }

    // ── 3. Body ──────────────────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body?.id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

    const { id: targetId, role: novoRole, departamento_id, ativo, nome } = body

    // Não pode editar o próprio cargo/ativo
    if (targetId === caller.id && (novoRole !== undefined || ativo !== undefined)) {
      return NextResponse.json(
        { error: 'Você não pode alterar seu próprio cargo ou status.' },
        { status: 400 }
      )
    }

    // Buscar perfil alvo
    const { data: targetProfile } = await admin
      .from('ruja_profiles')
      .select('role, nome, email, departamento_id')
      .eq('id', targetId)
      .single() as { data: { role: string; nome: string; email: string; departamento_id: string | null } | null }

    if (!targetProfile) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    // Validar novo role se fornecido
    if (novoRole !== undefined) {
      if (!ROLES_VALIDAS.includes(novoRole)) {
        return NextResponse.json({ error: `Cargo inválido: ${novoRole}` }, { status: 400 })
      }
      if (['lider_supremo', 'administrador'].includes(novoRole) && callerProfile.role !== 'lider_supremo') {
        return NextResponse.json(
          { error: 'Apenas o Líder Supremo pode promover a Administrador.' },
          { status: 403 }
        )
      }
    }

    // Validar departamento_id se fornecido
    if (departamento_id) {
      const { data: depto } = await admin
        .from('ruja_departamentos')
        .select('id')
        .eq('id', departamento_id)
        .single()
      if (!depto) {
        return NextResponse.json({ error: 'Departamento não encontrado.' }, { status: 400 })
      }
    }
    const roleFinal = novoRole ?? targetProfile.role
    const departamentoFinal = departamento_id === undefined ? targetProfile.departamento_id : departamento_id
    if (
      ['lider_departamento', 'voluntario', 'visualizador'].includes(roleFinal) &&
      !['teens', 'simply'].includes(departamentoFinal ?? '')
    ) {
      return NextResponse.json({ error: 'Este cargo exige Teens ou Simply.' }, { status: 400 })
    }

    // ── 4. Montar update ─────────────────────────────────────
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (novoRole      !== undefined) updates.role            = novoRole
    if (departamento_id !== undefined) updates.departamento_id = departamento_id ?? null
    if (ativo         !== undefined) updates.ativo           = ativo
    if (nome?.trim())                updates.nome            = nome.trim()

    const { error: updateErr } = await admin
      .from('ruja_profiles')
      .update(updates)
      .eq('id', targetId)

    if (updateErr) {
      console.error('[API /users/update]', updateErr.message)
      return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 })
    }

    // ── 5. Se desativando, também bloquear no Auth ───────────
    if (ativo === false) {
      await admin.auth.admin.updateUserById(targetId, { ban_duration: '876600h' }).catch(() => {})
    }
    if (ativo === true) {
      await admin.auth.admin.updateUserById(targetId, { ban_duration: 'none' }).catch(() => {})
    }

    // ── 6. Audit log ─────────────────────────────────────────
    const { error: auditError } = await admin
      .from('ruja_audit_logs')
      .insert({
        usuario_id:   caller.id,
        acao:         'editar_usuario',
        tabela:       'ruja_profiles',
        registro_id:  targetId,
        dados_antes:  { role: targetProfile.role, nome: targetProfile.nome },
        dados_depois: { ...updates, editado_por: callerProfile.nome },
      })
    if (auditError) {
      console.error('[API /users/update] Audit error:', auditError.message)
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error('[API /users/update] Unexpected:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function GET()    { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
export async function POST()   { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
