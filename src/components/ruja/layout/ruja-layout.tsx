'use client'
// ─── LAYOUT PRINCIPAL DO RUJA ─────────────────────────────────
// Fix desktop: estrutura h-dvh com overflow-y-auto apenas no conteúdo,
// sem scroll duplo. Sidebar fica sticky à esquerda.

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
const RujaHistoricoFrequencia = dynamic(() => import('../frequencia/ruja-historico-frequencia'))
const RujaRecuperacao   = dynamic(() => import('../recuperacao/ruja-recuperacao'))
const RujaDepartamentos = dynamic(() => import('../departamentos/ruja-departamentos'))
const RujaLideres       = dynamic(() => import('../lideres/ruja-lideres'))
const RujaMetas         = dynamic(() => import('../metas/ruja-metas'))
const RujaAniversarios  = dynamic(() => import('../aniversarios/ruja-aniversarios'))
const RujaConfig        = dynamic(() => import('../config/ruja-config'))
const RujaLiderSupremo  = dynamic(() => import('../lidersupremo/ruja-lidersupremo'))
const RujaAlertas       = dynamic(() => import('../alertas/ruja-alertas'))
const RujaUsuarios      = dynamic(() => import('../usuarios/ruja-usuarios'))
const RujaAnalistaIA    = dynamic(() => import('../analista/ruja-analista-ia'))

export type RujaPage =
  | 'dashboard' | 'jovens' | 'frequencia' | 'historico-frequencia' | 'recuperacao'
  | 'departamentos' | 'lideres' | 'metas' | 'aniversarios'
  | 'config' | 'lidersupremo' | 'alertas' | 'usuarios' | 'analista-ia'

const PAGE_TITLES: Record<RujaPage, string> = {
  dashboard:     'Dashboard',
  jovens:        'Jovens',
  frequencia:    'Frequência',
  'historico-frequencia': 'Histórico de Frequência',
  recuperacao:   'Recuperação',
  departamentos: 'Departamentos',
  lideres:       'Líderes',
  metas:         'Metas',
  aniversarios:  'Aniversários',
  config:        'Configurações',
  lidersupremo:  'Líder Supremo',
  alertas:       'Alertas',
  usuarios:      'Usuários',
  'analista-ia': 'Analista IA',
}

const FULL_HEIGHT_PAGES: RujaPage[] = ['analista-ia']

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
    dashboard:     <RujaDashboard />,
    jovens:        <RujaJovens />,
    frequencia:    <RujaFrequencia />,
    'historico-frequencia': <RujaHistoricoFrequencia />,
    recuperacao:   <RujaRecuperacao />,
    departamentos: <RujaDepartamentos />,
    lideres:       <RujaLideres />,
    metas:         <RujaMetas />,
    aniversarios:  <RujaAniversarios />,
    config:        <RujaConfig />,
    lidersupremo:  <RujaLiderSupremo />,
    alertas:       <RujaAlertas />,
    usuarios:      <RujaUsuarios />,
    'analista-ia': <RujaAnalistaIA />,
  }

  const isFull = FULL_HEIGHT_PAGES.includes(page)

  return (
    <RujaProvider>
      {/*
        ─── ESTRUTURA DE LAYOUT DESKTOP ─────────────────────────
        h-dvh no container raiz + overflow-hidden garante que
        só o <div.flex-1.overflow-y-auto> role internamente.
        A sidebar fica fixa à esquerda sem scroll duplo.
      */}
      <div className="flex h-dvh overflow-hidden bg-[#0A0A0A]">

        {/* ── SIDEBAR DESKTOP (hidden no mobile) ── */}
        <RujaSidebar
          current={page}
          userName={userName}
          onNavigate={setPage}
          onLogout={handleLogout}
          onBusca={() => setBuscaAberta(true)}
        />

        {/* ── COLUNA DIREITA ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Topbar mobile */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#111]/95 backdrop-blur shrink-0 z-30">
            <div className="flex items-center gap-2">
              <img
                src="/ruja-logo.png"
                alt="RUJA"
                className="w-7 h-7 object-contain rounded-full"
              />
              <span className="font-black text-white text-base">
                <span className="text-red-500">RUJA</span>
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-300">{PAGE_TITLES[page]}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBuscaAberta(true)}
                className="p-2 text-gray-400 hover:text-white touch-manipulation"
              >
                🔍
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-white touch-manipulation"
              >
                🚪
              </button>
            </div>
          </header>

          {/* Área de conteúdo — no Analista IA, o filho controla o próprio scroll */}
          <div className={`flex-1 min-h-0 ${isFull ? 'overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0' : 'overflow-y-auto pb-20 md:pb-0'}`}>
            {PAGES[page]}
          </div>
        </div>

        {/* ── BOTTOM NAV MOBILE ── */}
        <RujaMobileNav
          current={page}
          onNavigate={setPage}
          onBusca={() => setBuscaAberta(true)}
        />

        {/* ── BUSCA GLOBAL ── */}
        {buscaAberta && (
          <RujaBusca onClose={() => setBuscaAberta(false)} />
        )}
      </div>
    </RujaProvider>
  )
}
