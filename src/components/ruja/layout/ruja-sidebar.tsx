'use client'
import type { RujaPage } from './ruja-layout'

interface Props {
  current: RujaPage
  userName: string
  onNavigate: (page: RujaPage) => void
  onLogout: () => void
}

const NAV_ITEMS: { page: RujaPage; icon: string; label: string }[] = [
  { page: 'dashboard',   icon: '📊', label: 'Dashboard' },
  { page: 'jovens',      icon: '👥', label: 'Jovens' },
  { page: 'frequencia',  icon: '✅', label: 'Frequência' },
  { page: 'recuperacao', icon: '🚑', label: 'Recuperação' },
  { page: 'departamentos',icon:'🏛️', label: 'Departamentos' },
  { page: 'lideres',     icon: '⭐', label: 'Líderes' },
  { page: 'metas',       icon: '🎯', label: 'Metas' },
  { page: 'aniversarios',icon: '🎂', label: 'Aniversários' },
  { page: 'config',      icon: '⚙️', label: 'Configurações' },
]

export function RujaSidebar({ current, userName, onNavigate, onLogout }: Props) {
  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#111] border-r border-white/8 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦁</span>
          <div>
            <div className="font-black text-white text-lg tracking-tight">
              <span className="text-red-500">RUJA</span>
            </div>
            <div className="text-gray-500 text-xs">UniJovem ADJA</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition touch-manipulation
              ${current === item.page
                ? 'bg-red-500/15 text-red-400'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 pb-4 border-t border-white/8 pt-4">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition touch-manipulation"
        >
          <span>🚪</span>
          Sair
        </button>
      </div>
    </aside>
  )
}
