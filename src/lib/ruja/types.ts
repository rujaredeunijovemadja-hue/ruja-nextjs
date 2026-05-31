// ─── TIPOS CENTRAIS DO SISTEMA RUJA ───────────────────────────
// Espelham exatamente o schema do Supabase (BANCO_DE_DADOS_RUJA.md)

export type Status = 'Ativo' | 'Oscilando' | 'Ocioso' | 'Em Risco'
export type Batizado = 'sim' | 'nao'
export type Presenca = 'presente' | 'falta'

export interface Jovem {
  id: string
  nome: string
  idade: number
  contato: string
  instagram: string
  endereco: string
  departamento: string   // múltiplos separados por ";"
  lider: string
  status: Status
  entrada: string        // YYYY-MM-DD
  batizado: Batizado
  data_batismo: string   // YYYY-MM-DD
  data_nasc: string      // YYYY-MM-DD
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
  data_nasc: string      // YYYY-MM-DD
  criado_em?: string
  atualizado_em?: string
}

export interface Departamento {
  id: string
  nome: string
  icone: string
  lider: string
  capacidade: number
  descricao: string
  criado_em?: string
  atualizado_em?: string
}

export interface Frequencia {
  id: string             // {jovem_id}_{data}_{evento}
  jovem_id: string
  data: string           // YYYY-MM-DD
  evento: string
  presenca: Presenca
  obs: string
  criado_em?: string
}

export interface Recuperacao {
  id: string
  jovem_id: string
  data_inicio: string    // YYYY-MM-DD
  lider_resp: string
  motivo: string
  status: 'ativo' | 'concluido'
  obs: string
  criado_em?: string
  atualizado_em?: string
}

export interface HistoricoMensal {
  id?: number
  mes: string            // YYYY-MM
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
  ativo: number          // % mínimo para Ativo (padrão 75)
  oscilando: number      // % mínimo para Oscilando (padrão 40)
  risco: number          // faltas seguidas para Em Risco (padrão 3)
}

export interface Metas {
  ativosDepto: number    // meta de jovens ativos em departamento
  batizadosDepto: number // meta de batizados ativos em departamento
}

export interface LiderSupremo {
  nome: string
  contato: string
  instagram: string
  foto: string
  descricao: string
  dataPosseLider: string
  versiculoLider: string
  visao: string
  tempoRuja: string
}

// ─── ESTADO GLOBAL DO APP ─────────────────────────────────────
export interface RujaState {
  jovens: Jovem[]
  lideres: Lider[]
  departamentos: Departamento[]
  frequencias: Frequencia[]
  recuperacoes: Recuperacao[]
  historicoMensal: HistoricoMensal[]
  liderSupremo: LiderSupremo
  regras: Regras
  metas: Metas
}

export const DEFAULT_REGRAS: Regras = { ativo: 75, oscilando: 40, risco: 3 }
export const DEFAULT_METAS: Metas   = { ativosDepto: 20, batizadosDepto: 10 }
