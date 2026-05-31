// ─── CÁLCULOS CENTRALIZADOS DO RUJA ───────────────────────────
// Migração de: getDiasParaAniversario, calcularStatusAutomatico,
// getFreqPct, getFaltasSeguidas, getIdade, calcStatus

import type { Frequencia, Regras, Status } from './types'

/** Dias até o próximo aniversário. Retorna 0 se for hoje. */
export function getDiasParaAniversario(dataNasc: string): number {
  if (!dataNasc) return 999
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const partes = dataNasc.split('-')
  const aniv = new Date(hoje.getFullYear(), parseInt(partes[1]) - 1, parseInt(partes[2]))
  aniv.setHours(0, 0, 0, 0)
  if (aniv.getTime() === hoje.getTime()) return 0
  if (aniv < hoje) aniv.setFullYear(hoje.getFullYear() + 1)
  return Math.ceil((aniv.getTime() - hoje.getTime()) / 86400000)
}

/** Idade atual a partir da data de nascimento YYYY-MM-DD */
export function getIdade(dataNasc: string): number | null {
  if (!dataNasc) return null
  const hoje = new Date()
  const [y, m, d] = dataNasc.split('-').map(Number)
  let idade = hoje.getFullYear() - y
  const anivEsteAno = new Date(hoje.getFullYear(), m - 1, d)
  if (hoje < anivEsteAno) idade--
  return idade
}

/** Percentual de presença de um jovem */
export function getFreqPct(jovemId: string, frequencias: Frequencia[]): number {
  const regs = frequencias.filter(f => String(f.jovem_id) === String(jovemId))
  if (!regs.length) return 0
  const presentes = regs.filter(f => f.presenca === 'presente').length
  return Math.round((presentes / regs.length) * 100)
}

/** Faltas consecutivas recentes (últimas 5) */
export function getFaltasSeguidas(jovemId: string, frequencias: Frequencia[]): number {
  const regs = frequencias
    .filter(f => String(f.jovem_id) === String(jovemId))
    .sort((a, b) => b.data.localeCompare(a.data))
  const ultimas = regs.slice(0, 5)
  const idx = ultimas.findIndex(f => f.presenca === 'presente')
  return idx === -1 ? ultimas.length : idx
}

/** Calcula status automático com base em frequência e regras */
export function calcularStatus(
  jovemId: string,
  frequencias: Frequencia[],
  regras: Regras
): Status | null {
  const regs = frequencias.filter(f => String(f.jovem_id) === String(jovemId))
  if (!regs.length) return null
  const pct = getFreqPct(jovemId, frequencias)
  const faltas = getFaltasSeguidas(jovemId, frequencias)
  if (faltas >= regras.risco)   return 'Em Risco'
  if (pct >= regras.ativo)      return 'Ativo'
  if (pct >= regras.oscilando)  return 'Oscilando'
  return 'Ocioso'
}

/** Label de dias para aniversário */
export function diasLabel(dias: number): string {
  if (dias === 0) return '🎉 Hoje!'
  if (dias === 1) return 'Amanhã'
  if (dias <= 7)  return `em ${dias} dias`
  return `em ${dias} dias`
}

/** Cor do status */
export function statusColor(status: Status): string {
  switch (status) {
    case 'Ativo':     return 'text-green-400'
    case 'Oscilando': return 'text-yellow-400'
    case 'Ocioso':    return 'text-gray-400'
    case 'Em Risco':  return 'text-red-400'
  }
}

/** Badge CSS do status */
export function statusBadgeClass(status: Status): string {
  switch (status) {
    case 'Ativo':     return 'bg-green-500/20 text-green-400 border border-green-500/30'
    case 'Oscilando': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    case 'Ocioso':    return 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
    case 'Em Risco':  return 'bg-red-500/20 text-red-400 border border-red-500/30'
  }
}
