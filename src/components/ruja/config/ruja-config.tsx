'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { saveConfig } from '@/lib/ruja/queries'
import { exportToCSV, importFromCSV } from '@/lib/ruja/csv'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'

// ─── Card: WhatsApp da automação (PLANO_AUTOMACAO_WHATSAPP_RUJA.md) ────
function WhatsappAutomacaoCard() {
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
        setErro(data.error ?? 'Erro ao gerar QR code.')
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

  // Poll de estado a cada 4s enquanto não conectar -- some assim que
  // conectar (não precisa mais ficar checando).
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
    <div className="bg-[#111] border border-white/8 rounded-xl p-5">
      <h2 className="text-white font-semibold mb-1">💬 WhatsApp da Automação</h2>
      <p className="text-gray-500 text-xs mb-3">
        Número oficial da RUJA usado pro grupo de líderes e o SOS de acolhimento.
      </p>

      {connected === true && (
        <div className="flex items-center gap-2 text-green-400 text-sm py-3">
          <span>✅</span> Conectado
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

      <button
        onClick={buscarQr}
        disabled={loading}
        className="w-full py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold rounded-xl touch-manipulation"
      >
        {loading ? 'Gerando...' : connected ? '🔄 Verificar conexão' : '📱 Gerar QR Code'}
      </button>
    </div>
  )
}

export default function RujaConfig() {
  const { jovens, lideres, departamentos, frequencias, loading, reload } = useRuja()
  const [gasUrl,      setGasUrl]      = useState('')
  const [savingGas,   setSavingGas]   = useState(false)
  const [senha,       setSenha]       = useState('')
  const [senhaConf,   setSenhaConf]   = useState(false)
  const [alterandoSenha, setAlterandoSenha] = useState(false)
  const [importando,  setImportando]  = useState(false)
  const [toast,       setToast]       = useState('')
  const [importStatus,setImportStatus]= useState('')
  const [csvTipo,     setCsvTipo]     = useState<'jovens'|'lideres'|'departamentos'|'frequencias'>('jovens')
  const fileRef = useRef<HTMLInputElement>(null)

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  async function handleSalvarGas() {
    setSavingGas(true)
    try {
      await saveConfig('gas_url', gasUrl)
      showToast('URL salva!')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSavingGas(false)
    }
  }

  async function handleAlterarSenha() {
    if (senha.length < 6) { showToast('Senha deve ter no mínimo 6 caracteres.'); return }
    if (!senhaConf) { showToast('Confirme que deseja alterar a senha.'); return }
    setAlterandoSenha(true)
    try {
      const sb = createClient()
      const { error } = await sb.auth.updateUser({ password: senha })
      if (error) throw error
      showToast('Senha alterada com sucesso!')
      setSenha('')
      setSenhaConf(false)
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setAlterandoSenha(false)
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    setImportStatus('Importando...')
    try {
      const { importados, erros } = await importFromCSV(file, csvTipo)
      await reload()
      setImportStatus(`✅ ${importados} registros importados.${erros.length ? ` ⚠️ ${erros.length} erros.` : ''}`)
      showToast(`${importados} registros importados!`)
    } catch (e) {
      setImportStatus('❌ Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const EXPORTS = [
    { label: '👥 Jovens',        fn: () => exportToCSV(jovens,        'ruja_jovens') },
    { label: '⭐ Líderes',       fn: () => exportToCSV(lideres,       'ruja_lideres') },
    { label: '🏛️ Departamentos', fn: () => exportToCSV(departamentos, 'ruja_departamentos') },
    { label: '✅ Frequências',   fn: () => exportToCSV(frequencias,   'ruja_frequencias') },
    { label: '📦 Tudo',          fn: () => {
      exportToCSV(jovens, 'ruja_jovens')
      setTimeout(() => exportToCSV(lideres, 'ruja_lideres'), 300)
      setTimeout(() => exportToCSV(departamentos, 'ruja_departamentos'), 600)
    }},
  ]

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-white">Configurações</h1>

      {/* Sobre */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🦁</span>
          <div>
            <div className="text-white font-bold">RUJA — Rede UniJovem ADJA</div>
            <div className="text-gray-500 text-xs">Painel de Gestão · Next.js + Supabase</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-white/5">
          <div><div className="text-white font-bold">{jovens.length}</div><div className="text-gray-500 text-xs">Jovens</div></div>
          <div><div className="text-white font-bold">{lideres.length}</div><div className="text-gray-500 text-xs">Líderes</div></div>
          <div><div className="text-white font-bold">{departamentos.length}</div><div className="text-gray-500 text-xs">Deptos</div></div>
        </div>
      </div>

      {/* WhatsApp da Automação */}
      <WhatsappAutomacaoCard />

      {/* Exportar CSV */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">⬇️ Exportar CSV</h2>
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map(({ label, fn }) => (
            <button key={label} onClick={fn}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-xl transition touch-manipulation">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Importar CSV */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">⬆️ Importar CSV</h2>
        <p className="text-gray-500 text-xs mb-3">O CSV deve ter cabeçalho com os mesmos nomes das colunas exportadas. Registros existentes serão atualizados.</p>
        <div className="flex gap-3 mb-3 flex-wrap">
          {(['jovens','lideres','departamentos','frequencias'] as const).map(t => (
            <button key={t} onClick={() => setCsvTipo(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
                ${csvTipo === t ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={importando}
          className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:border-white/40 hover:text-gray-200 transition text-sm touch-manipulation disabled:opacity-50">
          {importando ? '⏳ Importando...' : '📁 Escolher arquivo CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
        {importStatus && (
          <p className="text-sm mt-2 text-gray-400">{importStatus}</p>
        )}
      </div>

      {/* GAS URL */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">🔄 Google Sheets (opcional)</h2>
        <p className="text-gray-500 text-xs mb-3">URL do Apps Script para importação manual de dados legados.</p>
        <input
          value={gasUrl}
          onChange={e => setGasUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 mb-3 touch-manipulation"
        />
        <button onClick={handleSalvarGas} disabled={savingGas}
          className="w-full py-3 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-bold rounded-xl touch-manipulation">
          {savingGas ? 'Salvando...' : '💾 Salvar URL'}
        </button>
      </div>

      {/* Alterar senha */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-3">🔐 Alterar Senha</h2>
        <input
          type="password"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          placeholder="Nova senha (mín. 6 caracteres)"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 mb-3 touch-manipulation"
        />
        <label className="flex items-center gap-2 text-gray-400 text-sm mb-3 cursor-pointer touch-manipulation">
          <input type="checkbox" checked={senhaConf} onChange={e => setSenhaConf(e.target.checked)}
            className="w-4 h-4 rounded" />
          Confirmo que quero alterar minha senha
        </label>
        <button onClick={handleAlterarSenha} disabled={alterandoSenha || !senha || !senhaConf}
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold rounded-xl touch-manipulation">
          {alterandoSenha ? 'Alterando...' : '🔐 Alterar Senha'}
        </button>
      </div>

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>}
    </div>
  )
}
