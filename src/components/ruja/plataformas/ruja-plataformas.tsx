'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'

interface Platform { id: string; nome: string; slug: string; descricao: string | null; icone: string | null; cor: string | null; ativo: boolean; ordem: number }
interface ModuleLink { plataforma_id: string; ativo: boolean; modulo: { chave: string; nome: string; descricao: string | null } | null }

export default function RujaPlataformas() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [modules, setModules] = useState<ModuleLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/ruja/platforms/catalog')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível carregar o catálogo.')
      setPlatforms(data.plataformas ?? [])
      setModules(data.modulos ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao carregar o catálogo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void Promise.resolve().then(load) }, [])

  async function toggle(platform: Platform) {
    setSaving(platform.id)
    setError('')
    try {
      const response = await fetch('/api/ruja/platforms/catalog', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: platform.id, ativo: !platform.ativo, ordem: platform.ordem }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível atualizar a plataforma.')
      setPlatforms(current => current.map(item => item.id === platform.id ? { ...item, ativo: !item.ativo } : item))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erro ao atualizar a plataforma.')
    } finally {
      setSaving('')
    }
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>

  return <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5"><header><h1 className="text-xl font-bold text-white">Catálogo de Plataformas</h1><p className="text-gray-500 text-sm mt-1">Ative plataformas e confira seus módulos operacionais.</p></header>{error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm">{error}</div>}<div className="space-y-3">{platforms.map(platform => { const platformModules = modules.filter(item => item.plataforma_id === platform.id && item.ativo); return <article key={platform.id} className={`bg-[#111] border rounded-xl p-4 ${platform.ativo ? 'border-white/8' : 'border-white/5 opacity-60'}`}><div className="flex items-start gap-3"><div className="text-3xl">{platform.icone || '🧩'}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h2 className="text-white font-semibold">{platform.nome}</h2><span className="text-gray-600 text-xs">{platform.slug}</span></div><p className="text-gray-500 text-sm mt-1">{platform.descricao || 'Sem descrição.'}</p><div className="flex flex-wrap gap-1.5 mt-3">{platformModules.map(module => <span key={module.modulo?.chave} className="px-2 py-1 rounded-full bg-white/5 text-gray-400 text-[11px]">{module.modulo?.nome}</span>)}</div></div><div className="shrink-0 text-right"><span className={`block text-xs mb-2 ${platform.ativo ? 'text-green-400' : 'text-gray-600'}`}>{platform.ativo ? 'Ativa' : 'Inativa'}</span><button onClick={() => void toggle(platform)} disabled={saving === platform.id || platform.slug === 'nexus'} className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${platform.ativo ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'}`}>{saving === platform.id ? 'Salvando...' : platform.ativo ? 'Desativar' : 'Ativar'}</button></div></div></article> })}</div></div>
}
