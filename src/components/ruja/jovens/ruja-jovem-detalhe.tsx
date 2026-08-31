'use client'
import { useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import {
  getFreqPct, getFaltasSeguidas, getDiasParaAniversario, getIdade,
  getEventoFreqPct, getEventoFaltasSeguidas, eventosDoDepartamento, departamentoNomePorId,
} from '@/lib/ruja/calculos'
import type { Jovem } from '@/lib/ruja/types'
import { Pencil, X, Check } from 'lucide-react'

interface Props {
  jovem: Jovem
  onClose: () => void
  onEdit?: () => void
}

export function RujaJovemDetalhe({ jovem, onClose, onEdit }: Props) {
  const { frequencias, eventosFrequencia, departamentos, lideres, recuperacoes } = useRuja()

  const usaEventos = eventosFrequencia.length > 0
  const pct = usaEventos ? getEventoFreqPct(jovem.id, eventosFrequencia, jovem, departamentos) : getFreqPct(jovem.id, frequencias)
  const faltasSeg = usaEventos ? getEventoFaltasSeguidas(jovem.id, eventosFrequencia, jovem, departamentos) : getFaltasSeguidas(jovem.id, frequencias)
  const diasAniv = getDiasParaAniversario(jovem.data_nasc)
  const idade = getIdade(jovem.data_nasc)
  const deptos = jovem.departamento ? jovem.departamento.split(';').filter(Boolean) : []
  const emRecup = recuperacoes.some(r => String(r.jovem_id) === String(jovem.id) && r.status === 'ativo')

  const eventosIndividuais = useMemo(() => {
    return eventosDoDepartamento(eventosFrequencia, jovem, departamentos)
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 12)
      .map(evento => {
        const rel = evento.participantes?.find(p => String(p.jovem_id) === String(jovem.id) && p.presente)
        return { evento, presente: Boolean(rel), observacao: rel?.observacao ?? '' }
      })
  }, [eventosFrequencia, departamentos, jovem])

  const ultFreqs = useMemo(() => {
    return frequencias
      .filter(f => String(f.jovem_id) === String(jovem.id))
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 10)
  }, [frequencias, jovem.id])

  const nomeLider = (id?: string | null) => lideres.find(l => String(l.id) === String(id))?.nome ?? 'Sem líder'

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end md:items-center justify-center">
      <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <h2 className="text-white font-bold truncate">Perfil do Jovem</h2>
          <div className="flex gap-2 flex-shrink-0">
            {onEdit && <button onClick={onEdit} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded-lg touch-manipulation"><Pencil size={16} /></button>}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white text-xl touch-manipulation"><X size={16} /></button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div className="flex flex-col items-center text-center">
            <Avatar src={jovem.foto_url} nome={jovem.nome} size={250} className="w-[200px] h-[200px] md:w-[250px] md:h-[250px]" />
            <div className="text-white font-bold text-lg mt-3">{jovem.nome}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap justify-center">
              <StatusBadge status={jovem.status} />
              {jovem.batizado === 'sim' && <span className="text-blue-400 text-xs">Batizado</span>}
              {emRecup && <span className="text-orange-400 text-xs">Recuperação</span>}
            </div>
          </div>

          <div className="flex gap-2">
            {jovem.contato && (
              <a href={`https://wa.me/55${jovem.contato.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl py-2.5 text-green-400 text-sm touch-manipulation">WhatsApp</a>
            )}
            {jovem.instagram && (
              <a href={`https://instagram.com/${jovem.instagram.replace('@','')}`} target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl py-2.5 text-purple-400 text-sm touch-manipulation">Instagram</a>
            )}
          </div>

          <div className="bg-black/30 rounded-xl p-4">
            <div className="text-gray-400 text-xs uppercase tracking-wider mb-3">Frequência {usaEventos ? 'por evento' : 'legado'}</div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className={`text-2xl font-black ${pct >= 75 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{pct}%</div>
                <div className="text-gray-500 text-xs">Total</div>
              </div>
              <div className="flex-1 bg-white/5 rounded-full h-2">
                <div className={`h-2 rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="text-center">
                <div className="text-xl font-black text-red-400">{faltasSeg}</div>
                <div className="text-gray-500 text-xs">Faltas seg.</div>
              </div>
            </div>

            {usaEventos ? (
              <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                <div className="text-gray-500 text-xs mb-2">Eventos recentes</div>
                {eventosIndividuais.map(({ evento, presente, observacao }) => (
                  <div key={evento.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                    <div className="min-w-0">
                      <div className="text-gray-200 text-xs font-semibold truncate">{evento.nome}</div>
                      <div className="text-gray-500 text-[11px] truncate">
                        {evento.data} · {departamentoNomePorId(departamentos, evento.departamento_id)} · {nomeLider(evento.lider_responsavel_id)}
                      </div>
                      {observacao && <div className="text-gray-600 text-[11px] truncate">{observacao}</div>}
                    </div>
                    <span className={`text-[11px] px-2 py-1 rounded-full font-bold ${presente ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {presente ? 'Presente' : 'Ausente'}
                    </span>
                  </div>
                ))}
              </div>
            ) : ultFreqs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-gray-500 text-xs mb-2">Últimos registros legados</div>
                <div className="flex flex-wrap gap-1.5">
                  {ultFreqs.map(f => (
                    <div key={f.id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg ${f.presenca === 'presente' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {f.data.slice(5)} {f.presenca === 'presente' ? <Check size={11} /> : <X size={11} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {deptos.length > 0 && <InfoItem label="Departamentos" value={deptos.join(', ')} />}
            {jovem.lider && <InfoItem label="Líder" value={jovem.lider} />}
            {jovem.data_nasc && <InfoItem label="Aniversário" value={`${jovem.data_nasc.slice(8,10)}/${jovem.data_nasc.slice(5,7)} · ${idade} anos${diasAniv === 0 ? ' · hoje' : diasAniv <= 7 ? ` · em ${diasAniv}d` : ''}`} />}
            {jovem.entrada && <InfoItem label="Na RUJA desde" value={jovem.entrada} />}
            {jovem.endereco && <InfoItem label="Endereço" value={jovem.endereco} className="col-span-2" />}
          </div>

          {jovem.obs && (
            <div className="bg-black/30 rounded-xl p-4">
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">Observações</div>
              <p className="text-gray-300 text-sm">{jovem.obs}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`bg-black/30 rounded-xl p-3 ${className}`}>
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-gray-200 text-sm">{value}</div>
    </div>
  )
}
