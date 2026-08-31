// ─── ÍCONES DE NAVEGAÇÃO ────────────────────────────────────────
// Mapa nome -> ícone (lucide-react). Antes disso os itens de nav do
// mobile usavam emoji como "name" (ex.: icon: '🎯'), que não batia com
// nenhuma palavra-chave e sempre caía no ícone genérico de "+". Trocado
// por um mapa explícito -- cobre página do app + slug de plataforma.
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Sparkles, Settings,
  Landmark, UserCog, Puzzle, Target, Bot, Search, LogOut, Menu, User,
  HeartPulse, History, Flame, Mic, Wine, BookOpen, PenLine, Presentation,
  Wallet, Sprout, Star, type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  jovens: Users,
  usuarios: UserCog,
  usu: UserCog,
  user: User,
  teens: Users,
  simply: Sprout,
  evento: CalendarDays,
  eventos: CalendarDays,
  calend: CalendarDays,
  tarefas: ClipboardList,
  pendentes: ClipboardList,
  ia: Sparkles,
  'analista-ia': Sparkles,
  config: Settings,
  configuracoes: Settings,
  departamentos: Landmark,
  plata: Puzzle,
  plataformas: Puzzle,
  metas: Target,
  meta: Target,
  missoes: Target,
  miss: Target,
  automacao: Bot,
  bot: Bot,
  robot: Bot,
  busca: Search,
  search: Search,
  logout: LogOut,
  menu: Menu,
  recuperacao: HeartPulse,
  'historico-frequencia': History,
  altar: Flame,
  podsimply: Mic,
  'happy-hour': Wine,
  'central-ebd': BookOpen,
  redacao: PenLine,
  palestras: Presentation,
  contabilidade: Wallet,
  lideres: Star,
  lider: Star,
  frequ: ClipboardList,
  check: ClipboardList,
  alert: Sparkles,
  risco: Sparkles,
}

export function RujaIcon({ name, size = 18 }: { name: string; size?: number }) {
  const key = name.toLowerCase()
  const Icon = ICONS[key] ?? Object.entries(ICONS).find(([k]) => key.includes(k))?.[1] ?? Menu
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" />
}
