'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import type { PlatformAccess } from '@/lib/ruja/platforms'
import { criarMissao, fetchMissoes, atualizarMissao, type Missao, type MissaoPrioridade, type MissaoStatus, type MissaoTarget } from '@/lib/ruja/missoes'

const INPUT = 'w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/50'
const STATUS: Array<{ value: MissaoStatus; label: string }> = [
  { value: 'pendente', label: 'Pendentes' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'concluida', label: 'Concluídas' },
  { value: 'cancelada', label: 'Canceladas' },
]

export default function RujaMissoes({ access }: { access: PlatformAccess }) {
  const { jovens, lideres, departamentos, loading: rujaLoading } = useRuja()
  const [missions, setMissions] = useState<Missao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<MissaoStatus | 'todas'>('todas')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', descricao: '', alvo: '', departamento_id: '', prioridade: 'normal' as MissaoPrioridade, prazo: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try { setMissions(await fetchMissoes(access.id)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as missões.') }
    finally { setLoading(false) }
  }, [access.id])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const filtered = useMemo(() => filter === 'todas' ? missions : missions.filter(item => item.status === filter), [filter, missions])
  const targets = [
    ...jovens.map(jovem => ({ value: `jovem:${jovem.id}`, label: `Jovem · ${jovem.nome}`, type: 'jovem' as const, id: jovem.id, nome: jovem.nome })),
    ...lideres.map(lider => ({ value: `lider:${lider.id}`, label: `Líder · ${lider.nome}`, type: 'lider' as const, id: lider.id, nome: lider.nome })),
  ]

  async function create() {
    const target = targets.find(item => item.value === form.alvo)
    if (!form.titulo.trim() || !target) { setError('Informe o título e o responsável pela missão.'); return }
    setSaving(true)
    setError('')
    try {
      await criarMissao({ plataforma_id: access.id, departamento_id: form.departamento_id || null, titulo: form.titulo.trim(), descricao: form.descricao.trim(), alvo_tipo: target.type, alvo_id: target.id, alvo_nome: target.nome, prioridade: form.prioridade, prazo: form.prazo || null })
      setForm({ titulo: '', descricao: '', alvo: '', departamento_id: '', prioridade: 'normal', prazo: '' })
      setShowForm(false)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível criar a missão.') }
    finally { setSaving(false) }
  }

  async function update(mission: Missao, status: MissaoStatus, progress: number) {
    try { await atualizarMissao(mission.id, status, progress); setMissions(current => current.map(item => item.id === mission.id ? { ...item, status, progresso: progress } : item)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a missão.') }
  }

  if (rujaLoading || loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>
  return <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6"><header className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="text-3xl">🎯</span><div><h1 className="text-xl font-bold text-white">Missões</h1><p className="text-gray-500 text-sm">Atribua, acompanhe e conclua missões de jovens e líderes.</p></div></div><button onClick={() => { setShowForm(true); setError('') }} className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">+ Nova missão</button></header>{error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm">{error}</div>}<div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Metric label="Total" value={missions.length} /><Metric label="Em andamento" value={missions.filter(item => item.status === 'em_andamento').length} color="text-amber-300" /><Metric label="Concluídas" value={missions.filter(item => item.status === 'concluida').length} color="text-green-300" /><Metric label="Atrasadas" value={missions.filter(item => item.prazo && item.prazo < new Date().toISOString().slice(0, 10) && !['concluida', 'cancelada'].includes(item.status)).length} color="text-red-300" /></div><div className="flex gap-2 overflow-x-auto pb-1"><Filter active={filter === 'todas'} onClick={() => setFilter('todas')}>Todas</Filter>{STATUS.map(status => <Filter key={status.value} active={filter === status.value} onClick={() => setFilter(status.value)}>{status.label}</Filter>)}</div>{filtered.length === 0 ? <div className="bg-[#111] border border-white/8 rounded-xl p-12 text-center text-gray-500"><div className="text-4xl mb-3">🎯</div><p>Nenhuma missão encontrada.</p></div> : <div className="grid md:grid-cols-2 gap-3">{filtered.map(mission => <MissionCard key={mission.id} mission={mission} onUpdate={(status, progress) => void update(mission, status, progress)} />)}</div>}{showForm && <CreateModal form={form} setForm={setForm} targets={targets} departamentos={departamentos} saving={saving} onClose={() => setShowForm(false)} onSave={() => void create()} />}</div>
}

function Metric({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) { return <div className="bg-[#111] border border-white/8 rounded-xl p-4"><div className={`text-2xl font-black ${color}`}>{value}</div><div className="text-gray-500 text-xs mt-1">{label}</div></div> }
function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${active ? 'bg-amber-600 text-white' : 'bg-white/5 text-gray-400'}`}>{children}</button> }
function MissionCard({ mission, onUpdate }: { mission: Missao; onUpdate: (status: MissaoStatus, progress: number) => void }) { const finished = mission.status === 'concluida'; const overdue = Boolean(mission.prazo && mission.prazo < new Date().toISOString().slice(0, 10) && !finished && mission.status !== 'cancelada'); return <article className="bg-[#111] border border-white/8 rounded-xl p-4"><div className="flex items-start gap-3"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><h2 className="text-white font-semibold">{mission.titulo}</h2><span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">{mission.alvo_tipo === 'jovem' ? 'Jovem' : mission.alvo_tipo === 'lider' ? 'Líder' : 'Usuário'}</span><span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{mission.prioridade}</span></div><p className="text-amber-200 text-sm mt-2">👤 {mission.alvo_nome}</p><p className="text-gray-500 text-sm mt-2">{mission.descricao || 'Sem descrição.'}</p></div>{overdue && <span className="text-xs text-red-300">Atrasada</span>}</div><div className="mt-4"><div className="flex justify-between text-xs mb-1"><span className="text-gray-500">Progresso</span><span className="text-white">{mission.progresso}%</span></div><div className="h-2 bg-white/5 rounded-full"><div className={`h-2 rounded-full ${finished ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${mission.progresso}%` }} /></div></div><div className="flex items-center justify-between gap-2 mt-4"><span className="text-gray-600 text-xs">{mission.prazo ? `Prazo: ${new Date(`${mission.prazo}T12:00:00`).toLocaleDateString('pt-BR')}` : 'Sem prazo'}</span><select value={mission.status} onChange={event => { const status = event.target.value as MissaoStatus; onUpdate(status, status === 'concluida' ? 100 : status === 'pendente' ? 0 : mission.progresso) }} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-gray-300 text-xs"><option value="pendente">Pendente</option><option value="em_andamento">Em andamento</option><option value="concluida">Concluída</option><option value="cancelada">Cancelada</option></select></div></article> }
function CreateModal({ form, setForm, targets, departamentos, saving, onClose, onSave }: { form: { titulo: string; descricao: string; alvo: string; departamento_id: string; prioridade: MissaoPrioridade; prazo: string }; setForm: React.Dispatch<React.SetStateAction<{ titulo: string; descricao: string; alvo: string; departamento_id: string; prioridade: MissaoPrioridade; prazo: string }>>; targets: Array<{ value: string; label: string; type: MissaoTarget; id: string; nome: string }>; departamentos: Array<{ id: string; nome: string }>; saving: boolean; onClose: () => void; onSave: () => void }) { return <div className="fixed inset-0 z-50 bg-black/80 flex items-end md:items-center justify-center"><div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl p-5 w-full max-w-lg space-y-4"><div className="flex justify-between"><h2 className="text-white font-bold">Nova missão</h2><button onClick={onClose} className="text-gray-500">✕</button></div><input value={form.titulo} onChange={event => setForm(current => ({ ...current, titulo: event.target.value }))} placeholder="Título da missão" className={INPUT} /><textarea value={form.descricao} onChange={event => setForm(current => ({ ...current, descricao: event.target.value }))} placeholder="Descrição e instruções" className={`${INPUT} resize-none`} rows={3} /><select value={form.alvo} onChange={event => setForm(current => ({ ...current, alvo: event.target.value }))} className={INPUT}><option value="">Atribuir a jovem ou líder</option>{targets.map(target => <option key={target.value} value={target.value}>{target.label}</option>)}</select><select value={form.departamento_id} onChange={event => setForm(current => ({ ...current, departamento_id: event.target.value }))} className={INPUT}><option value="">Toda a RUJA / escopo global</option>{departamentos.map(departamento => <option key={departamento.id} value={departamento.id}>{departamento.nome}</option>)}</select><div className="grid grid-cols-2 gap-3"><select value={form.prioridade} onChange={event => setForm(current => ({ ...current, prioridade: event.target.value as MissaoPrioridade }))} className={INPUT}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select><input type="date" value={form.prazo} onChange={event => setForm(current => ({ ...current, prazo: event.target.value }))} className={INPUT} /></div><div className="flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300">Cancelar</button><button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Criar missão'}</button></div></div></div> }
