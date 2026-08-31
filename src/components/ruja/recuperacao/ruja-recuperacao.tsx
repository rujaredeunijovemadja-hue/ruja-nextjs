'use client'
import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { upsertRecuperacao, deleteRecuperacao } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import { Avatar } from '@/components/ui/avatar'
import type { Recuperacao } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { DEPARTMENT_LABELS, filterJovensByScope } from '@/lib/ruja/departments'
import { Pencil, Trash2, X, AlertTriangle, HeartPulse, CheckCircle2, MessageCircle } from 'lucide-react'

export default function RujaRecuperacao({ scope = 'all' }: { scope?: DepartmentScope }) {
  const { jovens, lideres, recuperacoes, loading, reload } = useRuja()
  const [editando,  setEditando]  = useState<Recuperacao | 'novo' | null>(null)
  const [deletando, setDeletando] = useState<Recuperacao | null>(null)
  const [filtro,    setFiltro]    = useState<'ativo' | 'concluido' | 'todos'>('ativo')
  const [form,      setForm]      = useState({ jovem_id:'', data_inicio:'', lider_resp:'', motivo:'', status:'ativo' as 'ativo'|'concluido', obs:'' })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  const scopedJovens = useMemo(() => filterJovensByScope(jovens, scope), [jovens, scope])
  const scopedJovemIds = useMemo(() => new Set(scopedJovens.map(j => j.id)), [scopedJovens])

  const filtrados = useMemo(() =>
    recuperacoes.filter(r => scopedJovemIds.has(r.jovem_id) && (filtro === 'todos' || r.status === filtro)),
    [recuperacoes, filtro, scopedJovemIds]
  )

  function openEdit(r: Recuperacao | 'novo') {
    if (r === 'novo') {
      setForm({ jovem_id:'', data_inicio: new Date().toISOString().slice(0,10), lider_resp:'', motivo:'', status:'ativo', obs:'' })
    } else {
      setForm({ jovem_id: r.jovem_id, data_inicio: r.data_inicio, lider_resp: r.lider_resp, motivo: r.motivo, status: r.status, obs: r.obs })
    }
    setEditando(r)
    setError('')
  }

  async function handleSave() {
    if (!form.jovem_id) { setError('Selecione o jovem.'); return }
    setSaving(true)
    setError('')
    try {
      const id = editando === 'novo' ? String(Date.now()) : (editando as Recuperacao).id
      await upsertRecuperacao({ id, ...form })
      await reload()
      setEditando(null)
      showToast('Plano salvo!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletando) return
    try {
      await deleteRecuperacao(deletando.id)
      await reload()
      showToast('Plano removido.')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setDeletando(null)
    }
  }

  async function marcarConcluido(r: Recuperacao) {
    try {
      await upsertRecuperacao({ ...r, status: 'concluido' })
      await reload()
      showToast('Marcado como concluído!')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  const jovensEmRisco = scopedJovens.filter(j => j.status === 'Em Risco')

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">
            Recuperação{scope !== 'all' ? ` · ${DEPARTMENT_LABELS[scope]}` : ''}
          </h1>
          <p className="text-gray-500 text-sm">{jovensEmRisco.length} em risco · {filtrados.length} planos</p>
        </div>
        <button onClick={() => openEdit('novo')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm touch-manipulation">
          + Novo Plano
        </button>
      </div>

      {/* Jovens em risco sem plano */}
      {jovensEmRisco.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-1.5 text-red-400 text-sm font-semibold mb-2"><AlertTriangle size={14} />Jovens Em Risco sem plano de recuperação</div>
          <div className="flex flex-wrap gap-2">
            {jovensEmRisco
              .filter(j => !recuperacoes.some(r => r.jovem_id === j.id && r.status === 'ativo'))
              .map(j => (
                <button key={j.id}
                  onClick={() => { openEdit('novo'); setForm(f => ({ ...f, jovem_id: j.id })) }}
                  className="bg-red-500/20 text-red-300 text-xs px-3 py-1.5 rounded-full hover:bg-red-500/30 touch-manipulation">
                  + {j.nome}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Filtro */}
      <div className="flex gap-2 mb-4">
        {(['ativo','concluido','todos'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
              ${filtro === f ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400'}`}>
            {f === 'ativo' ? 'Ativos' : f === 'concluido' ? 'Concluídos' : 'Todos'}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="flex justify-center mb-3"><HeartPulse size={36} className="text-gray-600" /></div>
          <p>Nenhum plano de recuperação.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(r => {
            const jovem = jovens.find(j => String(j.id) === String(r.jovem_id))
            return (
              <div key={r.id} className={`bg-[#111] border rounded-xl p-4
                ${r.status === 'ativo' ? 'border-red-500/20' : 'border-white/8 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <Avatar
                    src={jovem?.foto_url}
                    nome={jovem?.nome ?? '?'}
                    size={80}
                    className="w-16 h-16 md:w-20 md:h-20"
                    bg={r.status === 'ativo' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400'}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold">{jovem?.nome ?? 'Jovem não encontrado'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'ativo' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                        {r.status === 'ativo' ? (<span className="flex items-center gap-1"><HeartPulse size={11}/>Ativo</span>) : (<span className="flex items-center gap-1"><CheckCircle2 size={11}/>Concluído</span>)}
                      </span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      Líder: {r.lider_resp || '—'} · Início: {r.data_inicio || '—'}
                    </div>
                    {r.motivo && <p className="text-gray-400 text-sm mt-2">{r.motivo}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {r.status === 'ativo' && (
                      <button onClick={() => marcarConcluido(r)}
                        title="Marcar como concluído"
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg touch-manipulation"><CheckCircle2 size={16} /></button>
                    )}
                    <button onClick={() => openEdit(r)} className="p-2 text-gray-400 hover:text-white touch-manipulation"><Pencil size={16} /></button>
                    <button onClick={() => setDeletando(r)} className="p-2 text-gray-400 hover:text-red-400 touch-manipulation"><Trash2 size={16} /></button>
                    {jovem?.contato && (
                      <a href={`https://wa.me/55${jovem.contato.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg touch-manipulation"><MessageCircle size={16} /></a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {editando !== null && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <h2 className="text-white font-bold">Plano de Recuperação</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 text-xl touch-manipulation"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className={LBL}>Jovem *</label>
                <select value={form.jovem_id} onChange={e => setForm(f => ({ ...f, jovem_id: e.target.value }))} className={INP}>
                  <option value="">— Selecionar jovem</option>
                  {scopedJovens.map(j => <option key={j.id} value={j.id}>{j.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>Líder responsável</label>
                <select value={form.lider_resp} onChange={e => setForm(f => ({ ...f, lider_resp: e.target.value }))} className={INP}>
                  <option value="">— Selecionar líder</option>
                  {lideres.map(l => <option key={l.id} value={l.nome}>{l.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>Data de início</label>
                <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className={INP} />
              </div>
              <div>
                <label className={LBL}>Motivo</label>
                <textarea value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                  rows={3} className={INP + ' resize-none'} placeholder="Descreva a situação..." />
              </div>
              <div>
                <label className={LBL}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'ativo'|'concluido' }))} className={INP}>
                  <option value="ativo">Ativo</option>
                  <option value="concluido">Concluído</option>
                </select>
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</div>}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditando(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50 touch-manipulation">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">Excluir plano?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeletando(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold touch-manipulation">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>}
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
