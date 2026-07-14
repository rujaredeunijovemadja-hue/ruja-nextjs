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

export function departmentNameFromScope(scope: DepartmentScope) {
  return scope === 'all' ? null : DEPARTMENT_LABELS[scope]
}

export function jovemMatchesDepartment(jovem: Pick<Jovem, 'departamento'>, scope: DepartmentScope) {
  if (scope === 'all') return true
  const expected = DEPARTMENT_LABELS[scope].toLowerCase()
  return jovem.departamento
    .split(';')
    .map((item) => item.trim().toLowerCase())
    .includes(expected)
}

export function filterJovensByScope<T extends Pick<Jovem, 'departamento'>>(jovens: T[], scope: DepartmentScope) {
  return jovens.filter((jovem) => jovemMatchesDepartment(jovem, scope))
}
