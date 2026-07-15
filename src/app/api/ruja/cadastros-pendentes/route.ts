import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  ageFromBirthDate,
  cleanText,
  isValidDate,
  normalizeEmail,
  normalizeName,
  normalizePhone,
} from '@/lib/ruja/cadastro-publico'

export const runtime = 'nodejs'

const PENDING_BUCKET = 'ruja-cadastros-pendentes'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Duplicate = { origem: 'pendente' | 'jovem'; id: string; nome: string; motivos: string[] }

export async function POST(request: NextRequest) {
  let admin: SupabaseClient
  try {
    admin = getSupabaseAdmin() as unknown as SupabaseClient
  } catch {
    return NextResponse.json({ error: 'Cadastro temporariamente indisponível.' }, { status: 503 })
  }

  let uploadedPath = ''
  try {
    const form = await request.formData()
    const submissionToken = cleanText(form.get('submission_token'), 36)
    const nome = cleanText(form.get('nome'), 120)
    const telefone = cleanText(form.get('telefone'), 30)
    const telefoneNormalizado = normalizePhone(telefone)
    const email = normalizeEmail(cleanText(form.get('email'), 160))
    const dataNascimento = cleanText(form.get('data_nascimento'), 10)
    const departamentoSlug = cleanText(form.get('departamento_slug'), 20).toLowerCase()
    const endereco = cleanText(form.get('endereco'), 240)
    const tempoRuja = cleanText(form.get('tempo_ruja'), 100)
    const observacoes = cleanText(form.get('observacoes'), 1000)
    const responsavelNome = cleanText(form.get('responsavel_nome'), 120)
    const responsavelTelefone = cleanText(form.get('responsavel_telefone'), 30)
    const batizado = form.get('batizado') === 'true'
    const dataBatismo = cleanText(form.get('data_batismo'), 10)
    const consentimentoDados = form.get('consentimento_dados') === 'true'
    const autorizacaoResponsavel = form.get('autorizacao_responsavel') === 'true'
    const foto = form.get('foto')

    if (!UUID.test(submissionToken)) {
      return NextResponse.json({ error: 'Identificador de envio inválido. Atualize a página.' }, { status: 400 })
    }

    const { data: existente } = await admin
      .from('ruja_cadastros_pendentes')
      .select('id,created_at')
      .eq('submission_token', submissionToken)
      .maybeSingle()
    if (existente) {
      return NextResponse.json({ ok: true, protocolo: protocol(existente.id), enviado_em: existente.created_at })
    }

    if (nome.length < 3) return fieldError('nome', 'Informe o nome completo.')
    if (!isValidDate(dataNascimento)) return fieldError('data_nascimento', 'Informe uma data de nascimento válida.')
    if (telefoneNormalizado.length < 10 || telefoneNormalizado.length > 11) {
      return fieldError('telefone', 'Informe um telefone com DDD.')
    }
    if (!['teens', 'simply'].includes(departamentoSlug)) {
      return fieldError('departamento_slug', 'Escolha Teens ou Simply.')
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fieldError('email', 'Informe um email válido.')
    }
    if (!consentimentoDados) {
      return fieldError('consentimento_dados', 'Autorize o armazenamento dos dados para continuar.')
    }
    if (batizado && dataBatismo && !isValidDate(dataBatismo)) {
      return fieldError('data_batismo', 'Informe uma data de batismo válida.')
    }

    const idade = ageFromBirthDate(dataNascimento)
    if (idade < 0 || idade > 100) return fieldError('data_nascimento', 'Confira a data de nascimento.')
    if (idade < 18) {
      if (responsavelNome.length < 3) return fieldError('responsavel_nome', 'Informe o nome do responsável.')
      if (normalizePhone(responsavelTelefone).length < 10) {
        return fieldError('responsavel_telefone', 'Informe o telefone do responsável com DDD.')
      }
      if (!autorizacaoResponsavel) {
        return fieldError('autorizacao_responsavel', 'É necessária a autorização do responsável.')
      }
    }

    const { data: departamento } = await admin
      .from('ruja_departamentos')
      .select('id,nome,slug,ativo')
      .eq('slug', departamentoSlug)
      .eq('ativo', true)
      .maybeSingle()
    if (!departamento || !['teens', 'simply'].includes(departamento.id)) {
      return fieldError('departamento_slug', 'Departamento indisponível.')
    }

    let photoBuffer: Buffer | null = null
    if (foto instanceof File && foto.size > 0) {
      if (foto.size > MAX_PHOTO_BYTES) return fieldError('foto', 'A foto deve ter no máximo 5 MB.')
      if (!PHOTO_TYPES.has(foto.type)) return fieldError('foto', 'Use uma foto JPG, PNG ou WEBP.')
      photoBuffer = await sharp(Buffer.from(await foto.arrayBuffer()), {
        failOn: 'warning',
        limitInputPixels: 20_000_000,
      })
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
    }

    const nomeNormalizado = normalizeName(nome)
    const duplicates = await findDuplicates(admin, {
      nomeNormalizado,
      dataNascimento,
      telefoneNormalizado,
      email,
    })
    const cadastroId = crypto.randomUUID()

    if (photoBuffer) {
      uploadedPath = `cadastros-pendentes/${cadastroId}/foto.webp`
      const { error: uploadError } = await admin.storage
        .from(PENDING_BUCKET)
        .upload(uploadedPath, photoBuffer, { contentType: 'image/webp', upsert: false })
      if (uploadError) throw uploadError
    }

    const payload = {
      id: cadastroId,
      submission_token: submissionToken,
      nome,
      nome_normalizado: nomeNormalizado,
      telefone,
      telefone_normalizado: telefoneNormalizado,
      email: email || null,
      email_normalizado: email || null,
      data_nascimento: dataNascimento,
      departamento_id: departamento.id,
      foto_path: uploadedPath || null,
      endereco: endereco || null,
      tempo_ruja: tempoRuja || null,
      batizado,
      data_batismo: batizado && dataBatismo ? dataBatismo : null,
      responsavel_nome: responsavelNome || null,
      responsavel_telefone: responsavelTelefone || null,
      autorizacao_responsavel: idade < 18 && autorizacaoResponsavel,
      consentimento_dados: true,
      observacoes: observacoes || null,
      status: 'pendente',
      possivel_duplicidade: duplicates.length > 0,
      duplicidade_detalhes: duplicates.length ? duplicates : null,
    }
    const { data: cadastro, error: insertError } = await admin
      .from('ruja_cadastros_pendentes')
      .insert(payload)
      .select('id,created_at')
      .single()
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: repetido } = await admin
          .from('ruja_cadastros_pendentes')
          .select('id,created_at')
          .eq('submission_token', submissionToken)
          .single()
        if (uploadedPath) await admin.storage.from(PENDING_BUCKET).remove([uploadedPath])
        if (!repetido) throw insertError
        return NextResponse.json({ ok: true, protocolo: protocol(repetido.id), enviado_em: repetido.created_at })
      }
      throw insertError
    }

    const actions = [{
      cadastro_id: cadastro.id,
      acao: 'cadastro_publico_enviado',
      departamento_id: departamento.id,
      dados_depois: { possivel_duplicidade: duplicates.length > 0, possui_foto: Boolean(uploadedPath) },
    }]
    if (duplicates.length) actions.push({
      cadastro_id: cadastro.id,
      acao: 'duplicidade_identificada',
      departamento_id: departamento.id,
      dados_depois: { possivel_duplicidade: true, possui_foto: Boolean(uploadedPath) },
    })
    await admin.from('ruja_cadastro_acoes').insert(actions)
    await admin.from('ruja_audit_logs').insert({
      usuario_id: null,
      acao: 'cadastro_publico_enviado',
      tabela: 'ruja_cadastros_pendentes',
      registro_id: cadastro.id,
      dados_depois: { departamento_id: departamento.id, possivel_duplicidade: duplicates.length > 0 },
    })

    return NextResponse.json({ ok: true, protocolo: protocol(cadastro.id), enviado_em: cadastro.created_at }, { status: 201 })
  } catch (error) {
    if (uploadedPath) {
      try { await admin.storage.from(PENDING_BUCKET).remove([uploadedPath]) } catch { /* cleanup best effort */ }
    }
    console.error('[cadastros-pendentes]', error)
    return NextResponse.json({ error: 'Não foi possível enviar agora. Tente novamente.' }, { status: 500 })
  }
}

function fieldError(field: string, error: string) {
  return NextResponse.json({ error, field }, { status: 400 })
}

function protocol(id: string) {
  return `RUJA-${String(id).replaceAll('-', '').slice(0, 10).toUpperCase()}`
}

async function findDuplicates(admin: SupabaseClient, input: {
  nomeNormalizado: string
  dataNascimento: string
  telefoneNormalizado: string
  email: string
}): Promise<Duplicate[]> {
  const [pendingResult, jovensResult] = await Promise.all([
    admin.from('ruja_cadastros_pendentes')
      .select('id,nome,nome_normalizado,data_nascimento,telefone_normalizado,email_normalizado,status')
      .in('status', ['pendente', 'em_analise', 'correcao_solicitada', 'aprovado'])
      .limit(5000),
    admin.from('ruja_jovens').select('id,nome,data_nasc,contato').limit(5000),
  ])

  const found: Duplicate[] = []
  for (const item of pendingResult.data ?? []) {
    const motivos: string[] = []
    if (item.nome_normalizado === input.nomeNormalizado && item.data_nascimento === input.dataNascimento) motivos.push('mesmo nome e nascimento')
    if (item.telefone_normalizado === input.telefoneNormalizado) motivos.push('mesmo telefone')
    if (input.email && item.email_normalizado === input.email) motivos.push('mesmo email')
    if (motivos.length) found.push({ origem: 'pendente', id: item.id, nome: item.nome, motivos })
  }
  for (const item of jovensResult.data ?? []) {
    const motivos: string[] = []
    if (normalizeName(item.nome) === input.nomeNormalizado && item.data_nasc === input.dataNascimento) motivos.push('mesmo nome e nascimento')
    if (normalizePhone(item.contato ?? '') === input.telefoneNormalizado) motivos.push('mesmo telefone')
    if (motivos.length) found.push({ origem: 'jovem', id: item.id, nome: item.nome, motivos })
  }
  return found.slice(0, 10)
}
