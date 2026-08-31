'use client'
import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { StatusBadge } from '@/components/ui/badge'
import { X, Search, Frown, Users, Star, Landmark, MessageCircle } from 'lucide-react'

interface Props {
  onClose: () => void
  onJovem?: (id: string) => void
}

export function RujaBusca({ onClose, onJovem }: Props) {
  const { jovens, lideres, departamentos } = useRuja()
  const [query, setQuery] = useState('')

  const resultados = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (q.length < 2) return { jovens: [], lideres: [], departamentos: [] }
    return {
      jovens:        jovens.filter(j =>
        j.nome.toLowerCase().includes(q) || j.contato.includes(q) ||
        j.departamento.toLowerCase().includes(q) || j.instagram.toLowerCase().includes(q)
      ).slice(0, 8),
      lideres:       lideres.filter(l =>
        l.nome.toLowerCase().includes(q) || l.contato.includes(q) ||
        l.departamento.toLowerCase().includes(q)
      ).slice(0, 4),
      departamentos: departamentos.filter(d =>
        d.nome.toLowerCase().includes(q) || d.lider.toLowerCase().includes(q)
      ).slice(0, 3),
    }
  }, [query, jovens, lideres, departamentos])

  const total = resultados.jovens.length + resultados.lideres.length + resultados.departamentos.length

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#111]">
        <Search size={18} className="text-gray-400" />
        <input autoFocus type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar jovens, líderes, departamentos..."
          className="flex-1 bg-transparent text-white placeholder-gray-500 text-base focus:outline-none" />
        <button onClick={onClose} className="text-gray-400 hover:text-white touch-manipulation px-2 py-1"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {query.length < 2 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="flex justify-center mb-3"><Search size={36} /></div>
            <p>Digite ao menos 2 caracteres</p>
          </div>
        ) : total === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="flex justify-center mb-3"><Frown size={36} /></div>
            <p>Nenhum resultado para <span className="text-white">&ldquo;{query}&rdquo;</span></p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {resultados.jovens.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 text-xs uppercase tracking-wider mb-2"><Users size={12} />Jovens</div>
                <div className="space-y-1">
                  {resultados.jovens.map(j => (
                    <button key={j.id} onClick={() => { onJovem?.(j.id); onClose() }}
                      className="w-full flex items-center gap-3 p-3 bg-[#111] border border-white/8 rounded-xl hover:border-white/20 transition touch-manipulation text-left">
                      <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-sm flex-shrink-0 overflow-hidden">
                        {j.foto_url ? <img src={j.foto_url} className="w-full h-full object-cover" alt="" /> : j.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm truncate">{j.nome}</div>
                        <div className="text-gray-500 text-xs">{j.departamento || 'Sem depto'} · {j.contato || '—'}</div>
                      </div>
                      <StatusBadge status={j.status} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {resultados.lideres.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 text-xs uppercase tracking-wider mb-2"><Star size={12} />Líderes</div>
                <div className="space-y-1">
                  {resultados.lideres.map(l => (
                    <div key={l.id} className="flex items-center gap-3 p-3 bg-[#111] border border-white/8 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
                        {l.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-sm">{l.nome}</div>
                        <div className="text-gray-500 text-xs">{l.funcao || '—'} · {l.departamento || '—'}</div>
                      </div>
                      {l.contato && (
                        <a href={`https://wa.me/55${l.contato.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          className="p-2 text-green-400 touch-manipulation"><MessageCircle size={16} /></a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resultados.departamentos.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 text-xs uppercase tracking-wider mb-2"><Landmark size={12} />Departamentos</div>
                <div className="space-y-1">
                  {resultados.departamentos.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 bg-[#111] border border-white/8 rounded-xl">
                      <span className="text-2xl">{d.icone}</span>
                      <div>
                        <div className="text-white font-medium text-sm">{d.nome}</div>
                        <div className="text-gray-500 text-xs">{d.lider || 'Sem líder'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
