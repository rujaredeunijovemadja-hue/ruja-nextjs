import { createClient } from '@/lib/supabase/server'
import { activeOfficialDepartments } from '@/lib/ruja/departments'
import type { Departamento } from '@/lib/ruja/types'
import CadastroPublicoForm from './public-form'

export default async function CadastroPage() {
  const sb = await createClient()
  const { data } = await sb
    .from('ruja_departamentos')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  const departamentos = activeOfficialDepartments((data ?? []) as Departamento[])

  return <CadastroPublicoForm departamentos={departamentos} />
}
