import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RujaLayout } from '@/components/ruja/layout/ruja-layout'
import { normalizeRujaRole, type RujaAccessProfile } from '@/lib/ruja/access'
import { PLATFORM_REGISTRY, type PlatformAccess, type PlatformModule } from '@/lib/ruja/platforms'

function nexusAccess(profile: { id: string; role: string; departamento_id: string | null }): PlatformAccess {
  return {
    id: 'legacy-nexus',
    slug: 'nexus',
    role: profile.role === 'lider_supremo' ? 'owner' : profile.role === 'administrador' ? 'admin' : 'gestor',
    departamento_id: profile.departamento_id,
    modules: PLATFORM_REGISTRY.nexus.modules,
  }
}

async function loadPlatformAccess(
  sb: Awaited<ReturnType<typeof createClient>>,
  profile: { id: string; role: string; departamento_id: string | null }
): Promise<PlatformAccess[]> {
  const fallback = [nexusAccess(profile)]
  try {
    const { data: platforms, error: platformsError } = await sb
      .from('ruja_plataformas')
      .select('id,slug,ativo')
      .eq('ativo', true)
      .order('ordem')
    if (platformsError) return fallback

    const global = profile.role === 'lider_supremo' || profile.role === 'administrador'
    const { data: memberships, error: membershipsError } = await sb
      .from('ruja_usuario_plataformas')
      .select('plataforma_id,role,departamento_id,ativo')
      .eq('user_id', profile.id)
      .eq('ativo', true)
    if (membershipsError) return fallback

    const { data: platformModules } = await sb
      .from('ruja_plataforma_modulos')
      .select('plataforma_id,modulo:ruja_modulos(chave)')
      .eq('ativo', true)
    const membershipByPlatform = new Map((memberships ?? []).map(item => [item.plataforma_id, item]))
    const access = (platforms ?? [])
      .filter(platform => global || membershipByPlatform.has(platform.id))
      .map(platform => {
        const membership = membershipByPlatform.get(platform.id)
        const definition = PLATFORM_REGISTRY[platform.slug as keyof typeof PLATFORM_REGISTRY]
        const configuredModules = (platformModules ?? [])
          .filter(item => item.plataforma_id === platform.id)
          .map(item => (item.modulo as { chave?: string } | null)?.chave)
          .filter((module): module is PlatformModule => Boolean(module && definition?.modules.includes(module as PlatformModule)))
        return {
          id: platform.id,
          slug: platform.slug,
          role: membership?.role ?? (profile.role === 'lider_supremo' ? 'owner' : 'admin'),
          departamento_id: membership?.departamento_id ?? profile.departamento_id,
          modules: configuredModules.length ? configuredModules : definition?.modules ?? [],
        } as PlatformAccess
      })
    return access.length ? access : fallback
  } catch {
    return fallback
  }
}

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

  const platforms = await loadPlatformAccess(sb, accessProfile)
  accessProfile.platforms = platforms

  if (
    !['lider_supremo', 'administrador'].includes(accessProfile.role) &&
    !['teens', 'simply'].includes(accessProfile.departamento_id ?? '') &&
    !platforms.some(platform => platform.slug !== 'nexus')
  ) redirect('/login?erro=departamento')

  return <RujaLayout profile={accessProfile} platforms={platforms} />
}
