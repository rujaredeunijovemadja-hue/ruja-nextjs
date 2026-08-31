'use client'
import { useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { upsertLider, deleteLider, upsertJovem } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import type { Lider } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { DEPARTMENT_LABELS, filterJovensByScope, jovemMatchesDepartment } from '@/lib/ruja/departments'
import { Pencil, Trash2, X, Star } from 'lucide-react'

const EMPTY = { nome:'', contato:'', departamento:'', funcao:'', data_nasc:'' }

export default function RujaLideres({ scope = 'all' }: { scope?: DepartmentScope }) {
  const { lideres, departamentos, jovens, loading, reload, reloadJovens } = useRuja()
  const [editando,  setEditando]  = useState<Lider | 'novo' | null>(null)
  const [deletando, setDeletando] = useState<Lider | null>(null)
  const [form,      setForm]      = useState({ ...EMPTY })
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [toast,     setToast]     = useState('')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

  function openEdit(l: Lider | 'novo') {
    setForm(l === 'novo' ? { ...EMPTY } : {
      nome: l.nome, contato: l.contato, departamento: l.departamento,
      funcao: l.funcao, data_nasc: l.data_nasc,
    })
    setEditando(l)
    setError('')
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    try {
      const id = editando === 'novo' ? String(Date.now()) : (editando as Lider).id
      await upsertLider({ id, ...form })
      await reload()
      setEditando(null)
      showToast('Líder salvo!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletando) return
    try {
      // Sincronizar jovens do departamento — remover referência ao líder
      const jovensDoDepto = jovens.filter(
        j => j.lider === deletando.nome && j.departamento.includes(deletando.departamento)
      )
      await Promise.all(jovensDoDepto.map(j => upsertJovem({ ...j, lider: '' })))
      await deleteLider(deletando.id)
      await reload()
      await reloadJovens()
      showToast('Líder excluído.')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setDeletando(null)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>
  const lideresFiltrados = scope === 'all'
    ? lideres
    : lideres.filter(l => l.departamento.toLowerCase() === DEPARTMENT_LABELS[scope].toLowerCase())
  const jovensEscopo = filterJovensByScope(jovens, scope)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">
            Líderes{scope !== 'all' ? ` · ${DEPARTMENT_LABELS[scope]}` : ''}
          </h1>
          <p className="text-gray-500 text-sm">{lideresFiltrados.length} líderes</p>
        </div>
        <button onClick={() => openEdit('novo')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm touch-manipulation">
          + Novo
        </button>
      </div>

      {lideresFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="flex justify-center mb-3"><Star size={36} className="text-gray-600" /></div>
          <p>Nenhum líder cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lideresFiltrados.map(l => {
            const jovensLider = jovensEscopo.filter(j => j.lider === l.nome)
            return (
              <div key={l.id} className="bg-[#111] border border-white/8 rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
                  {l.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm">{l.nome}</div>
                  <div className="text-gray-500 text-xs">{l.funcao || '—'} · {l.departamento || 'Sem depto'}</div>
                  <div className="text-gray-600 text-xs">{l.contato || '—'} · {jovensLider.length} jovens</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(l)} className="p-2 text-gray-400 hover:text-white touch-manipulation"><Pencil size={16} /></button>
                  <button onClick={() => setDeletando(l)} className="p-2 text-gray-400 hover:text-red-400 touch-manipulation"><Trash2 size={16} /></button>
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
              <h2 className="text-white font-bold">{editando === 'novo' ? 'Novo Líder' : 'Editar Líder'}</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 text-xl touch-manipulation"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {[
                { label:'Nome *',     key:'nome',     type:'text',   placeholder:'Nome completo' },
                { label:'WhatsApp',   key:'contato',  type:'tel',    placeholder:'(21) 99999-9999' },
                { label:'Função',     key:'funcao',   type:'text',   placeholder:'Ex: Líder de Célula' },
                { label:'Nascimento', key:'data_nasc',type:'date',   placeholder:'' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className={LBL}>{label}</label>
                  <input type={type} placeholder={placeholder}
                    value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={INP} />
                </div>
              ))}
              <div>
                <label className={LBL}>Departamento</label>
                <select value={form.departamento}
                  onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))} className={INP}>
                  <option value="">— Selecionar</option>
                  {departamentos
                    .filter(d => scope === 'all' || jovemMatchesDepartment({ departamento: d.nome }, scope))
                    .map(d => <option key={d.id} value={d.nome}>{d.nome}</option>)}
                </select>
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

      {deletando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold mb-2">Excluir líder?</h3>
            <p className="text-gray-400 text-sm mb-5">
              <strong className="text-white">{deletando.nome}</strong> será removido.
              Os jovens vinculados terão o campo líder limpo.
            </p>
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
