'use client'
import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { upsertFrequencias } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import { getFreqPct } from '@/lib/ruja/calculos'
import type { Frequencia } from '@/lib/ruja/types'

type DeptoFiltro = 'Geral' | 'Teens' | 'Simply' | 'Up' | 'Sem Depto'

export default function RujaFrequencia() {
  const { jovens, frequencias, loading, reload, recalcularStatus } = useRuja()
  const [depto,      setDepto]      = useState<DeptoFiltro>('Geral')
  const [evento,     setEvento]     = useState('')
  const [data,       setData]       = useState(new Date().toISOString().slice(0,10))
  const [presentes,  setPresentes]  = useState<Set<string>>(new Set())
  const [saving,     setSaving]     = useState(false)
  const [toast,      setToast]      = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  // Jovens do contexto filtrados pelo departamento
  const jovensDepto = useMemo(() => {
    if (depto === 'Geral') return jovens.filter(j => j.nome)
    if (depto === 'Sem Depto') return jovens.filter(j => !j.departamento)
    return jovens.filter(j => j.departamento.toLowerCase().includes(depto.toLowerCase()))
  }, [jovens, depto])

  function togglePresente(id: string) {
    setPresentes(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function marcarTodos(valor: boolean) {
    setPresentes(valor ? new Set(jovensDepto.map(j => j.id)) : new Set())
  }

  async function handleSalvar() {
    if (!evento.trim()) { showToast('Informe o nome do evento.'); return }
    setSaving(true)
    try {
      const registros: Frequencia[] = jovensDepto.map(j => ({
        id:       `${j.id}_${data}_${evento.replace(/\s+/g, '_')}`,
        jovem_id: j.id,
        data,
        evento:   evento.trim(),
        presenca: presentes.has(j.id) ? 'presente' : 'falta',
        obs:      '',
      }))

      await upsertFrequencias(registros)

      // Recalcular status automático para todos os presentes
      for (const id of presentes) {
        await recalcularStatus(id)
      }

      await reload()
      showToast(`✅ ${presentes.size} presenças salvas!`)
      setPresentes(new Set())
      setEvento('')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-5">Frequência</h1>

      {/* Configuração do evento */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={INP} />
          </div>
          <div>
            <label className={LBL}>Evento</label>
            <input value={evento} onChange={e => setEvento(e.target.value)}
              placeholder="Ex: Culto Domingo" className={INP} />
          </div>
        </div>

        {/* Filtro de departamento */}
        <div>
          <label className={LBL}>Departamento</label>
          <div className="flex gap-2 flex-wrap">
            {(['Geral','Teens','Simply','Up','Sem Depto'] as DeptoFiltro[]).map(d => (
              <button key={d} onClick={() => setDepto(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
                  ${depto === d ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Barra de ação */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-400 text-sm">
          <span className="text-white font-bold">{presentes.size}</span> / {jovensDepto.length} presentes
        </div>
        <div className="flex gap-2">
          <button onClick={() => marcarTodos(true)}
            className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg touch-manipulation">
            ✅ Todos
          </button>
          <button onClick={() => marcarTodos(false)}
            className="px-3 py-1.5 text-xs bg-white/5 text-gray-400 rounded-lg touch-manipulation">
            ❌ Nenhum
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2 mb-4">
        {jovensDepto.map(j => {
          const presente = presentes.has(j.id)
          const pct = getFreqPct(j.id, frequencias)
          return (
            <button key={j.id} onClick={() => togglePresente(j.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition touch-manipulation text-left
                ${presente
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-[#111] border-white/8 hover:border-white/15'}`}
            >
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                ${presente ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                {presente && <span className="text-white text-xs">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{j.nome}</div>
                <div className="text-gray-500 text-xs">{j.departamento || 'Sem depto'}</div>
              </div>
              <div className={`text-xs font-bold ${pct >= 75 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {pct}%
              </div>
            </button>
          )
        })}
      </div>

      {/* Salvar */}
      <button onClick={handleSalvar} disabled={saving}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 touch-manipulation sticky bottom-24 md:bottom-4">
        {saving ? <Spinner size="sm" /> : '💾'}
        {saving ? 'Salvando...' : `Salvar ${presentes.size} presenças`}
      </button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>
      )}
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
