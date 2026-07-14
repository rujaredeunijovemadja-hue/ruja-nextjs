'use client'
import { useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { criarEventoFrequencia } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import { getEventoFreqPct, getFreqPct } from '@/lib/ruja/calculos'
import type { EventoFrequenciaInput, TipoEventoFrequencia } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { activeOfficialDepartments, DEPARTMENT_LABELS, filterJovensByScope, isOfficialDepartmentSlug, jovemMatchesDepartment } from '@/lib/ruja/departments'

const TIPOS: TipoEventoFrequencia[] = ['Culto', 'Reunião', 'Ensaio', 'Conexão', 'Congresso', 'Vigília', 'Evangelismo', 'Outro']
const LBL = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5'
const INP = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation'

export default function RujaFrequencia({ scope = 'all' }: { scope?: DepartmentScope }) {
  const { jovens, lideres, departamentos, frequencias, eventosFrequencia, loading, reload, recalcularStatus } = useRuja()
  const officialDepartments = activeOfficialDepartments(departamentos)
  const defaultDepto = scope === 'all' ? (officialDepartments[0]?.id ?? '') : (officialDepartments.find(d => d.slug === scope)?.id ?? '')

  const [nome, setNome] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [departamentoId, setDepartamentoId] = useState(defaultDepto)
  const [liderId, setLiderId] = useState('')
  const [tipo, setTipo] = useState<TipoEventoFrequencia>('Culto')
  const [observacao, setObservacao] = useState('')
  const [busca, setBusca] = useState('')
  const [presentes, setPresentes] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const selectedDepto = officialDepartments.find(d => d.id === departamentoId)
  const selectedScope: DepartmentScope = selectedDepto?.slug && isOfficialDepartmentSlug(selectedDepto.slug) ? selectedDepto.slug : scope
  const selectedLabel = selectedScope === 'all' ? 'Geral' : DEPARTMENT_LABELS[selectedScope]
  const scopedJovens = filterJovensByScope(jovens, selectedScope)
  const jovensBase = selectedDepto ? scopedJovens.filter(j => jovemMatchesDepartment(j, selectedScope)) : scopedJovens
  const termoBusca = busca.trim().toLowerCase()
  const jovensDepto = termoBusca ? jovensBase.filter(j => j.nome.toLowerCase().includes(termoBusca)) : jovensBase
  const lideresDepto = selectedDepto
    ? lideres.filter(l => !l.departamento || l.departamento.includes(selectedDepto.nome))
    : lideres

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  function togglePresente(id: string) {
    setPresentes(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function marcarTodos(valor: boolean) {
    setPresentes(valor ? new Set(jovensDepto.map(j => j.id)) : new Set())
  }

  async function handleSalvar() {
    if (!nome.trim()) { showToast('Informe o nome do evento.'); return }
    if (!data) { showToast('Informe a data do evento.'); return }
    if (!departamentoId) { showToast('Selecione Teens ou Simply.'); return }
    if (!liderId) { showToast('Selecione o líder responsável.'); return }

    setSaving(true)
    try {
      const input: EventoFrequenciaInput = {
        nome,
        data,
        departamento_id: departamentoId,
        lider_responsavel_id: liderId,
        tipo,
        observacao: observacao.trim() || null,
        participantes: Array.from(presentes).map(jovem_id => ({ jovem_id })),
      }
      await criarEventoFrequencia(input)
      for (const id of presentes) await recalcularStatus(id)
      await reload()
      showToast(`${presentes.size} presença(s) salvas no evento.`)
      setNome('')
      setObservacao('')
      setPresentes(new Set())
      setBusca('')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Novo evento de frequência</h1>
          <p className="text-gray-500 text-sm mt-1">Marque somente quem esteve presente. Ausências são calculadas pelo sistema.</p>
        </div>
        <span className="text-xs bg-white/8 text-gray-400 px-2.5 py-1 rounded-full whitespace-nowrap">
          {presentes.size}/{jovensDepto.length}
        </span>
      </div>

      <div className="bg-[#111] border border-white/8 rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={LBL}>Nome do evento</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Culto de Jovens" className={INP} />
          </div>
          <div>
            <label className={LBL}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={INP} />
          </div>
          <div>
            <label className={LBL}>Departamento</label>
            <select value={departamentoId} onChange={e => { setDepartamentoId(e.target.value); setPresentes(new Set()) }} className={INP}>
              <option value="">Selecione</option>
              {(scope === 'all' ? officialDepartments : officialDepartments.filter(d => d.slug === scope)).map(d => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LBL}>Líder responsável</label>
            <select value={liderId} onChange={e => setLiderId(e.target.value)} className={INP}>
              <option value="">Selecione</option>
              {lideresDepto.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoEventoFrequencia)} className={INP}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Observação</label>
            <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Opcional" className={INP} />
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 bg-[#0A0A0A]/95 backdrop-blur border-y border-white/8 py-3 mb-3">
        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jovem" className={INP} />
          <div className="flex gap-2">
            <button onClick={() => marcarTodos(true)} className="flex-1 md:flex-none px-3 py-2 text-xs bg-green-500/20 text-green-400 rounded-lg touch-manipulation">Selecionar todos</button>
            <button onClick={() => marcarTodos(false)} className="flex-1 md:flex-none px-3 py-2 text-xs bg-white/5 text-gray-400 rounded-lg touch-manipulation">Limpar</button>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {jovensDepto.map(j => {
          const presente = presentes.has(j.id)
          const pct = eventosFrequencia.length
            ? getEventoFreqPct(j.id, eventosFrequencia, j, departamentos)
            : getFreqPct(j.id, frequencias)
          return (
            <button key={j.id} onClick={() => togglePresente(j.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition touch-manipulation text-left ${
                presente ? 'bg-green-500/10 border-green-500/30' : 'bg-[#111] border-white/8 hover:border-white/15'
              }`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${presente ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                {presente && <span className="text-white text-xs">✓</span>}
              </div>
              <img src={j.foto_url || '/ruja-logo.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-white/5" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{j.nome}</div>
                <div className="text-gray-500 text-xs">{j.departamento || selectedLabel || 'Sem depto'}</div>
              </div>
              <div className={`text-xs font-bold ${pct >= 75 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</div>
            </button>
          )
        })}
      </div>

      <button onClick={handleSalvar} disabled={saving}
        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 touch-manipulation sticky bottom-24 md:bottom-4">
        {saving ? <Spinner size="sm" /> : null}
        {saving ? 'Salvando...' : `Salvar evento com ${presentes.size} presente(s)`}
      </button>

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>}
    </div>
  )
}
