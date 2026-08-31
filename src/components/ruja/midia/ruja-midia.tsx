'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import type { PlatformAccess } from '@/lib/ruja/platforms'
import { X, Video, Download, CalendarDays, Clapperboard, Search, CheckCircle2, Upload, Paperclip, type LucideIcon } from 'lucide-react'
import {
  atualizarMidiaStatus,
  atualizarMidiaTarefa,
  criarMidiaTarefa,
  criarMidiaSolicitacao,
  fetchMidiaAprovacao,
  fetchMidiaArquivos,
  fetchMidiaSolicitacoes,
  fetchMidiaTarefas,
  MIDIA_STATUS,
  MIDIA_TIPOS,
  registrarMidiaAprovacao,
  removeMidiaArquivo,
  uploadMidiaArquivo,
  type MidiaPrioridade,
  type MidiaSolicitacao,
  type MidiaAprovacao,
  type MidiaArquivo,
  type MidiaTarefa,
  type MidiaStatus,
} from '@/lib/ruja/midia'

const STEPS: Array<{ value: MidiaStatus; label: string; icon: LucideIcon }> = [
  { value: 'solicitada', label: 'Solicitada', icon: Download },
  { value: 'planejada', label: 'Planejada', icon: CalendarDays },
  { value: 'em_producao', label: 'Em produção', icon: Clapperboard },
  { value: 'em_revisao', label: 'Em revisão', icon: Search },
  { value: 'aprovada', label: 'Aprovada', icon: CheckCircle2 },
  { value: 'entregue', label: 'Entregue', icon: Upload },
]

const INPUT = 'w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-violet-500/50'

export default function RujaMidia({ access }: { access: PlatformAccess }) {
  const { loading: rujaLoading } = useRuja()
  const [solicitacoes, setSolicitacoes] = useState<MidiaSolicitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState<MidiaStatus | 'todos'>('todos')
  const [form, setForm] = useState({ titulo: '', descricao: '', tipo: 'arte', prioridade: 'normal' as MidiaPrioridade, prazo: '' })
  const [selected, setSelected] = useState<MidiaSolicitacao | null>(null)
  const [tasks, setTasks] = useState<MidiaTarefa[]>([])
  const [approval, setApproval] = useState<MidiaAprovacao | null>(null)
  const [files, setFiles] = useState<MidiaArquivo[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSolicitacoes(await fetchMidiaSolicitacoes(access.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as solicitações.')
    } finally {
      setLoading(false)
    }
  }, [access.id])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const filtradas = useMemo(
    () => filtro === 'todos' ? solicitacoes : solicitacoes.filter(item => item.status === filtro),
    [filtro, solicitacoes]
  )

  async function handleCreate() {
    if (!form.titulo.trim()) { setError('Informe o título da solicitação.'); return }
    setSaving(true)
    setError('')
    try {
      await criarMidiaSolicitacao({ ...form, titulo: form.titulo.trim(), descricao: form.descricao.trim(), plataforma_id: access.id, prazo: form.prazo || null })
      setForm({ titulo: '', descricao: '', tipo: 'arte', prioridade: 'normal', prazo: '' })
      setShowForm(false)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a solicitação.')
    } finally {
      setSaving(false)
    }
  }

  async function advance(item: MidiaSolicitacao) {
    const index = STEPS.findIndex(step => step.value === item.status)
    const next = STEPS[index + 1]
    if (!next) return
    try {
      await atualizarMidiaStatus(item.id, next.value)
      setSolicitacoes(current => current.map(row => row.id === item.id ? { ...row, status: next.value } : row))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a etapa.')
    }
  }

  async function openDetail(item: MidiaSolicitacao) {
    setSelected(item)
    setDetailLoading(true)
    try {
      const [nextTasks, nextApproval, nextFiles] = await Promise.all([fetchMidiaTarefas(item.id), fetchMidiaAprovacao(item.id), fetchMidiaArquivos(item.id)])
      setTasks(nextTasks)
      setApproval(nextApproval)
      setFiles(nextFiles)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o detalhe.')
    } finally {
      setDetailLoading(false)
    }
  }

  async function uploadFile(file: File | undefined) {
    if (!selected || !file) return
    try {
      await uploadMidiaArquivo(access.id, selected.id, file)
      setFiles(await fetchMidiaArquivos(selected.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o arquivo.')
    }
  }

  async function deleteFile(file: MidiaArquivo) {
    try {
      await removeMidiaArquivo(file)
      setFiles(current => current.filter(row => row.id !== file.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover o arquivo.')
    }
  }

  async function addTask() {
    if (!selected || !taskTitle.trim()) return
    try {
      await criarMidiaTarefa({ plataforma_id: access.id, solicitacao_id: selected.id, titulo: taskTitle.trim() })
      setTaskTitle('')
      setTasks(await fetchMidiaTarefas(selected.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a tarefa.')
    }
  }

  async function decide(status: 'aprovada' | 'rejeitada') {
    if (!selected) return
    try {
      await registrarMidiaAprovacao({ plataforma_id: access.id, solicitacao_id: selected.id, status, comentario: status === 'aprovada' ? 'Aprovado pela equipe.' : 'Solicitação devolvida para produção.' })
      await load()
      setSelected(current => current ? { ...current, status: status === 'aprovada' ? 'aprovada' : 'em_producao' } : current)
      setApproval(await fetchMidiaAprovacao(selected.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar a aprovação.')
    }
  }

  if (rujaLoading || loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Video size={28} className="text-red-400" />
          <div><h1 className="text-xl font-bold text-white">Mídia</h1><p className="text-gray-500 text-sm">Solicitações e produção de conteúdo.</p></div>
        </div>
        <button onClick={() => { setShowForm(true); setError('') }} className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">+ Nova solicitação</button>
      </header>

      {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total" value={solicitacoes.length} />
        <Metric label="Em produção" value={solicitacoes.filter(item => item.status === 'em_producao').length} color="text-violet-300" />
        <Metric label="Em revisão" value={solicitacoes.filter(item => item.status === 'em_revisao').length} color="text-yellow-300" />
        <Metric label="Entregues" value={solicitacoes.filter(item => item.status === 'entregue').length} color="text-green-300" />
      </div>

      <section className="flex gap-2 overflow-x-auto pb-1">
        <FilterButton active={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todas</FilterButton>
        {MIDIA_STATUS.map(status => <FilterButton key={status.value} active={filtro === status.value} onClick={() => setFiltro(status.value)}>{status.label}</FilterButton>)}
      </section>

      {filtradas.length === 0 ? (
        <div className="bg-[#111] border border-white/8 rounded-xl p-12 text-center text-gray-500"><div className="flex justify-center mb-3"><Clapperboard size={36} /></div><p>Nenhuma solicitação nesta etapa.</p></div>
      ) : (
        <div className="space-y-3">{filtradas.map(item => <RequestCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={() => void openDetail(item)} onAdvance={() => void advance(item)} />)}</div>
      )}

      {selected && <RequestDetail item={selected} tasks={tasks} approval={approval} files={files} loading={detailLoading} taskTitle={taskTitle} setTaskTitle={setTaskTitle} onAddTask={() => void addTask()} onUpload={file => void uploadFile(file)} onDeleteFile={file => void deleteFile(file)} onTaskStatus={async (task, status) => { await atualizarMidiaTarefa(task.id, status); setTasks(current => current.map(row => row.id === task.id ? { ...row, status } : row)) }} onDecide={status => void decide(status)} onClose={() => setSelected(null)} />}

      {showForm && <CreateModal form={form} setForm={setForm} saving={saving} onClose={() => setShowForm(false)} onSave={() => void handleCreate()} />}
    </div>
  )
}

function Metric({ label, value, color = 'text-white' }: { label: string; value: number; color?: string }) {
  return <div className="bg-[#111] border border-white/8 rounded-xl p-4"><div className={`text-2xl font-black ${color}`}>{value}</div><div className="text-gray-500 text-xs mt-1">{label}</div></div>
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${active ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400'}`}>{children}</button>
}

function RequestCard({ item, selected, onSelect, onAdvance }: { item: MidiaSolicitacao; selected: boolean; onSelect: () => void; onAdvance: () => void }) {
  const currentStep = STEPS.findIndex(step => step.value === item.status)
  const next = STEPS[currentStep + 1]
  return <article className={`bg-[#111] border rounded-xl p-4 ${selected ? 'border-violet-500/50' : 'border-white/8'}`}>
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
      <div className="min-w-0"><button onClick={onSelect} className="text-left"><div className="flex items-center gap-2 flex-wrap"><h2 className="text-white font-semibold">{item.titulo}</h2><span className="text-xs rounded-full px-2 py-0.5 bg-violet-500/15 text-violet-300">{item.tipo}</span><span className="text-xs rounded-full px-2 py-0.5 bg-white/5 text-gray-400">{item.prioridade}</span></div><p className="text-gray-500 text-sm mt-2 whitespace-pre-wrap">{item.descricao || 'Sem descrição.'}</p>{item.prazo && <p className="text-gray-600 text-xs mt-2">Prazo: {new Date(`${item.prazo}T12:00:00`).toLocaleDateString('pt-BR')}</p>}</button></div>
      {next && item.status !== 'cancelada' && <button onClick={onAdvance} className="shrink-0 px-3 py-2 rounded-lg bg-violet-500/15 text-violet-300 text-xs font-semibold hover:bg-violet-500/25">Avançar para {next.label}</button>}
    </div>
    <div className="grid grid-cols-3 md:grid-cols-6 gap-1 mt-4">{STEPS.map((step, index) => <div key={step.value} className={`text-center py-2 rounded-lg text-[10px] ${index <= currentStep ? 'bg-violet-500/20 text-violet-200' : 'bg-white/5 text-gray-600'}`}><div className="flex justify-center"><step.icon size={14} /></div><div className="mt-1">{step.label}</div></div>)}</div>
  </article>
}

function RequestDetail({ item, tasks, approval, files, loading, taskTitle, setTaskTitle, onAddTask, onUpload, onDeleteFile, onTaskStatus, onDecide, onClose }: { item: MidiaSolicitacao; tasks: MidiaTarefa[]; approval: MidiaAprovacao | null; files: MidiaArquivo[]; loading: boolean; taskTitle: string; setTaskTitle: (value: string) => void; onAddTask: () => void; onUpload: (file: File | undefined) => void; onDeleteFile: (file: MidiaArquivo) => void; onTaskStatus: (task: MidiaTarefa, status: MidiaTarefa['status']) => Promise<void>; onDecide: (status: 'aprovada' | 'rejeitada') => void; onClose: () => void }) {
  return <section className="bg-[#111] border border-violet-500/25 rounded-xl p-4 space-y-4"><div className="flex items-center justify-between"><div><p className="text-violet-300 text-xs uppercase tracking-wider">Detalhe da solicitação</p><h2 className="text-white font-bold mt-1">{item.titulo}</h2></div><button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button></div>{loading ? <Spinner /> : <><div><h3 className="text-white text-sm font-semibold mb-2">Tarefas</h3><div className="flex gap-2"><input value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Nova tarefa" className={INPUT} /><button onClick={onAddTask} className="px-3 rounded-xl bg-violet-600 text-white text-sm font-semibold">Adicionar</button></div><div className="space-y-2 mt-3">{tasks.length === 0 ? <p className="text-gray-600 text-sm">Nenhuma tarefa criada.</p> : tasks.map(task => <div key={task.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"><span className={`w-2 h-2 rounded-full ${task.status === 'concluida' ? 'bg-green-400' : 'bg-yellow-400'}`} /><span className={`flex-1 text-sm ${task.status === 'concluida' ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{task.titulo}</span><button onClick={() => void onTaskStatus(task, task.status === 'concluida' ? 'pendente' : 'concluida')} className="text-xs text-violet-300">{task.status === 'concluida' ? 'Reabrir' : 'Concluir'}</button></div>)}</div></div><div className="border-t border-white/8 pt-4"><div className="flex items-center justify-between mb-3"><h3 className="text-white text-sm font-semibold">Arquivos</h3><label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/5 text-violet-300 text-xs"><input type="file" className="hidden" onChange={event => { onUpload(event.target.files?.[0]); event.currentTarget.value = '' }} />Adicionar arquivo</label></div>{files.length === 0 ? <p className="text-gray-600 text-sm">Nenhum arquivo anexado.</p> : <div className="space-y-2">{files.map(file => <div key={file.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2"><a href={file.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-violet-300 truncate"><Paperclip size={13} />{file.nome}</a><button onClick={() => onDeleteFile(file)} className="text-xs text-red-300">Remover</button></div>)}</div>}</div><div className="border-t border-white/8 pt-4"><div className="flex items-center justify-between"><h3 className="text-white text-sm font-semibold">Aprovação</h3>{approval && <span className={`text-xs ${approval.status === 'aprovada' ? 'text-green-300' : 'text-red-300'}`}>{approval.status}</span>}</div>{item.status === 'em_revisao' && <div className="flex gap-2 mt-3"><button onClick={() => onDecide('rejeitada')} className="flex-1 py-2 rounded-lg bg-red-500/15 text-red-300 text-sm">Devolver para produção</button><button onClick={() => onDecide('aprovada')} className="flex-1 py-2 rounded-lg bg-green-500/15 text-green-300 text-sm">Aprovar entrega</button></div>}</div></>}</section>
}

function CreateModal({ form, setForm, saving, onClose, onSave }: { form: { titulo: string; descricao: string; tipo: string; prioridade: MidiaPrioridade; prazo: string }; setForm: React.Dispatch<React.SetStateAction<{ titulo: string; descricao: string; tipo: string; prioridade: MidiaPrioridade; prazo: string }>>; saving: boolean; onClose: () => void; onSave: () => void }) {
  return <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center"><div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-lg"><div className="flex items-center justify-between px-5 py-4 border-b border-white/8"><h2 className="text-white font-bold">Nova solicitação de Mídia</h2><button onClick={onClose} className="text-gray-400 text-xl"><X size={16} /></button></div><div className="p-5 space-y-4"><div><label className="label">Título *</label><input value={form.titulo} onChange={event => setForm(current => ({ ...current, titulo: event.target.value }))} placeholder="Ex.: Arte para culto de domingo" className={INPUT} /></div><div><label className="label">Descrição / briefing</label><textarea value={form.descricao} onChange={event => setForm(current => ({ ...current, descricao: event.target.value }))} rows={4} className={`${INPUT} resize-none`} /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Tipo</label><select value={form.tipo} onChange={event => setForm(current => ({ ...current, tipo: event.target.value }))} className={INPUT}>{MIDIA_TIPOS.map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}</select></div><div><label className="label">Prioridade</label><select value={form.prioridade} onChange={event => setForm(current => ({ ...current, prioridade: event.target.value as MidiaPrioridade }))} className={INPUT}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div></div><div><label className="label">Prazo</label><input type="date" value={form.prazo} onChange={event => setForm(current => ({ ...current, prazo: event.target.value }))} className={INPUT} /></div></div><div className="px-5 pb-5 flex gap-3"><button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold">Cancelar</button><button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Criar solicitação'}</button></div></div></div>
}
