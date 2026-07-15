export const CADASTRO_STATUS = [
  'pendente',
  'em_analise',
  'correcao_solicitada',
  'aprovado',
  'rejeitado',
] as const

export type CadastroStatus = typeof CADASTRO_STATUS[number]

export function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function normalizeName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function ageFromBirthDate(value: string | null | undefined): number {
  if (!value || !isValidDate(value)) return 0
  const birth = new Date(`${value}T12:00:00Z`)
  const today = new Date()
  let age = today.getUTCFullYear() - birth.getUTCFullYear()
  const month = today.getUTCMonth() - birth.getUTCMonth()
  if (month < 0 || (month === 0 && today.getUTCDate() < birth.getUTCDate())) age--
  return age
}

export function formatPhone(value: string): string {
  const digits = normalizePhone(value).slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}
