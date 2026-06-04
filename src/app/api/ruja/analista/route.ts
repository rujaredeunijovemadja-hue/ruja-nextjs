// src/app/api/ruja/analista/route.ts
// ─── API ROUTE: ANALISTA IA DO RUJA ──────────────────────────
// Usa Groq (llama-3.3-70b-versatile) — variável: GROQ_API_KEY

import { NextRequest, NextResponse } from 'next/server'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GROQ_API_KEY não configurada.' }, { status: 503 })
  }

  try {
    const { mensagens, contexto } = await request.json()

    if (!mensagens || !Array.isArray(mensagens) || mensagens.length === 0) {
      return NextResponse.json({ error: 'Mensagens inválidas.' }, { status: 400 })
    }

    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      GROQ_MODEL,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: contexto },
          ...mensagens.map((m: { role: string; content: string }) => ({
            role:    m.role,
            content: m.content,
          })),
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[Analista IA] Groq error:', err)
      return NextResponse.json({ error: 'Erro ao chamar a IA.' }, { status: 502 })
    }

    const data = await response.json()

    // Retorna no mesmo formato que o frontend espera: { content: [{ text }] }
    const texto = data.choices?.[0]?.message?.content ?? 'Sem resposta.'
    return NextResponse.json({ content: [{ text: texto }] })

  } catch (error) {
    console.error('[Analista IA] Erro:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function GET()    { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
export async function DELETE() { return NextResponse.json({ error: 'Método não permitido.' }, { status: 405 }) }
