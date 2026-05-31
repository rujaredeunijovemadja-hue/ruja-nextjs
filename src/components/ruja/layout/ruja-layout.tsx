'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/ruja/auth'
import { RujaProvider } from '@/lib/ruja/context'
import { RujaSidebar } from './ruja-sidebar'
import { RujaMobileNav } from './ruja-mobile-nav'
import { LoadingScreen } from '@/components/ui/spinner'

// Importações lazy dos módulos
import dynamic from 'next/dynamic'

const RujaDashboard    = dynamic(() => import('../dashboard/ruja-dashboard'),    { loading: () => <PageLoader /> })
const RujaJovens       = dynamic(() => import('../jovens/ruja-jovens'),          { loading: () => <PageLoader /> })
const RujaFrequencia   = dynamic(() => import('../frequencia/ruja-frequencia'),  { loading: () => <PageLoader /> })
const RujaRecuperacao  = dynamic(() => import('../recuperacao/ruja-recuperacao'),{ loading: () => <PageLoader /> })
const RujaDepartamentos= dynamic(() => import('../departamentos/ruja-departamentos'), { loading: () => <PageLoader /> })
const RujaLideres      = dynamic(() => import('../lideres/ruja-lideres'),        { loading: () => <PageLoader /> })
const RujaMetas        = dynamic(() => import('../metas/ruja-metas'),            { loading: () => <PageLoader /> })
const RujaAniversarios = dynamic(() => import('../aniversarios/ruja-aniversarios'), { loading: () => <PageLoader /> })
const RujaConfig       = dynamic(() => import('../config/ruja-config'),          { loading: () => <PageLoader /> })

export type RujaPage =
  | 'dashboard' | 'jovens' | 'frequencia' | 'recuperacao'
  | 'departamentos' | 'lideres' | 'metas' | 'aniversarios' | 'config'

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
    </div>
  )
}

const PAGE_TITLES: Record<RujaPage, string> = {
  dashboard:    'Dashboard',
  jovens:       'Jovens',
  frequencia:   'Frequência',
  recuperacao:  'Recuperação',
  departamentos:'Departamentos',
  lideres:      'Líderes',
  metas:        'Metas',
  aniversarios: 'Aniversários',
  config:       'Configurações',
}

interface Props {
  userName: string
}

export function RujaLayout({ userName }: Props) {
  const router = useRouter()
  const [page, setPage] = useState<RujaPage>('dashboard')

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const PAGES: Record<RujaPage, React.ReactNode> = {
    dashboard:    <RujaDashboard />,
    jovens:       <RujaJovens />,
    frequencia:   <RujaFrequencia />,
    recuperacao:  <RujaRecuperacao />,
    departamentos:<RujaDepartamentos />,
    lideres:      <RujaLideres />,
    metas:        <RujaMetas />,
    aniversarios: <RujaAniversarios />,
    config:       <RujaConfig />,
  }

  return (
    <RujaProvider>
      <div className="flex min-h-dvh bg-[#0A0A0A]">
        {/* Sidebar desktop */}
        <RujaSidebar
          current={page}
          userName={userName}
          onNavigate={setPage}
          onLogout={handleLogout}
        />

        {/* Conteúdo principal */}
        <main className="flex-1 flex flex-col min-h-dvh overflow-hidden">
          {/* Topbar mobile */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#111]/95 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦁</span>
              <span className="font-black text-white text-base">
                <span className="text-red-500">RUJA</span>
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-300">{PAGE_TITLES[page]}</div>
            <button
              onClick={handleLogout}
              className="text-gray-400 text-sm touch-manipulation"
            >
              🚪
            </button>
          </header>

          {/* Página atual */}
          <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {PAGES[page]}
          </div>
        </main>

        {/* Bottom nav mobile */}
        <RujaMobileNav current={page} onNavigate={setPage} />
      </div>
    </RujaProvider>
  )
}
