'use client'
// ─── CONTEXTO GLOBAL DO RUJA ──────────────────────────────────
// Centraliza todos os dados do app — substitui o "data store" in-memory
// do index.html (let jovens = [], let lideres = [], etc.)

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  fetchJovens, fetchLideres, fetchDepartamentos,
  fetchFrequencias, fetchRecuperacoes, fetchHistoricoMensal,
  fetchRegras, fetchMetas, fetchLiderSupremo,
  updateJovemStatus,
} from './queries'
import { calcularStatus } from './calculos'
import type { RujaState, Jovem, Regras, Metas, LiderSupremo } from './types'
import { DEFAULT_REGRAS, DEFAULT_METAS } from './types'

interface RujaContextValue extends RujaState {
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  reloadJovens: () => Promise<void>
  setJovens: (jovens: Jovem[]) => void
  recalcularStatus: (jovemId: string) => Promise<void>
}

const RujaContext = createContext<RujaContextValue | null>(null)

export function RujaProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [state, setState]       = useState<RujaState>({
    jovens:          [],
    lideres:         [],
    departamentos:   [],
    frequencias:     [],
    recuperacoes:    [],
    historicoMensal: [],
    liderSupremo:    { nome:'', contato:'', instagram:'', foto:'', descricao:'', dataPosseLider:'', versiculoLider:'', visao:'', tempoRuja:'' },
    regras:          DEFAULT_REGRAS,
    metas:           DEFAULT_METAS,
  })

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [jovens, lideres, departamentos, frequencias, recuperacoes,
             historicoMensal, regras, metas, liderSupremo] = await Promise.all([
        fetchJovens(), fetchLideres(), fetchDepartamentos(),
        fetchFrequencias(), fetchRecuperacoes(), fetchHistoricoMensal(),
        fetchRegras(), fetchMetas(), fetchLiderSupremo(),
      ])
      setState({
        jovens,
        lideres,
        departamentos,
        frequencias,
        recuperacoes,
        historicoMensal,
        liderSupremo: liderSupremo ?? state.liderSupremo,
        regras:       regras ?? DEFAULT_REGRAS,
        metas:        metas  ?? DEFAULT_METAS,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  const reloadJovens = useCallback(async () => {
    const jovens = await fetchJovens()
    setState(s => ({ ...s, jovens }))
  }, [])

  const setJovens = useCallback((jovens: Jovem[]) => {
    setState(s => ({ ...s, jovens }))
  }, [])

  const recalcularStatus = useCallback(async (jovemId: string) => {
    const novoStatus = calcularStatus(jovemId, state.frequencias, state.regras)
    if (!novoStatus) return
    const jovem = state.jovens.find(j => String(j.id) === String(jovemId))
    if (!jovem || jovem.status === novoStatus) return
    await updateJovemStatus(jovemId, novoStatus)
    setState(s => ({
      ...s,
      jovens: s.jovens.map(j =>
        String(j.id) === String(jovemId) ? { ...j, status: novoStatus } : j
      ),
    }))
  }, [state.frequencias, state.regras, state.jovens])

  useEffect(() => { reload() }, [reload])

  return (
    <RujaContext.Provider value={{ ...state, loading, error, reload, reloadJovens, setJovens, recalcularStatus }}>
      {children}
    </RujaContext.Provider>
  )
}

export function useRuja() {
  const ctx = useContext(RujaContext)
  if (!ctx) throw new Error('useRuja must be used within RujaProvider')
  return ctx
}
