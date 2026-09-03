'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Users } from 'lucide-react'

interface Candidato {
  id: string
  nome: string
  data_nasc: string | null
  contato: string | null
  foto_path: string | null
  foto_url: string | null
  endereco: string | null
  instagram: string | null
  obs: string | null
  departamento: string | null
  lider: string | null
  status: string | null
  batizado: boolean | null
}

interface Grupo {
  motivo: 'nome_nascimento' | 'telefone'
  candidatos: Candidato[]
}

const MOTIVO_LABEL: Record<Grupo['motivo'], string> = {
  nome_nascimento: 'Mesmo nome e nascimento',
  telefone: 'Mesmo telefone',
}

export default function RujaDuplicatas() {
  const [loading, setLoading] = useState(true)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [totalJovens, setTotalJovens] = useState(0)
  const [erro, setErro] = useState('')
  const [selecao, setSelecao] = useState<Record<number, string>>({})
  const [mesclando, setMesclando] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const res = await fetch('/api/ruja/jovens/duplicatas')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao carregar duplicatas.')
      setGrupos(data.grupos ?? [])
      setTotalJovens(data.total_jovens ?? 0)
      setSelecao(Object.fromEntries((data.grupos ?? []).map((g: Grupo, i: number) => [i, g.candidatos[0]?.id])))
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar duplicatas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const showToast = (message: string) => { setToast(message); setTimeout(() => setToast(''), 4000) }

  async function mesclar(index: number) {
    const grupo = grupos[index]
    const manterId = selecao[index]
    const removerIds = grupo.candidatos.filter(c => c.id !== manterId).map(c => c.id)
    if (!window.confirm(`Manter "${grupo.candidatos.find(c => c.id === manterId)?.nome}" e apagar os outros ${removerIds.length} registro(s) duplicado(s)? O histórico de presença e recuperação é transferido automaticamente. Esta ação não pode ser desfeita.`)) return
    setMesclando(index)
    try {
      const res = await fetch('/api/ruja/jovens/duplicatas/mesclar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manter_id: manterId, remover_ids: removerIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Falha ao mesclar.')
      showToast('Duplicata mesclada com sucesso.')
      await carregar()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Falha ao mesclar.')
    } finally {
      setMesclando(null)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Duplicatas de Jovens</h1>
        <p className="text-gray-500 text-sm">
          {grupos.length} grupo(s) de possível duplicata em {totalJovens} jovem(ns) cadastrado(s)
        </p>
      </div>

      {erro && <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">{erro}</div>}

      {grupos.length === 0 && !erro ? (
        <div className="text-center py-16 text-gray-500">
          <div className="flex justify-center mb-3"><Users size={36} /></div>
          <p>Nenhuma duplicata encontrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map((grupo, index) => (
            <article key={index} className="bg-[#111] border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">{MOTIVO_LABEL[grupo.motivo]}</span>
                <span className="text-gray-600 text-xs">{grupo.candidatos.length} registros</span>
              </div>

              <div className="space-y-2 mb-3">
                {grupo.candidatos.map((candidato) => (
                  <label
                    key={candidato.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${selecao[index] === candidato.id ? 'border-green-500/40 bg-green-500/5' : 'border-white/8 bg-white/[0.02]'}`}
                  >
                    <input
                      type="radio"
                      name={`grupo-${index}`}
                      checked={selecao[index] === candidato.id}
                      onChange={() => setSelecao(s => ({ ...s, [index]: candidato.id }))}
                      className="accent-green-500"
                    />
                    {candidato.foto_path || candidato.foto_url ? (
                      <img src={candidato.foto_url ?? ''} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-white/5" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 text-lg shrink-0">{candidato.nome.charAt(0)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{candidato.nome}</span>
                        {selecao[index] === candidato.id && <span className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded-full shrink-0">Manter</span>}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {candidato.data_nasc ?? 'sem nascimento'} · {candidato.contato ?? 'sem telefone'} · {candidato.departamento ?? 'sem departamento'}
                        {(candidato.foto_path || candidato.foto_url) ? ' · com foto' : ' · sem foto'}
                      </p>
                      <p className="text-gray-600 text-[11px] font-mono mt-0.5">{candidato.id}</p>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={() => mesclar(index)}
                disabled={mesclando === index}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl"
              >
                {mesclando === index ? 'Mesclando...' : `Mesclar (manter o marcado, apagar os outros ${grupo.candidatos.length - 1})`}
              </button>
            </article>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis">
          {toast}
        </div>
      )}
    </div>
  )
}
