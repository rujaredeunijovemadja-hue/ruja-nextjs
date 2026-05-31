import { createClient } from '../supabase/client'
import type { Jovem, Lider, Departamento, Frequencia } from './types'

type TabelaCSV = 'jovens' | 'lideres' | 'departamentos' | 'frequencias'

const TABELA_MAP: Record<TabelaCSV, string> = {
  jovens:        'ruja_jovens',
  lideres:       'ruja_lideres',
  departamentos: 'ruja_departamentos',
  frequencias:   'ruja_frequencias',
}

// ── EXPORTAR ──────────────────────────────────────────────────
export function exportToCSV<T extends Record<string, unknown>>(
  dados: T[],
  nomeArquivo: string
): void {
  if (!dados.length) return
  const headers = Object.keys(dados[0])
  const rows = dados.map(r =>
    headers.map(h => {
      const val = r[h]
      const s = val == null ? '' : String(val)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  const csv  = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${nomeArquivo}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── IMPORTAR ──────────────────────────────────────────────────
export async function importFromCSV(
  file: File,
  tabela: TabelaCSV
): Promise<{ importados: number; erros: string[] }> {
  const text   = await file.text()
  const linhas = text.split('\n').filter(l => l.trim())
  if (linhas.length < 2) throw new Error('Arquivo vazio ou sem dados.')

  const headers   = linhas[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const registros = linhas.slice(1).map(linha => {
    const vals = linha.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  }).filter(r => r.nome || r.id)

  if (!registros.length) throw new Error('Nenhum registro válido encontrado.')

  const sb     = createClient()
  const tabela_sb = TABELA_MAP[tabela]
  const erros: string[] = []
  let importados = 0

  // Processar em lotes de 100
  for (let i = 0; i < registros.length; i += 100) {
    const lote = registros.slice(i, i + 100).map(r => ({
      ...r,
      id: r.id || String(Date.now() + Math.random()),
    }))
    const { error } = await sb.from(tabela_sb).upsert(lote, { onConflict: 'id' })
    if (error) {
      erros.push(`Lote ${Math.floor(i/100)+1}: ${error.message}`)
    } else {
      importados += lote.length
    }
  }

  return { importados, erros }
}
