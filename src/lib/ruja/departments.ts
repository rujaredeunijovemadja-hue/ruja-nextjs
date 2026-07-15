import type { Departamento, Jovem } from './types'

export type DepartmentSlug = 'teens' | 'simply'
export type DepartmentScope = 'all' | DepartmentSlug

export const OFFICIAL_DEPARTMENT_SLUGS: DepartmentSlug[] = ['teens', 'simply']

export const DEPARTMENT_LABELS: Record<DepartmentSlug, string> = {
  teens: 'Teens',
  simply: 'Simply',
}

export const DEPARTMENT_ICONS: Record<DepartmentSlug, string> = {
  teens: '👦',
  simply: '🌱',
}

export function slugifyDepartment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function departmentSlug(department: Pick<Departamento, 'nome'> & { slug?: string | null }) {
  return slugifyDepartment(department.slug || department.nome)
}

export function isOfficialDepartmentSlug(slug: string): slug is DepartmentSlug {
  return OFFICIAL_DEPARTMENT_SLUGS.includes(slug as DepartmentSlug)
}

export function activeOfficialDepartments(departamentos: Departamento[]) {
  const bySlug = new Map<string, Departamento>()
  departamentos.forEach((department) => {
    const slug = departmentSlug(department)
    if (isOfficialDepartmentSlug(slug) && department.ativo !== false) {
      bySlug.set(slug, { ...department, slug })
    }
  })

  return OFFICIAL_DEPARTMENT_SLUGS.map((slug) => bySlug.get(slug) ?? {
    id: slug,
    nome: DEPARTMENT_LABELS[slug],
    slug,
    icone: DEPARTMENT_ICONS[slug],
    lider: '',
    lider_id: null,
    ativo: true,
    capacidade: 0,
    descricao: '',
  })
}

export function activeDepartments(departamentos: Departamento[]) {
  return departamentos
    .filter(department => department.ativo !== false)
    .map(department => ({ ...department, slug: departmentSlug(department) }))
    .sort((a, b) => {
      const aOfficial = OFFICIAL_DEPARTMENT_SLUGS.indexOf(a.slug as DepartmentSlug)
      const bOfficial = OFFICIAL_DEPARTMENT_SLUGS.indexOf(b.slug as DepartmentSlug)
      if (aOfficial !== -1 || bOfficial !== -1) {
        if (aOfficial === -1) return 1
        if (bOfficial === -1) return -1
        return aOfficial - bOfficial
      }
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
}

export function departmentNameFromScope(scope: DepartmentScope) {
  return scope === 'all' ? null : DEPARTMENT_LABELS[scope]
}

export function jovemMatchesDepartment(jovem: Pick<Jovem, 'departamento'>, scope: DepartmentScope) {
  if (scope === 'all') return true
  return jovemMatchesDepartmentName(jovem, DEPARTMENT_LABELS[scope])
}

export function jovemMatchesDepartmentName(
  jovem: Pick<Jovem, 'departamento'>,
  departmentName: string
) {
  const expected = departmentName.trim().toLowerCase()
  return jovem.departamento
    .split(';')
    .map((item) => item.trim().toLowerCase())
    .includes(expected)
}

export function filterJovensByScope<T extends Pick<Jovem, 'departamento'>>(jovens: T[], scope: DepartmentScope) {
  return jovens.filter((jovem) => jovemMatchesDepartment(jovem, scope))
}
