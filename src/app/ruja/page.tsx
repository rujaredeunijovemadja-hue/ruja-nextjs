import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RujaLayout } from '@/components/ruja/layout/ruja-layout'

export default async function RujaPage() {
  const sb = await createClient()

  // Verificação de auth server-side — fonte da verdade
  const { data: { user }, error } = await sb.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const nome = user.user_metadata?.nome
    ?? user.email?.split('@')[0]
    ?? 'Usuário'

  return <RujaLayout userName={nome} />
}
