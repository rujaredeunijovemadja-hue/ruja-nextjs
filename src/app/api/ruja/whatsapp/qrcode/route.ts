// src/app/api/ruja/whatsapp/qrcode/route.ts
// ─── API ROUTE: QR CODE DA AUTOMAÇÃO WHATSAPP ─────────────────
// Gera/consulta o QR code da instância oficial da RUJA na Evolution API
// isolada (container próprio, ver PLANO_AUTOMACAO_WHATSAPP_RUJA.md).
// A key da Evolution nunca vai ao navegador -- só o QR/estado.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const ROLES_COM_PERMISSAO = ['lider_supremo', 'administrador'] as const

function evolutionConfig() {
  const baseUrl = process.env.RUJA_EVOLUTION_API_URL
  const apiKey = process.env.RUJA_EVOLUTION_API_KEY
  const instance = process.env.RUJA_EVOLUTION_INSTANCE
  if (!baseUrl || !apiKey || !instance) return null
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey, instance }
}

export async function GET(request: NextRequest) {
  const sb = await createClient()
  const { data: { user }, error: sessErr } = await sb.auth.getUser()
  if (sessErr || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const { data: profile } = await admin
    .from('ruja_profiles')
    .select('role, ativo')
    .eq('id', user.id)
    .single() as { data: { role: string; ativo: boolean } | null }

  if (!profile?.ativo || !ROLES_COM_PERMISSAO.includes(profile.role as typeof ROLES_COM_PERMISSAO[number])) {
    return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
  }

  const cfg = evolutionConfig()
  if (!cfg) {
    return NextResponse.json({ error: 'Evolution da RUJA não configurada (RUJA_EVOLUTION_API_URL/KEY/INSTANCE).' }, { status: 503 })
  }

  const check = new URL(request.url).searchParams.get('check')
  const headers = { 'Content-Type': 'application/json', apikey: cfg.apiKey }
  const inst = encodeURIComponent(cfg.instance)

  try {
    if (check === 'state') {
      const res = await fetch(`${cfg.baseUrl}/instance/connectionState/${inst}`, { headers })
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      const rawState = (data as { instance?: { state?: string } })?.instance?.state ?? null
      const connected = rawState === 'open'
      return NextResponse.json({ ok: res.ok, connected, rawState })
    }

    // GET /instance/connect/{instance} devolve o QR se ainda não pareado,
    // ou confirma que já está conectado.
    const res = await fetch(`${cfg.baseUrl}/instance/connect/${inst}`, { headers })
    const data = await res.json().catch(() => ({} as Record<string, unknown>))
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Evolution retornou ${res.status}` }, { status: 502 })
    }

    const qr = (data as { base64?: string; qrcode?: { base64?: string } })
    const base64 = qr.base64 ?? qr.qrcode?.base64 ?? null
    const rawState = (data as { instance?: { state?: string } })?.instance?.state ?? null

    return NextResponse.json({ ok: true, base64, connected: rawState === 'open', rawState })
  } catch (err) {
    // "fetch failed" sozinho não diz nada -- err.cause tem a causa real
    // (ECONNREFUSED, timeout, TLS...). Acesso 30/08/2026: 502 em toda
    // tentativa (nunca chega log na Evolution) -- precisamos da causa
    // exata pra saber se é timeout, DNS ou TLS entre Vercel e o Tailscale
    // Funnel.
    const cause = err instanceof Error && 'cause' in err ? (err as { cause?: unknown }).cause : undefined
    console.error('[ruja/whatsapp/qrcode] falha ao chamar Evolution', {
      message: err instanceof Error ? err.message : String(err),
      causeMessage: cause instanceof Error ? cause.message : cause ? String(cause) : null,
      causeCode: cause && typeof cause === 'object' && 'code' in cause ? (cause as { code?: unknown }).code : null,
      baseUrl: cfg.baseUrl,
    })
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Falha ao consultar a Evolution.',
      causeMessage: cause instanceof Error ? cause.message : cause ? String(cause) : null,
      causeCode: cause && typeof cause === 'object' && 'code' in cause ? (cause as { code?: unknown }).code : null,
    }, { status: 502 })
  }
}
