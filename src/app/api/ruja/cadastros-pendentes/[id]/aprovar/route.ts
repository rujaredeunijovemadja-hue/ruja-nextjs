import { NextRequest, NextResponse } from 'next/server'
import { assertCadastroDepartment, requireCadastroManager, RujaAccessError } from '@/lib/ruja/server-access'
import { ageFromBirthDate, normalizeName, normalizePhone } from '@/lib/ruja/cadastro-publico'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const PENDING_BUCKET = 'ruja-cadastros-pendentes'
const FINAL_BUCKET = process.env.NEXT_PUBLIC_FOTO_BUCKET ?? 'ruja-jovens-fotos'

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const { admin, user, profile } = await requireCadastroManager()
    const { data: cadastro } = await admin
      .from('ruja_cadastros_pendentes')
      .select('*, departamento:ruja_departamentos(id,nome,slug)')
      .eq('id', id)
      .single()
    if (!cadastro) return NextResponse.json({ error: 'Cadastro não encontrado.' }, { status: 404 })
    assertCadastroDepartment(profile.role, profile.departamento_id, cadastro.departamento_id)

    if (cadastro.status === 'aprovado' && cadastro.jovem_id_criado) {
      return NextResponse.json({ ok: true, ja_aprovado: true, jovem_id: cadastro.jovem_id_criado })
    }
    if (cadastro.status === 'rejeitado') {
      return NextResponse.json({ error: 'Cadastro rejeitado não pode ser aprovado sem nova análise.' }, { status: 409 })
    }
    if (!cadastro.data_nascimento) {
      return NextResponse.json({ error: 'Solicite a correção da data de nascimento antes de aprovar.' }, { status: 409 })
    }

    const jovemId = cadastro.jovem_id_criado || `cad_${cadastro.id}`
    const recheckedDuplicates = await recheckDuplicates(admin, cadastro, jovemId)
    const duplicateDetails = [
      ...(Array.isArray(cadastro.duplicidade_detalhes) ? cadastro.duplicidade_detalhes : []),
      ...recheckedDuplicates,
    ].filter((item, index, all) => all.findIndex(other => other.origem === item.origem && other.id === item.id) === index).slice(0, 10)
    let finalPhotoPath = ''
    let finalPhotoUrl = ''

    if (cadastro.foto_path) {
      const { data: photo, error: downloadError } = await admin.storage
        .from(PENDING_BUCKET)
        .download(cadastro.foto_path)
      if (downloadError) throw new Error(`Foto pendente indisponível: ${downloadError.message}`)
      finalPhotoPath = `jovens/${jovemId}/perfil.webp`
      const { error: uploadError } = await admin.storage
        .from(FINAL_BUCKET)
        .upload(finalPhotoPath, Buffer.from(await photo.arrayBuffer()), {
          contentType: 'image/webp',
          upsert: true,
        })
      if (uploadError) throw uploadError
      const { data: signed } = await admin.storage.from(FINAL_BUCKET)
        .createSignedUrl(finalPhotoPath, 60 * 60 * 24 * 365)
      finalPhotoUrl = signed?.signedUrl ?? ''
    }

    const { error: jovemError } = await admin.from('ruja_jovens').upsert({
      id: jovemId,
      nome: cadastro.nome,
      idade: ageFromBirthDate(cadastro.data_nascimento),
      contato: cadastro.telefone ?? '',
      instagram: '',
      endereco: cadastro.endereco ?? '',
      departamento: cadastro.departamento?.nome ?? cadastro.departamento_id,
      lider: '',
      status: 'Em Risco',
      entrada: new Date().toISOString().slice(0, 10),
      batizado: cadastro.batizado ? 'sim' : 'nao',
      data_batismo: cadastro.data_batismo ?? '',
      data_nasc: cadastro.data_nascimento,
      obs: cadastro.observacoes ?? '',
      foto_path: finalPhotoPath,
      foto_url: finalPhotoUrl,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (jovemError) throw jovemError

    const now = new Date().toISOString()
    const { error: updateError } = await admin.from('ruja_cadastros_pendentes').update({
      status: 'aprovado',
      jovem_id_criado: jovemId,
      aprovado_por: user.id,
      aprovado_em: now,
      rejeitado_por: null,
      rejeitado_em: null,
      motivo_rejeicao: null,
      possivel_duplicidade: duplicateDetails.length > 0,
      duplicidade_detalhes: duplicateDetails.length ? duplicateDetails : null,
      updated_at: now,
    }).eq('id', cadastro.id)
    if (updateError) throw updateError

    await Promise.all([
      admin.from('ruja_cadastro_acoes').insert({
        cadastro_id: cadastro.id,
        acao: 'cadastro_aprovado',
        usuario_id: user.id,
        jovem_id: jovemId,
        departamento_id: cadastro.departamento_id,
        dados_antes: { status: cadastro.status },
        dados_depois: { status: 'aprovado', jovem_id: jovemId, foto_path: finalPhotoPath || null },
      }),
      admin.from('ruja_audit_logs').insert({
        usuario_id: user.id,
        acao: 'cadastro_aprovado',
        tabela: 'ruja_cadastros_pendentes',
        registro_id: cadastro.id,
        dados_antes: { status: cadastro.status },
        dados_depois: { status: 'aprovado', jovem_id: jovemId, departamento_id: cadastro.departamento_id },
      }),
    ])

    return NextResponse.json({ ok: true, ja_aprovado: false, jovem_id: jovemId })
  } catch (error) {
    return routeError(error, '[aprovar cadastro]')
  }
}

type ApprovalCadastro = {
  nome: string
  telefone: string | null
  data_nascimento: string
}

async function recheckDuplicates(admin: SupabaseClient, cadastro: ApprovalCadastro, jovemId: string) {
  const { data: jovens } = await admin.from('ruja_jovens').select('id,nome,data_nasc,contato').neq('id', jovemId).limit(5000)
  return (jovens ?? []).flatMap((jovem: { id: string; nome: string; data_nasc: string; contato: string }) => {
    const motivos: string[] = []
    if (normalizeName(jovem.nome) === normalizeName(cadastro.nome) && jovem.data_nasc === cadastro.data_nascimento) motivos.push('mesmo nome e nascimento')
    if (normalizePhone(jovem.contato ?? '') === normalizePhone(cadastro.telefone ?? '')) motivos.push('mesmo telefone')
    return motivos.length ? [{ origem: 'jovem', id: jovem.id, nome: jovem.nome, motivos }] : []
  }).slice(0, 10)
}

function routeError(error: unknown, label: string) {
  if (error instanceof RujaAccessError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error(label, error)
  return NextResponse.json({ error: 'Erro interno ao aprovar cadastro.' }, { status: 500 })
}
