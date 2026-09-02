import type { Departamento } from '@/lib/ruja/types'
import { dedupeDepartmentsByName } from '@/lib/ruja/departments'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import CadastroPublicoForm from './public-form'

// Sem isso, o Next tenta gerar /cadastro como página estática e congela a
// lista de departamentos no momento do build (e ainda tenta chamar o
// Supabase durante o build em si). Precisa ser sempre buscada por request.
export const dynamic = 'force-dynamic'

const FALLBACK_DEPARTAMENTOS: Departamento[] = [
  { id: 'teens', nome: 'Teens', slug: 'teens', icone: '👦', lider: '', capacidade: 0, descricao: '' },
  { id: 'simply', nome: 'Simply', slug: 'simply', icone: '🌱', lider: '', capacidade: 0, descricao: '' },
]

export default async function CadastroPage() {
  let departamentos = FALLBACK_DEPARTAMENTOS
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('ruja_departamentos')
      .select('id,nome,slug,icone,lider,lider_id,ativo,capacidade,descricao')
      .eq('ativo', true)
    if (!error && data?.length) departamentos = dedupeDepartmentsByName(data as Departamento[])
  } catch (error) {
    console.error('[cadastro] falha ao carregar departamentos, usando fallback', error)
  }

  return <CadastroPublicoForm departamentos={departamentos} />
}
