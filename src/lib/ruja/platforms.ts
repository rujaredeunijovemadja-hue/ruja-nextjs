export type PlatformSlug =
  | 'nexus'
  | 'midia'
  | 'altar'
  | 'podsimply'
  | 'happy-hour'
  | 'central-ebd'
  | 'redacao'
  | 'palestras'
  | 'contabilidade'

export type PlatformModule =
  | 'dashboard'
  | 'membros'
  | 'equipe'
  | 'eventos'
  | 'tarefas'
  | 'metas'
  | 'relatorios'
  | 'arquivos'
  | 'aprovacoes'
  | 'calendario'
  | 'producao'
  | 'financeiro'
  | 'ia'
  | 'configuracoes'
  | 'jovens'
  | 'frequencia'
  | 'recuperacao'

export interface PlatformDefinition {
  slug: PlatformSlug
  label: string
  icon: string
  color: string
  description: string
  modules: PlatformModule[]
}

export interface PlatformAccess {
  id: string
  slug: PlatformSlug
  role: string
  departamento_id: string | null
  modules: PlatformModule[]
}

export const PLATFORM_REGISTRY: Record<PlatformSlug, PlatformDefinition> = {
  nexus: {
    slug: 'nexus', label: 'Nexus', icon: '🦁', color: '#ef4444',
    description: 'Nucleo global de gestao da RUJA.',
    modules: ['dashboard', 'jovens', 'frequencia', 'recuperacao', 'eventos', 'tarefas', 'relatorios', 'ia', 'configuracoes'],
  },
  midia: {
    slug: 'midia', label: 'Midia', icon: '🎥', color: '#8b5cf6',
    description: 'Solicitacoes, producao, revisao e publicacao.',
    modules: ['dashboard', 'tarefas', 'calendario', 'producao', 'aprovacoes', 'arquivos', 'relatorios'],
  },
  altar: { slug: 'altar', label: 'Altar', icon: '🔥', color: '#f97316', description: 'Ministerio de altar.', modules: ['dashboard', 'equipe', 'eventos', 'tarefas', 'relatorios'] },
  podsimply: { slug: 'podsimply', label: 'PodSimply', icon: '🎙️', color: '#06b6d4', description: 'Producao do PodSimply.', modules: ['dashboard', 'tarefas', 'producao', 'arquivos', 'relatorios'] },
  'happy-hour': { slug: 'happy-hour', label: 'Happy Hour', icon: '🍹', color: '#ec4899', description: 'Planejamento do Happy Hour.', modules: ['dashboard', 'eventos', 'tarefas', 'relatorios'] },
  'central-ebd': { slug: 'central-ebd', label: 'Central EBD', icon: '📚', color: '#22c55e', description: 'Classes, professores e licoes.', modules: ['dashboard', 'membros', 'equipe', 'eventos', 'tarefas', 'arquivos', 'relatorios'] },
  redacao: { slug: 'redacao', label: 'Redacao', icon: '✍️', color: '#eab308', description: 'Pautas, textos e revisao.', modules: ['dashboard', 'tarefas', 'producao', 'aprovacoes', 'arquivos', 'relatorios'] },
  palestras: { slug: 'palestras', label: 'Palestras', icon: '🎤', color: '#14b8a6', description: 'Agenda e materiais de palestras.', modules: ['dashboard', 'eventos', 'equipe', 'arquivos', 'relatorios'] },
  contabilidade: { slug: 'contabilidade', label: 'Contabilidade', icon: '💰', color: '#64748b', description: 'Financas e orcamento.', modules: ['dashboard', 'financeiro', 'arquivos', 'aprovacoes', 'relatorios'] },
}

export function platformDefinition(slug: string) {
  return PLATFORM_REGISTRY[slug as PlatformSlug] ?? null
}

export function hasPlatformModule(access: PlatformAccess | undefined, module: PlatformModule) {
  return Boolean(access?.modules.includes(module))
}
