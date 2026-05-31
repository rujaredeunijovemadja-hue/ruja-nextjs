import { createClient } from '../supabase/client'

export async function signIn(email: string, password: string) {
  const sb = createClient()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const sb = createClient()
  await sb.auth.signOut()
}

export async function resetPassword(email: string) {
  const sb = createClient()
  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  })
  if (error) throw error
}

export async function getSession() {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  return session
}

export function translateAuthError(msg: string): string {
  if (msg.includes('Invalid login'))    return 'Email ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (msg.includes('User not found'))   return 'Usuário não encontrado.'
  if (msg.includes('network'))          return 'Sem conexão. Verifique sua internet.'
  return 'Erro ao entrar. Tente novamente.'
}
