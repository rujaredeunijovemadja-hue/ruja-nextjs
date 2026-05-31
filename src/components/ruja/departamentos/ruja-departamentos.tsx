'use client'
import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { upsertDepartamento, deleteDepartamento } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import type { Departamento } from '@/lib/ruja/types'

const EMPTY: Omit<Departamento, 'id'> = { nome:'', icone:'🏛️', lider:'', capacidade:0, descricao:'' }

export default function RujaDepartamentos() {
  const { departamentos, lideres, jovens, loading, reload } = useRuja()
  const [editando, setEditando] = useState<Departamento | 'novo' | null>(null)
  const [deletando, setDeletando] = useState<Departamento | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  function openEdit(d: Departamento | 'novo') {
    if (d === 'novo') {
      setForm({ ...EMPTY })
    } else {
      setForm({ nome: d.nome, icone: d.icone, lider: d.lider, capacidade: d.capacidade, descricao: d.descricao })
    }
    setEditando(d)
    setError('')
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      const id = editando === 'novo' ? String(Date.now()) : (editando as Departamento).id
      await upsertDepartamento({ id, ...form })
      await reload()
      setEditando(null)
      showToast('Departamento salvo!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletando) return
    try {
      await deleteDepartamento(deletando.id)
      await reload()
      showToast('Departamento excluído.')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setDeletando(null)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Departamentos</h1>
          <p className="text-gray-500 text-sm">{departamentos.length} departamentos</p>
        </div>
        <button onClick={() => openEdit('novo')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm touch-manipulation">
          + Novo
        </button>
      </div>

      {/* Cards */}
      {departamentos.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏛️</div>
          <p>Nenhum departamento cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {departamentos.map(d => {
            const membros = jovens.filter(j => j.departamento.includes(d.nome))
            const ativos  = membros.filter(j => j.status === 'Ativo')
            return (
              <div key={d.id} className="bg-[#111] border border-white/8 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{d.icone}</span>
                    <div>
                      <div className="text-white font-bold">{d.nome}</div>
                      <div className="text-gray-500 text-xs">{d.lider || 'Sem líder'}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(d)} className="p-2 text-gray-400 hover:text-white touch-manipulation">✏️</button>
                    <button onClick={() => setDeletando(d)} className="p-2 text-gray-400 hover:text-red-400 touch-manipulation">🗑️</button>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 pt-3 border-t border-white/5">
                  <div className="text-center">
                    <div className="text-white font-bold text-lg">{membros.length}</div>
                    <div className="text-gray-500 text-xs">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-bold text-lg">{ativos.length}</div>
                    <div className="text-gray-500 text-xs">Ativos</div>
                  </div>
                  {d.capacidade > 0 && (
                    <div className="text-center">
                      <div className="text-yellow-400 font-bold text-lg">{d.capacidade}</div>
                      <div className="text-gray-500 text-xs">Meta</div>
                    </div>
                  )}
                </div>
                {d.descricao && <p className="text-gray-500 text-xs mt-2">{d.descricao}</p>}
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
              <h2 className="text-white font-bold">{editando === 'novo' ? 'Novo Departamento' : 'Editar Departamento'}</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 text-xl touch-manipulation">✕</button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-16">
                  <label className={LBL}>Ícone</label>
                  <input value={form.icone} onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
                    className={INP + ' text-center text-2xl'} maxLength={2} />
                </div>
                <div className="flex-1">
                  <label className={LBL}>Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Nome do departamento" className={INP} />
                </div>
              </div>
              <div>
                <label className={LBL}>Líder responsável</label>
                <select value={form.lider} onChange={e => setForm(f => ({ ...f, lider: e.target.value }))} className={INP}>
                  <option value="">— Selecionar</option>
                  {lideres.map(l => <option key={l.id} value={l.nome}>{l.nome}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>Capacidade (meta)</label>
                <input type="number" min={0} value={form.capacidade}
                  onChange={e => setForm(f => ({ ...f, capacidade: parseInt(e.target.value) || 0 }))}
                  className={INP} />
              </div>
              <div>
                <label className={LBL}>Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2} className={INP + ' resize-none'} />
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</div>}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button onClick={() => setEditando(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50 touch-manipulation">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deletando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">Excluir departamento?</h3>
            <p className="text-gray-400 text-sm mb-5"><strong className="text-white">{deletando.nome}</strong> será removido.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletando(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold touch-manipulation">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">{toast}</div>
      )}
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
