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
import type { DepartmentScope } from '@/lib/ruja/departments'
import { DEPARTMENT_LABELS } from '@/lib/ruja/departments'
import { departmentScopeFor, type RujaAccessProfile } from '@/lib/ruja/access'
import type { PlatformAccess } from '@/lib/ruja/platforms'
import type { PlatformSlug } from '@/lib/ruja/platforms'

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
const RujaCadastrosPendentes = dynamic(() => import('../pendentes/ruja-cadastros-pendentes'))
const RujaMidia = dynamic(() => import('../midia/ruja-midia'))
const RujaPlataformas = dynamic(() => import('../plataformas/ruja-plataformas'))
const RujaPlataformaWorkspace = dynamic(() => import('../plataformas/ruja-plataforma-workspace'))
const RujaContabilidade = dynamic(() => import('../plataformas/ruja-contabilidade'))
const RujaRedacao = dynamic(() => import('../plataformas/ruja-redacao'))
const RujaPalestras = dynamic(() => import('../plataformas/ruja-palestras'))
const RujaAltar = dynamic(() => import('../plataformas/ruja-altar'))
const RujaEbd = dynamic(() => import('../plataformas/ruja-ebd'))
const RujaMissoes = dynamic(() => import('../missoes/ruja-missoes'))

export type RujaPage =
  | 'dashboard' | 'teens' | 'simply' | 'eventos' | 'jovens' | 'frequencia' | 'historico-frequencia' | 'recuperacao'
  | 'departamentos' | 'lideres' | 'metas' | 'aniversarios'
  | 'pendentes' | 'config' | 'lidersupremo' | 'alertas' | 'usuarios' | 'analista-ia'
  | 'midia'
  | 'plataformas'
  | Exclude<PlatformSlug, 'nexus' | 'midia'>
  | 'missoes'

const PAGE_TITLES: Record<RujaPage, string> = {
  dashboard:     'Dashboard Geral',
  teens:         'Teens',
  simply:        'Simply',
  eventos:       'Eventos Gerais',
  jovens:        'Jovens',
  frequencia:    'Frequência',
  'historico-frequencia': 'Histórico de Frequência',
  recuperacao:   'Recuperação',
  departamentos: 'Departamentos',
  lideres:       'Líderes',
  metas:         'Metas',
  aniversarios:  'Aniversários',
  pendentes:     'Cadastros Pendentes',
  config:        'Configurações',
  lidersupremo:  'Líder Supremo',
  alertas:       'Alertas',
  usuarios:      'Usuários',
  'analista-ia': 'IA Nexus',
  midia:          'Mídia',
  plataformas:    'Plataformas',
  altar:          'Altar',
  podsimply:      'PodSimply',
  'happy-hour':   'Happy Hour',
  'central-ebd':  'Central EBD',
  redacao:        'Redação',
  palestras:      'Palestras',
  contabilidade:  'Contabilidade',
  missoes:        'Missões',
}

const FULL_HEIGHT_PAGES: RujaPage[] = ['analista-ia']

interface Props { profile: RujaAccessProfile; platforms: PlatformAccess[] }

function allowedPages(profile: RujaAccessProfile, platforms: PlatformAccess[]): RujaPage[] {
  const platformPages = platforms.filter(platform => platform.slug !== 'nexus').map(platform => platform.slug as RujaPage)
  if (profile.role === 'lider_supremo') return [...Object.keys(PAGE_TITLES), ...platformPages].filter((page, index, pages) => pages.indexOf(page) === index) as RujaPage[]
  if (profile.role === 'administrador') {
    return ['dashboard', 'teens', 'simply', 'eventos', 'jovens', 'frequencia', 'historico-frequencia', 'recuperacao', 'departamentos', 'lideres', 'metas', 'aniversarios', 'pendentes', 'alertas', 'analista-ia', 'missoes', ...platformPages]
  }
  const department = profile.departamento_id === 'simply' ? 'simply' : 'teens'
  if (profile.role === 'lider_departamento') {
    return [department, 'jovens', 'frequencia', 'historico-frequencia', 'recuperacao', 'lideres', 'metas', 'pendentes', 'analista-ia', 'missoes', ...platformPages]
  }
  if (profile.role === 'voluntario') {
    return [department, 'jovens', 'frequencia', 'historico-frequencia', 'analista-ia', 'missoes', ...platformPages]
  }
    return [department, 'jovens', 'frequencia', 'historico-frequencia', ...platformPages]
}

export function RujaLayout({ profile, platforms }: Props) {
  const router = useRouter()
  const permittedPages = allowedPages(profile, platforms)
  const profileScope = departmentScopeFor(profile)
  const initialPage: RujaPage = profileScope === 'all' ? 'dashboard' : profileScope
  const [page,        setPage]        = useState<RujaPage>(initialPage)
  const [departmentScope, setDepartmentScope] = useState<DepartmentScope>(profileScope)
  const [buscaAberta, setBuscaAberta] = useState(false)

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  function handleNavigate(nextPage: RujaPage) {
    if (!permittedPages.includes(nextPage)) return
    if (nextPage === 'teens') {
      setDepartmentScope('teens')
    } else if (nextPage === 'simply') {
      setDepartmentScope('simply')
    } else if ((nextPage === 'dashboard' || nextPage === 'eventos') && profileScope === 'all') {
      setDepartmentScope('all')
    }
    setPage(nextPage)
  }

  const activeScope: DepartmentScope =
    profileScope !== 'all'
      ? profileScope
      : page === 'teens' ? 'teens' : page === 'simply' ? 'simply' : departmentScope

  const PAGES: Partial<Record<RujaPage, React.ReactNode>> = {
    dashboard:     <RujaDashboard scope="all" />,
    teens:         <DepartmentArea scope="teens" activePage={page} onNavigate={handleNavigate} />,
    simply:        <DepartmentArea scope="simply" activePage={page} onNavigate={handleNavigate} />,
    eventos:       <RujaFrequencia scope="all" allowMixedDepartments />,
    jovens:        <RujaJovens scope={activeScope} />,
    frequencia:    <RujaFrequencia scope={activeScope} />,
    'historico-frequencia': <RujaHistoricoFrequencia />,
    recuperacao:   <RujaRecuperacao scope={activeScope} />,
    departamentos: <RujaDepartamentos />,
    lideres:       <RujaLideres scope={activeScope} />,
    metas:         <RujaMetas />,
    aniversarios:  <RujaAniversarios />,
    pendentes:     <RujaCadastrosPendentes scope={activeScope} />,
    config:        <RujaConfig />,
    lidersupremo:  <RujaLiderSupremo />,
    alertas:       <RujaAlertas />,
    usuarios:      <RujaUsuarios />,
    'analista-ia': <RujaAnalistaIA />,
    midia:          <RujaMidia access={platforms.find(platform => platform.slug === 'midia') ?? platforms[0]} />,
    plataformas:    <RujaPlataformas />,
    missoes:        <RujaMissoes access={platforms.find(platform => platform.slug === 'nexus') ?? platforms[0]} />,
  }
  for (const platform of platforms) {
    if (platform.slug === 'nexus' || platform.slug === 'midia') continue
    PAGES[platform.slug as RujaPage] = platform.slug === 'central-ebd'
      ? <RujaEbd access={platform} />
      : platform.slug === 'contabilidade' ? <RujaContabilidade access={platform} /> : platform.slug === 'redacao' ? <RujaRedacao access={platform} /> : platform.slug === 'palestras' ? <RujaPalestras access={platform} /> : platform.slug === 'altar' ? <RujaAltar access={platform} /> : <RujaPlataformaWorkspace access={platform} />
  }

  const isFull = FULL_HEIGHT_PAGES.includes(page)

  return (
    <RujaProvider profile={profile}>
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
          userName={profile.nome}
          profile={profile}
          allowedPages={permittedPages}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onBusca={() => setBuscaAberta(true)}
          platforms={platforms}
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
          profile={profile}
          allowedPages={permittedPages}
          onNavigate={handleNavigate}
          onBusca={() => setBuscaAberta(true)}
          platforms={platforms}
        />

        {/* ── BUSCA GLOBAL ── */}
        {buscaAberta && (
          <RujaBusca onClose={() => setBuscaAberta(false)} />
        )}
      </div>
    </RujaProvider>
  )
}

function DepartmentArea({
  scope,
  activePage,
  onNavigate,
}: {
  scope: Exclude<DepartmentScope, 'all'>
  activePage: RujaPage
  onNavigate: (page: RujaPage) => void
}) {
  const label = DEPARTMENT_LABELS[scope]
  const tabs: { page: RujaPage; label: string }[] = [
    { page: scope, label: 'Dashboard' },
    { page: 'jovens', label: 'Jovens' },
    { page: 'frequencia', label: `Eventos do ${label}` },
    { page: 'recuperacao', label: 'Recuperação' },
    { page: 'lideres', label: 'Líderes' },
    { page: 'metas', label: 'Metas' },
    { page: 'historico-frequencia', label: 'Relatórios' },
  ]

  return (
    <div className="space-y-4">
      <div className="px-4 md:px-6 pt-4 md:pt-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wider">Departamento</p>
            <h1 className="text-xl font-bold text-white">{label}</h1>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.page}
              onClick={() => onNavigate(tab.page)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition touch-manipulation ${
                activePage === tab.page ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <RujaDashboard scope={scope} title={`Dashboard ${label}`} />
    </div>
  )
}
