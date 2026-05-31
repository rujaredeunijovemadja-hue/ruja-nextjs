'use client'
import { useState } from 'react'
import type { RujaPage } from './ruja-layout'

interface Props {
  current: RujaPage
  onNavigate: (page: RujaPage) => void
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
  { page: 'config',        icon: '⚙️', label: 'Configurações' },
]

export function RujaMobileNav({ current, onNavigate }: Props) {
  const [showMore, setShowMore] = useState(false)

  return (
    <>
      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111]/95 backdrop-blur border-t border-white/8 pb-safe">
        <div className="flex items-stretch h-16">
          {MAIN_TABS.map(t => (
            <button
              key={t.page}
              onClick={() => onNavigate(t.page)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition touch-manipulation
                ${current === t.page ? 'text-red-500' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowMore(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-gray-500 hover:text-gray-300 transition touch-manipulation"
          >
            <span className="text-xl leading-none">☰</span>
            Mais
          </button>
        </div>
      </nav>

      {/* Drawer "Mais" */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="flex-1 bg-black/50" onClick={() => setShowMore(false)} />
          <div className="bg-[#111] border-t border-white/8 rounded-t-2xl pb-safe">
            <div className="w-9 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-4" />
            <div className="grid grid-cols-3 gap-1 px-2 pb-4">
              {MORE_PAGES.map(p => (
                <button
                  key={p.page}
                  onClick={() => { onNavigate(p.page); setShowMore(false) }}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-xl text-xs font-medium transition touch-manipulation
                    ${current === p.page ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:bg-white/5'}`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
