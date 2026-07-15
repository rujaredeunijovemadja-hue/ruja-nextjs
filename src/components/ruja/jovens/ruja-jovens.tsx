'use client'
import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { Spinner } from '@/components/ui/spinner'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { FotoLightbox } from '@/components/ui/foto-lightbox'
import { RujaJovemForm } from './ruja-jovem-form'
import { RujaJovemDetalhe } from './ruja-jovem-detalhe'
import { deleteJovem, auditLog } from '@/lib/ruja/queries'
import type { Jovem } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { activeDepartments, DEPARTMENT_LABELS, filterJovensByScope, jovemMatchesDepartmentName } from '@/lib/ruja/departments'

type Filtro = 'todos' | 'Ativo' | 'Oscilando' | 'Ocioso' | 'Em Risco'
type Depto = 'todos' | string

export default function RujaJovens({ scope = 'all' }: { scope?: DepartmentScope }) {
  const { jovens, departamentos, loading, reloadJovens, can } = useRuja()
  const canManage = can('manage_department')
  const [busca,      setBusca]      = useState('')
  const [filtroStatus, setFiltroStatus] = useState<Filtro>('todos')
  const [filtroDepto,  setFiltroDepto]  = useState<Depto>('todos')
  const [editando,   setEditando]   = useState<Jovem | null | 'novo'>(null)
  const [detalhe,    setDetalhe]    = useState<Jovem | null>(null)
  const [deletando,  setDeletando]  = useState<Jovem | null>(null)
  const [fotoExpandida, setFotoExpandida] = useState<{ url: string; nome: string } | null>(null)
  const [toast,      setToast]      = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const filtrados = useMemo(() => {
    return filterJovensByScope(jovens, scope).filter(j => {
      const matchBusca = !busca || j.nome.toLowerCase().includes(busca.toLowerCase()) ||
        j.contato.includes(busca) || j.departamento.toLowerCase().includes(busca.toLowerCase())
      const matchStatus = filtroStatus === 'todos' || j.status === filtroStatus
      const matchDepto = filtroDepto === 'todos' || jovemMatchesDepartmentName(j, filtroDepto)
      return matchBusca && matchStatus && matchDepto
    })
  }, [jovens, busca, filtroStatus, filtroDepto, scope])

  const availableDepartments = activeDepartments(departamentos)

  async function handleDelete() {
    if (!deletando) return
    try {
      await auditLog('delete_jovem', 'ruja_jovens', deletando.id, deletando)
      await deleteJovem(deletando.id)
      await reloadJovens()
      showToast('Jovem excluído.')
    } catch (e) {
      showToast('Erro ao excluir: ' + (e instanceof Error ? e.message : ''))
    } finally {
      setDeletando(null)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">
            Jovens{scope !== 'all' ? ` · ${DEPARTMENT_LABELS[scope]}` : ''}
          </h1>
          <p className="text-gray-500 text-sm">{filterJovensByScope(jovens, scope).length} cadastrados · {filtrados.length} exibidos</p>
        </div>
        {canManage && <button
          onClick={() => setEditando('novo')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 touch-manipulation"
        >
          <span className="text-base">+</span> Novo
        </button>}
      </div>

      {/* Busca */}
      <input
        type="search"
        placeholder="Buscar por nome, WhatsApp, departamento..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 mb-3 touch-manipulation"
      />

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {(['todos','Ativo','Oscilando','Ocioso','Em Risco'] as Filtro[]).map(f => (
          <button key={f}
            onClick={() => setFiltroStatus(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
              ${filtroStatus === f ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            {f === 'todos' ? 'Todos' : f}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1" />
        {scope === 'all' && (
          <>
            {(['todos'] as Depto[]).map(d => (
              <button key={d}
                onClick={() => setFiltroDepto(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
                  ${filtroDepto === d ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                Todos deptos
              </button>
            ))}
            {availableDepartments.map(d => (
                <button key={d.id}
                  onClick={() => setFiltroDepto(d.nome)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition touch-manipulation
                    ${filtroDepto === d.nome ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  {d.nome}
                </button>
            ))}
          </>
        )}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">👥</div>
          <p>{busca ? 'Nenhum resultado para a busca.' : 'Nenhum jovem cadastrado.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(j => (
            <JovemCard
              key={j.id}
              jovem={j}
              onView={() => setDetalhe(j)}
              onEdit={() => setEditando(j)}
              onDelete={() => setDeletando(j)}
              onExpandFoto={() => setFotoExpandida({ url: j.foto_url, nome: j.nome })}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Detalhe do jovem */}
      {detalhe && (
        <RujaJovemDetalhe
          jovem={detalhe}
          onClose={() => setDetalhe(null)}
          onEdit={canManage ? () => { setEditando(detalhe); setDetalhe(null) } : undefined}
        />
      )}

      {/* Modal formulário */}
      {editando !== null && (
        <RujaJovemForm
          jovem={editando === 'novo' ? null : editando}
          scope={scope}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); reloadJovens(); showToast('Jovem salvo!') }}
        />
      )}

      {/* Confirm delete */}
      {deletando && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-white font-bold text-lg mb-2">Excluir jovem?</h3>
            <p className="text-gray-400 text-sm mb-5">
              <strong className="text-white">{deletando.nome}</strong> será removido permanentemente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletando(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold touch-manipulation">
                Cancelar
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold touch-manipulation">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Foto em destaque */}
      {fotoExpandida && (
        <FotoLightbox src={fotoExpandida.url} nome={fotoExpandida.nome} onClose={() => setFotoExpandida(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function JovemCard({ jovem, onView, onEdit, onDelete, onExpandFoto, canManage }: {
  jovem: Jovem
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onExpandFoto: () => void
  canManage: boolean
}) {
  const deptos = jovem.departamento ? jovem.departamento.split(';').filter(Boolean) : []

  return (
    <div className="bg-[#111] border border-white/8 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-white/15 transition" onClick={onView}>
      {/* Avatar */}
      <div
        onClick={jovem.foto_url ? e => { e.stopPropagation(); onExpandFoto() } : undefined}
        className={jovem.foto_url ? 'cursor-zoom-in' : undefined}
      >
        <Avatar src={jovem.foto_url} nome={jovem.nome} size={80} className="w-16 h-16 md:w-20 md:h-20" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-semibold text-sm truncate">{jovem.nome}</span>
          <StatusBadge status={jovem.status} />
          {jovem.batizado === 'sim' && (
            <span className="text-xs text-blue-400">🔵 Batizado</span>
          )}
        </div>
        <div className="text-gray-500 text-xs mt-0.5">{jovem.contato || '—'}</div>
        {deptos.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {deptos.map(d => (
              <span key={d} className="bg-white/5 text-gray-400 text-xs px-2 py-0.5 rounded-full">{d}</span>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      {canManage && <div className="flex gap-1 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); onEdit() }}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition touch-manipulation text-base">
          ✏️
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition touch-manipulation text-base">
          🗑️
        </button>
      </div>}
    </div>
  )
}
