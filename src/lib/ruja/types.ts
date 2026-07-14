// ─── TIPOS CENTRAIS DO SISTEMA RUJA ───────────────────────────
// Espelham o schema do Supabase documentado em BANCO_DE_DADOS_RUJA.md.

export type Status = 'Ativo' | 'Oscilando' | 'Ocioso' | 'Em Risco'
export type Batizado = 'sim' | 'nao'
export type Presenca = 'presente' | 'falta'
export type TipoEventoFrequencia =
  | 'Culto'
  | 'Reunião'
  | 'Ensaio'
  | 'Conexão'
  | 'Congresso'
  | 'Vigília'
  | 'Evangelismo'
  | 'Outro'

export interface Jovem {
  id: string
  nome: string
  idade: number
  contato: string
  instagram: string
  endereco: string
  departamento: string
  lider: string
  status: Status
  entrada: string
  batizado: Batizado
  data_batismo: string
  data_nasc: string
  obs: string
  foto_path: string
  foto_url: string
  criado_em?: string
  atualizado_em?: string
}

export interface Lider {
  id: string
  nome: string
  contato: string
  departamento: string
  funcao: string
  data_nasc: string
  criado_em?: string
  atualizado_em?: string
}

export interface Departamento {
  id: string
  nome: string
  slug?: string | null
  icone: string
  lider: string
  lider_id?: string | null
  ativo?: boolean
  capacidade: number
  descricao: string
  criado_em?: string
  atualizado_em?: string
}

export interface CadastroPendente {
  id: string
  nome: string
  telefone: string
  email: string
  data_nascimento: string
  departamento_id: string
  departamento?: Departamento | null
  foto_path: string | null
  responsavel_nome: string
  responsavel_telefone: string
  observacoes: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  aprovado_por: string | null
  aprovado_em: string | null
  rejeitado_por: string | null
  rejeitado_em: string | null
  motivo_rejeicao: string | null
  created_at: string
  updated_at: string
}

export interface Frequencia {
  id: string
  jovem_id: string
  data: string
  evento: string
  presenca: Presenca
  obs: string
  criado_em?: string
}

export interface EventoParticipante {
  id: string
  evento_id: string
  jovem_id: string
  presente: boolean
  observacao: string | null
  registrado_por: string | null
  created_at: string
  updated_at: string
}

export interface EventoFrequencia {
  id: string
  nome: string
  data: string
  departamento_id: string | null
  lider_responsavel_id: string | null
  tipo: TipoEventoFrequencia | string | null
  observacao: string | null
  created_by: string
  created_at: string
  updated_at: string
  participantes?: EventoParticipante[]
}

export interface EventoFrequenciaInput {
  nome: string
  data: string
  departamento_id: string | null
  lider_responsavel_id: string | null
  tipo: TipoEventoFrequencia | string | null
  observacao: string | null
  participantes: Array<{ jovem_id: string; observacao?: string | null }>
}

export interface Recuperacao {
  id: string
  jovem_id: string
  data_inicio: string
  lider_resp: string
  motivo: string
  status: 'ativo' | 'concluido'
  obs: string
  criado_em?: string
  atualizado_em?: string
}

export interface HistoricoMensal {
  id?: number
  mes: string
  ativos_depto: number
  batizados_depto: number
  total: number
  criado_em?: string
}

export interface Configuracao {
  chave: string
  valor_json: unknown
  atualizado_em?: string
}

export interface Regras {
  ativo: number
  oscilando: number
  risco: number
}

export interface Metas {
  ativosDepto: number
  batizadosDepto: number
}

export interface LiderSupremo {
  nome: string
  funcao: string
  contato: string
  instagram: string
  foto: string
  descricao: string
  dataPosseLider: string
  versiculoLider: string
  visao: string
  tempoRuja: string
}

export interface RujaState {
  jovens: Jovem[]
  lideres: Lider[]
  departamentos: Departamento[]
  cadastrosPendentes: CadastroPendente[]
  frequencias: Frequencia[]
  eventosFrequencia: EventoFrequencia[]
  recuperacoes: Recuperacao[]
  historicoMensal: HistoricoMensal[]
  liderSupremo: LiderSupremo
  regras: Regras
  metas: Metas
}

export const DEFAULT_REGRAS: Regras = { ativo: 75, oscilando: 40, risco: 3 }
export const DEFAULT_METAS: Metas   = { ativosDepto: 20, batizadosDepto: 10 }
