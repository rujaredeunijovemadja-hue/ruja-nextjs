import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RujaLayout } from '@/components/ruja/layout/ruja-layout'
import { normalizeRujaRole, type RujaAccessProfile } from '@/lib/ruja/access'

export default async function RujaPage() {
  const sb = await createClient()

  // Verificação de auth server-side — fonte da verdade
  const { data: { user }, error } = await sb.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await sb
    .from('ruja_profiles')
    .select('id, nome, email, role, departamento_id, ativo')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.ativo) redirect('/login?erro=acesso')

  const accessProfile: RujaAccessProfile = {
    ...profile,
    role: normalizeRujaRole(profile.role),
  }

  if (
    !['lider_supremo', 'administrador'].includes(accessProfile.role) &&
    !['teens', 'simply'].includes(accessProfile.departamento_id ?? '')
  ) redirect('/login?erro=departamento')

  return <RujaLayout profile={accessProfile} />
}
