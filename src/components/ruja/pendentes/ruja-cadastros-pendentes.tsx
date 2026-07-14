'use client'

import { useMemo, useState } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { aprovarCadastroPendente, rejeitarCadastroPendente } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import type { CadastroPendente } from '@/lib/ruja/types'
import type { DepartmentScope } from '@/lib/ruja/departments'
import { activeOfficialDepartments, DEPARTMENT_LABELS, departmentSlug } from '@/lib/ruja/departments'

export default function RujaCadastrosPendentes({ scope = 'all' }: { scope?: DepartmentScope }) {
  const { cadastrosPendentes, departamentos, loading, reload } = useRuja()
  const [selecionado, setSelecionado] = useState<CadastroPendente | null>(null)
  const [rejeitando, setRejeitando] = useState<CadastroPendente | null>(null)
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 3000)
  }

  const officialDepartments = activeOfficialDepartments(departamentos)
  const filtrados = useMemo(() => {
    return cadastrosPendentes.filter((cadastro) => {
      if (scope === 'all') return true
      const slug = cadastro.departamento ? departmentSlug(cadastro.departamento) : ''
      return slug === scope
    })
  }, [cadastrosPendentes, scope])

  async function handleAprovar(cadastro: CadastroPendente) {
    setSaving(true)
    try {
      await aprovarCadastroPendente(cadastro)
      await reload()
      setSelecionado(null)
      showToast('Cadastro aprovado e jovem criado no departamento correto.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao aprovar cadastro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRejeitar() {
    if (!rejeitando) return
    if (!motivo.trim()) {
      showToast('Informe o motivo da rejeição.')
      return
    }
    setSaving(true)
    try {
      await rejeitarCadastroPendente(rejeitando.id, motivo.trim())
      await reload()
      setRejeitando(null)
      setMotivo('')
      showToast('Cadastro rejeitado com motivo registrado.')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao rejeitar cadastro.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">
            Cadastros Pendentes{scope !== 'all' ? ` · ${DEPARTMENT_LABELS[scope]}` : ''}
          </h1>
          <p className="text-gray-500 text-sm">
            {filtrados.filter(c => c.status === 'pendente').length} pendentes · departamentos ativos:{' '}
            {officialDepartments.map(d => d.nome).join(', ')}
          </p>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">📋</div>
          <p>Nenhum cadastro pendente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((cadastro) => (
            <div key={cadastro.id} className="bg-[#111] border border-white/8 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-white font-semibold">{cadastro.nome}</h2>
                    <StatusPill status={cadastro.status} />
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                      {cadastro.departamento?.nome ?? 'Sem departamento'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {cadastro.telefone || 'Sem telefone'} · {cadastro.email || 'Sem email'}
                  </p>
                  {cadastro.observacoes && (
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">{cadastro.observacoes}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setSelecionado(cadastro)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 text-xs font-semibold touch-manipulation"
                  >
                    Detalhes
                  </button>
                  {cadastro.status === 'pendente' && (
                    <>
                      <button
                        onClick={() => handleAprovar(cadastro)}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold disabled:opacity-50 touch-manipulation"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => setRejeitando(cadastro)}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50 touch-manipulation"
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selecionado && (
        <CadastroModal cadastro={selecionado} onClose={() => setSelecionado(null)} />
      )}

      {rejeitando && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
          <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-md p-5">
            <h2 className="text-white font-bold mb-2">Rejeitar cadastro</h2>
            <p className="text-gray-400 text-sm mb-4">{rejeitando.nome}</p>
            <textarea
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              rows={4}
              placeholder="Motivo da rejeição"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejeitando(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-300 font-semibold">
                Cancelar
              </button>
              <button onClick={handleRejeitar} disabled={saving} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">
                {saving ? 'Salvando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function CadastroModal({ cadastro, onClose }: { cadastro: CadastroPendente; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center">
      <div className="bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <h2 className="text-white font-bold">Detalhes do cadastro</h2>
          <button onClick={onClose} className="text-gray-400 text-xl touch-manipulation">✕</button>
        </div>
        <div className="p-5 grid gap-3 text-sm">
          <Info label="Nome" value={cadastro.nome} />
          <Info label="Departamento" value={cadastro.departamento?.nome ?? '—'} />
          <Info label="Telefone" value={cadastro.telefone || '—'} />
          <Info label="Email" value={cadastro.email || '—'} />
          <Info label="Nascimento" value={cadastro.data_nascimento || '—'} />
          <Info label="Responsável" value={cadastro.responsavel_nome || '—'} />
          <Info label="Telefone do responsável" value={cadastro.responsavel_telefone || '—'} />
          <Info label="Observações" value={cadastro.observacoes || '—'} />
          {cadastro.motivo_rejeicao && <Info label="Motivo da rejeição" value={cadastro.motivo_rejeicao} />}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-4 py-3">
      <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">{label}</div>
      <div className="text-gray-200">{value}</div>
    </div>
  )
}

function StatusPill({ status }: { status: CadastroPendente['status'] }) {
  const styles = {
    pendente: 'bg-yellow-500/20 text-yellow-300',
    aprovado: 'bg-green-500/20 text-green-300',
    rejeitado: 'bg-red-500/20 text-red-300',
  }[status]

  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles}`}>{status}</span>
}
