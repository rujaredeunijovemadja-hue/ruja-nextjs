// src/app/api/ruja/analista/route.ts
// ─── API ROUTE: ANALISTA IA DO RUJA ──────────────────────────
// Recebe mensagens + contexto do banco e retorna análise da IA.
// Usa Anthropic API (chave já configurada no ambiente Vercel).

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { mensagens, contexto } = await request.json()

    if (!mensagens || !Array.isArray(mensagens) || mensagens.length === 0) {
      return NextResponse.json({ error: 'mensagens inválidas' }, { status: 400 })
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: contexto,
      messages: mensagens.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Analista IA] Erro:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar análise.' },
      { status: 500 }
    )
  }
}
