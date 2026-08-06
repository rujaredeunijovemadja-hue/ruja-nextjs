// src/app/api/ruja/users/create/route.ts
// ─── API ROUTE: CRIAR USUÁRIO ─────────────────────────────────
// Alinhado com schema real: departamento_id (FK), created_at, updated_at.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }     from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any

const ROLES_COM_PERMISSAO = ['lider_supremo'] as const
const ROLES_VALIDAS       = ['lider_supremo', 'administrador', 'lider_departamento', 'voluntario', 'visualizador'] as const

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function senhaForte(p: string): { ok: boolean; msg: string } {
  if (p.length < 8)      return { ok: false, msg: 'Senha deve ter no mínimo 8 caracteres.' }
  if (!/[A-Z]/.test(p)) return { ok: false, msg: 'Senha deve ter ao menos uma letra maiúscula.' }
  if (!/[0-9]/.test(p)) return { ok: false, msg: 'Senha deve ter ao menos um número.' }
  return { ok: true, msg: '' }
}

export async function POST(request: NextRequest) {
  let admin: AdminClient
  try {
    admin = getSupabaseAdmin()
  } catch (e) {
    console.error('[API /users/create]', e)
    return NextResponse.json(
      { error: 'Servidor não configurado. Contate o administrador.' },
      { status: 503 }
    )
  }

  try {
    // ── 1. Verificar sessão ──────────────────────────────────
    const sb = await createClient()
    const { data: { user: caller }, error: sessErr } = await sb.auth.getUser()
    if (sessErr || !caller) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    // ── 2. Verificar permissão ───────────────────────────────
    const { data: callerProfile, error: profErr } = await admin
      .from('ruja_profiles')
      .select('role, nome, ativo')
      .eq('id', caller.id)
      .single() as { data: { role: string; nome: string; ativo: boolean } | null; error: unknown }

    if (profErr || !callerProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 403 })
    }
    if (!callerProfile.ativo) {
      return NextResponse.json({ error: 'Conta inativa.' }, { status: 403 })
    }
    if (!ROLES_COM_PERMISSAO.includes(callerProfile.role as typeof ROLES_COM_PERMISSAO[number])) {
      return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
    }

    // ── 3. Validar body ──────────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })

    const {
      nome,
      email,
      senha: senhaInput,
      role: novoRole = 'voluntario',
      departamento_id = null,
    } = body

    if (!nome?.trim())
      return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    if (!email?.trim() || !emailValido(email.trim()))
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    if (!ROLES_VALIDAS.includes(novoRole))
      return NextResponse.json({ error: `Cargo inválido: ${novoRole}` }, { status: 400 })

    // Apenas lider_supremo cria administrador/lider_supremo
    if (['lider_supremo', 'administrador'].includes(novoRole) && callerProfile.role !== 'lider_supremo') {
      return NextResponse.json(
        { error: 'Apenas o Líder Supremo pode criar Administradores.' },
        { status: 403 }
      )
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
    if (['lider_departamento', 'voluntario', 'visualizador'].includes(novoRole) && !['teens', 'simply'].includes(departamento_id)) {
      return NextResponse.json({ error: 'Este cargo exige Teens ou Simply.' }, { status: 400 })
    }

    // Senha
    const senha = senhaInput?.trim() || gerarSenha()
    const { ok: senhaOk, msg: senhaMsg } = senhaForte(senha)
    if (!senhaOk) return NextResponse.json({ error: senhaMsg }, { status: 400 })

    // ── 4. Criar no Supabase Auth ────────────────────────────
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password:      senha,
      email_confirm: true,
      user_metadata: { nome: nome.trim(), role: novoRole },
    })

    if (createErr) {
      if (
        createErr.message.includes('already been registered') ||
        createErr.message.includes('already exists') ||
        createErr.message.includes('duplicate')
      ) {
        return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 })
      }
      console.error('[API /users/create] Auth error:', createErr.message)
      return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 })
    }

    if (!newUser?.user) {
      return NextResponse.json({ error: 'Resposta inesperada do servidor.' }, { status: 500 })
    }

    const uid = newUser.user.id
    const now = new Date().toISOString()

    // ── 5. Criar ruja_profiles (schema real) ─────────────────
    const { error: profInsertErr } = await admin
      .from('ruja_profiles')
      .upsert({
        id:              uid,
        nome:            nome.trim(),
        email:           email.trim().toLowerCase(),
        role:            novoRole,
        departamento_id: departamento_id ?? null,
        ativo:           true,
        created_at:      now,
        updated_at:      now,
      }, { onConflict: 'id' })

    if (profInsertErr) {
      // Rollback: deletar usuário Auth
      await admin.auth.admin.deleteUser(uid).catch(() => {})
      console.error('[API /users/create] Profile error:', profInsertErr.message)
      return NextResponse.json({ error: 'Erro ao criar perfil.' }, { status: 500 })
    }

    // O acesso Nexus e criado automaticamente; acessos a outras plataformas
    // continuam sendo concedidos separadamente pelo catalogo de plataformas.
    const { data: nexus } = await admin
      .from('ruja_plataformas')
      .select('id')
      .eq('slug', 'nexus')
      .maybeSingle()
    if (nexus?.id) {
      await admin.from('ruja_usuario_plataformas').upsert({
        user_id: uid,
        plataforma_id: nexus.id,
        role: novoRole === 'lider_supremo' ? 'owner' : novoRole === 'administrador' ? 'admin' : novoRole === 'lider_departamento' ? 'gestor' : novoRole === 'voluntario' ? 'operador' : 'visualizador',
        departamento_id: departamento_id ?? null,
        ativo: true,
      }, { onConflict: 'user_id,plataforma_id' })
    }

    // ── 6. Audit log (silencioso) ────────────────────────────
    const { error: auditError } = await admin
      .from('ruja_audit_logs')
      .insert({
        usuario_id:   caller.id,
        acao:         'criar_usuario',
        tabela:       'ruja_profiles',
        registro_id:  uid,
        dados_depois: {
          nome:           nome.trim(),
          email:          email.trim().toLowerCase(),
          role:           novoRole,
          departamento_id,
          criado_por:     callerProfile.nome,
        },
      })
    if (auditError) {
      console.error('[API /users/create] Audit error:', auditError.message)
    }

    // ── 7. Retornar — senha só aparece se foi gerada pelo server
    const resposta: Record<string, unknown> = {
      ok: true,
      usuario: {
        id:    uid,
        email: newUser.user.email,
        nome:  nome.trim(),
        role:  novoRole,
      },
    }
    if (!senhaInput?.trim()) {
      resposta.senhaTemporaria = senha
    }

    return NextResponse.json(resposta, { status: 201 })

  } catch (err) {
    console.error('[API /users/create] Unexpected:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function GET()    { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
export async function PUT()    { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
