import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type PlatformSlug = 'nexus' | 'midia' | 'altar' | 'podsimply' | 'happy-hour' | 'central-ebd' | 'redacao' | 'palestras' | 'contabilidade'

function validMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(message => {
    if (!message || typeof message !== 'object') return false
    const candidate = message as ChatMessage
    return ['user', 'assistant'].includes(candidate.role) &&
      typeof candidate.content === 'string' && candidate.content.length > 0 && candidate.content.length <= 4000
  })
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 503 })

  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const { data: profile } = await sb
      .from('ruja_profiles')
      .select('ativo,role')
      .eq('id', user.id)
      .single()
    if (!profile?.ativo) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

    const body = await request.json().catch(() => null)
    const plataforma = (body?.plataforma ?? 'nexus') as PlatformSlug
    const plataformasValidas: PlatformSlug[] = ['nexus', 'midia', 'altar', 'podsimply', 'happy-hour', 'central-ebd', 'redacao', 'palestras', 'contabilidade']
    if (!plataformasValidas.includes(plataforma)) {
      return NextResponse.json({ error: 'Plataforma inválida.' }, { status: 400 })
    }

    if (plataforma !== 'nexus') {
      const { data: platform } = await sb.from('ruja_plataformas').select('id').eq('slug', plataforma).eq('ativo', true).maybeSingle()
      const { data: membership } = platform?.id
        ? await sb.from('ruja_usuario_plataformas').select('user_id').eq('user_id', user.id).eq('plataforma_id', platform.id).eq('ativo', true).maybeSingle()
        : { data: null }
      if (!membership && !['lider_supremo', 'administrador'].includes(profile.role)) {
        return NextResponse.json({ error: 'Sem acesso à plataforma.' }, { status: 403 })
      }
    }

    if (!validMessages(body?.mensagens)) {
      return NextResponse.json({ error: 'Mensagens inválidas.' }, { status: 400 })
    }

    // Não aceita contexto fornecido pelo cliente e não envia dados pessoais da
    // RUJA ao provedor externo. A rota atua somente como instrutora do sistema.
    const contexto = `Você é a IA da plataforma ${plataforma} do sistema RUJA. Responda em português, de forma objetiva e didática. Use somente o contexto funcional dessa plataforma. Nunca solicite, invente ou revele dados pessoais, financeiros, pastorais ou de outra plataforma. Quando pedirem análise de dados reais, informe que essa análise está indisponível neste canal por proteção de privacidade. Você é somente leitura.`

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1500,
        messages: [{ role: 'system', content: contexto }, ...body.mensagens],
      }),
    })

    if (!response.ok) {
      console.error('[Analista IA] Groq error:', await response.text())
      return NextResponse.json({ error: 'Erro ao chamar a IA.' }, { status: 502 })
    }

    const data = await response.json()
    return NextResponse.json({ content: [{ text: data.choices?.[0]?.message?.content ?? 'Sem resposta.' }] })
  } catch (error) {
    console.error('[Analista IA] Erro:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
