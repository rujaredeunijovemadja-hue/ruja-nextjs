'use client'
import { useState } from 'react'
import type { RujaPage } from './ruja-layout'

interface Props {
  current: RujaPage
  onNavigate: (page: RujaPage) => void
  onBusca: () => void
}

const MAIN_TABS: { page: RujaPage; icon: string; label: string }[] = [
  { page: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { page: 'jovens',      icon: '👥', label: 'Jovens' },
  { page: 'frequencia',  icon: '✅', label: 'Freq.' },
  { page: 'aniversarios',icon: '🎂', label: 'Aniv.' },
]

const MORE_PAGES: { page: RujaPage; icon: string; label: string }[] = [
  { page: 'recuperacao',   icon: '🚑', label: 'Recuperação' },
  { page: 'departamentos', icon: '🏛️', label: 'Departamentos' },
  { page: 'lideres',       icon: '⭐', label: 'Líderes' },
  { page: 'metas',         icon: '🎯', label: 'Metas' },
  { page: 'alertas',       icon: '🚨', label: 'Alertas' },
  { page: 'lidersupremo',  icon: '👑', label: 'Líder Supremo' },
  { page: 'usuarios',       icon: '👤', label: 'Usuários' },
  { page: 'config',        icon: '⚙️', label: 'Configurações' },
]

export function RujaMobileNav({ current, onNavigate, onBusca }: Props) {
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111]/95 backdrop-blur border-t border-white/8"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-16">
          {MAIN_TABS.map(t => (
            <button key={t.page} onClick={() => onNavigate(t.page)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition touch-manipulation
                ${current === t.page ? 'text-red-500' : 'text-gray-500 hover:text-gray-300'}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <button onClick={() => setShowMore(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition touch-manipulation">
            <span className="text-xl leading-none">☰</span>
            Mais
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="bg-[#111] border-t border-white/8 rounded-t-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
            <div className="w-9 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

            {/* Busca dentro do drawer */}
            <div className="px-4 py-2">
              <button onClick={() => { setShowMore(false); onBusca() }}
                className="w-full flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-gray-400 text-sm touch-manipulation">
                🔍 Buscar...
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 px-2 pb-2">
              {MORE_PAGES.map(p => (
                <button key={p.page}
                  onClick={() => { onNavigate(p.page); setShowMore(false) }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition touch-manipulation
                    ${current === p.page ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/5'}`}>
                  <span className="text-2xl">{p.icon}</span>
                  <span className="text-center leading-tight">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
