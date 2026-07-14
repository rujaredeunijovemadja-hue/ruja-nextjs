import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activeOfficialDepartments, departmentSlug } from '@/lib/ruja/departments'
import type { Departamento } from '@/lib/ruja/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const nome = String(body.nome ?? '').trim()
    const telefone = String(body.telefone ?? '').trim()
    const departamentoSlug = String(body.departamento_slug ?? '').trim()

    if (!nome || !telefone || !departamentoSlug) {
      return NextResponse.json({ error: 'Nome, telefone e departamento são obrigatórios.' }, { status: 400 })
    }

    const sb = await createClient()
    const { data: departamentos, error: deptError } = await sb
      .from('ruja_departamentos')
      .select('*')
      .eq('ativo', true)

    if (deptError) throw deptError

    const departamento = activeOfficialDepartments((departamentos ?? []) as Departamento[])
      .find((item) => departmentSlug(item) === departamentoSlug)

    if (!departamento) {
      return NextResponse.json({ error: 'Departamento inválido.' }, { status: 400 })
    }

    const { error } = await sb.from('ruja_cadastros_pendentes').insert({
      id: crypto.randomUUID(),
      nome,
      telefone,
      email: String(body.email ?? '').trim(),
      data_nascimento: String(body.data_nascimento ?? '').trim(),
      departamento_id: departamento.id,
      foto_path: null,
      responsavel_nome: String(body.responsavel_nome ?? '').trim(),
      responsavel_telefone: String(body.responsavel_telefone ?? '').trim(),
      observacoes: String(body.observacoes ?? '').trim(),
      status: 'pendente',
    })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[cadastros-pendentes]', error)
    return NextResponse.json({ error: 'Erro ao enviar cadastro.' }, { status: 500 })
  }
}
