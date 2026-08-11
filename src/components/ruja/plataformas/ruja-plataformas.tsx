'use client'

import { useEffect, useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { RujaIcon } from '../layout/ruja-icon'

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

  return <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-7"><header className="flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.18em] text-red-500/80">RUJA / Governança</p><h1 className="text-2xl font-bold text-white mt-1">Catálogo de Plataformas</h1><p className="text-gray-500 text-sm mt-1">Ative plataformas e acompanhe seus módulos operacionais.</p></div><div className="text-right"><div className="text-2xl font-bold text-white">{platforms.filter(platform => platform.ativo).length}<span className="text-gray-600 text-base">/{platforms.length}</span></div><div className="text-gray-600 text-xs">plataformas ativas</div></div></header>{error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-300 text-sm">{error}</div>}<div className="grid md:grid-cols-2 gap-4">{platforms.map(platform => { const platformModules = modules.filter(item => item.plataforma_id === platform.id && item.ativo); return <article key={platform.id} className={`relative overflow-hidden bg-[#111] border rounded-2xl p-5 transition ${platform.ativo ? 'border-white/10 hover:border-red-500/30' : 'border-white/5 opacity-60'}`}><div className="absolute inset-x-0 top-0 h-0.5" style={{ backgroundColor: platform.cor || '#ef4444' }} /><div className="flex items-start gap-4"><PlatformLogo platform={platform} /><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h2 className="text-white font-semibold">{platform.nome}</h2><span className="text-gray-600 text-xs">{platform.slug}</span></div><p className="text-gray-500 text-sm mt-1 leading-relaxed">{platform.descricao || 'Sem descrição.'}</p><div className="flex flex-wrap gap-1.5 mt-4">{platformModules.map(module => <span key={module.modulo?.chave} className="px-2 py-1 rounded-md bg-white/5 text-gray-400 text-[11px]">{module.modulo?.nome}</span>)}</div></div><div className="shrink-0 text-right"><span className={`block text-xs mb-3 ${platform.ativo ? 'text-green-400' : 'text-gray-600'}`}>{platform.ativo ? 'Ativa' : 'Inativa'}</span><button onClick={() => void toggle(platform)} disabled={saving === platform.id || platform.slug === 'nexus'} className={`px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${platform.ativo ? 'bg-red-500/15 text-red-300' : 'bg-white/8 text-gray-300'}`}>{saving === platform.id ? 'Salvando...' : platform.ativo ? 'Desativar' : 'Ativar'}</button></div></div></article> })}</div></div>
}

function PlatformLogo({ platform }: { platform: Platform }) {
  const logo = platform.slug === 'nexus' ? '/logos/ruja-mono.png' : platform.slug === 'central-ebd' ? '/logos/ruja-brand.png' : null
  return <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-white/10 bg-black">{logo ? <img src={logo} alt={platform.nome} className="w-full h-full object-contain" /> : <span style={{ color: platform.cor || '#ef4444' }}><RujaIcon name={platform.slug} size={24} /></span>}</div>
}
