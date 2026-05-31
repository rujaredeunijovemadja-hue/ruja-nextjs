'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/ruja/auth'
import { RujaProvider } from '@/lib/ruja/context'
import { RujaSidebar } from './ruja-sidebar'
import { RujaMobileNav } from './ruja-mobile-nav'
import { RujaBusca } from '../busca/ruja-busca'
import dynamic from 'next/dynamic'

const RujaDashboard     = dynamic(() => import('../dashboard/ruja-dashboard'))
const RujaJovens        = dynamic(() => import('../jovens/ruja-jovens'))
const RujaFrequencia    = dynamic(() => import('../frequencia/ruja-frequencia'))
const RujaRecuperacao   = dynamic(() => import('../recuperacao/ruja-recuperacao'))
const RujaDepartamentos = dynamic(() => import('../departamentos/ruja-departamentos'))
const RujaLideres       = dynamic(() => import('../lideres/ruja-lideres'))
const RujaMetas         = dynamic(() => import('../metas/ruja-metas'))
const RujaAniversarios  = dynamic(() => import('../aniversarios/ruja-aniversarios'))
const RujaConfig        = dynamic(() => import('../config/ruja-config'))
const RujaLiderSupremo  = dynamic(() => import('../lidersupremo/ruja-lidersupremo'))
const RujaAlertas       = dynamic(() => import('../alertas/ruja-alertas'))

export type RujaPage =
  | 'dashboard' | 'jovens' | 'frequencia' | 'recuperacao'
  | 'departamentos' | 'lideres' | 'metas' | 'aniversarios'
  | 'config' | 'lidersupremo' | 'alertas'

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
  lidersupremo: 'Líder Supremo',
  alertas:      'Alertas',
}

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
    </div>
  )
}

interface Props { userName: string }

export function RujaLayout({ userName }: Props) {
  const router = useRouter()
  const [page,        setPage]        = useState<RujaPage>('dashboard')
  const [buscaAberta, setBuscaAberta] = useState(false)

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
    lidersupremo: <RujaLiderSupremo />,
    alertas:      <RujaAlertas />,
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
          onBusca={() => setBuscaAberta(true)}
        />

        {/* Conteúdo */}
        <main className="flex-1 flex flex-col min-h-dvh overflow-hidden">
          {/* Topbar mobile */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#111]/95 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <span className="text-lg">🦁</span>
              <span className="font-black text-white text-base"><span className="text-red-500">RUJA</span></span>
            </div>
            <span className="text-sm font-semibold text-gray-300">{PAGE_TITLES[page]}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setBuscaAberta(true)}
                className="p-2 text-gray-400 hover:text-white touch-manipulation">🔍</button>
              <button onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white touch-manipulation">🚪</button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {PAGES[page]}
          </div>
        </main>

        {/* Bottom nav mobile */}
        <RujaMobileNav current={page} onNavigate={setPage} onBusca={() => setBuscaAberta(true)} />

        {/* Busca global */}
        {buscaAberta && (
          <RujaBusca onClose={() => setBuscaAberta(false)} />
        )}
      </div>
    </RujaProvider>
  )
}
