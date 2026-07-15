'use client'
// ─── SIDEBAR DESKTOP DO RUJA ──────────────────────────────────
// Logo atualizado: usa /ruja-logo.png em vez do emoji 🦁.
// Layout: h-full + overflow-y-auto no nav para scroll interno correto.

import type { RujaPage } from './ruja-layout'
import type { RujaAccessProfile } from '@/lib/ruja/access'

interface Props {
  current:    RujaPage
  userName:   string
  onNavigate: (page: RujaPage) => void
  onLogout:   () => void
  onBusca:    () => void
  profile: RujaAccessProfile
  allowedPages: RujaPage[]
}

const NAV_ITEMS: { page: RujaPage; icon: string; label: string }[] = [
  { page: 'dashboard',     icon: '🏠', label: 'Dashboard Geral' },
  { page: 'teens',         icon: '👦', label: 'Teens' },
  { page: 'simply',        icon: '🌱', label: 'Simply' },
  { page: 'eventos',       icon: '📅', label: 'Eventos Gerais' },
  { page: 'pendentes',     icon: '📋', label: 'Cadastros Pendentes' },
  { page: 'analista-ia',   icon: '🤖', label: 'IA Nexus' },
  { page: 'config',        icon: '⚙️', label: 'Configurações' },
  { page: 'departamentos', icon: '🏛️', label: 'Departamentos' },
  { page: 'usuarios',      icon: '👤', label: 'Usuários' },
]

export function RujaSidebar({ current, userName, onNavigate, onLogout, onBusca, profile, allowedPages }: Props) {
  const scopedDepartment = profile.departamento_id === 'simply' ? 'Simply' : 'Teens'
  const items = NAV_ITEMS
    .map(item => profile.role !== 'lider_supremo' && profile.role !== 'administrador' && item.page === 'eventos'
      ? { ...item, page: 'frequencia' as RujaPage, label: `Eventos ${scopedDepartment}` }
      : item)
    .filter(item => allowedPages.includes(item.page))
  return (
    <aside className="hidden md:flex flex-col w-60 bg-[#111] border-r border-white/8 h-full shrink-0">

      {/* ── LOGO ── */}
      <div className="px-5 py-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo real do RUJA */}
          <img
            src="/ruja-logo.png"
            alt="RUJA logo"
            className="w-10 h-10 object-contain rounded-full shrink-0"
          />
          <div>
            <div className="font-black text-white text-lg tracking-tight">
              <span className="text-red-500">RUJA</span>
            </div>
            <div className="text-gray-500 text-xs">UniJovem ADJA</div>
          </div>
        </div>

        {/* Busca */}
        <button
          onClick={onBusca}
          className="mt-3 w-full flex items-center gap-2 bg-white/5 hover:bg-white/8 border border-white/8 rounded-xl px-3 py-2 text-gray-500 text-sm transition touch-manipulation"
        >
          🔍 <span>Buscar...</span>
          <span className="ml-auto text-xs bg-white/10 px-1.5 py-0.5 rounded">⌘K</span>
        </button>
      </div>

      {/* ── NAV ── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {items.map(item => (
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

      {/* ── USER / LOGOUT ── */}
      <div className="px-3 pb-4 border-t border-white/8 pt-3 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center text-red-400 font-bold text-sm shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-medium truncate">{userName}</div>
            <div className="text-gray-600 text-[10px] truncate">{profile.role.replaceAll('_', ' ')}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/5 hover:text-gray-200 transition touch-manipulation"
        >
          <span>🚪</span> Sair
        </button>
      </div>
    </aside>
  )
}
