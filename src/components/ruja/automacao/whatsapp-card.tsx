'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, MessageCircle, RefreshCw } from 'lucide-react'
import Card from './card'

export default function WhatsappAutomacaoCard() {
  const [qr, setQr] = useState<string | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const buscarQr = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/ruja/whatsapp/qrcode')
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        const detalhe = [data.causeCode, data.causeMessage].filter(Boolean).join(': ')
        setErro((data.error ?? 'Erro ao gerar QR code.') + (detalhe ? ` (${detalhe})` : ''))
        setQr(null)
        return
      }
      setConnected(Boolean(data.connected))
      setQr(data.connected ? null : (data.base64 ?? null))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao conectar.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (connected) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/ruja/whatsapp/qrcode?check=state')
        const data = await res.json()
        if (data.connected) {
          setConnected(true)
          setQr(null)
        }
      } catch {
        // silencioso -- próximo poll tenta de novo
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [connected])

  return (
    <Card icon={MessageCircle} title="WhatsApp da Automação" subtitle="Número oficial da RUJA usado pro grupo de líderes e o SOS de acolhimento.">
      {connected === true && (
        <div className="flex items-center gap-2 text-green-400 text-sm py-3">
          <CheckCircle2 size={16} /> Conectado
        </div>
      )}

      {connected !== true && qr && (
        <div className="flex flex-col items-center gap-3 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR Code do WhatsApp" className="w-56 h-56 rounded-lg bg-white p-2" />
          <p className="text-gray-500 text-xs text-center">
            Escaneie em WhatsApp → Aparelhos conectados → Conectar um aparelho.
            <br />O código expira rápido -- gere outro se der tempo.
          </p>
        </div>
      )}

      {erro && <p className="text-red-400 text-sm mb-2">{erro}</p>}

      <button onClick={buscarQr} disabled={loading} className="w-full py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold rounded-xl touch-manipulation">
        {loading ? 'Gerando...' : connected ? (<span className="flex items-center justify-center gap-2"><RefreshCw size={16}/>Verificar conexão</span>) : 'Gerar QR Code'}
      </button>
    </Card>
  )
}
