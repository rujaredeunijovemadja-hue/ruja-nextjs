import { normalizeName, normalizePhone } from './cadastro-publico'

export interface JovemDuplicataCandidato {
  id: string
  nome: string
  data_nasc: string | null
  contato: string | null
  foto_path: string | null
  foto_url: string | null
  endereco: string | null
  instagram: string | null
  obs: string | null
  departamento: string | null
  lider: string | null
  status: string | null
  batizado: boolean | null
}

export interface JovemDuplicataGrupo {
  motivo: 'nome_nascimento' | 'telefone'
  candidatos: JovemDuplicataCandidato[]
}

/**
 * Pontuação de completude -- decide qual registro é o "vencedor" sugerido
 * ao mesclar duas entradas da mesma pessoa. Pedido 02/09/2026: prioriza
 * quem tem foto (peso maior, é o dado mais visível/verificável) e depois
 * quantos campos estão preenchidos.
 */
export function completenessScore(jovem: JovemDuplicataCandidato): number {
  let score = 0
  if (jovem.foto_path || jovem.foto_url) score += 10
  if (jovem.endereco) score += 1
  if (jovem.instagram) score += 1
  if (jovem.obs) score += 1
  if (jovem.departamento) score += 1
  if (jovem.lider) score += 1
  if (jovem.contato) score += 1
  if (jovem.status) score += 1
  if (jovem.batizado) score += 1
  return score
}

/**
 * Ordena o grupo com o candidato sugerido pra manter em [0] -- maior
 * pontuação de completude primeiro; empate desfeito pelo id mais recente
 * (cad_* de cadastro público aprovado tende a ser o registro mais novo
 * e mais completo que o legado numérico).
 */
export function ordenarPorCompletude(candidatos: JovemDuplicataCandidato[]): JovemDuplicataCandidato[] {
  return [...candidatos].sort((a, b) => {
    const diff = completenessScore(b) - completenessScore(a)
    if (diff !== 0) return diff
    return b.id.localeCompare(a.id)
  })
}

export function encontrarDuplicatas(jovens: JovemDuplicataCandidato[]): JovemDuplicataGrupo[] {
  const porNomeNascimento = new Map<string, JovemDuplicataCandidato[]>()
  const porTelefone = new Map<string, JovemDuplicataCandidato[]>()

  for (const jovem of jovens) {
    const nomeN = normalizeName(jovem.nome || '')
    const nasc = jovem.data_nasc || ''
    if (nomeN && nasc) {
      const chave = `${nomeN}|${nasc}`
      const lista = porNomeNascimento.get(chave) ?? []
      lista.push(jovem)
      porNomeNascimento.set(chave, lista)
    }

    const telN = normalizePhone(jovem.contato || '')
    if (telN.length >= 10) {
      const lista = porTelefone.get(telN) ?? []
      lista.push(jovem)
      porTelefone.set(telN, lista)
    }
  }

  const grupos: JovemDuplicataGrupo[] = []
  const jaAgrupados = new Set<string>()

  for (const candidatos of porNomeNascimento.values()) {
    if (candidatos.length < 2) continue
    grupos.push({ motivo: 'nome_nascimento', candidatos: ordenarPorCompletude(candidatos) })
    candidatos.forEach((c) => jaAgrupados.add(c.id))
  }

  for (const candidatos of porTelefone.values()) {
    if (candidatos.length < 2) continue
    // Evita grupo duplicado quando o mesmo par já foi pego por nome+nascimento.
    const idsJaNoGrupo = candidatos.every((c) => jaAgrupados.has(c.id))
    if (idsJaNoGrupo) continue
    grupos.push({ motivo: 'telefone', candidatos: ordenarPorCompletude(candidatos) })
  }

  return grupos
}
