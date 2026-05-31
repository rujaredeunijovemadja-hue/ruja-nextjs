import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RujaLayout } from '@/components/ruja/layout/ruja-layout'

export default async function RujaPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (!user) redirect('/login')

  const nome   = user.user_metadata?.nome   ?? user.email?.split('@')[0] ?? 'Usuário'

  return <RujaLayout userName={nome} />
}
