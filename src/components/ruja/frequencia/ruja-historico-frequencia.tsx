'use client'
// ─── HISTÓRICO DE FREQUÊNCIA ──────────────────────────────────
// Auditoria e correção de presenças/faltas lançadas no RUJA.
// Permite: filtrar, editar, excluir e recalcular status automático.

import { useState, useMemo } from 'react'
import { useRuja } from '@/lib/ruja/context'
import { createClient } from '@/lib/supabase/client'
import { auditLog, fetchFrequencias } from '@/lib/ruja/queries'
import { Spinner } from '@/components/ui/spinner'
import { calcularStatus } from '@/lib/ruja/calculos'
import type { Frequencia } from '@/lib/ruja/types'

type Filtro = { jovemId: string; data: string; presenca: 'todos' | 'presente' | 'falta' }

export default function RujaHistoricoFrequencia() {
  const { jovens, frequencias, regras, reload, loading } = useRuja()

  const [filtro, setFiltro] = useState<Filtro>({ jovemId: '', data: '', presenca: 'todos' })
  const [editando, setEditando] = useState<Frequencia | null>(null)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null) // id do registro

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500) }

  // ── Filtragem ──────────────────────────────────────────────
  const registros = useMemo(() => {
    return frequencias
      .filter(f => {
        if (filtro.jovemId && f.jovem_id !== filtro.jovemId) return false
        if (filtro.data && !f.data.startsWith(filtro.data)) return false
        if (filtro.presenca !== 'todos' && f.presenca !== filtro.presenca) return false
        return true
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [frequencias, filtro])

  // ── Mapa jovem_id → nome ───────────────────────────────────
  const nomeJovem = useMemo(() => {
    const m: Record<string, string> = {}
    jovens.forEach(j => { m[j.id] = j.nome })
    return m
  }, [jovens])

  // ── Recalcular status de um jovem após alteração ───────────
  async function recalcularJovem(jovemId: string, freqsAtuais: Frequencia[]) {
    const novoStatus = calcularStatus(jovemId, freqsAtuais, regras)
    if (!novoStatus) return
    const sb = createClient()
    await sb.from('ruja_jovens')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', jovemId)
  }

  // ── Salvar edição (presença ↔ falta) ──────────────────────
  async function handleSalvarEdicao() {
    if (!editando) return
    setSaving(true)
    try {
      const sb = createClient()
      const antes = frequencias.find(f => f.id === editando.id)
      const { error } = await sb
        .from('ruja_frequencias')
        .update({ presenca: editando.presenca, obs: editando.obs })
        .eq('id', editando.id)
      if (error) throw error

      await auditLog('UPDATE', 'ruja_frequencias', editando.id, antes, editando)

      // Recalcular com frequências atualizadas localmente
      const freqsAtualizadas = frequencias.map(f =>
        f.id === editando.id ? { ...f, presenca: editando.presenca } : f
      )
      await recalcularJovem(editando.jovem_id, freqsAtualizadas)

      await reload()
      setEditando(null)
      showToast('✅ Registro atualizado e status recalculado.')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  // ── Excluir registro ───────────────────────────────────────
  async function handleExcluir(id: string) {
    setSaving(true)
    try {
      const registro = frequencias.find(f => f.id === id)
      const sb = createClient()
      const { error } = await sb.from('ruja_frequencias').delete().eq('id', id)
      if (error) throw error

      if (registro) {
        await auditLog('DELETE', 'ruja_frequencias', id, registro, null)
        const freqsAtualizadas = frequencias.filter(f => f.id !== id)
        await recalcularJovem(registro.jovem_id, freqsAtualizadas)
      }

      await reload()
      setConfirmDel(null)
      showToast('🗑️ Registro excluído e status recalculado.')
    } catch (e) {
      showToast('Erro: ' + (e instanceof Error ? e.message : 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-white">Histórico de Frequência</h1>
        <span className="text-xs bg-white/8 text-gray-400 px-2.5 py-1 rounded-full">
          {registros.length} registros
        </span>
      </div>

      {/* ── FILTROS ─────────────────────────────────────────── */}
      <div className="bg-[#111] border border-white/8 rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Jovem */}
          <div>
            <label className={LBL}>Jovem</label>
            <select
              value={filtro.jovemId}
              onChange={e => setFiltro(f => ({ ...f, jovemId: e.target.value }))}
              className={SEL}
            >
              <option value="">Todos</option>
              {jovens.map(j => (
                <option key={j.id} value={j.id}>{j.nome}</option>
              ))}
            </select>
          </div>

          {/* Mês */}
          <div>
            <label className={LBL}>Mês</label>
            <input
              type="month"
              value={filtro.data}
              onChange={e => setFiltro(f => ({ ...f, data: e.target.value }))}
              className={INP}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className={LBL}>Tipo</label>
            <div className="flex gap-2">
              {(['todos', 'presente', 'falta'] as const).map(op => (
                <button key={op} onClick={() => setFiltro(f => ({ ...f, presenca: op }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold capitalize transition touch-manipulation
                    ${filtro.presenca === op
                      ? op === 'presente' ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : op === 'falta' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-white/10 text-white border border-white/20'
                      : 'bg-white/5 text-gray-500 border border-white/5'}`}>
                  {op === 'todos' ? 'Todos' : op === 'presente' ? '✅ Presente' : '❌ Falta'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Limpar filtros */}
        {(filtro.jovemId || filtro.data || filtro.presenca !== 'todos') && (
          <button
            onClick={() => setFiltro({ jovemId: '', data: '', presenca: 'todos' })}
            className="text-xs text-gray-500 hover:text-gray-300 underline transition"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── LISTA ───────────────────────────────────────────── */}
      {registros.length === 0 ? (
        <div className="text-center py-16 text-gray-600 text-sm">
          Nenhum registro encontrado com os filtros aplicados.
        </div>
      ) : (
        <div className="space-y-2">
          {registros.map(reg => (
            <div key={reg.id}
              className="bg-[#111] border border-white/8 rounded-xl p-3.5 flex items-center gap-3"
            >
              {/* Indicador presença */}
              <div className={`w-2 h-10 rounded-full flex-shrink-0
                ${reg.presenca === 'presente' ? 'bg-green-500' : 'bg-red-500'}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium truncate">
                    {nomeJovem[reg.jovem_id] ?? reg.jovem_id}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                    ${reg.presenca === 'presente'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400'}`}>
                    {reg.presenca === 'presente' ? 'Presente' : 'Falta'}
                  </span>
                </div>
                <div className="text-gray-500 text-xs mt-0.5">
                  {reg.data} · {reg.evento}
                  {reg.obs && <span className="ml-2 text-gray-600">— {reg.obs}</span>}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditando({ ...reg })}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-blue-500/20 hover:text-blue-400 transition touch-manipulation text-xs"
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setConfirmDel(reg.id)}
                  className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition touch-manipulation text-xs"
                  title="Excluir"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL EDIÇÃO ────────────────────────────────────── */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-white/12 rounded-2xl w-full max-w-md p-5">
            <h2 className="text-white font-bold mb-1">Editar Registro</h2>
            <p className="text-gray-500 text-xs mb-4">
              {nomeJovem[editando.jovem_id]} · {editando.data} · {editando.evento}
            </p>

            {/* Presença toggle */}
            <div className="mb-4">
              <label className={LBL}>Presença</label>
              <div className="flex gap-3">
                {(['presente', 'falta'] as const).map(op => (
                  <button key={op} onClick={() => setEditando(e => e ? { ...e, presenca: op } : e)}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition touch-manipulation
                      ${editando.presenca === op
                        ? op === 'presente'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-600 text-white'
                        : 'bg-white/5 text-gray-500'}`}>
                    {op === 'presente' ? '✅ Presente' : '❌ Falta'}
                  </button>
                ))}
              </div>
            </div>

            {/* Observação */}
            <div className="mb-5">
              <label className={LBL}>Observação (opcional)</label>
              <input
                value={editando.obs ?? ''}
                onChange={e => setEditando(ed => ed ? { ...ed, obs: e.target.value } : ed)}
                placeholder="Ex: Justificativa médica"
                className={INP}
              />
            </div>

            {/* Aviso recálculo */}
            <div className="bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-3 py-2.5 mb-4">
              <p className="text-yellow-400 text-xs">
                ⚡ O status do jovem será <strong>recalculado automaticamente</strong> após salvar.
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditando(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 transition touch-manipulation">
                Cancelar
              </button>
              <button onClick={handleSalvarEdicao} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition touch-manipulation">
                {saving ? <Spinner size="sm" /> : null}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CONFIRMAÇÃO EXCLUSÃO ───────────────────────── */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-red-500/20 rounded-2xl w-full max-w-sm p-5">
            <h2 className="text-white font-bold mb-2">Excluir Registro?</h2>
            <p className="text-gray-400 text-sm mb-4">
              Esta ação não pode ser desfeita. O status do jovem será recalculado automaticamente.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:bg-white/5 transition touch-manipulation">
                Cancelar
              </button>
              <button onClick={() => handleExcluir(confirmDel)} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition touch-manipulation">
                {saving ? <Spinner size="sm" /> : null}
                {saving ? 'Excluindo...' : '🗑️ Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ───────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-5 py-2.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}

const LBL = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5"
const INP = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
const SEL = "w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/40 transition touch-manipulation"
