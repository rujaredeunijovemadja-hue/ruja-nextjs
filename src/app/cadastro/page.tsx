import type { Departamento } from '@/lib/ruja/types'
import CadastroPublicoForm from './public-form'

export default async function CadastroPage() {
  const departamentos: Departamento[] = [
    { id: 'teens', nome: 'Teens', slug: 'teens', icone: '👦', lider: '', capacidade: 0, descricao: '' },
    { id: 'simply', nome: 'Simply', slug: 'simply', icone: '🌱', lider: '', capacidade: 0, descricao: '' },
  ]

  return <CadastroPublicoForm departamentos={departamentos} />
}
