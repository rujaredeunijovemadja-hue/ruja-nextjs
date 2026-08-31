'use client'
import { useMemo, useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { atualizarEventoFrequencia, excluirEventoFrequencia } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import { departamentoNomePorId } from '@/lib/ruja/calculos'
import type { EventoFrequencia, EventoFrequenciaInput, StatusEvento, TipoEventoFrequencia } from '@/lib/ruja/types'
import { getRujaErrorMessage } from '@/lib/ruja/errors'
import { jovemMatchesDepartmentName } from '@/lib/ruja/departments'
import { X, Check } from 'lucide-react'

type Filtro = { data: string; departamentoId: string; liderId: string }
const TIPOS: TipoEventoFrequencia[] = ['Culto', 'Reunião', 'Ensaio', 'Conexão', 'Congresso', 'Vigília', 'Evangelismo', 'Outro']
const STATUS_EVENTO: StatusEvento[] = ['Agendado', 'Em andamento', 'Finalizado', 'Cancelado']
const LBL = 'block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5'
const INP = 'w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation'

export default function RujaHistoricoFrequencia() {
  const { jovens, lideres, departamentos, eventosFrequencia, loading, reload, recalcularStatus, can } = useRuja()
  const canManage = can('manage_department')
  const [filtro, setFiltro] = useState<Filtro>({ data: '', departamentoId: '', liderId: '' })
  const [aberto, setAberto] = useState<EventoFrequencia | null>(null)
  const [editando, setEditando] = useState<EventoFrequencia | null>(null)
  const [busca, setBusca] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmDel, setConfirmDel] = useState<EventoFrequencia | null>(null)

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }
  const nomeLider = (id?: string | null) => lideres.find(l => String(l.id) === String(id))?.nome ?? 'Sem líder'

  const eventos = useMemo(() => {
    return eventosFrequencia.filter(e => {
      if (filtro.data && !e.data.startsWith(filtro.data)) return false
      if (filtro.departamentoId && e.departamento_id !== filtro.departamentoId) return false
      if (filtro.liderId && e.lider_responsavel_id !== filtro.liderId) return false
      return true
    })
  }, [eventosFrequencia, filtro])

  function jovensEsperados(evento: EventoFrequencia) {
    const depto = departamentos.find(d => String(d.id) === String(evento.departamento_id))
    if (!depto) return jovens
    return jovens.filter(j => jovemMatchesDepartmentName(j, depto.nome))
  }

  function participantes(evento: EventoFrequencia) {
    const termo = busca.trim().toLowerCase()
    return (evento.participantes ?? [])
      .filter(p => p.presente)
      .map(p => ({ rel: p, jovem: jovens.find(j => String(j.id) === String(p.jovem_id)) }))
      .filter(item => !termo || item.jovem?.nome.toLowerCase().includes(termo))
      .sort((a, b) => (a.jovem?.nome ?? '').localeCompare(b.jovem?.nome ?? ''))
  }

  async function handleSalvarEdicao(input: EventoFrequenciaInput) {
    if (!editando) return
    setSaving(true)
    try {
      await atualizarEventoFrequencia(editando.id, input, editando)
      const afetados = new Set([
        ...(editando.participantes ?? []).map(p => p.jovem_id),
        ...input.participantes.map(p => p.jovem_id),
      ])
      for (const id of afetados) await recalcularStatus(id)
      await reload()
      setEditando(null)
      setAberto(null)
      showToast('Evento atualizado.')
    } catch (e) {
      showToast('Erro: ' + getRujaErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleExcluir(evento: EventoFrequencia) {
    setSaving(true)
    try {
      await excluirEventoFrequencia(evento)
      for (const p of evento.participantes ?? []) await recalcularStatus(p.jovem_id)
      await reload()
      setConfirmDel(null)
      setAberto(null)
      showToast('Evento excluído.')
    } catch (e) {
      showToast('Erro: ' + getRujaErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Histórico de Frequência</h1>
          <p className="text-gray-500 text-sm mt-1">{eventos.length} evento(s) no modelo novo</p>
        </div>
      </div>

      <div className="bg-[#111] border border-white/8 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={LBL}>Mês</label>
          <input type="month" value={filtro.data} onChange={e => setFiltro(f => ({ ...f, data: e.target.value }))} className={INP} />
        </div>
        <div>
          <label className={LBL}>Departamento</label>
          <select value={filtro.departamentoId} onChange={e => setFiltro(f => ({ ...f, departamentoId: e.target.value }))} className={INP}>
            <option value="">Todos</option>
            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={LBL}>Líder</label>
          <select value={filtro.liderId} onChange={e => setFiltro(f => ({ ...f, liderId: e.target.value }))} className={INP}>
            <option value="">Todos</option>
            {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
      </div>

      {eventos.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">Nenhum evento encontrado. Use “Novo evento” para criar o primeiro.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {eventos.map(evento => {
            const presentes = evento.participantes?.filter(p => p.presente).length ?? 0
            const esperado = jovensEsperados(evento).length
            const pct = esperado ? Math.round((presentes / esperado) * 100) : 0
            return (
              <div key={evento.id} className="bg-[#111] border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-white font-bold truncate">{evento.nome}</h2>
                    <p className="text-gray-500 text-xs mt-1">
                      {evento.data}{evento.hora_inicio ? ` · ${evento.hora_inicio.slice(0, 5)}` : ''} · {departamentoNomePorId(departamentos, evento.departamento_id)}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">Responsável: {nomeLider(evento.lider_responsavel_id)}</p>
                    {evento.local && <p className="text-gray-500 text-xs mt-1">Local: {evento.local}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {evento.status && <span className="text-[11px] px-2 py-1 rounded-full bg-blue-500/15 text-blue-300">{evento.status}</span>}
                    {evento.tipo && <span className="text-[11px] px-2 py-1 rounded-full bg-white/8 text-gray-400">{evento.tipo}</span>}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-white font-black text-2xl">{presentes}</div>
                      <div className="text-gray-500 text-xs">presentes de {esperado}</div>
                    </div>
                    <div className={`text-lg font-black ${pct >= 75 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</div>
                  </div>
                  <div className="mt-2 bg-white/5 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setAberto(evento); setBusca('') }} className="flex-1 py-2 rounded-lg bg-white/8 text-gray-200 text-xs font-semibold touch-manipulation">Ver participantes</button>
                  {canManage && <button onClick={() => setEditando(evento)} className="px-3 py-2 rounded-lg bg-blue-500/15 text-blue-300 text-xs font-semibold touch-manipulation">Editar</button>}
                  {canManage && <button onClick={() => setConfirmDel(evento)} className="px-3 py-2 rounded-lg bg-red-500/15 text-red-300 text-xs font-semibold touch-manipulation">Excluir</button>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/12 rounded-t-2xl md:rounded-2xl w-full max-w-2xl max-h-[88dvh] flex flex-col">
            <div className="p-5 border-b border-white/8 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-white font-bold">{aberto.nome}</h2>
                <p className="text-gray-500 text-xs mt-1">{aberto.data} · {departamentoNomePorId(departamentos, aberto.departamento_id)} · {nomeLider(aberto.lider_responsavel_id)}</p>
                {(aberto.hora_inicio || aberto.local || aberto.status) && (
                  <p className="text-gray-500 text-xs mt-1">
                    {[aberto.status, aberto.hora_inicio?.slice(0, 5), aberto.hora_termino?.slice(0, 5), aberto.local].filter(Boolean).join(' · ')}
                  </p>
                )}
                {aberto.descricao && <p className="text-gray-400 text-sm mt-3">{aberto.descricao}</p>}
                {aberto.departamentos_envolvidos?.length ? (
                  <p className="text-gray-500 text-xs mt-2">Envolvidos: {aberto.departamentos_envolvidos.join(', ')}</p>
                ) : null}
              </div>
              <button onClick={() => setAberto(null)} className="text-gray-400 hover:text-white p-2"><X size={16} /></button>
            </div>
            <div className="p-5 border-b border-white/8">
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar participante" className={INP} />
            </div>
            <div className="overflow-y-auto p-5 space-y-2">
              {participantes(aberto).map(({ rel, jovem }) => (
                <div key={rel.id} className="flex items-center gap-3 bg-black/30 rounded-xl p-3">
                  <img src={jovem?.foto_url || '/ruja-logo.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-white/5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{jovem?.nome ?? rel.jovem_id}</div>
                    {rel.observacao && <div className="text-gray-500 text-xs truncate">{rel.observacao}</div>}
                  </div>
                </div>
              ))}
              {participantes(aberto).length === 0 && <div className="text-gray-600 text-sm text-center py-10">Nenhum participante encontrado.</div>}
            </div>
            <div className="p-5 border-t border-white/8 flex gap-2">
              {canManage && <button onClick={() => setEditando(aberto)} className="flex-1 py-3 rounded-xl bg-blue-500/15 text-blue-300 text-sm font-bold">Editar evento</button>}
            </div>
          </div>
        </div>
      )}

      {editando && (
        <EditarEventoModal
          evento={editando}
          saving={saving}
          jovens={jovensEsperados(editando)}
          lideres={lideres}
          departamentos={departamentos}
          onClose={() => setEditando(null)}
          onSave={handleSalvarEdicao}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-red-500/20 rounded-2xl w-full max-w-sm p-5">
            <h2 className="text-white font-bold mb-2">Excluir evento?</h2>
            <p className="text-gray-400 text-sm mb-4">Os participantes deste evento serão removidos junto. Registros antigos em ruja_frequencias não são apagados.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-medium">Cancelar</button>
              <button onClick={() => handleExcluir(confirmDel)} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Excluindo...' : 'Excluir'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>}
    </div>
  )
}

function EditarEventoModal({
  evento, jovens, lideres, departamentos, saving, onClose, onSave,
}: {
  evento: EventoFrequencia
  jovens: ReturnType<typeof useRuja>['jovens']
  lideres: ReturnType<typeof useRuja>['lideres']
  departamentos: ReturnType<typeof useRuja>['departamentos']
  saving: boolean
  onClose: () => void
  onSave: (input: EventoFrequenciaInput) => void
}) {
  const [nome, setNome] = useState(evento.nome)
  const [data, setData] = useState(evento.data)
  const [departamentoId, setDepartamentoId] = useState(evento.departamento_id ?? '')
  const [liderId, setLiderId] = useState(evento.lider_responsavel_id ?? '')
  const [tipo, setTipo] = useState((evento.tipo || 'Culto') as TipoEventoFrequencia)
  const [statusEvento, setStatusEvento] = useState((evento.status || 'Agendado') as StatusEvento)
  const [horaInicio, setHoraInicio] = useState(evento.hora_inicio?.slice(0, 5) ?? '')
  const [horaTermino, setHoraTermino] = useState(evento.hora_termino?.slice(0, 5) ?? '')
  const [local, setLocal] = useState(evento.local ?? '')
  const [descricao, setDescricao] = useState(evento.descricao ?? '')
  const [departamentosEnvolvidos, setDepartamentosEnvolvidos] = useState((evento.departamentos_envolvidos ?? []).join('; '))
  const [observacao, setObservacao] = useState(evento.observacao ?? '')
  const [busca, setBusca] = useState('')
  const [presentes, setPresentes] = useState<Set<string>>(new Set((evento.participantes ?? []).filter(p => p.presente).map(p => p.jovem_id)))
  const [observacoes, setObservacoes] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const p of evento.participantes ?? []) m[p.jovem_id] = p.observacao ?? ''
    return m
  })
  const termo = busca.trim().toLowerCase()
  const list = jovens.filter(j => !termo || j.nome.toLowerCase().includes(termo))

  function salvar() {
    onSave({
      nome,
      data,
      departamento_id: departamentoId || null,
      lider_responsavel_id: liderId || null,
      tipo,
      hora_inicio: horaInicio || null,
      hora_termino: horaTermino || null,
      local: local.trim() || null,
      descricao: descricao.trim() || null,
      status: statusEvento,
      departamentos_envolvidos: departamentosEnvolvidos.split(';').map(d => d.trim()).filter(Boolean),
      observacao: observacao.trim() || null,
      participantes: Array.from(presentes).map(jovem_id => ({ jovem_id, observacao: observacoes[jovem_id] || null })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#141414] border border-white/12 rounded-t-2xl md:rounded-2xl w-full max-w-3xl max-h-[92dvh] flex flex-col">
        <div className="p-5 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-white font-bold">Editar evento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={nome} onChange={e => setNome(e.target.value)} className={INP} />
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={INP} />
            <select value={departamentoId} onChange={e => setDepartamentoId(e.target.value)} className={INP}>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
            <select value={liderId} onChange={e => setLiderId(e.target.value)} className={INP}>
              <option value="">Sem líder</option>
              {lideres.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoEventoFrequencia)} className={INP}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={statusEvento} onChange={e => setStatusEvento(e.target.value as StatusEvento)} className={INP}>
              {STATUS_EVENTO.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={INP} />
            <input type="time" value={horaTermino} onChange={e => setHoraTermino(e.target.value)} className={INP} />
            <input value={local} onChange={e => setLocal(e.target.value)} placeholder="Local" className={INP} />
            <input value={departamentosEnvolvidos} onChange={e => setDepartamentosEnvolvidos(e.target.value)} placeholder="Departamentos envolvidos separados por ;" className={INP} />
          </div>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" className={`${INP} min-h-20 resize-none`} />
          <input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observação interna" className={INP} />
          <div className="flex gap-2">
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar jovem" className={INP} />
            <button onClick={() => setPresentes(new Set(list.map(j => j.id)))} className="px-3 rounded-xl bg-green-500/15 text-green-300 text-xs font-bold">Todos</button>
            <button onClick={() => setPresentes(new Set())} className="px-3 rounded-xl bg-white/8 text-gray-300 text-xs font-bold">Limpar</button>
          </div>
          <div className="space-y-2">
            {list.map(j => {
              const checked = presentes.has(j.id)
              return (
                <div key={j.id} className={`rounded-xl border p-3 ${checked ? 'bg-green-500/10 border-green-500/30' : 'bg-black/30 border-white/8'}`}>
                  <button onClick={() => setPresentes(prev => {
                    const n = new Set(prev)
                    if (n.has(j.id)) n.delete(j.id); else n.add(j.id)
                    return n
                  })} className="w-full flex items-center gap-3 text-left">
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-600'}`}>{checked ? <Check size={12} /> : ''}</span>
                    <span className="text-white text-sm font-medium flex-1">{j.nome}</span>
                  </button>
                  {checked && (
                    <input value={observacoes[j.id] ?? ''} onChange={e => setObservacoes(o => ({ ...o, [j.id]: e.target.value }))} placeholder="Observação individual" className={`${INP} mt-2`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="p-5 border-t border-white/8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-medium">Cancelar</button>
          <button onClick={salvar} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>
      </div>
    </div>
  )
}
